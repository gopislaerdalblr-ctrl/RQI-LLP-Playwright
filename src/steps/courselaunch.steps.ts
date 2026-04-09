import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld, getZimbraCredentials, getZimbraUrl } from "../support/hooks";
import { clickIfPresent, fillIfPresent, tryGetFlashText } from "../utils/ui-actions";
import { readCourseConfig } from "../config/course-config";
import * as fs from "fs";
import * as path from "path";


Then('Navigate to Assignments page',async function (this: ICustomWorld) {
           
            const clicked = await clickIfPresent(this, S.adminLogin.Assignments);

  if (!clicked) {
    throw new Error(" Failed to find or click the Assignments link.");
  }
  await this.page.waitForLoadState("domcontentloaded").catch(() => {});
  await this.attach(`Mapsd back to: ${this.page.url()}`, "text/plain");

 });



Then(
  "I create a manual assignment with a specific due date for course {string}",
  async function (this: ICustomWorld, courseKey: string) {
    const courseCfg = readCourseConfig() as any;

    const suffix = courseKey.match(/\d+$/)?.[0] || "";
    const nameKey = `courseName${suffix}`;
    const resolvedCourseName = (courseCfg[nameKey] || courseCfg["courseName"] || "").trim();
    this.assignedCourseName = resolvedCourseName;

    if (!resolvedCourseName) {
      throw new Error(`Could not resolve a course name for key: ${courseKey}`);
    }

    const uniqueTitle = `${resolvedCourseName}_${Date.now()}`;
    this.assignmentTitle = uniqueTitle;

    await this.page.waitForLoadState("domcontentloaded");

    await clickIfPresent(this, S.adminLogin.CreateAssignment);
    await this.page.waitForTimeout(1000);

    await clickIfPresent(this, S.adminLogin.ManualSelection);
    await this.page.waitForTimeout(500);

    let dropdownOpened = false;
    for (const sel of S.adminLogin.CourseCurriculumDropdown) {
      try {
        const el = this.page.locator(sel).first();
        await el.waitFor({ state: "visible", timeout: 8000 });
        await el.click();
        dropdownOpened = true;
        break;
      } catch {}
    }
    if (!dropdownOpened) throw new Error("[FATAL] CourseCurriculumDropdown not found");
    await this.page.waitForTimeout(1000);

    let searchFilled = false;
    for (const sel of S.adminLogin.CourseSearchInput) {
      try {
        const el = this.page.locator(sel).first();
        await el.waitFor({ state: "visible", timeout: 8000 });
        await el.click({ clickCount: 3 });
        await el.pressSequentially(resolvedCourseName, { delay: 80 });
        searchFilled = true;
        break;
      } catch {}
    }
    if (!searchFilled) throw new Error("[FATAL] CourseSearchInput not found");
    await this.page.waitForTimeout(1500);

    await this.page.keyboard.press("ArrowDown");
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(800);
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.waitForTimeout(500);

    await fillIfPresent(this, S.adminLogin.AssignmentTitleInput, uniqueTitle);
    await this.page.waitForTimeout(500);

    const dueDateRadioLabel = this.page.locator('label').filter({ hasText: 'Specific Date' }).nth(1);
    await dueDateRadioLabel.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await dueDateRadioLabel.click({ force: true }); 
    await this.page.waitForTimeout(1000); 

    let dateInputOpened = false;
    for (const sel of S.adminLogin.AssignmentDueDateInput) {
      try {
        const dateInput = this.page.locator(sel).first();
        await dateInput.evaluate((el: HTMLElement) => el.click());
        dateInputOpened = true;
        break;
      } catch {}
    }
    
    if (!dateInputOpened) throw new Error("[FATAL] AssignmentDueDateInput not found.");
    await this.page.waitForTimeout(1000); 

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate().toString();

    let dayClicked = false;
    for (const sel of S.adminLogin.CalendarActiveDays) {
      try {
        const dayToClick = this.page.locator(sel).getByText(tomorrowDay, { exact: true }).first();
        await dayToClick.waitFor({ state: "visible", timeout: 2000 });
        await dayToClick.click({ force: true });
        dayClicked = true;
        break;
      } catch {}
    }

    if (!dayClicked) throw new Error(`[FATAL] Could not find or click day ${tomorrowDay}.`);
    await this.page.waitForTimeout(500);

    for (const sel of S.adminLogin.NoRecurrenceRadioLabel) {
      try {
        const noRecurrenceLabel = this.page.locator(sel).first();
        if (await noRecurrenceLabel.isVisible().catch(() => false)) {
          await noRecurrenceLabel.click({ force: true }).catch(() => {});
          await this.page.waitForTimeout(500);
          break;
        }
      } catch {}
    }

    const nextClicked = await clickIfPresent(this, S.adminLogin.AssignmentNextButton);
    if (!nextClicked) throw new Error("[FATAL] Failed to click Assignment Next button.");
    await this.page.waitForTimeout(2000);

  

    const addLearnerClicked = await clickIfPresent(this, S.adminLogin.AddLearnerButton);
    if (!addLearnerClicked) throw new Error("[FATAL] Could not click Add Learner button.");
    await this.page.waitForTimeout(1500);

    const searchTarget = this.importedUserEmail; 
    if (!searchTarget) {
      throw new Error("[FATAL] No imported user email found in context.");
    }
    
    await fillIfPresent(this, S.adminLogin.AssignmentSearchUser, searchTarget);
    await this.page.waitForTimeout(2000); 

    const searchResult = this.page.locator(`text=${searchTarget}`).last();
    await searchResult.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await searchResult.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(1000);

    await this.page.locator('button:has-text("Add")').last().click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2000);

    const createFinalClicked = await clickIfPresent(this, S.adminLogin.CreateAssignmentButton);
    if (!createFinalClicked) throw new Error("[FATAL] Failed to click the final Create Assignment button.");

    await this.attach(`Successfully created manual Assignment: ${uniqueTitle} for user: ${searchTarget}`, "text/plain");
  }
);

