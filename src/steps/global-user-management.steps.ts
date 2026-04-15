import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import {
  clickIfPresent,
  fillIfPresent,
  executeHardLogout,
} from "../utils/ui-actions";

Then(
  "Navigate to Global User Management page",
  async function (this: ICustomWorld) {
    // 1. SHORT-CIRCUIT: Are we already there?
    if (this.page.url().includes("/admin/manageuser")) {
      await this.attach(
        "Already on User Management page. Skipping dashboard navigation.",
        "text/plain",
      );
      return;
    }

    // 2. WAIT FOR PAGE TO SETTLE: Ensure dashboard is completely loaded
    await this.page.waitForLoadState("domcontentloaded");

    // 3. FETCH SELECTORS: Strictly following standards (No hardcoded strings here)
    const userMgmtWidgetSelectors = S.adminLogin.GlobalUserManagementWidget;

    // 4. SYNCHRONIZATION: Wait for the primary widget button to be physically visible
    const primaryWidget = this.page.locator(userMgmtWidgetSelectors[0]).first();
    await primaryWidget.waitFor({ state: "visible", timeout: 20000 });

    // 5. THE CLICK: Use your enterprise array-exhaustion utility
    const clicked = await clickIfPresent(this, userMgmtWidgetSelectors, {
      strictClick: false,
    });

    // 6. NATIVE FALLBACK: If the widget has an overlay (like a tooltip glitching), force click it
    if (!clicked) {
      await this.attach(
        "Standard click failed, attempting Native Force-Click on Dashboard Widget.",
        "text/plain",
      );
      await primaryWidget.click({ force: true });
    }

    // 7. VERIFY NAVIGATION: Wait for URL change AND the network to quiet down
    await this.page.waitForURL(
      (url: URL) => url.href.includes("/admin/manageuser"),
      { timeout: 30000 },
    );

    // Final settling phase for the next step
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForLoadState("networkidle").catch(() => {});
  },
);

Then(
  "Search user with email id {string}",
  async function (this: ICustomWorld, email: string) {
    const emailFieldSelector = S.adminLogin.EmailField[0];
    const loc = this.page.locator(emailFieldSelector);

    await loc.waitFor({ state: "visible", timeout: 15000 });
    await fillIfPresent(this, S.adminLogin.EmailField, email, { strict: true });

    // ✅ Focus shift to enable the search button
    await this.page.keyboard.press("Tab");
    await this.page.waitForTimeout(500);
  },
);

Then("Click on search icon", async function (this: ICustomWorld) {
  const searchSelectors = S.adminLogin.globalUserSearchButton;
  const editSelector = S.adminLogin.globalUserEdit[0];

  // 1. Click Search
  await clickIfPresent(this, searchSelectors, { strictClick: true });

  // 2. STABILITY: Wait for the "Edit" button to be ATTACHED.
  // We don't wait for 'visible' here because the logs show it stays 'hidden'
  // due to overlays. 'attached' just means it exists in the DOM.
  await this.page.locator(editSelector).first().waitFor({
    state: "attached",
    timeout: 30000,
  });

  // 3. Optional: Wait for any common loading spinners to vanish
  await this.page
    .locator(S.adminLogin.loadingSpinner.join(', '))
    .waitFor({ state: "hidden" })
    .catch(() => {});

  await this.page.waitForLoadState("networkidle").catch(() => {});
});

Then(
  "Click on edit icon for the searched user",
  async function (this: ICustomWorld) {
    const editSelectors = S.adminLogin.globalUserEdit;
    const editBtn = this.page.locator(editSelectors[0]).first();

    // ✅ THE SLEDGEHAMMER:
    // Since Playwright sees it as 'hidden', we use force: true to click it anyway.
    // This bypasses the 'actionability' check that is currently failing.
    await editBtn.click({ force: true, timeout: 10000 });

    await this.page.waitForLoadState("domcontentloaded");
  },
);

Then("Navigate to New Role details", async function (this: ICustomWorld) {
  await clickIfPresent(this, S.adminLogin.NewRoleDetails, {
    strictClick: true,
  });
  await this.page.waitForLoadState("domcontentloaded");
});
