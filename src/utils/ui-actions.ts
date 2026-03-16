// src/utils/ui-actions.ts
import type { World } from "../support/world";
import { S } from "../pages/selectors"; // Ensure this import is correct for your structure

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

async function safeAttach(world: any, text: string) {
  try {
    if (world && typeof world.attach === "function") {
      await world.attach(text, "text/plain");
    }
  } catch {
    // ignore
  }
}

export type ClickIfPresentOptions = {
  strictClick?: boolean;
  timeoutMs?: number;
  attachDebug?: boolean;
};

/**
 * Enterprise Click Action:
 * 1. Iterates through all provided selectors.
 * 2. If all fail, attempts Healwright on the primary selector.
 */
export async function clickIfPresent(
  world: World,
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

        await el.scrollIntoViewIfNeeded().catch(() => {});
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
    } catch (healErr) {
      await safeAttach(
        world,
        `Healwright also failed: ${errToString(healErr)}`,
      );
    }
  }

  if (strictClick) {
    throw new Error(
      `clickIfPresent(strict): Exhausted all ${selectors.length} selectors and AI healing failed.`,
    );
  }
  return false;
}

/**
 * Enterprise Fill Action
 */
export async function fillIfPresent(
  world: World,
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
    } catch {
      /* continue */
    }
  }

  if (strict)
    throw new Error(
      `fillIfPresent(strict) failed for: ${selectors.join(", ")}`,
    );
  return false;
}

/**
 * GLOBAL LOGOUT SOLUTION
 * Handles profile dropdown, logout link resolution, and session clearing.
 */
export async function executeHardLogout(world: World): Promise<void> {
  const page: any = world.page;

  // 1. Open profile dropdown
  await clickIfPresent(world, S.adminLogin.profileDropdown, {
    timeoutMs: 5000,
  });
  await page.waitForTimeout(500);

  // 2. Resolve logout URL from selector array
  let targetUrl: string | null = null;
  for (const sel of S.adminLogin.logoutLink) {
    const loc = page.locator(sel);
    const count = await loc.count().catch(() => 0);
    if (!count) continue;

    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      const href = await el.getAttribute("href").catch(() => null);
      const text = await el.textContent().catch(() => "");

      // Filter for actual logout links
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

  // 3. Perform Logout and Clear Data
  if (targetUrl) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  }

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const baseUrl = new URL("/", page.url()).toString();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await safeAttach(world, `Hard Logout Complete. Session cleared.`);
}
