import {
  BeforeAll,
  Before,
  After,
  BeforeStep,
  AfterStep,
  setDefaultTimeout,
  Status,
} from "@cucumber/cucumber";
import fs from "node:fs";
import path from "node:path";
import {
  chromium,
  firefox,
  webkit,
  BrowserContext,
  Page,
  type ConsoleMessage,
  type Request,
  type Response,
} from "playwright";
import {
  loadInstance,
  loadCourseConfig,
  loadSecretsForInstance,
} from "../config/runtime";
import { World } from "./world";
import { pageFixture } from "./pageFixture";

const FIXED_VIEWPORT = { width: 1920, height: 1080 };
const ALLOWED_BROWSER_TYPES = new Set(["chromium", "firefox", "webkit"]);

const BROWSER_LAUNCHERS = {
  chromium: (headless: boolean) =>
    chromium.launch({ headless, args: ["--start-maximized"] }),
  firefox: (headless: boolean) => firefox.launch({ headless }),
  webkit: (headless: boolean) => webkit.launch({ headless }),
} as const;

type SecretsInstanceKey = Parameters<typeof loadSecretsForInstance>[0];
type SecretsEnv = Parameters<typeof loadSecretsForInstance>[1];

type NetEntry = {
  type: "request" | "response" | "failed";
  ts: string;
  method?: string;
  url: string;
  status?: number;
  statusText?: string;
  resourceType?: string;
  errorText?: string;
  timingMs?: number;
};

export interface ICustomWorld extends World {
  pickle?: any;
  lastStepText?: string;
  _failedStepScreenshotCaptured?: boolean;
  courseConfig?: any;
  pageErrors?: string[];
  netLogs?: NetEntry[];
  reqStart?: Map<string, number>;
  assignmentTitle?: string;
  importedUserId?: string;
  importedUserEmail?: string;
  importedUserFirstName?: string;
  importedUserLastName?: string;
  assignedCourseName?: string;
  extractedResetUrl?: string;
  coursePlayerPage?: Page;
}

setDefaultTimeout(120_000);

function clearStaleLocks() {
  const lockDir = path.resolve(process.cwd(), ".locks");
  if (fs.existsSync(lockDir)) {
    fs.rmSync(lockDir, { recursive: true, force: true });
    console.log('\n[SETUP] Cleared stale mutex lock files from previous runs.');
  }
}

BeforeAll(() => {
  clearStaleLocks();
});

export function getZimbraCredentials() {
  const secretPath = path.resolve("src", "data", "secrets", "zimbra.json");
  if (!fs.existsSync(secretPath)) {
    throw new Error(`[FATAL] Zimbra credentials file not found at: ${secretPath}`);
  }
  let fileContent = fs.readFileSync(secretPath, "utf-8");

  fileContent = fileContent.replace(/^\uFEFF/, "").trim();
  return JSON.parse(fileContent);
}

