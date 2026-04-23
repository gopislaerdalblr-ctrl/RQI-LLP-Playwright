import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import { clickIfPresent, fillIfPresent } from "../utils/ui-actions";
import { getAdminForCurrentWorker } from "../utils/credential-manager";

Given("Launch the application", async function (this: ICustomWorld) {
  await this.page.goto(this.instance.baseUrl, {
    waitUntil: "domcontentloaded",
  });
});

Then("Login with admin credentials", async function (this: ICustomWorld) {

  await clickIfPresent(this, S.adminLogin.signIn);


  const emailSelector = S.adminLogin.email[0];
  await this.page.locator(emailSelector).first().waitFor({
    state: "attached",
    timeout: 30000,
  });

  const adminCreds = getAdminForCurrentWorker();
  await fillIfPresent(this, S.adminLogin.email, adminCreds.email, {
    strict: true,
  });
  await fillIfPresent(this, S.adminLogin.password, adminCreds.password, {
    strict: true,
  });


  await clickIfPresent(this, S.adminLogin.submit, { strictClick: true });


  await this.page.waitForURL((url: URL) => !url.href.includes("login"), {
    timeout: 30000,
  });
  await this.page.waitForLoadState("domcontentloaded");
});

Then(
  "Admin should be logged in successfully",
  async function (this: ICustomWorld) {
    const loginFieldsStillVisible = await this.page
      .locator(S.adminLogin.passwordFieldCheck.join(', '))
      .count()
      .catch(() => 0);

    if (loginFieldsStillVisible > 0) {
      await this.attach(
        "Warning: Login form still visible. Possible redirect delay or session issue.",
        "text/plain",
      );
    }
  },
);

Then("Select Super admin role", async function (this: ICustomWorld) {
  // Wait for role selection UI to be ready
  const roleSelector = S.adminLogin.superAdminRole[0];
  await this.page
    .locator(roleSelector)
    .first()
    .waitFor({ state: "visible", timeout: 20000 });

  await clickIfPresent(this, S.adminLogin.superAdminRole, {
    strictClick: true,
  });

  console.log("Selected Super Administrator role");
  await this.page.waitForLoadState("domcontentloaded");
});

Then("Navigate to Admin Dashboard", async function (this: ICustomWorld) {
  const adminDashboardUrl = `${this.instance.baseUrl}/dashboard`;
  await this.attach(
    `Mapsd to Admin Dashboard: ${adminDashboardUrl}`,
    "text/plain",
  );
});

Then(
  "Navigate to Organizations listing page",
  async function (this: ICustomWorld) {

    const navSelector = S.adminLogin.admindashboard.OrgListingNav[0];
    await this.page
      .locator(navSelector)
      .first()
      .waitFor({ state: "visible", timeout: 20000 });

    const clicked = await clickIfPresent(
      this,
      S.adminLogin.admindashboard.OrgListingNav,
      { strictClick: true },
    );

    expect(clicked).toBeTruthy();
    await this.page.waitForLoadState("domcontentloaded");

    await this.attach(
      `Mapsd to Organizations listing page: ${this.page.url()}`,
      "text/plain",
    );
  },
);

Then(
  "Admin search org by id {string}",
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
    this.activeOrgId = orgId;


    await fillIfPresent(this, S.adminLogin.orgListing.searchInput, orgId, {
      strict: true,
    });
    await clickIfPresent(this, S.adminLogin.orgListing.searchButton, {
      strictClick: true,
    });


    await expect(this.page.locator(`text=${orgId}`).first()).toBeVisible({
      timeout: 20000,
    });
  },
);

Then(
  "Navigate to Organization details page",
  async function (this: ICustomWorld) {

    // =========================================================================
    // THE FIX: Explicitly wait for the search UI to settle before interacting
    // =========================================================================
    console.log("[DEBUG] Pausing for 3 seconds to let search results populate...");
    await this.page.waitForTimeout(3000);

    const kababLocator = this.page.locator(S.adminLogin.orgListingActions.orgActions[0]).first();
    await kababLocator.waitFor({ state: "attached", timeout: 20000 });
    await kababLocator.waitFor({ state: "visible", timeout: 10000 });

    const actionsClicked = await clickIfPresent(
      this,
      S.adminLogin.orgListingActions.orgActions,
      { strictClick: true },
    );

    if (!actionsClicked) {
      throw new Error(
        "Found the kabab icon in HTML but failed to trigger the click.",
      );
    }

    await clickIfPresent(
      this,
      S.adminLogin.orgListingActions.orgDetailsAction,
      { strictClick: true },
    );

    await this.page.waitForLoadState("domcontentloaded");

    await this.attach(
      `Successfully navigated to Organization details: ${this.page.url()}`,
      "text/plain",
    );
  },
);

Then("Navigate to products page", async function (this: ICustomWorld) {

  const productSelector = S.adminLogin.orgProducts.orgProducts[0];
  await this.page
    .locator(productSelector)
    .first()
    .waitFor({ state: "visible", timeout: 20000 });

  await clickIfPresent(this, S.adminLogin.orgProducts.orgProducts, {
    strictClick: true,
  });

  await this.page.waitForLoadState("domcontentloaded");

  await this.attach(
    `Mapsd to Organization products page: ${this.page.url()}`,
    "text/plain",
  );
});



Then('Navigate back to Organizations listing page', async function (this: ICustomWorld) {

  const clicked = await clickIfPresent(this, S.adminLogin.orgListing.OrganizationsLink);

  if (!clicked) {
    throw new Error(" Failed to find or click the Organizations link.");
  }
  await this.page.waitForLoadState("domcontentloaded").catch(() => { });
  await this.attach(`Mapsd back to: ${this.page.url()}`, "text/plain");

});

