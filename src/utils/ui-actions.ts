// src/utils/ui-actions.ts
import fs from "node:fs";
import path from "node:path";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";

function looksLikeSelectorFailure(err: unknown): boolean {
  const msg = errToString(err).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("waiting for") ||
    msg.includes("locator") ||
    msg.includes("strict mode violation") ||
    msg.includes("not attached") ||
    msg.includes("detached") ||
    msg.includes("element is not visible")
  );
}

function errToString(err: unknown): string {
  if (err instanceof Error) return err.message || String(err);
  return String(err);
}

async function safeAttach(world: ICustomWorld, text: string) {
  try {
    if (world && typeof world.attach === "function") {
      await world.attach(text, "text/plain");
    }
  } catch { }
}

// ==========================================
// HELPER: DEVTOOLS CONSOLE INJECTION
// ==========================================
export async function injectConsoleDate(page: any, targetDate: string) {
  console.log(`\n[HELPER] Executing DevTools console injection for date: ${targetDate}`);

  try {
    // Method 1: The physical script tag (Mimics typing and pressing Enter)
    await page.addScriptTag({
      content: `var testActivateDate = '${targetDate}';`
    });

    // Method 2: Direct window object assignment (Failsafe)
    await page.evaluate((d: string) => {
      (window as any).testActivateDate = d;
    }, targetDate);

    // Give the browser's JavaScript engine a brief moment to register the global variable
    await page.waitForTimeout(1000);
    console.log(`[HELPER] Console injection complete.`);

  } catch (error) {
    console.error(`[HELPER ERROR] Failed to inject console date: ${error}`);
  }
}

export type ClickIfPresentOptions = {
  strictClick?: boolean;
  timeoutMs?: number;
  attachDebug?: boolean;
};

export async function clickIfPresent(
  world: ICustomWorld,
  selectors: readonly string[],
  options: ClickIfPresentOptions = {},
): Promise<boolean> {
  const page: any = world.page;
  const strictClick = options.strictClick ?? false;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const attachDebug = options.attachDebug ?? true;

  for (const sel of selectors) {
    const loc = page.locator(sel);
    const count = await loc.count().catch(() => 0);
    if (!count) continue;

    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      try {
        await el.waitFor({ state: "visible", timeout: 2000 });

        if (attachDebug) {
          const href = await el.getAttribute("href").catch(() => null);
          const text = ((await el.textContent().catch(() => "")) ?? "").trim();
          await safeAttach(
            world,
            `Manual Click Attempt: ${sel}\nIndex: ${i}\nText: ${text}\nHref: ${href}`,
          );
        }

        await el.scrollIntoViewIfNeeded().catch(() => { });
        await el.click({ timeout: 5000 });
        return true;
      } catch (err: unknown) {
        continue;
      }
    }
  }

  if (world.heal?.enabled && page?.heal) {
    const primarySel = selectors[0];
    try {
      await safeAttach(
        world,
        `Standard selectors failed. Triggering Healwright for: ${primarySel}`,
      );
      await page.heal
        .locator(primarySel, `Final AI recovery for: ${primarySel}`)
        .click({ timeout: timeoutMs });
      world.heal.used = true;
      world.heal.messages.push(
        `Healwright: Recovered click on "${primarySel}"`,
      );
      return true;
    } catch (healErr) { }
  }

  if (strictClick) {
    throw new Error(
      `clickIfPresent(strict): Exhausted all ${selectors.length} selectors and AI healing failed.`,
    );
  }
  return false;
}

export async function fillIfPresent(
  world: ICustomWorld,
  selectors: readonly string[],
  value: string,
  options: { strict?: boolean; timeoutMs?: number } = {},
): Promise<boolean> {
  const page: any = world.page;
  const strict = options.strict ?? false;
  const timeoutMs = options.timeoutMs ?? 10_000;

  for (const sel of selectors) {
    const loc = page.locator(sel);
    const count = await loc.count().catch(() => 0);
    if (!count) continue;

    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      try {
        await el.waitFor({ state: "visible", timeout: 2000 });
        await el.fill(value, { timeout: 5000 });
        return true;
      } catch (err: unknown) {
        continue;
      }
    }
  }

  if (world.heal?.enabled && page?.heal) {
    const primarySel = selectors[0];
    try {
      await page.heal.locator(primarySel).fill(value, { timeout: timeoutMs });
      world.heal.used = true;
      return true;
    } catch { }
  }

  if (strict)
    throw new Error(
      `fillIfPresent(strict) failed for: ${selectors.join(", ")}`,
    );
  return false;
}

export async function executeHardLogout(world: ICustomWorld): Promise<void> {
  const page: any = world.page;
  await clickIfPresent(world, S.adminLogin.profileDropdown, {
    timeoutMs: 5000,
  });
  await page.waitForTimeout(500);

  let targetUrl: string | null = null;
  for (const sel of S.adminLogin.logoutLink) {
    const loc = page.locator(sel);
    const count = await loc.count().catch(() => 0);
    if (!count) continue;

    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      const href = await el.getAttribute("href").catch(() => null);
      const text = await el.textContent().catch(() => "");

      if (
        href &&
        (href.includes("signout") || href.includes("logout")) &&
        /logout|sign\s?out/i.test(text || "")
      ) {
        targetUrl = new URL(href, page.url()).toString();
        break;
      }
    }
    if (targetUrl) break;
  }

  if (targetUrl) await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const baseUrl = new URL("/", page.url()).toString();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await safeAttach(world, `Hard Logout Complete. Session cleared.`);
}

// ============================================================================
// DATA & FILE UTILITIES (Moved from Step Definitions)
// ============================================================================

export function ensureDir(dirPath: string) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch { }
}

export function deleteIfExists(p: string) {
  try {
    if (fs.existsSync(p)) fs.rmSync(p, { force: true });
  } catch { }
}

export function nowSuffix(maxLen = 20) {
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return s.slice(-maxLen);
}

export function parseCsvHeader(csvText: string): string[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  return splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
}

function normalizeHeader(h: string): string {
  return (h || "").toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function escapeCsvValue(v: string): string {
  const s = (v ?? "").toString();
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildRowByHeader(
  headers: string[],
  values: Record<string, string>,
) {
  return headers
    .map((h) => {
      const key = normalizeHeader(h);
      const val = values[key] ?? "";
      return escapeCsvValue(val);
    })
    .join(",");
}

export async function tryGetFlashText(page: any): Promise<string> {
  const flash = page.locator(
    '.alert-success, .alert.alert-success, .flash-success, div:has-text("added successfully"), div:has-text("success")',
  );
  const visible = await flash
    .first()
    .isVisible({ timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return "";
  return (
    await flash
      .first()
      .innerText()
      .catch(() => "")
  ).trim();
}

export type CourseConfig = {
  courseName: string;
  courseId: string;
  defaultTags?: string;
};

export function readCourseConfig(): CourseConfig {
  const p = path.resolve("src/config/course.json");
  const raw = fs
    .readFileSync(p, "utf-8")
    .replace(/^\uFEFF/, "")
    .trim();
  try {
    return JSON.parse(raw) as CourseConfig;
  } catch (e) {
    throw new Error(
      `course.json is not valid JSON. File: ${p}\nOriginal error: ${(e as Error).message}`,
    );
  }
}
