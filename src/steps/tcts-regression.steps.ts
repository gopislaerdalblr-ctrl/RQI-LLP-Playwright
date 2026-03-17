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
  "Admin search org by TC org id {string}",
  async function (this: ICustomWorld, orgIdFromStep: string) {
    const key = (orgIdFromStep || "").trim();
    const isOrgKey =
      /^orgid(\d+)?$/i.test(key) || key.toUpperCase() === "ORGID";

    let orgId: string;
    if (!key || key.toUpperCase() === "ORGID") {
      orgId = this.instance?.orgId || "";
    } else if (isOrgKey) {
      const v =
        (this.instance as any)?.[key] ??
        (this.instance as any)?.[key.toLowerCase()] ??
        "";
      orgId = String(v || "").trim();
    } else {
      orgId = key;
    }

    if (!orgId) throw new Error(`OrgId lookup failed for: "${key}"`);

    // Smart Fill and Search
    await fillIfPresent(this, S.adminLogin.orgListing.searchInput, orgId, {
      strict: true,
    });
    await clickIfPresent(this, S.adminLogin.orgListing.searchButton, {
      strictClick: true,
    });

    // Verify search results appeared
    await expect(this.page.locator(`text=${orgId}`).first()).toBeVisible({
      timeout: 15000,
    });
  },
);

Then(
  "Admin validate the searched TC org in the listing page",
  async function (this: ICustomWorld) {
    const resultRowSelectors = S.adminLogin.orgListingActions.OrgListingRow;

    const firstResultRow = this.page.locator(resultRowSelectors[0]).first();

    await firstResultRow.waitFor({ state: "visible", timeout: 20000 });

    await expect(firstResultRow).toBeVisible();

    await this.attach(
      "Validation Passed: Organization is listed in the results.",
      "text/plain",
    );
  },
);

Then("Admin clear the search field", async function (this: ICustomWorld) {
  const clearSelectors = S.adminLogin.orgListingActions.ClearSearchButton;

  const clearBtn = this.page.locator(clearSelectors[0]).first();
  await clearBtn.waitFor({ state: "visible", timeout: 15000 });

  await clickIfPresent(this, clearSelectors, { strictClick: true });

  await this.page.waitForLoadState("networkidle").catch(() => {});

  await this.page.waitForTimeout(500);
});

Then(
  "Admin search org by TS org id {string}",
  async function (this: ICustomWorld, orgIdFromStep: string) {
    const key = (orgIdFromStep || "").trim();
    const isOrgKey =
      /^orgid(\d+)?$/i.test(key) || key.toUpperCase() === "ORGID";

    let orgId: string;
    if (!key || key.toUpperCase() === "ORGID") {
      orgId = this.instance?.orgId || "";
    } else if (isOrgKey) {
      const v =
        (this.instance as any)?.[key] ??
        (this.instance as any)?.[key.toLowerCase()] ??
        "";
      orgId = String(v || "").trim();
    } else {
      orgId = key;
    }

    if (!orgId) throw new Error(`OrgId lookup failed for: "${key}"`);

    // Smart Fill and Search
    await fillIfPresent(this, S.adminLogin.orgListing.searchInput, orgId, {
      strict: true,
    });
    await clickIfPresent(this, S.adminLogin.orgListing.searchButton, {
      strictClick: true,
    });

    // Verify search results appeared
    await expect(this.page.locator(`text=${orgId}`).first()).toBeVisible({
      timeout: 15000,
    });
  },
);

Then(
  "Admin validate the searched TS org in the listing page",
  async function (this: ICustomWorld) {
    const resultRowSelectors = S.adminLogin.orgListingActions.OrgListingRow;

    const firstResultRow = this.page.locator(resultRowSelectors[0]).first();

    await firstResultRow.waitFor({ state: "visible", timeout: 20000 });

    await expect(firstResultRow).toBeVisible();

    await this.attach(
      "Validation Passed: Organization is listed in the results.",
      "text/plain",
    );
  },
);
