import { Given, Then } from "@cucumber/cucumber";
import { World } from "../support/world";
import { S } from "../pages/selectors";
import * as fs from "fs";
import * as path from "path";
import { MoodleUI } from "../pages/moodle.page";
import { saveCreatedUser } from "../utils/user-registry";

// --- STEP DEFINITIONS ---

Given("Launch the moodle application", async function (this: World) {
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
  // Use the new Page Object class!
  const moodle = new MoodleUI(this.moodlePage);
  await moodle.loginAsAdmin();
});

Then(
  "I create a Moodle user on the fly and assign to course {string}",
  async function (this: World, courseName: string) {
    const moodle = new MoodleUI(this.moodlePage);

    // The POM handles the UI clicking, and returns the generated data
    const userDetails = await moodle.createAndEnrollUser(
      courseName,
      this.instance.moodleUrl,
    );

    // Use your utility registry to save it centrally
    saveCreatedUser(userDetails);
    this.lastCreatedMoodleUser = userDetails;
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