Then(
  "I verify the assignment was created successfully with {int} learner added",
  async function (this: ICustomWorld, expectedLearnerCount: number) {
    if (!this.assignmentTitle) {
        throw new Error("No assignment title found in context. Did the creation step run?");
    }

    await this.page.waitForLoadState("domcontentloaded");

    const flashText = await tryGetFlashText(this.page);
    if (!flashText.toLowerCase().includes("successfully")) {
        const banner = this.page.locator('text="Assignment was created successfully."');
        await expect(banner).toBeVisible({ timeout: 15000 });
    }
    await this.attach(`Success message verified.`, "text/plain");

    await fillIfPresent(this, S.adminLogin.SearchaAsignmentTitleInput, this.assignmentTitle);
    await clickIfPresent(this, S.adminLogin.AssignmentSearchButton);
    
    await this.page.waitForLoadState("networkidle").catch(()=>{});
    await this.page.waitForTimeout(1500); 

    const assignmentRow = this.page.locator(`table.dataTable tbody tr`, { hasText: this.assignmentTitle }).first();
    await expect(assignmentRow).toBeVisible({ timeout: 10000 });

    const tdCount = await assignmentRow.locator('td').count();
    let foundCount = -1;
    
    if (tdCount >= 6) {
        const learnerColText = await assignmentRow.locator('td').nth(5).innerText();
        foundCount = parseInt(learnerColText.trim(), 10);
    } else {
        const rowText = await assignmentRow.innerText();
        throw new Error(`Table layout unexpected. Found ${tdCount} columns. Row Text: ${rowText}`);
    }

    if (foundCount !== expectedLearnerCount) {
        throw new Error(`Learner count mismatch! Expected ${expectedLearnerCount}, but found ${foundCount}.`);
    }

    await this.attach(`Verified in table. Title: ${this.assignmentTitle} | Learners: ${foundCount}`, "text/plain");
  }
);

Then(
  "I retrieve the password reset link from Zimbra for the newly created user",
  async function (this: ICustomWorld) {
    if (!this.importedUserEmail) {
      throw new Error("[FATAL] No importedUserEmail found in context. Run the import step first.");
    }

    const zimbraCreds = getZimbraCredentials();
    const zimbraUrl = getZimbraUrl();

    await this.page.goto(zimbraUrl, { waitUntil: "networkidle" });
    await this.page.waitForTimeout(2000);

    const userLoc = this.page.locator(S.zimbra.usernameInput.join(', ')).first();
    await userLoc.waitFor({ state: "visible", timeout: 15000 });
    await userLoc.fill(zimbraCreds.username);

    const passLoc = this.page.locator(S.zimbra.passwordInput.join(', ')).first();
    await passLoc.fill(zimbraCreds.password);

    const btnLoc = this.page.locator(S.zimbra.loginBtn.join(', ')).first();
    await btnLoc.click();
    
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(4000); 

    const searchQuery = this.importedUserEmail;
    
    const searchInput = this.page.locator(S.zimbra.searchInputStandard.join(', ')).first();
    await searchInput.waitFor({ state: "visible", timeout: 15000 }); 
    await searchInput.fill(searchQuery);
    await this.page.waitForTimeout(500);
    
    const searchBtn = this.page.locator(S.zimbra.searchBtnStandard.join(', ')).first();
    await searchBtn.click();
    
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(3000); 

    const emailLink = this.page.locator(S.zimbra.emailLinkStandard.join(', ')).first();
    await expect(emailLink, "Could not find the 'Account created' email link in results").toBeVisible({ timeout: 15000 });
    await emailLink.click();
    
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(3000);

    let resetUrl: string | null = null;
    
    const directLinkLocator = this.page.locator(S.zimbra.resetLinkUrl.join(', ')).first();
    if (await directLinkLocator.isVisible().catch(() => false)) {
        resetUrl = await directLinkLocator.getAttribute('href');
    }

    if (!resetUrl) {
      const frames = this.page.frames();
      for (const frame of frames) {
        const linkLocator = frame.locator(S.zimbra.resetLinkUrl.join(', ')).first();
        if (await linkLocator.isVisible().catch(() => false)) {
          resetUrl = await linkLocator.getAttribute('href');
          break;
        }
      }
    }

    if (!resetUrl) {
      throw new Error("[FATAL] Could not find the password reset link inside the email body.");
    }

    this.extractedResetUrl = resetUrl;
    
    await this.attach(`Successfully extracted Reset URL from Zimbra: ${resetUrl}`, "text/plain");
    console.log(`\n[DEBUG] Extracted Reset URL: ${resetUrl}\n`);
  }
);

