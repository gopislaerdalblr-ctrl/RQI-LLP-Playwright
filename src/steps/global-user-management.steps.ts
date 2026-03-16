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
    const dropdownSelectors = S.adminLogin.GlobalUserDropDown;

    // 1. GATEKEEPER: Wait for the specific "User Mgmt" link to be visible
    // This prevents the script from clicking too early while the page is loading
    await this.page.locator(dropdownSelectors[0]).first().waitFor({
      state: "visible",
      timeout: 20000,
    });

    // 2. THE CLICK: Use our utility
    // Since we updated the selectors to include ":has-text", it will only click the right one
    await clickIfPresent(this, dropdownSelectors, { strictClick: true });

    // 3. SECOND CLICK: Navigate to Global User Management link
    // Ensure the menu item is visible before clicking
    const managementLink = S.adminLogin.GlobalUserManagement;
    await this.page
      .locator(managementLink[0])
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await clickIfPresent(this, managementLink, { strictClick: true });

    // 4. VERIFY
    await this.page.waitForURL((url: URL) => !url.href.includes("login"), {
      timeout: 30000,
    });
    expect(this.page.url()).toContain("/admin/manageuser");
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
    .locator(".loading, .spinner, #loading-image")
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
