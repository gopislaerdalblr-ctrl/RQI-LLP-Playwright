import { S } from "./selectors";
import { BasePage } from "./BasePage";

export class MoodleUI extends BasePage {
  async loginAsAdmin() {
    const secrets = this.getMoodleSecrets();

    // SMART CHECK: If already on dashboard, skip login
    if (
      this.page.url().includes("/my/") ||
      this.page.url().includes("dashboard")
    ) {
      console.log("Already on Moodle Dashboard. Skipping Login.");
      return;
    }

    const userLoc = this.page.locator(S.moodle.username.join(","));
    await userLoc.first().waitFor({ state: "visible", timeout: 60000 });
    await userLoc.first().fill(secrets.adminEmail);

    const pwdLoc = this.page.locator(S.moodle.password.join(","));
    await pwdLoc.first().fill(secrets.adminPassword);

    const submitLoc = this.page.locator(S.moodle.loginBtn.join(","));
    await submitLoc.first().click();

    // WAIT: Allow "my" (dashboard) OR "login" (if it redirects back)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForURL(/^(?!.*login\/index\.php).*$/, {
      timeout: 45000,
    });
  }

  async createAndEnrollUser(courseName: string, moodleUrl: string) {
    const ts = Date.now();
    const userDetails = {
      courseName: courseName,
      UserId: `user_${ts}`,
      UserFirstName: `AutoFN_${ts}`,
      UserLastName: `AutoLN_${ts}`,
      UserEmailId: `auto_${ts}@laerdalblr.in`,
      Password: "Password@1234",
    };

    // Navigate to Moodle User Creation
    await this.page.goto(`${moodleUrl}/user/editadvanced.php?id=-1`);

    // Fill User Form
    await this.page
      .locator(S.moodleUserForm.username[0])
      .fill(userDetails.UserId);
    const pwdClick = this.page.locator("em >> text=Click to enter text");
    if (await pwdClick.isVisible()) await pwdClick.click();

    await this.page
      .locator(S.moodleUserForm.passwordInput[0])
      .fill(userDetails.Password);
    await this.page
      .locator(S.moodleUserForm.firstname[0])
      .fill(userDetails.UserFirstName);
    await this.page
      .locator(S.moodleUserForm.lastname[0])
      .fill(userDetails.UserLastName);
    await this.page
      .locator(S.moodleUserForm.email[0])
      .fill(userDetails.UserEmailId);

    // Click Create
    await this.page.locator(S.moodleUserForm.createBtn[0]).click();

    // Enroll
    await this.page.goto(`${moodleUrl}/course/search.php?search=${courseName}`);
    await this.page.locator(`text=${courseName}`).first().click();

    const courseId = this.page.url().split("id=")[1];
    await this.page.goto(`${moodleUrl}/enrol/users.php?id=${courseId}`);

    await this.page.locator('input[value="Enrol users"]').click();
    await this.page
      .locator('.modal-body input[type="text"]')
      .fill(userDetails.UserEmailId);
    await this.page
      .locator(`.results li:has-text("${userDetails.UserEmailId}")`)
      .click();
    await this.page.locator(".modal-footer button.btn-primary").click();

    // Return the generated details so the Step can save it to the registry
    return userDetails;
  }
}
