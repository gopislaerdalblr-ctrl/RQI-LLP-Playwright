import { Given, Then, When } from "@cucumber/cucumber";
import { World } from "../support/world";
import { S } from "../ui/selectors";
import * as fs from "fs";
import * as path from "path";

// ... (Keep your existing helper functions like getMoodleSecrets and saveExecutionUser) ...
const getMoodleSecrets = () => {
  const secretPath = path.resolve(
    process.cwd(),
    "src/data/secrets/moodle.json",
  );
  if (!fs.existsSync(secretPath)) {
    throw new Error(`Moodle secrets file not found at: ${secretPath}`);
  }
  return JSON.parse(fs.readFileSync(secretPath, "utf-8"));
};

const saveExecutionUser = (userData: any) => {
  // ... (Keep your existing saveExecutionUser logic) ...
  const filePath = path.resolve(
    process.cwd(),
    "src/config/executionUsers.json",
  );
  let registry: any[] = [];
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath)) {
    try {
      registry = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      registry = [];
    }
  }
  const newUserEntry = {
    executionTimestamp: new Date().toLocaleString(),
    ...userData,
  };
  registry.push(newUserEntry);
  if (registry.length > 50) registry.shift();
  fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), "utf-8");
  return newUserEntry;
};

// --- STEP DEFINITIONS ---

Given("Launch the moodle application", async function (this: World) {
  // We expect this.instance.moodleUrl to be populated by the HOOK injection
  if (!this.instance.moodleUrl) {
    throw new Error(
      "Moodle URL not found! Ensure 'moodle' block exists in instances.json",
    );
  }

  this.moodlePage = await this.context.newPage();
  await this.moodlePage.goto(this.instance.moodleUrl, {
    waitUntil: "domcontentloaded",
  });
});

Then("Login with moodle admin credentials", async function (this: World) {
  const page = this.moodlePage;
  const secrets = getMoodleSecrets();

  // 1. SMART CHECK: If already on dashboard, skip login
  if (page.url().includes("/my/") || page.url().includes("dashboard")) {
    console.log("Already on Moodle Dashboard. Skipping Login.");
    return;
  }

  const userLoc = page.locator(S.moodle.username.join(","));
  await userLoc.first().waitFor({ state: "visible", timeout: 60000 });
  await userLoc.first().fill(secrets.adminEmail);

  const pwdLoc = page.locator(S.moodle.password.join(","));
  await pwdLoc.first().fill(secrets.adminPassword);

  const submitLoc = page.locator(S.moodle.loginBtn.join(","));
  await submitLoc.first().click();

  // 2. WAIT: Allow "my" (dashboard) OR "login" (if it redirects back)
  await page.waitForLoadState("domcontentloaded");
  // We simply wait for the URL to change away from the login page
  await page.waitForURL(/^(?!.*login\/index\.php).*$/, { timeout: 45000 });
});

// ... (Keep the rest of your steps: Create User, Verify in Maurya, etc.) ...
Then(
  "I create a Moodle user on the fly and assign to course {string}",
  async function (this: World, courseName: string) {
    const page = this.moodlePage;
    const ts = Date.now();

    const userDetails = {
      courseName: courseName,
      UserId: `user_${ts}`,
      UserFirstName: `AutoFN_${ts}`,
      UserLastName: `AutoLN_${ts}`,
      UserEmailId: `auto_${ts}@laerdalblr.in`,
      Password: "Password@1234",
    };

    // 1. Navigate to Moodle User Creation
    await page.goto(`${this.instance.moodleUrl}/user/editadvanced.php?id=-1`);

    // 2. Fill User Form
    await page.locator(S.moodleUserForm.username[0]).fill(userDetails.UserId);
    const pwdClick = page.locator("em >> text=Click to enter text");
    if (await pwdClick.isVisible()) await pwdClick.click();

    await page
      .locator(S.moodleUserForm.passwordInput[0])
      .fill(userDetails.Password);
    await page
      .locator(S.moodleUserForm.firstname[0])
      .fill(userDetails.UserFirstName);
    await page
      .locator(S.moodleUserForm.lastname[0])
      .fill(userDetails.UserLastName);
    await page.locator(S.moodleUserForm.email[0]).fill(userDetails.UserEmailId);

    // 3. Click Create
    await page.locator(S.moodleUserForm.createBtn[0]).click();

    // 4. Record user
    saveExecutionUser(userDetails);
    this.lastCreatedMoodleUser = userDetails;

    // 5. Enroll
    await page.goto(
      `${this.instance.moodleUrl}/course/search.php?search=${courseName}`,
    );
    await page.locator(`text=${courseName}`).first().click();

    const courseId = page.url().split("id=")[1];
    await page.goto(
      `${this.instance.moodleUrl}/enrol/users.php?id=${courseId}`,
    );

    await page.locator('input[value="Enrol users"]').click();
    await page
      .locator('.modal-body input[type="text"]')
      .fill(userDetails.UserEmailId);
    await page
      .locator(`.results li:has-text("${userDetails.UserEmailId}")`)
      .click();
    await page.locator(".modal-footer button.btn-primary").click();
  },
);

Then(
  "I verify the on-the-fly user appears in Maurya student management",
  async function (this: World) {
    await this.page.bringToFront();
    const userToSearch = this.lastCreatedMoodleUser.UserId;

    // Ensure we are on the Manage Students page (Tab 1)
    await this.page.goto(`${this.instance.baseUrl}/manage_student`);

    // Search
    await this.page
      .locator(S.adminLogin.manageStudents.searchUserInput[0])
      .fill(userToSearch);
    await this.page.locator(S.adminLogin.manageStudents.searchBtn[0]).click();

    await this.page.waitForLoadState("networkidle");

    const isVisible = await this.page
      .locator(`tr:has-text("${userToSearch}")`)
      .isVisible();
    if (!isVisible) {
      throw new Error(
        `User ${userToSearch} created in Moodle was not found in Maurya!`,
      );
    }
  },
);

Then(
  "I perform a bulk status check on the last {int} created users in Maurya",
  async function (this: World, count: number) {
    const filePath = path.resolve(
      process.cwd(),
      "src/config/executionUsers.json",
    );
    if (!fs.existsSync(filePath)) return;

    const registry = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const usersToCheck = registry.reverse().slice(0, count);

    await this.page.bringToFront();
    await this.page.goto(`${this.instance.baseUrl}/manage_student`);

    for (const user of usersToCheck) {
      const userId = user.UserId;
      await this.page
        .locator(S.adminLogin.manageStudents.searchUserInput[0])
        .fill(userId);
      await this.page.locator(S.adminLogin.manageStudents.searchBtn[0]).click();
      await this.page.waitForLoadState("networkidle");

      if ((await this.page.locator(`tr:has-text("${userId}")`).count()) === 0) {
        throw new Error(`❌ Bulk Check: User ${userId} NOT found in Maurya!`);
      }
      await this.page
        .locator(S.adminLogin.manageStudents.searchUserInput[0])
        .fill("");
    }
  },
);