export function getZimbraUrl() {
  const instancePath = path.resolve("src", "config", "instances.json");
  if (!fs.existsSync(instancePath)) {
    throw new Error(`[FATAL] instance.json file not found at: ${instancePath}`);
  }
  let fileContent = fs.readFileSync(instancePath, "utf-8");
  fileContent = fileContent.replace(/^\uFEFF/, "").trim();
  const config = JSON.parse(fileContent);
  return config.zimbra.baseUrl;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function safeWriteRunMeta(meta: any) {
  const tmpDir = path.resolve("reports/_tmp");
  ensureDir(tmpDir);
  const metaFile = path.join(tmpDir, "run-meta.json");
  const tempFile = metaFile + ".tmp";
  try {
    fs.writeFileSync(tempFile, JSON.stringify(meta, null, 2), "utf-8");
    fs.renameSync(tempFile, metaFile);
  } catch {
    try {
      if (fs.existsSync(tempFile)) fs.rmSync(tempFile, { force: true });
    } catch { }
  }
}

function readRunMeta(): any | null {
  try {
    const metaFile = path.resolve("reports/_tmp/run-meta.json");
    if (!fs.existsSync(metaFile)) return null;
    return JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  } catch {
    return null;
  }
}

function formatRunNameFromIso(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function safeFilePart(s: string) {
  return s.replace(/[^a-z0-9-_]/gi, "_").slice(0, 140);
}

function toFileUrl(p: string) {
  return "file:///" + p.replace(/\\/g, "/");
}

function writeTextFile(fullPath: string, content: string) {
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, "utf-8");
}

function getInstanceKey(): string {
  return String(process.env.INSTANCE || "maurya")
    .trim()
    .toLowerCase();
}

function getViewportOptionsForBrowser(browserType: string) {
  return browserType === "chromium"
    ? { viewport: null }
    : { viewport: FIXED_VIEWPORT };
}

async function captureUIErrors(page: Page): Promise<string[]> {
  try {
    const detectedErrors = await page.evaluate(() => {
      const errors: string[] = [];
      document.querySelectorAll("h1").forEach((h) => {
        const txt = h.innerText || "";
        if (/502|500|404|403|Bad Gateway|Internal Server Error/i.test(txt))
          errors.push(`Header Error: ${txt}`);
      });
      document
        .querySelectorAll(
          '.toast-message, .alert, div[role="alert"], .error-banner',
        )
        .forEach((el) => {
          const txt = (el as HTMLElement).innerText || "";
          if (txt.length > 0 && txt.length < 300)
            errors.push(`UI Alert: ${txt}`);
        });
      const bodyText = document.body.innerText || "";

      if (bodyText.includes("502 Bad Gateway"))
        errors.push("Page contains: 502 Bad Gateway");
      if (bodyText.includes("404 Not Found"))
        errors.push("Page contains: 404 Not Found");
      return errors;
    });
    return Array.from(new Set(detectedErrors));
  } catch {
    return [];
  }
}

BeforeStep(function (this: ICustomWorld, { pickleStep }) {
  this.lastStepText = pickleStep?.text || "";
});

AfterStep(async function (this: ICustomWorld, { result }) {
  if (!result || result.status !== Status.FAILED) return;
  if (!this.page) return;

  try {
    const tmpShotsDir = path.resolve("reports/_tmp/screenshots");
    ensureDir(tmpShotsDir);

    const scenarioName = this.pickle?.name || "scenario";
    const safeScenario = safeFilePart(scenarioName);
    const safeStep = safeFilePart(this.lastStepText || "failed_step");

    const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeScenario}__${safeStep}.png`;
    const fullPath = path.join(tmpShotsDir, fileName);

    const buf = await this.page.screenshot({ path: fullPath, fullPage: true });
    await this.attach(buf, "image/png");
    await this.attach(`URL: \n${this.page.url()}`, "text/plain");

    this._failedStepScreenshotCaptured = true;
  } catch (e) {
    await this.attach(
      `Failed to capture AfterStep screenshot: ${(e as Error).message}`,
      "text/plain",
    );
  }
});

Before(async function (this: ICustomWorld, scenario) {
  this.pickle = scenario.pickle;
  this._failedStepScreenshotCaptured = false;

  const instanceKey = getInstanceKey();
  const cfg = loadInstance(instanceKey);

  try {
    const instancesPath = path.resolve("src/config/instances.json");
    if (fs.existsSync(instancesPath)) {
      let fileContent = await fs.promises.readFile(instancesPath, "utf-8");
      fileContent = fileContent.replace(/^\uFEFF/, "").trim();
      const allInstances = JSON.parse(fileContent);

      if (allInstances.moodle && allInstances.moodle.moodleUrl) {
        (cfg as any).moodleUrl = allInstances.moodle.moodleUrl;
      }
    }
  } catch (e) {
    console.error("\n[HOOKS] ❌ FAILED to load src/config/instances.json.");
  }

  this.instance = cfg;
  const secrets = loadSecretsForInstance(
    instanceKey as SecretsInstanceKey,
    cfg.env as SecretsEnv,
  );

  const course = loadCourseConfig();
  this.courseConfig = course;

  this.adminEmail = secrets.adminEmail;
  this.adminPassword = secrets.adminPassword;

  const browserEnvValue = process.env.BROWSER;
  const browserType = browserEnvValue
    ? browserEnvValue.toLowerCase()
    : "chromium";
  const headless = process.env.HEADLESS === "true";

  if (!ALLOWED_BROWSER_TYPES.has(browserType)) {
    throw new Error(
      `Unsupported browser type "${browserEnvValue}". Allowed values are: chromium, firefox, webkit.`,
    );
  }

  const launchBrowser =
    BROWSER_LAUNCHERS[browserType as keyof typeof BROWSER_LAUNCHERS];
  const browser = await launchBrowser(headless);
  const contextOptions = getViewportOptionsForBrowser(browserType);

  const context: BrowserContext = await browser.newContext({
    ...contextOptions,
    ignoreHTTPSErrors: true,
    recordVideo: {
      dir: path.resolve("reports/_tmp/videos"),
      size: { width: 1280, height: 720 },
    },
  });

  const page: Page = await context.newPage();
  this.browser = browser;
  this.context = context;
  this.page = page;

  pageFixture.page = page;

  this.consoleLogs = [];
  this.page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    const limit = 1000;
    const cleanText =
      text.length > limit
        ? text.substring(0, limit) +
        ` ... [TRUNCATED (${text.length - limit} chars)]`
        : text;
    this.consoleLogs!.push(`[console] ${msg.type()} ${cleanText}`);
  });

  this.pageErrors = [];
  this.page.on("pageerror", (err: Error) => {
    this.pageErrors!.push(`[pageerror] ${err?.message || String(err)}`);
  });

  this.netLogs = [];
  this.reqStart = new Map<string, number>();
  const nowIso = () => new Date().toISOString();

  this.page.on("request", (req: Request) => {
    const id = req.url() + "::" + req.method() + "::" + req.resourceType();
    this.reqStart!.set(id, Date.now());
    this.netLogs!.push({
      type: "request",
      ts: nowIso(),
      method: req.method(),
      url: req.url(),
      resourceType: req.resourceType(),
    });
  });

  this.page.on("response", async (res: Response) => {
    const req = res.request();
    const id = req.url() + "::" + req.method() + "::" + req.resourceType();
    const start = this.reqStart!.get(id);
    const timingMs = typeof start === "number" ? Date.now() - start : undefined;
    this.netLogs!.push({
      type: "response",
      ts: nowIso(),
      method: req.method(),
      url: req.url(),
      status: res.status(),
      statusText: res.statusText(),
      resourceType: req.resourceType(),
      timingMs,
    });
  });

  this.page.on("requestfailed", (req: Request) => {
    this.netLogs!.push({
      type: "failed",
      ts: nowIso(),
      method: req.method(),
      url: req.url(),
      resourceType: req.resourceType(),
      errorText: req.failure()?.errorText || "requestfailed",
    });
  });

  safeWriteRunMeta({
    instance: instanceKey,
    env: this.instance.env,
    baseUrl: this.instance.baseUrl,
    subdomain: this.instance.subdomain,
    orgId: this.instance.orgId,
    courseName: course.courseName,
    sourceId: this.sourceId ?? "not-captured-yet",
    generatedAt: new Date().toISOString(),
    browser: browserType,
    userSpecifiedBrowser:
      typeof process.env.BROWSER === "string" ? process.env.BROWSER : null,
  });

  await this.attach(`Scenario: ${scenario.pickle.name}`, "text/plain");
});

After(async function (this: ICustomWorld, scenario) {
  const scenarioName = scenario.pickle.name;

  if (scenario.result?.status === Status.FAILED && this.page) {
    if (!this._failedStepScreenshotCaptured) {
      const tmpShotsDir = path.resolve("reports/_tmp/screenshots");
      ensureDir(tmpShotsDir);
      const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeFilePart(scenarioName)}.png`;
      const fullPath = path.join(tmpShotsDir, fileName);
      await this.page.screenshot({ path: fullPath, fullPage: true });

      const buf = await fs.promises.readFile(fullPath);
      await this.attach(buf, "image/png");
      await this.attach(`URL: ${this.page.url()}`, "text/plain");
    }

    const uniqueErrors = await captureUIErrors(this.page);
    if (uniqueErrors.length > 0) {
      const errorMsg = `🚨 UI ERROR DETECTED ON FAILURE:\n${uniqueErrors.join("\n")}`;
      await this.attach(errorMsg, "text/plain");
      console.error(`\n[HOOKS] ${errorMsg}\n`);
    }
  }

  const currentInstance = this.instance || {};
  const courseConfig = this.courseConfig || {};
  let activeOrgId = currentInstance.orgId || "unknown";

  if (this.page) {
    try {
      const url = this.page.url();
      const match = url.match(/\/manage_organization\/(\d+)/);
      if (match && match[1]) {
        activeOrgId = match[1];
      } else {
        const netLogs: NetEntry[] = this.netLogs || [];
        const lastOrgVisit = netLogs
          .reverse()
          .find(
            (l) =>
              l.url.includes("/manage_organization/") &&
              !l.url.endsWith("/manage_organization/"),
          );
        if (lastOrgVisit) {
          const histMatch = lastOrgVisit.url.match(
            /\/manage_organization\/(\d+)/,
          );
          if (histMatch && histMatch[1]) activeOrgId = histMatch[1];
        }
      }
    } catch { }
  }

  const foundCourses = new Set<string>();
  try {
    const steps = scenario.pickle.steps || [];
    steps.forEach((step: any) => {
      const text = step.text || "";
      const matches = text.match(/["']([^"']+)["']/g);
      if (matches) {
        matches.forEach((m: string) => {
          const key = m.replace(/["']/g, "");
          if (courseConfig[key]) {
            foundCourses.add(courseConfig[key]);
          } else if (Object.values(courseConfig).includes(key)) {
            foundCourses.add(key);
          }
        });
      }
    });
  } catch { }

  const coursesList = foundCourses.size
    ? Array.from(foundCourses)
      .map((c) => `• ${c}`)
      .join("\n" + " ".repeat(18))
    : "• (No mapped courses found)";
  const instanceKey = getInstanceKey();

  const testMetadata = `
╔════════════════════════════════════════════════════════════╗
║             🔍  TEST EXECUTION CONTEXT                     ║
╠════════════════════════════════════════════════════════════╣
║ 🌍 Environment    : ${(currentInstance.env || "unknown").toUpperCase().padEnd(30)} ║
║ 🔑 Instance Key   : ${instanceKey.padEnd(30)} ║
║ 🖥️  Browser        : ${(process.env.BROWSER || "chromium").padEnd(30)} ║
║ 🏢 Active Org ID  : ${activeOrgId.padEnd(30)} ║
║ 🔗 Base URL       : ${(currentInstance.baseUrl || "unknown").padEnd(30)} ║
╠════════════════════════════════════════════════════════════╣
║ 📚 Used Courses   :
                ${coursesList}
╚════════════════════════════════════════════════════════════╝
Timestamp: ${new Date().toISOString()}
`.trim();
  await this.attach(testMetadata, "text/plain");

  const video = this.page?.video ? this.page.video() : null;
  let videoPathPromise: Promise<string> | null = null;
  if (video) videoPathPromise = video.path();

  const meta = readRunMeta();
  const runName = meta?.generatedAt
    ? formatRunNameFromIso(meta.generatedAt)
    : formatRunNameFromIso(new Date().toISOString());
  const tmpLogsDir = path.resolve("reports/_tmp/logs");
  ensureDir(tmpLogsDir);
  const safeScenario = safeFilePart(scenarioName);
  const baseFile = `${runName}__${safeScenario}`;

  const consoleFileTmp = path.join(tmpLogsDir, `${baseFile}__console.log`);
  const pageErrFileTmp = path.join(tmpLogsDir, `${baseFile}__pageerrors.log`);
  const netFileTmp = path.join(tmpLogsDir, `${baseFile}__network.log`);
  const netJsonFileTmp = path.join(tmpLogsDir, `${baseFile}__network.json`);

  const consoleText = this.consoleLogs?.length
    ? this.consoleLogs.join("\n")
    : "No console logs captured.";
  writeTextFile(consoleFileTmp, consoleText);

  const pageErrors: string[] = this.pageErrors || [];
  const pageErrorsText = pageErrors.length
    ? pageErrors.join("\n")
    : "No page errors captured.";
  writeTextFile(pageErrFileTmp, pageErrorsText);

  const netLogs: NetEntry[] = this.netLogs || [];
  let netText = "No network logs captured.";
  if (netLogs.length) {
    const lines: string[] = [];
    lines.push("========== NETWORK LOGS ==========");
    for (const e of netLogs) {
      if (e.type === "request") {
        lines.push(
          `[${e.ts}] [REQ] ${e.method} ${e.url} (${e.resourceType || ""})`,
        );
      } else if (e.type === "response") {
        lines.push(
          `[${e.ts}] [RES] ${e.method} ${e.url} -> ${e.status} ${e.statusText || ""} (${e.resourceType || ""}) ${typeof e.timingMs === "number" ? `(${e.timingMs}ms)` : ""}`,
        );
      } else {
        lines.push(
          `[${e.ts}] [FAIL] ${e.method} ${e.url} (${e.resourceType || ""}) :: ${e.errorText || ""}`,
        );
      }
    }
    lines.push("==================================");
    netText = lines.join("\n");
  }
  writeTextFile(netFileTmp, netText);
  writeTextFile(netJsonFileTmp, JSON.stringify(netLogs, null, 2));

  await this.moodlePage?.close().catch(() => { });
  await this.page?.close().catch(() => { });
  await this.context?.close().catch(() => { });
  await this.browser?.close().catch(() => { });

  if (video && videoPathPromise) {
    try {
      const originalPath = await videoPathPromise;
      if (fs.existsSync(originalPath)) {
        const videosDir = path.resolve("reports/_tmp/videos");
        ensureDir(videosDir);
        const newFileName = `${runName}__${safeFilePart(scenarioName)}.webm`;
        const newPath = path.join(videosDir, newFileName);

        try {
          if (fs.existsSync(newPath)) fs.rmSync(newPath, { force: true });
          fs.renameSync(originalPath, newPath);
        } catch (e) {
          fs.copyFileSync(originalPath, newPath);
          fs.unlinkSync(originalPath);
        }

        const videoBuf = await fs.promises.readFile(newPath);
        await this.attach(videoBuf, "video/webm");
        await this.attach(`🎥 Video: ${newFileName}`, "text/plain");
      }
    } catch (e) {
      await this.attach(
        `⚠️ Video processing failed: ${(e as Error).message}`,
        "text/plain",
      );
    }
  }

  const summary: string[] = [];
  summary.push("📋 LOG FILES (Available locally)");
  summary.push("────────────────────────────────────────────────");
  summary.push(`📂 Run ID: ${runName}`);
  summary.push("");
  summary.push("🔗 Open Local Logs:");
  summary.push(`  • Console    : ${toFileUrl(consoleFileTmp)}`);
  summary.push(`  • PageErrors : ${toFileUrl(pageErrFileTmp)}`);
  summary.push(`  • Network    : ${toFileUrl(netFileTmp)}`);
  summary.push(`  • NetworkJS  : ${toFileUrl(netJsonFileTmp)}`);
  summary.push("");
  summary.push("📝 Local Paths:");
  summary.push(`  • ${consoleFileTmp}`);
  summary.push("────────────────────────────────────────────────");

  await this.attach(summary.join("\n"), "text/plain");

  if (this.heal?.enabled)
    await this.attach(`Healwright enabled: ${this.heal.enabled}`, "text/plain");
  if (this.heal?.used) {
    const msg = `Failed scenario had a selector/locator issue, it was healed with Healwright.`;
    await this.attach(msg, "text/plain");
    if (Array.isArray(this.heal.messages) && this.heal.messages.length) {
      await this.attach(this.heal.messages.join("\n"), "text/plain");
    }
  }
});
