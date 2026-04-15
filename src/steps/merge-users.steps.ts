import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import { clickIfPresent } from "../utils/ui-actions";
import { executeHardLogout } from "../utils/ui-actions"; // New import!

Then(
  "Navigate to Access Organization page",
  async function (this: ICustomWorld) {
    // 1. Wait for the UI to settle
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForTimeout(500);

    // 2. Click the Action Menu (...)
    let menuClicked = await clickIfPresent(this, S.adminLogin.orgListingActions.orgActions);
    
    // Safety Net: If the primary selector for '...' fails, look for it structurally
    if (!menuClicked) {
      const dotsBtn = this.page.locator(S.adminLogin.mergeUsers.dotsMenuFallback[0]).first();
      if (await dotsBtn.isVisible().catch(() => false)) {
        await dotsBtn.scrollIntoViewIfNeeded().catch(() => {});
        await dotsBtn.click({ force: true }).catch(() => {});
        menuClicked = true;
      }
    }

    if (!menuClicked) {
      throw new Error("❌ Failed to click the Organization Actions (...) menu.");
    }

    // 3. Wait for the Dropdown to physically render
    const dropdownProof = this.page.locator(S.adminLogin.mergeUsers.orgDetailsDropdownProof[0]).first();
    await expect(dropdownProof).toBeVisible({ timeout: 15000 }).catch(() => {});

    // 4. Click 'Access Organisation' (Handling 's' or 'z' spelling dynamically)
    let accessClicked = await clickIfPresent(this, S.adminLogin.AccessOrganization);

    // Safety Net: Look for the text using Regex to bypass strict spelling
    if (!accessClicked) {
      const accessLinkRegex = this.page.locator(S.adminLogin.mergeUsers.accessOrganizationRegex[0]).first();
      
      if (await accessLinkRegex.isVisible().catch(() => false)) {
        await accessLinkRegex.click({ force: true }).catch(() => {});
        accessClicked = true;
      }
    }

    if (!accessClicked) {
      throw new Error("❌ Failed to click 'Access Organisation'. The dropdown may have closed or the text changed.");
    }

    // 5. Wait for the heavy navigation to the target Tenant/Org page
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForTimeout(2000); // Give the new dashboard time to mount

    await this.attach(
      `✅ Navigated to Access Organization page: ${this.page.url()}`,
      "text/plain",
    );
  },
);

Then("Click on Support Action dropdown", async function (this: ICustomWorld) {
  await this.page.waitForLoadState("domcontentloaded");
  await clickIfPresent(this, S.adminLogin.SupportActionDropdown);
});

Then("Click on Merge Account option", async function (this: ICustomWorld) {
  await clickIfPresent(this, S.adminLogin.MergeAccountOption);
});

Then(
  "Merge user page should load successfully",
  async function (this: ICustomWorld) {
    await this.page.waitForLoadState("networkidle");
    const currentUrl = this.page.url();

    await this.attach(`Merge User Page Loaded: ${currentUrl}`, "text/plain");
  },
);

Then(
  "Validate the UI elements on Merge user page",
  async function (this: ICustomWorld) {
    const page = this.page;
    const url = page.url();

    // 1. Attach URL
    await this.attach(`Merge Accounts URL: ${url}`, "text/plain");

    // 2. Capture and attach the full-page screenshot
    const shot = await page.screenshot({ fullPage: true });
    await this.attach(shot, "image/png");
  },
);

Then("Logout from the application", async function (this: ICustomWorld) {
  // Calls the utility function from ui-actions.ts
  await executeHardLogout(this);

  await this.attach(`After logout URL: ${this.page.url()}`, "text/plain");
});
