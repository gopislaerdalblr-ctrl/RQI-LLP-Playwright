import fs from "node:fs";
import path from "node:path";

function numFromEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isDir(p: string) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listRunFolders(historyDir: string): string[] {
  if (!fs.existsSync(historyDir)) return [];
  return fs
    .readdirSync(historyDir)
    .map((name) => path.join(historyDir, name))
    .filter(isDir)
    // folders are named like YYYY-MM-DD_HH-MM-SS so lexicographic sort works
    .sort()
    .reverse(); // newest first
}

function cleanupTmpLogs(retainRuns: number) {
  const logsDir = path.resolve("reports/_tmp/logs");
  if (!fs.existsSync(logsDir)) return;

  // History is source of truth: keep logs that match retained run folder names.
  const historyDir = path.resolve("reports/_history");
  const retained = listRunFolders(historyDir).slice(0, retainRuns);
  const retainedRunNames = new Set(retained.map((p) => path.basename(p)));

  const files = fs.readdirSync(logsDir).map((f) => path.join(logsDir, f));
  for (const f of files) {
    const base = path.basename(f);

    // filenames start with runName like: 2026-02-04_19-21-38__Scenario__console.log
    const runName = base.split("__")[0] || "";

    if (runName && !retainedRunNames.has(runName)) {
      try {
        fs.rmSync(f, { force: true });
      } catch {
        // ignore
      }
    }
  }
}

function rotateReports() {
  const keepLast = numFromEnv("REPORTS_KEEP_LAST", 5);
  const historyDir = path.resolve("reports/_history");
  if (!fs.existsSync(historyDir)) return;

  const dirs = fs
    .readdirSync(historyDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const toDelete = dirs.slice(0, Math.max(0, dirs.length - keepLast));

  for (const name of toDelete) {
    const full = path.join(historyDir, name);
    try {
      fs.rmSync(full, { recursive: true, force: true });
    } catch {
      // ignore; windows may lock briefly
    }
  }

  const zips = fs
    .readdirSync(historyDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".zip"))
    .map((d) => d.name)
    .sort();

  const zipDelete = zips.slice(0, Math.max(0, zips.length - keepLast));
  for (const z of zipDelete) {
    const full = path.join(historyDir, z);
    try {
      fs.rmSync(full, { force: true });
    } catch {
      // ignore
    }
  }

  // ✅ NEW: cleanup tmp logs to match the same retention count
  cleanupTmpLogs(keepLast);
}

if (require.main === module) {
  rotateReports();
}

export { rotateReports };