Then(
  "I reset the user password, login, and save the user details",
  async function (this: ICustomWorld) {
    if (!this.extractedResetUrl) {
      throw new Error("[FATAL] No reset URL found in context.");
    }
    if (!this.importedUserEmail) {
      throw new Error("[FATAL] No importedUserEmail found in context.");
    }

    const newPassword = "Welcome@123!";


    await this.page.goto(this.extractedResetUrl, { waitUntil: "networkidle" });
    await this.page.waitForTimeout(2000);

    await fillIfPresent(this, S.resetPassword.newPasswordInput, newPassword);
    await fillIfPresent(this, S.resetPassword.confirmPasswordInput, newPassword);
    
    const submitClicked = await clickIfPresent(this, S.resetPassword.submitBtn);
    if (!submitClicked) throw new Error("[FATAL] Could not click Create Password submit button.");
    await this.page.waitForTimeout(4000); 

    const returnClicked = await clickIfPresent(this, S.resetPassword.returnToLoginLink);
    if (!returnClicked) throw new Error("[FATAL] Could not click Return to Login / Next.");

    
    await this.page.waitForTimeout(2000); 

  
    const homepageLoginBtn = this.page.locator(S.studentLogin.loginBtnHomepage.join(', ')).first();
    await homepageLoginBtn.waitFor({ state: "visible", timeout: 15000 });
    await homepageLoginBtn.click();

  
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(4000); 

    const emailLoc = this.page.locator(S.studentLogin.emailInput.join(', ')).first();
    await emailLoc.waitFor({ state: "visible", timeout: 15000 });
    await emailLoc.fill(this.importedUserEmail);

    const passLoc = this.page.locator(S.studentLogin.passwordInput.join(', ')).first();
    await passLoc.fill(newPassword);

    const finalLoginBtn = this.page.locator(S.studentLogin.submitLoginBtn.join(', ')).first();
    await finalLoginBtn.click();
    
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(10000); 

    
    const currentUrl = this.page.url();
    let exactInstance = this.instance?.env || "UNKNOWN_INSTANCE"; 
    const envMatch = currentUrl.match(/(?:qa|uat|dev)-([^.]+)\./i);
    if (envMatch && envMatch[1]) {
        exactInstance = envMatch[1]; 
    }

    
    const dataDir = path.join(process.cwd(), "src", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const usersFilePath = path.join(dataDir, "users.json");
    let usersList: any[] = [];

    
    if (fs.existsSync(usersFilePath)) {
        try {
            const fileContent = fs.readFileSync(usersFilePath, "utf-8").replace(/^\uFEFF/, "").trim();
            if (fileContent) {
                usersList = JSON.parse(fileContent);
            }
        } catch (e) {
            console.log("[WARNING] Could not parse existing users.json, starting fresh.");
        }
    }

    const newUserRecord = {
        "orgid": this.instance?.orgId || "UNKNOWN_ORG",
        "User email": this.importedUserEmail,
        "User first name": this.importedUserFirstName || "UNKNOWN_FIRST",
        "User last name": this.importedUserLastName || "UNKNOWN_LAST",
        "Course Assigned to user": this.assignedCourseName || "UNKNOWN_COURSE",
        "Instance": exactInstance 
    };

    usersList.push(newUserRecord);
    fs.writeFileSync(usersFilePath, JSON.stringify(usersList, null, 4), "utf-8");

    await this.attach(`Successfully logged in and saved user data to users.json:\n${JSON.stringify(newUserRecord, null, 2)}`, "text/plain");
    
    
    console.log(`\n[✅ SUCCESS] User details saved to EXACT path: ${usersFilePath}\n`);
  }
);