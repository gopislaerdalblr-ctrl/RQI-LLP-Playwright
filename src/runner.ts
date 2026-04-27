import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const RUN_CONFIG = {
  instance: "maurya",
  tags: "@demo",
  parallel: 4,
  browser: "chromium",
  headless: false,
  dryRun: false,
  keepLastReports: 5,
} as const;

function envOrDefault(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length ? v.trim() : fallback;
}

function getCliArg(prefix: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.split('=')[1] : undefined;
}

function parseBool(v: string, fallback: boolean): boolean {
  const s = (v ?? "").toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return fallback;
}

function parseIntSafe(v: string, fallback: number): number {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBrowsers(input: string): string[] {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return ["chromium"];

  if (raw === "chromiumfirefoxwebkit") return ["chromium", "firefox", "webkit"];
  if (raw === "all") return ["chromium", "firefox", "webkit"];

  const parts = raw.includes("+")
    ? raw.split("+")
    : raw.includes(",")
      ? raw.split(",")
      : raw.includes(" ")
        ? raw.split(/\s+/)
        : [raw];

  const cleaned = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p === "chrome" ? "chromium" : p));

  const valid = ["chromium", "firefox", "webkit"];
  const out: string[] = [];
  for (const b of cleaned) {
    if (valid.includes(b) && !out.includes(b)) out.push(b);
  }

  return out.length ? out : ["chromium"];
}

const instance = (getCliArg('--instance=') || envOrDefault("INSTANCE", RUN_CONFIG.instance)).toLowerCase();

// =========================================================================
// 1. Tag Translation Logic
// =========================================================================
let tags = getCliArg('--tags=') || envOrDefault("TAGS", RUN_CONFIG.tags);
if (tags === "All") {
  tags = ""; // If 'All' is selected, clear the tags so Cucumber runs everything
}

// =========================================================================
// 2. Module Translation Logic
// =========================================================================
const rawModule = getCliArg('--module=') || envOrDefault("MODULE", "All");
let modulePath = "";

if (rawModule !== "All" && rawModule !== "") {
  // Translates the clean dropdown name into the actual folder path
  modulePath = `src/features/${rawModule}.feature`;
}

const parallel = parseIntSafe(
  getCliArg('--parallel=') || getCliArg('--workers=') || envOrDefault("PARALLEL", String(RUN_CONFIG.parallel)),
  RUN_CONFIG.parallel
);

const browserRaw = getCliArg('--browser=') || envOrDefault("BROWSER", RUN_CONFIG.browser).toLowerCase();
const browsersToRun = parseBrowsers(browserRaw);

const isCI = process.env.CI === "true" || !!process.env.JENKINS_URL;
const headless = parseBool(
  getCliArg('--headless=') || envOrDefault("HEADLESS", String(isCI ? true : RUN_CONFIG.headless)),
  isCI ? true : RUN_CONFIG.headless
);

const DRY_RUN = RUN_CONFIG.dryRun;

function runTs(scriptPath: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["-r", "ts-node/register", scriptPath],
      { stdio: "inherit", env },
    );
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function mergeWorkerJsonToSingle(): string | null {
  const tmpDir = path.resolve("reports", "_tmp");
  if (!fs.existsSync(tmpDir)) return null;

  const workerFiles = fs
    .readdirSync(tmpDir)
    .filter((f) => /^cucumber-worker-\d+\.json$/i.test(f))
    .map((f) => path.join(tmpDir, f));

  if (!workerFiles.length) return null;

  const merged: any[] = [];
  for (const file of workerFiles) {
    const raw = fs.readFileSync(file, "utf-8").trim();
    if (!raw) continue;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) merged.push(...parsed);
    else merged.push(parsed);
  }

  const outPath = path.join(tmpDir, "cucumber.json");
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf-8");

  for (const f of workerFiles) {
    try {
      fs.rmSync(f, { force: true });
    } catch { }
  }

  return outPath;
}

async function runOnceForBrowser(browser: string): Promise<number> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    INSTANCE: instance,
    BROWSER: browser,
    HEADLESS: String(headless),
  };

  const cucumberEntry = path.resolve(
    "node_modules",
    "@cucumber",
    "cucumber",
    "bin",
    "cucumber-js",
  );

  if (!fs.existsSync(cucumberEntry)) {
    throw new Error(`Cucumber entry not found: ${cucumberEntry}`);
  }

  fs.mkdirSync(path.resolve("reports", "_tmp"), { recursive: true });
  fs.mkdirSync(path.resolve("reports", "_history"), { recursive: true });

  const args: string[] = [
    cucumberEntry,
    "--config",
    "cucumber.js",
    "--parallel",
    String(parallel),
  ];

  // Dynamically push tags if they exist
  if (tags && tags.trim() !== "") {
    args.push("--tags", tags);
  }

  // Dynamically push the specific feature module if one was typed in Jenkins
  if (modulePath && modulePath.trim() !== "") {
    args.push(modulePath.trim());
  }

  if (String(process.env.RETRY_FAILED_ONCE || "") === "1") {
    args.push("--retry", "1");
  }

  if (DRY_RUN) {
    args.push("--dry-run");
  }

  const exitCode: number = await new Promise((resolve) => {
    const p = spawn(process.execPath, args, { stdio: "inherit", env });
    p.on("exit", (code) => resolve(code ?? 1));
  });

  if (DRY_RUN) {
    return exitCode;
  }

  const merged = mergeWorkerJsonToSingle();
  if (!merged) {
    return exitCode;
  }

  const gen = path.resolve("src", "report", "generate-report.ts");
  const rot = path.resolve("src", "report", "rotate-reports.ts");

  if (fs.existsSync(gen)) await runTs(gen, env);
  if (fs.existsSync(rot)) {
    env.REPORTS_KEEP_LAST = String(RUN_CONFIG.keepLastReports);
    await runTs(rot, env);
  }

  return exitCode;
}

async function main() {
  let finalExitCode = 0;

  for (const b of browsersToRun) {
    console.log(`\n==============================`);
    console.log(`🚀 Running on browser: ${b} | Headless: ${headless}`);
    console.log(`==============================\n`);

    const code = await runOnceForBrowser(b);
    if (code !== 0) finalExitCode = code;
  }

  process.exit(finalExitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});