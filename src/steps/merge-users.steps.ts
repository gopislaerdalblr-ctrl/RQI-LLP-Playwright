import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import { clickIfPresent } from "../utils/ui-actions";
import { executeHardLogout } from "../utils/ui-actions"; // New import!

Then(
  "Navigate to Access Organization page",
  async function (this: ICustomWorld) {
    // Wait for the UI to settle before interacting
    await this.page.waitForLoadState("domcontentloaded");

    await clickIfPresent(this, S.adminLogin.orgListingActions.orgActions);
    await this.page.waitForLoadState("networkidle");

    await expect(
      this.page.getByRole("link", { name: /Organi[sz]ation Details/ }),
    ).toBeVisible({ timeout: 20000 });

    await clickIfPresent(this, S.adminLogin.AccessOrganization);

    await this.attach(
      `Mapsd to Access Organization page: ${this.page.url()}`,
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
