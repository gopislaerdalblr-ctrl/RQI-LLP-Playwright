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

export type PWContext = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

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
    args: ["--start-maximized"],
  });

  // ✅ Video folder
  const videoDir = path.resolve("reports/_tmp/videos");
  ensureDir(videoDir);

  const context = await browser.newContext({
    viewport: null,
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(60_000);

  return { browser, context, page };
}
