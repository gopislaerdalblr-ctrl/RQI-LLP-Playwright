import { Page } from "@playwright/test";

/**
 * Click the first visible selector from the list
 */
export async function clickIfPresent(
  world: { page: Page },
  selectors: readonly string[],
): Promise<boolean> {
  for (const sel of selectors) {
    const loc = world.page.locator(sel);
    try {
      if (await loc.first().isVisible()) {
        await loc.first().click();
        return true;
      }
    } catch {
      // ignore and try next selector
    }
  }
  return false;
}

/**
 * Fill the first visible selector from the list
 */
export async function fillIfPresent(
  world: { page: Page },
  selectors: readonly string[],
  value: string,
): Promise<boolean> {
  for (const sel of selectors) {
    const loc = world.page.locator(sel);
    try {
      if (await loc.first().isVisible()) {
        await loc.first().fill(value);
        return true;
      }
    } catch {
      // ignore and try next selector
    }
  }
  return false;
}
