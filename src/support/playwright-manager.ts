// src/support/playwright-manage.ts
import fs from "node:fs";
import path from "node:path";
import {
  chromium,
  firefox,
  webkit,
  Browser,
  BrowserContext,
  Page,
} from "playwright";
import { isHealEnabled, wrapWithHealwright } from "./healwright";

export type PWContext = {
  browser: Browser;
  context: BrowserContext;
  page: Page & any;
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

/**
 * Launches Playwright with a "forced" maximized environment for Headless mode.
 * Combines --window-size, custom User-Agent, and specific viewport settings.
 */
export async function launchPlaywright(): Promise<PWContext> {
  const browserName = (process.env.BROWSER || "chromium").toLowerCase();
  const headless = (process.env.HEADLESS ?? "true") === "true";

  const launcher =
    browserName === "firefox"
      ? firefox
      : browserName === "webkit"
        ? webkit
        : chromium;

  const browser = await launcher.launch({
    headless,
    args: [
      /* ✅ CRITICAL: Forces the underlying browser "box" to 1080p in headless */
      "--window-size=1920,1080",
      "--start-maximized",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  // ✅ Video folder setup
  const videoDir = path.resolve("reports/_tmp/videos");
  ensureDir(videoDir);

  const context = await browser.newContext({
    /* ✅ VIEWPORT: Forces the website to draw at Full HD resolution */
    viewport: { width: 1920, height: 1080 },

    /* ✅ USER-AGENT: Prevents sites from detecting 'headless' and serving mobile layouts */
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",

    recordVideo: {
      dir: videoDir,
      /* ✅ Match video size to viewport for clear, wide-screen reports */
      size: { width: 1920, height: 1080 },
    },
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
  });

  const rawPage = await context.newPage();

  /* ✅ FINAL OVERRIDE: Ensures the page content is stretched to 1080p width */
  await rawPage.setViewportSize({ width: 1920, height: 1080 });

  // High timeouts for heavy batch runs
  rawPage.setDefaultTimeout(60_000);
  rawPage.setDefaultNavigationTimeout(60_000);

  // ✅ Healwright wrap
  const page = isHealEnabled() ? wrapWithHealwright(rawPage) : (rawPage as any);

  return { browser, context, page };
}
