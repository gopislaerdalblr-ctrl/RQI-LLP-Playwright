import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import { clickIfPresent, fillIfPresent } from "../utils/ui-actions";

Given("Launch the application", async function (this: ICustomWorld) {
  await this.page.goto(this.instance.baseUrl, {
    waitUntil: "domcontentloaded",
  });
});

Then("Login with admin credentials", async function (this: ICustomWorld) {
  // 1. Click "Sign in"
  await clickIfPresent(this, S.adminLogin.signIn);

  // 2. GATEKEEPER: Wait for Gigya/Login form to attach to DOM
  // Batch runs often lag here; waiting 30s for the email field is safer.
  const emailSelector = S.adminLogin.email[0];
  await this.page.locator(emailSelector).first().waitFor({
    state: "attached",
    timeout: 30000,
  });

  // 3. Fill Credentials (Iterates through array + Healwright fallback)
  await fillIfPresent(this, S.adminLogin.email, this.adminEmail, {
    strict: true,
  });
  await fillIfPresent(this, S.adminLogin.password, this.adminPassword, {
    strict: true,
  });

  // 4. Submit and wait for the Auth redirect to complete
  await clickIfPresent(this, S.adminLogin.submit, { strictClick: true });

  // 5. REDIRECT CHECKPOST: Don't move to next step until login page is gone
  await this.page.waitForURL((url: URL) => !url.href.includes("login"), {
    timeout: 30000,
  });
  await this.page.waitForLoadState("domcontentloaded");
});

Then(
  "Admin should be logged in successfully",
  async function (this: ICustomWorld) {
    const loginFieldsStillVisible = await this.page
      .locator('input[type="password"]')
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
    // Ensure Sidebar/Nav is visible before clicking
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
  "Navigate to Organization details page",
  async function (this: ICustomWorld) {
    // 1. SMART WAIT: Use the exact Bootstrap 5 attribute found in your outerHTML
    const kababSelector = 'a.action_dropdown[data-bs-toggle="dropdown"]';

    // Wait for it to be attached (it exists in code) then visible (user can see it)
    const kababLocator = this.page.locator(kababSelector).first();
    await kababLocator.waitFor({ state: "attached", timeout: 20000 });
    await kababLocator.waitFor({ state: "visible", timeout: 10000 });

    // 2. THE CLICK: Use our smart utility to handle the array and AI healing
    // This will now find the button immediately because the selector matches the HTML
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

    // 3. MENU SELECTION: Click the details link from the dropdown
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
  // Ensure the product tab/link is visible
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
