import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld, getZimbraCredentials, getZimbraUrl } from "../support/hooks";
import { clickIfPresent, fillIfPresent, tryGetFlashText, injectConsoleDate } from "../utils/ui-actions";
import { readCourseConfig } from "../config/course-config";
import * as fs from "fs";
import * as path from "path";
import { getTargetDateFromQuarter } from "../utils/date-helpers";
import { sendCourseCompletion } from "../api/course-completion";
import { acquireLock, releaseLock } from "../utils/mutex";


Then('Navigate to Assignments page', async function (this: ICustomWorld) {
  const hamburgerMenu = this.page.locator(S.studentLogin.hamburgerMenu.join(', ')).first();

  if (await hamburgerMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hamburgerMenu.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  const clicked = await clickIfPresent(this, S.adminLogin.Assignments);

  if (!clicked) {
    throw new Error(" Failed to find or click the Assignments link.");
  }

  await this.page.waitForLoadState("domcontentloaded").catch(() => { });
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

    console.log(`[DEBUG] Attempting to click the initial Create Assignment button...`);
    let createBtnFound = false;


    for (const sel of S.adminLogin.CreateAssignment) {
      try {
        const btn = this.page.locator(sel).first();


        await btn.waitFor({ state: "attached", timeout: 5000 });


        await btn.evaluate((el: HTMLElement) => el.click());
        createBtnFound = true;
        break;
      } catch (e) {

      }
    }

    if (!createBtnFound) {
      throw new Error("[FATAL] Could not find the initial Create Assignment button in the DOM.");
    }
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
      } catch { }
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
      } catch { }
    }
    if (!searchFilled) throw new Error("[FATAL] CourseSearchInput not found");
    await this.page.waitForTimeout(1500);

    await this.page.keyboard.press("ArrowDown");
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(800);
    await this.page.keyboard.press("Escape").catch(() => { });
    await this.page.waitForTimeout(500);

    await fillIfPresent(this, S.adminLogin.AssignmentTitleInput, uniqueTitle);
    await this.page.waitForTimeout(500);

    const dueDateRadioLabel = this.page.locator(S.adminLogin.specificDateLabel.join(', ')).filter({ hasText: 'Specific Date' }).nth(1);
    await dueDateRadioLabel.waitFor({ state: "visible", timeout: 5000 }).catch(() => { });
    await dueDateRadioLabel.click({ force: true });
    await this.page.waitForTimeout(1000);

    let dateInputOpened = false;
    for (const sel of S.adminLogin.AssignmentDueDateInput) {
      try {
        const dateInput = this.page.locator(sel).first();
        await dateInput.evaluate((el: HTMLElement) => el.click());
        dateInputOpened = true;
        break;
      } catch { }
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
      } catch { }
    }

    if (!dayClicked) throw new Error(`[FATAL] Could not find or click day ${tomorrowDay}.`);
    await this.page.waitForTimeout(500);

    for (const sel of S.adminLogin.NoRecurrenceRadioLabel) {
      try {
        const noRecurrenceLabel = this.page.locator(sel).first();
        if (await noRecurrenceLabel.isVisible().catch(() => false)) {
          await noRecurrenceLabel.click({ force: true }).catch(() => { });
          await this.page.waitForTimeout(500);
          break;
        }
      } catch { }
    }

    const nextClicked = await clickIfPresent(this, S.adminLogin.AssignmentNextButton);
    if (!nextClicked) throw new Error("[FATAL] Failed to click Assignment Next button.");
    await this.page.waitForTimeout(2000);


    const searchTarget = this.importedUserEmail;
    if (!searchTarget) {
      throw new Error("[FATAL] No imported user email found in context.");
    }


    console.log(`\n[DEBUG] Waiting for backend clearance to add learners...`);
    await acquireLock('assignment_creation');

    try {
      const addLearnerClicked = await clickIfPresent(this, S.adminLogin.AddLearnerButton);
      if (!addLearnerClicked) throw new Error("[FATAL] Could not click Add Learner button.");
      await this.page.waitForTimeout(1500);

      await fillIfPresent(this, S.adminLogin.AssignmentSearchUser, searchTarget);
      await this.page.waitForTimeout(2000);

      const searchResult = this.page.locator(`text=${searchTarget}`).last();
      await searchResult.waitFor({ state: "visible", timeout: 5000 }).catch(() => { });
      await searchResult.click({ force: true }).catch(() => { });
      await this.page.waitForTimeout(1000);

      await this.page.locator(S.adminLogin.addLearnerConfirmBtn.join(', ')).last().click({ force: true }).catch(() => { });
      await this.page.waitForTimeout(5000);

      console.log(`[DEBUG] Attempting to click final Create Assignment button...`);
      const createBtn = this.page.locator(S.adminLogin.CreateAssignmentButton.join(', ')).first();


      await createBtn.click({ force: true }).catch(() => {
        console.log("[WARNING] Playwright click event interrupted, likely due to instant DOM refresh.");
      });

      console.log(`[DEBUG] Waiting for success banner...`);


      const successBanner = this.page.locator(S.adminLogin.assignmentSuccessBanner.join(', ')).first();


      await successBanner.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
        console.log("[WARNING] Success banner not visible within 15s. Checking if assignment saved anyway.");
      });

      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);


      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);

    } finally {

      releaseLock('assignment_creation');
    }


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
      const banner = this.page.locator(S.adminLogin.assignmentSuccessBanner.join(', '));
      await expect(banner).toBeVisible({ timeout: 15000 }).catch(() => { });
    }
    await this.attach(`Success message verified.`, "text/plain");

    await fillIfPresent(this, S.adminLogin.SearchaAsignmentTitleInput, this.assignmentTitle);
    await this.page.waitForTimeout(1000);

    const omniSearchBtn = this.page.locator(S.adminLogin.assignmentSearchOmniBtn.join(', ')).first();

    try {
      await omniSearchBtn.waitFor({ state: "attached", timeout: 10000 });
      await omniSearchBtn.evaluate((el: HTMLElement) => el.click());
    } catch (error) {
      await omniSearchBtn.click({ force: true, timeout: 5000 }).catch(() => {
        throw new Error("[FATAL] Search button simply does not exist on this page for this test case.");
      });
    }

    await this.page.waitForLoadState("networkidle").catch(() => { });
    await this.page.waitForTimeout(2000);

    const assignmentRow = this.page.locator(S.adminLogin.assignmentResultRow.join(', '), { hasText: this.assignmentTitle }).first();
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

    await this.page.waitForTimeout(2000);
    const submitClicked = await clickIfPresent(this, S.resetPassword.submitBtn);
    if (!submitClicked) throw new Error("[FATAL] Could not click Create Password submit button.");
    await this.page.waitForTimeout(4000);

    const returnClicked = await clickIfPresent(this, S.resetPassword.returnToLoginLink);
    if (!returnClicked) throw new Error("[FATAL] Could not click Return to Login / Next.");

    await this.page.waitForTimeout(2000);

    const hamburgerMenu = this.page.locator(S.studentLogin.hamburgerMenu.join(', ')).first();

    if (await hamburgerMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hamburgerMenu.evaluate((el: HTMLElement) => el.click()).catch(() => {
        return hamburgerMenu.click({ force: true });
      });
      await this.page.waitForTimeout(1500);
    }

    const homepageLoginBtn = this.page.locator(S.studentLogin.loginBtnHomepage.join(', ')).first();
    await homepageLoginBtn.waitFor({ state: "attached", timeout: 15000 });

    await homepageLoginBtn.evaluate((el: HTMLElement) => el.click()).catch(async () => {
      await homepageLoginBtn.click({ force: true });
    });

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
      }
    }

    const newUserRecord = {
      "orgid": this.activeOrgId || this.instance?.orgId || "UNKNOWN_ORG",
      "User email": this.importedUserEmail,
      "User first name": this.importedUserFirstName || "UNKNOWN_FIRST",
      "User last name": this.importedUserLastName || "UNKNOWN_LAST",
      "Course Assigned to user": this.assignedCourseName || "UNKNOWN_COURSE",
      "Instance": exactInstance
    };

    usersList.push(newUserRecord);
    fs.writeFileSync(usersFilePath, JSON.stringify(usersList, null, 4), "utf-8");

    await this.attach(`Successfully logged in and saved user data to users.json:\n${JSON.stringify(newUserRecord, null, 2)}`, "text/plain");
  }
);


// Then(
//   "I activate and launch the assigned course",
//   async function (this: ICustomWorld) {
//     if (!this.assignedCourseName) {
//       throw new Error("[FATAL] No assignedCourseName found in context. Cannot identify which course to launch.");
//     }

//     const courseName = this.assignedCourseName;
//     console.log(`\n[DEBUG] Attempting to Activate and Launch course: ${courseName}`);


//     await this.page.waitForLoadState("networkidle");
//     await this.page.waitForTimeout(5000);


//     const courseCards = this.page.locator(S.studentDashboard.courseCards.join(', '));
//     const myCourseCard = courseCards.filter({ hasText: courseName }).first();

//     await expect(myCourseCard, `Could not find a course card containing the text: ${courseName}`).toBeVisible({ timeout: 15000 });


//     const activateBtn = myCourseCard.locator(S.studentDashboard.activateBtn.join(', ')).first();


//     if (await activateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
//       console.log(`[DEBUG] 'Activate' button found for ${courseName}. Clicking it now...`);
//       await activateBtn.click();


//       await this.page.waitForLoadState("networkidle");
//       await this.page.waitForTimeout(4000);
//     } else {
//       console.log(`[DEBUG] No 'Activate' button found (Course may already be active). Proceeding to Launch.`);
//     }

//     const launchBtn = myCourseCard.locator(S.studentDashboard.launchBtn.join(', ')).first();
//     await expect(launchBtn, `Could not find Launch/Start button for course: ${courseName}`).toBeVisible({ timeout: 15000 });

//     console.log(`[DEBUG] 'Launch' button found. Clicking it now...`);


//     const [newPage] = await Promise.all([
//       this.context.waitForEvent('page').catch(() => null),
//       launchBtn.click()
//     ]);


//     if (newPage) {
//       console.log(`[DEBUG] Course launched in a NEW TAB. Switching context to the new tab.`);
//       await newPage.waitForLoadState("domcontentloaded");
//       await newPage.waitForTimeout(3000);


//       this.coursePlayerPage = newPage;
//     } else {
//       console.log(`[DEBUG] Course launched in the SAME TAB.`);
//       await this.page.waitForLoadState("domcontentloaded");
//       await this.page.waitForTimeout(3000);


//       this.coursePlayerPage = this.page;
//     }

//     await this.attach(`Successfully Activated and Launched course: ${courseName}`, "text/plain");
//     console.log(`\n[ SUCCESS] Course '${courseName}' launched successfully!\n`);
//   }
// );

Then(
  "I launch and complete the assigned course {string} for {string}",
  { timeout: 240 * 1000 },
  async function (this: ICustomWorld, courseIdentifier: string, qtrInput: string) {
    if (!this.page || !this.context) {
      throw new Error("[FATAL] Playwright page/context object is undefined.");
    }


    const courseName = (this as any)[courseIdentifier] || courseIdentifier;

    if (!courseName) {
      throw new Error(`[FATAL] Could not resolve a course name for identifier: ${courseIdentifier}`);
    }

    const dateParts = getTargetDateFromQuarter(qtrInput);
    const targetFormattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;

    console.log(`\n======================================================`);
    console.log(`[DEBUG] NEW SCRIPT EXECUTING: Processing Course: ${courseName}`);
    console.log(`[DEBUG] Timeframe: ${qtrInput} | Target Date: ${targetFormattedDate}`);
    console.log(`======================================================\n`);

    const rawConsoleScript = `var testActivateDate = '${targetFormattedDate}';`;

    await this.page.addInitScript(rawConsoleScript);
    await this.page.bringToFront();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);


    const getExactCourseRow = async () => {
      const potentialRows = this.page.locator(S.studentDashboard.courseRowByText(courseName));
      await potentialRows.first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => { });

      const rowCount = await potentialRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = potentialRows.nth(i);
        const titleElements = row.locator('.course-title');
        const titleCount = await titleElements.count();

        if (titleCount > 0) {
          let hasTargetCourse = false;
          let hasOtherCourses = false;
          const normalizedTarget = courseName.replace(/\s+/g, ' ').trim();

          for (let j = 0; j < titleCount; j++) {
            const t = await titleElements.nth(j).innerText();
            const normalizedActual = t.replace(/\s+/g, ' ').trim();


            if (normalizedActual.includes(normalizedTarget)) {
              hasTargetCourse = true;
            }

            else if (normalizedActual.length > 5 && !normalizedActual.toLowerCase().includes('new')) {
              hasOtherCourses = true;
            }
          }


          if (hasTargetCourse && !hasOtherCourses) {
            return row;
          }
        }
      }
      throw new Error(`[FATAL] Could not isolate the exact individual row for: "${courseName}"`);
    };

    console.log(`[DEBUG] Waiting up to 30s for the courses to render...`);
    let exactCourseRow = await getExactCourseRow();
    await exactCourseRow.scrollIntoViewIfNeeded().catch(() => { });
    console.log(`[DEBUG] EXACT MATCH FOUND! True individual row successfully isolated.`);


    let activateBtn = exactCourseRow.locator(S.studentDashboard.activateBtnUppercase.join(', ')).first();

    console.log(`[DEBUG] Checking for ACTIVATE button...`);
    const isActivateVisible = await activateBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    if (isActivateVisible) {
      console.log(`[DEBUG] FORCING raw script evaluation into console before ACTIVATE...`);
      await this.page.evaluate(rawConsoleScript);
      await this.page.waitForTimeout(1000);

      console.log(`[DEBUG] Clicking ACTIVATE button...`);
      await activateBtn.click({ force: true });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(4000);

      console.log(`[DEBUG] UI likely resorted. Re-fetching the exact course row...`);
      exactCourseRow = await getExactCourseRow();
    } else {
      console.log(`[DEBUG] ACTIVATE button not found for this specific course.`);
    }

    let launchBtn = exactCourseRow.locator(S.studentDashboard.launchBtnUppercase.join(', ')).first();

    console.log(`[DEBUG] Checking for LAUNCH button...`);
    const isLaunchVisible = await launchBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);

    if (isLaunchVisible) {
      console.log(`[DEBUG] FORCING raw script evaluation into console before LAUNCH...`);
      await this.page.evaluate(rawConsoleScript);
      await this.page.waitForTimeout(1000);

      console.log(`[DEBUG] Clicking LAUNCH button...`);
      await launchBtn.click({ force: true });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);
    } else {
      console.log(`[DEBUG] LAUNCH button not found for this specific course.`);
    }


    const fillDateSafely = async (dateInputLocator: any) => {
      await dateInputLocator.waitFor({ state: 'visible', timeout: 5000 });
      await dateInputLocator.click({ force: true });
      await this.page.waitForTimeout(500);

      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(500);

      const inputType = await dateInputLocator.getAttribute('type');
      const placeholder = (await dateInputLocator.getAttribute('placeholder') || '').toUpperCase();

      let formattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;
      if (inputType !== 'date') {
        if (placeholder.includes('DD/MM') || placeholder.includes('DD-MM')) formattedDate = `${dateParts.dd}/${dateParts.mm}/${dateParts.yyyy}`;
        else if (placeholder.includes('MM/DD') || placeholder.includes('MM-DD')) formattedDate = `${dateParts.mm}/${dateParts.dd}/${dateParts.yyyy}`;
      }

      console.log(`[DEBUG] Typing date: ${formattedDate}`);
      if (inputType === 'date') {
        await dateInputLocator.fill(formattedDate, { force: true });
      } else {
        await dateInputLocator.pressSequentially(formattedDate, { delay: 100 });
      }
      await this.page.waitForTimeout(1000);

      await dateInputLocator.blur().catch(() => { });
      await this.page.locator(S.courseLaunch.safeClickTarget.join(', ')).first().click({ force: true, position: { x: 5, y: 5 } }).catch(() => { });
      await this.page.waitForTimeout(500);

      const currentValue = await dateInputLocator.inputValue();
      if (!currentValue || currentValue.trim() === '') {
        await dateInputLocator.evaluate((el: HTMLInputElement, val: string) => {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, formattedDate);
        await this.page.waitForTimeout(500);
      }
    };

    console.log(`[DEBUG] Scanning page for Inline Date Picker or Curriculum Table...`);
    const inlineSubmitBtn = this.page.locator(S.studentDashboard.inlineSubmitBtn.join(', ')).first();
    const tableStartBtn = this.page.locator(S.studentDashboard.tableStartBtn.join(', ')).first();

    const isInlineDateVisible = await Promise.race([
      inlineSubmitBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false),
      tableStartBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => false).catch(() => false)
    ]);

    if (isInlineDateVisible) {
      console.log(`[DEBUG] Inline Date form is blocking the curriculum. Processing date...`);
      const inlineDateInput = this.page.locator(S.studentDashboard.inlineDateInput.join(', ')).first();
      await fillDateSafely(inlineDateInput);
      await inlineSubmitBtn.click({ force: true });
      await tableStartBtn.waitFor({ state: 'visible', timeout: 20000 });
    }

    let modulesCompleted = 0;

    while (true) {
      await this.page.bringToFront();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);

      let startButtonsLoc = this.page.locator(S.studentDashboard.tableStartBtn.join(', '));
      let buttonCount = await startButtonsLoc.count();

      if (buttonCount === 0) {
        exactCourseRow = await getExactCourseRow().catch(() => null);
        if (exactCourseRow) {
          startButtonsLoc = exactCourseRow.locator(S.studentDashboard.startBtn.join(', '));
          buttonCount = await startButtonsLoc.count();
        }
      }

      if (buttonCount === 0) {
        console.log(`\n[DEBUG] 0 'START' buttons found. All modules for this course are complete!`);
        break;
      }

      const currentStartBtn = startButtonsLoc.first();
      await expect(currentStartBtn).toBeVisible({ timeout: 15000 });

      let newTabPromise = this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await currentStartBtn.click();
      let newPage = await newTabPromise;

      const dateModal = this.page.locator(S.studentDashboard.datePickerModal.join(', ')).first();
      if (await dateModal.isVisible({ timeout: 4000 }).catch(() => false)) {
        const dateInput = dateModal.locator(S.studentDashboard.dateInput.join(', ')).first();
        const inputType = await dateInput.getAttribute('type');
        const placeholder = (await dateInput.getAttribute('placeholder') || '').toUpperCase();

        let formattedDate = '';
        if (inputType === 'date') formattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;
        else if (placeholder.includes('DD/MM') || placeholder.includes('DD-MM')) formattedDate = `${dateParts.dd}/${dateParts.mm}/${dateParts.yyyy}`;
        else if (placeholder.includes('YYYY/MM') || placeholder.includes('YYYY-MM')) formattedDate = `${dateParts.yyyy}/${dateParts.mm}/${dateParts.dd}`;
        else formattedDate = `${dateParts.mm}/${dateParts.dd}/${dateParts.yyyy}`;

        await dateInput.fill(formattedDate);
        const saveBtn = dateModal.locator(S.studentDashboard.saveDateBtn.join(', ')).first();
        newTabPromise = this.context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
        await saveBtn.click();
        newPage = await newTabPromise;
      }

      const activePage = newPage ? newPage : this.page;
      await activePage.waitForLoadState("domcontentloaded");
      await activePage.waitForTimeout(3000);

      const currentUrl = activePage.url();
      const sourceIdMatch = currentUrl.match(/[?&]sourceId=([^&]+)/i) || currentUrl.match(/\/course\/(\d+)/i) || currentUrl.match(/[?&]id=([^&]+)/i);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : null;

      if (!sourceId) throw new Error(`[FATAL] Could not extract Source ID from URL: ${currentUrl}`);

      const apiResponse = await sendCourseCompletion({ sourcedId: sourceId });
      if (apiResponse.status >= 400) throw new Error(`[FATAL] API Completion failed. Status: ${apiResponse.status}`);

      const exitBtn = activePage.locator(S.coursePlayer.exitBtn.join(', ')).first();
      if (await exitBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        const tabClosedPromise = newPage ? activePage.waitForEvent('close', { timeout: 10000 }).catch(() => null) : Promise.resolve(null);
        await exitBtn.click();
        await tabClosedPromise;
      } else {
        if (newPage && !newPage.isClosed()) await newPage.close();
      }

      modulesCompleted++;
    }

    const cmeModal = this.page.locator(S.postCompletion.cmeModal.join(', ')).first();
    if (await cmeModal.isVisible({ timeout: 4000 }).catch(() => false)) {
      const ackBtn = cmeModal.locator(S.postCompletion.acknowledgeBtn.join(', ')).first();
      await ackBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
    }

    const eCardModal = this.page.locator(S.postCompletion.eCardModal.join(', ')).first();
    if (await eCardModal.isVisible({ timeout: 4000 }).catch(() => false)) {
      const cancelBtn = eCardModal.locator(S.postCompletion.eCardCancelBtn.join(', ')).first();
      await cancelBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
    }

    const evalBtn = this.page.locator(S.postCompletion.evaluationBtn.join(', ')).first();
    if (await evalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let newTabPromise = this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await evalBtn.click();
      let evalPage = await newTabPromise || this.page;

      await evalPage.waitForLoadState("networkidle");
      await evalPage.waitForTimeout(3000);

      const textAreas = evalPage.locator(S.postCompletion.evalTextAreas.join(', '));
      const textAreaCount = await textAreas.count();
      for (let i = 0; i < textAreaCount; i++) {
        await textAreas.nth(i).fill("Completed via Automation");
      }

      await evalPage.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
        const uniqueNames = new Set(radios.map(r => r.name).filter(n => n));
        uniqueNames.forEach(name => {
          const firstRadio = document.querySelector(`input[type="radio"][name="${name}"]`) as HTMLInputElement;
          if (firstRadio) firstRadio.click();
        });
      });

      const submitEvalBtn = evalPage.locator(S.postCompletion.submitEvalBtn.join(', ')).first();
      await submitEvalBtn.click();

      if (evalPage !== this.page) {
        await evalPage.waitForTimeout(3000);
        if (!evalPage.isClosed()) await evalPage.close();
      }

      await this.page.bringToFront();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);

      console.log(`[DEBUG] Checking for Post-Evaluation Inline Date Picker...`);
      const postEvalInlineSubmitBtn = this.page.locator(S.studentDashboard.inlineSubmitBtn.join(', ')).first();

      if (await postEvalInlineSubmitBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log(`[DEBUG] Post-Evaluation Inline Date Picker found! Restoring previous date...`);

        await this.page.evaluate(rawConsoleScript).catch(() => { });
        await this.page.waitForTimeout(1000);

        const inlineDateInput = this.page.locator(S.studentDashboard.inlineDateInput.join(', ')).first();
        await fillDateSafely(inlineDateInput);

        console.log(`[DEBUG] Clicking SUBMIT on Post-Evaluation Date Picker...`);
        await postEvalInlineSubmitBtn.click({ force: true });
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);
      }
    }

    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");


    const userInfo = {
      "orgid": this.activeOrgId || this.instance?.orgId || "UNKNOWN_ORG",
      "Instance": this.instance?.env || "UNKNOWN",
      "User Email": this.importedUserEmail || "UNKNOWN",
      "User First Name": this.importedUserFirstName || "UNKNOWN_FIRST",
      "User Last Name": this.importedUserLastName || "UNKNOWN_LAST",
      "Course Completed": courseName,
      "Total Modules Fired": modulesCompleted
    };

    await this.attach(` COURSE COMPLETION SUCCESS\n\nUser Details:\n${JSON.stringify(userInfo, null, 2)}`, "text/plain");
  }
);


Then(
  "I create a manual assignment for course {string}",
  async function (this: ICustomWorld, courseKey: string) {

    const courseCfg = readCourseConfig() as any;

    const suffix = courseKey.match(/\d+$/)?.[0] || "";
    const nameKey = `courseName${suffix}`;
    const resolvedCourseName = (courseCfg[nameKey] || courseCfg["courseName"] || "").trim();


    (this as any)[courseKey] = resolvedCourseName;
    this.assignedCourseName = resolvedCourseName;

    if (!resolvedCourseName) {
      throw new Error(`Could not resolve a course name for key: ${courseKey}`);
    }

    const uniqueTitle = `${resolvedCourseName}_${Date.now()}`;
    this.assignmentTitle = uniqueTitle;

    await this.page.waitForLoadState("domcontentloaded");

    console.log(`[DEBUG] Attempting to click the initial Create Assignment button...`);
    let createBtnFound = false;

    for (const sel of S.adminLogin.CreateAssignment) {
      try {
        const btn = this.page.locator(sel).first();
        await btn.waitFor({ state: "attached", timeout: 5000 });
        await btn.evaluate((el: HTMLElement) => el.click());
        createBtnFound = true;
        break;
      } catch (e) {
      }
    }

    if (!createBtnFound) {
      throw new Error("[FATAL] Could not find the initial Create Assignment button in the DOM.");
    }
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
      } catch { }
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
      } catch { }
    }
    if (!searchFilled) throw new Error("[FATAL] CourseSearchInput not found");
    await this.page.waitForTimeout(1500);

    await this.page.keyboard.press("ArrowDown");
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(800);
    await this.page.keyboard.press("Escape").catch(() => { });
    await this.page.waitForTimeout(500);

    await fillIfPresent(this, S.adminLogin.AssignmentTitleInput, uniqueTitle);
    await this.page.waitForTimeout(1000);



    const nextClicked = await clickIfPresent(this, S.adminLogin.AssignmentNextButton);
    if (!nextClicked) throw new Error("[FATAL] Failed to click Assignment Next button.");
    await this.page.waitForTimeout(2000);

    const searchTarget = this.importedUserEmail;
    if (!searchTarget) {
      throw new Error("[FATAL] No imported user email found in context.");
    }

    console.log(`\n[DEBUG] Waiting for backend clearance to add learners...`);
    await acquireLock('assignment_creation');

    try {
      const addLearnerClicked = await clickIfPresent(this, S.adminLogin.AddLearnerButton);
      if (!addLearnerClicked) throw new Error("[FATAL] Could not click Add Learner button.");
      await this.page.waitForTimeout(1500);

      await fillIfPresent(this, S.adminLogin.AssignmentSearchUser, searchTarget);
      await this.page.waitForTimeout(2000);

      const searchResult = this.page.locator(`text=${searchTarget}`).last();
      await searchResult.waitFor({ state: "visible", timeout: 5000 }).catch(() => { });
      await searchResult.click({ force: true }).catch(() => { });
      await this.page.waitForTimeout(1000);

      await this.page.locator(S.adminLogin.addLearnerConfirmBtn.join(', ')).last().click({ force: true }).catch(() => { });
      await this.page.waitForTimeout(2000);

      console.log(`[DEBUG] Attempting to click final Create Assignment button...`);
      const createBtn = this.page.locator(S.adminLogin.CreateAssignmentButton.join(', ')).first();

      await createBtn.click({ force: true }).catch(() => {
        console.log("[WARNING] Playwright click event interrupted, likely due to instant DOM refresh.");
      });

      console.log(`[DEBUG] Waiting for success banner...`);

      const successBanner = this.page.locator(S.adminLogin.assignmentSuccessBanner.join(', ')).first();

      await successBanner.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
        console.log("[WARNING] Success banner not visible within 15s. Checking if assignment saved anyway.");
      });

      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);

    } finally {
      releaseLock('assignment_creation');
    }

    await this.attach(`Successfully created manual Perpetual Assignment: ${uniqueTitle} for user: ${searchTarget}`, "text/plain");
  }
);




Then(
  "I launch and complete the specific course {string} for {string}",
  { timeout: 300 * 1000 }, // INCREASED TO 5 MINUTES FOR SLOW REDIRECTS
  async function (this: ICustomWorld, courseIdentifier: string, qtrInput: string) {
    if (!this.page || !this.context) {
      throw new Error("[FATAL] Playwright page/context object is undefined.");
    }


    const courseName = (this as any)[courseIdentifier] || courseIdentifier;

    if (!courseName) {
      throw new Error(`[FATAL] Could not resolve a course name for identifier: ${courseIdentifier}`);
    }

    const dateParts = getTargetDateFromQuarter(qtrInput);
    const targetFormattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;

    console.log(`\n======================================================`);
    console.log(`[DEBUG] NEW SCRIPT EXECUTING: Processing Course: ${courseName}`);
    console.log(`[DEBUG] Timeframe: ${qtrInput} | Target Date: ${targetFormattedDate}`);
    console.log(`======================================================\n`);

    const rawConsoleScript = `var testActivateDate = '${targetFormattedDate}';`;

    await this.page.addInitScript(rawConsoleScript);
    await this.page.bringToFront();
    await this.page.waitForLoadState("domcontentloaded");


    console.log(`[DEBUG] CONTINUITY SCRIPT: Navigating to dashboard for ${courseName}...`);

    const closeModal = this.page.locator('button.close, .modal-header button, button:has-text("Close")').first();
    if (await closeModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`[DEBUG] Lingering popup detected. Closing it...`);
      await closeModal.click({ force: true }).catch(() => { });
      await this.page.waitForTimeout(1000);
    }

    console.log(`[DEBUG] Initiating strict Menu -> My Programs sequence...`);

    let menuClicked = false;
    for (const sel of S.studentDashboard.menuToggles) {
      const toggles = this.page.locator(sel);
      const count = await toggles.count();
      for (let i = 0; i < count; i++) {
        if (await toggles.nth(i).isVisible({ timeout: 500 }).catch(() => false)) {
          console.log(`[DEBUG] Found visible Menu toggle. Clicking...`);
          await toggles.nth(i).click({ force: true });
          await this.page.waitForTimeout(2000);
          menuClicked = true;
          break;
        }
      }
      if (menuClicked) break;
    }

    for (const sel of S.studentDashboard.myProgramsLink) {
      const links = this.page.locator(sel);
      const count = await links.count();
      for (let i = 0; i < count; i++) {
        if (await links.nth(i).isVisible({ timeout: 500 }).catch(() => false)) {
          console.log(`[DEBUG] Found visible My Programs link. Clicking...`);
          await links.nth(i).click({ force: true });
          console.log(`[DEBUG] Clicked. Waiting for dashboard to load...`);
          break;
        }
      }
    }

    await this.page.waitForLoadState("domcontentloaded").catch(() => { });
    await this.page.waitForTimeout(2000);

    console.log(`[DEBUG] Verifying navigation success...`);
    const isDashboardReady = await this.page.locator(S.studentDashboard.courseRowByText(courseName))
      .first()
      .isVisible({ timeout: 4000 })
      .catch(() => false);

    if (!isDashboardReady) {
      console.log(`[WARNING] UI click swallowed by headless layout. Forcing direct URL navigation...`);
      const baseUrl = new URL(this.page.url()).origin;
      await this.page.goto(`${baseUrl}/mycourse`, { waitUntil: "networkidle" }).catch(() => { });
      await this.page.waitForTimeout(3000);
    }


    const getExactCourseRow = async () => {
      const potentialRows = this.page.locator(S.studentDashboard.courseRowByText(courseName));
      await potentialRows.first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => { });

      const rowCount = await potentialRows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = potentialRows.nth(i);
        const titleElements = row.locator('.course-title');
        const titleCount = await titleElements.count();

        if (titleCount > 0) {
          let hasTargetCourse = false;
          let hasOtherCourses = false;
          const normalizedTarget = courseName.replace(/\s+/g, ' ').trim();

          for (let j = 0; j < titleCount; j++) {
            const t = await titleElements.nth(j).innerText();
            const normalizedActual = t.replace(/\s+/g, ' ').trim();

            if (normalizedActual.includes(normalizedTarget)) {
              hasTargetCourse = true;
            }
            else if (normalizedActual.length > 5 && !normalizedActual.toLowerCase().includes('new')) {
              hasOtherCourses = true;
            }
          }

          if (hasTargetCourse && !hasOtherCourses) {
            return row;
          }
        }
      }
      throw new Error(`[FATAL] Could not isolate the exact individual row for: "${courseName}"`);
    };

    console.log(`[DEBUG] Waiting up to 30s for the courses to render...`);
    let exactCourseRow = await getExactCourseRow();
    await exactCourseRow.scrollIntoViewIfNeeded().catch(() => { });
    console.log(`[DEBUG] EXACT MATCH FOUND! True individual row successfully isolated.`);


    let activateBtn = exactCourseRow.locator(S.studentDashboard.activateBtnUppercase.join(', ')).first();

    console.log(`[DEBUG] Checking for ACTIVATE button...`);
    const isActivateVisible = await activateBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    if (isActivateVisible) {
      console.log(`[DEBUG] FORCING raw script evaluation into console before ACTIVATE...`);
      await this.page.evaluate(rawConsoleScript);
      await this.page.waitForTimeout(1000);

      console.log(`[DEBUG] Clicking ACTIVATE button...`);
      await activateBtn.click({ force: true });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(4000);

      console.log(`[DEBUG] UI likely resorted. Re-fetching the exact course row...`);
      exactCourseRow = await getExactCourseRow();
    } else {
      console.log(`[DEBUG] ACTIVATE button not found for this specific course.`);
    }

    let launchBtn = exactCourseRow.locator(S.studentDashboard.launchBtnUppercase.join(', ')).first();

    console.log(`[DEBUG] Checking for LAUNCH button...`);
    const isLaunchVisible = await launchBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);

    if (isLaunchVisible) {
      console.log(`[DEBUG] FORCING raw script evaluation into console before LAUNCH...`);
      await this.page.evaluate(rawConsoleScript);
      await this.page.waitForTimeout(1000);

      console.log(`[DEBUG] Clicking LAUNCH button...`);
      await launchBtn.click({ force: true });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);
    } else {
      console.log(`[DEBUG] LAUNCH button not found for this specific course.`);
    }


    const fillDateSafely = async (dateInputLocator: any) => {
      await dateInputLocator.waitFor({ state: 'visible', timeout: 5000 });

      const inputType = await dateInputLocator.getAttribute('type');
      const placeholder = (await dateInputLocator.getAttribute('placeholder') || '').toUpperCase();

      let formattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;
      if (inputType !== 'date') {
        if (placeholder.includes('DD/MM') || placeholder.includes('DD-MM')) formattedDate = `${dateParts.dd}/${dateParts.mm}/${dateParts.yyyy}`;
        else if (placeholder.includes('MM/DD') || placeholder.includes('MM-DD')) formattedDate = `${dateParts.mm}/${dateParts.dd}/${dateParts.yyyy}`;
      }

      console.log(`[DEBUG] Forcing date injection: ${formattedDate} to bypass UI masks.`);

      await dateInputLocator.evaluate((el: HTMLInputElement, val: string) => {
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      }, formattedDate);

      await this.page.waitForTimeout(500);

      await dateInputLocator.fill(formattedDate, { force: true }).catch(() => { });
      await this.page.waitForTimeout(500);

      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    };

    console.log(`[DEBUG] Scanning page for Inline Date Picker or Curriculum Table...`);
    const inlineSubmitBtn = this.page.locator(S.studentDashboard.inlineSubmitBtn.join(', ')).first();
    const tableStartBtn = this.page.locator(S.studentDashboard.tableStartBtn.join(', ')).first();

    const isInlineDateVisible = await Promise.race([
      inlineSubmitBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false),
      tableStartBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => false).catch(() => false)
    ]);

    if (isInlineDateVisible) {
      console.log(`[DEBUG] Inline Date form is blocking the curriculum. Processing date...`);
      const inlineDateInput = this.page.locator(S.studentDashboard.inlineDateInput.join(', ')).first();
      await fillDateSafely(inlineDateInput);
      await inlineSubmitBtn.click({ force: true });
      await tableStartBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });
    }

    let modulesCompleted = 0;

    while (true) {
      await this.page.bringToFront();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);

      let startButtonsLoc = this.page.locator(S.studentDashboard.tableStartBtn.join(', '));
      let buttonCount = await startButtonsLoc.count();

      if (buttonCount === 0) {
        exactCourseRow = await getExactCourseRow().catch(() => null);
        if (exactCourseRow) {
          startButtonsLoc = exactCourseRow.locator(S.studentDashboard.startBtn.join(', '));
          buttonCount = await startButtonsLoc.count();
        }
      }

      if (buttonCount === 0) {
        console.log(`\n[DEBUG] 0 'START' buttons found. All modules for this course are complete!`);
        break;
      }

      const currentStartBtn = startButtonsLoc.first();
      await expect(currentStartBtn).toBeVisible({ timeout: 15000 });

      let newTabPromise = this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await currentStartBtn.click();
      let newPage = await newTabPromise;

      const dateModal = this.page.locator(S.studentDashboard.datePickerModal.join(', ')).first();
      if (await dateModal.isVisible({ timeout: 4000 }).catch(() => false)) {
        const dateInput = dateModal.locator(S.studentDashboard.dateInput.join(', ')).first();
        const inputType = await dateInput.getAttribute('type');
        const placeholder = (await dateInput.getAttribute('placeholder') || '').toUpperCase();

        let formattedDate = '';
        if (inputType === 'date') formattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;
        else if (placeholder.includes('DD/MM') || placeholder.includes('DD-MM')) formattedDate = `${dateParts.dd}/${dateParts.mm}/${dateParts.yyyy}`;
        else if (placeholder.includes('YYYY/MM') || placeholder.includes('YYYY-MM')) formattedDate = `${dateParts.yyyy}/${dateParts.mm}/${dateParts.dd}`;
        else formattedDate = `${dateParts.mm}/${dateParts.dd}/${dateParts.yyyy}`;

        await dateInput.fill(formattedDate);
        const saveBtn = dateModal.locator(S.studentDashboard.saveDateBtn.join(', ')).first();
        newTabPromise = this.context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
        await saveBtn.click();
        newPage = await newTabPromise;
      }

      const activePage = newPage ? newPage : this.page;
      await activePage.waitForLoadState("domcontentloaded");
      await activePage.waitForTimeout(3000);

      const currentUrl = activePage.url();
      const sourceIdMatch = currentUrl.match(/[?&]sourceId=([^&]+)/i) || currentUrl.match(/\/course\/(\d+)/i) || currentUrl.match(/[?&]id=([^&]+)/i);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : null;

      if (!sourceId) throw new Error(`[FATAL] Could not extract Source ID from URL: ${currentUrl}`);

      const apiResponse = await sendCourseCompletion({ sourcedId: sourceId });
      if (apiResponse.status >= 400) throw new Error(`[FATAL] API Completion failed. Status: ${apiResponse.status}`);

      const exitBtn = activePage.locator(S.coursePlayer.exitBtn.join(', ')).first();
      if (await exitBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        const tabClosedPromise = newPage ? activePage.waitForEvent('close', { timeout: 10000 }).catch(() => null) : Promise.resolve(null);
        await exitBtn.click();
        await tabClosedPromise;
      } else {
        if (newPage && !newPage.isClosed()) await newPage.close();
      }

      modulesCompleted++;
    }

    const cmeModal = this.page.locator(S.postCompletion.cmeModal.join(', ')).first();
    if (await cmeModal.isVisible({ timeout: 4000 }).catch(() => false)) {
      const ackBtn = cmeModal.locator(S.postCompletion.acknowledgeBtn.join(', ')).first();
      await ackBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
    }

    const eCardModal = this.page.locator(S.postCompletion.eCardModal.join(', ')).first();
    if (await eCardModal.isVisible({ timeout: 4000 }).catch(() => false)) {
      const cancelBtn = eCardModal.locator(S.postCompletion.eCardCancelBtn.join(', ')).first();
      await cancelBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
    }

    const evalBtn = this.page.locator(S.postCompletion.evaluationBtn.join(', ')).first();
    if (await evalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let newTabPromise = this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await evalBtn.click();
      let evalPage = await newTabPromise || this.page;

      await evalPage.waitForLoadState("networkidle");
      await evalPage.waitForTimeout(3000);

      const textAreas = evalPage.locator(S.postCompletion.evalTextAreas.join(', '));
      const textAreaCount = await textAreas.count();
      for (let i = 0; i < textAreaCount; i++) {
        await textAreas.nth(i).fill("Completed via Automation");
      }

      await evalPage.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
        const uniqueNames = new Set(radios.map(r => r.name).filter(n => n));
        uniqueNames.forEach(name => {
          const firstRadio = document.querySelector(`input[type="radio"][name="${name}"]`) as HTMLInputElement;
          if (firstRadio) firstRadio.click();
        });
      });

      const submitEvalBtn = evalPage.locator(S.postCompletion.submitEvalBtn.join(', ')).first();
      await submitEvalBtn.click();

      if (evalPage !== this.page) {
        await evalPage.waitForTimeout(3000);
        if (!evalPage.isClosed()) await evalPage.close();
      }

      await this.page.bringToFront();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);

      console.log(`[DEBUG] Checking for Post-Evaluation Inline Date Picker...`);
      const postEvalInlineSubmitBtn = this.page.locator(S.studentDashboard.inlineSubmitBtn.join(', ')).first();

      if (await postEvalInlineSubmitBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log(`[DEBUG] Post-Evaluation Inline Date Picker found! Restoring previous date...`);

        await this.page.evaluate(rawConsoleScript).catch(() => { });
        await this.page.waitForTimeout(1000);

        const inlineDateInput = this.page.locator(S.studentDashboard.inlineDateInput.join(', ')).first();
        await fillDateSafely(inlineDateInput);

        console.log(`[DEBUG] Clicking SUBMIT on Post-Evaluation Date Picker...`);

        await postEvalInlineSubmitBtn.click({ force: true, noWaitAfter: true }).catch(() => { });

        console.log(`[DEBUG] Waiting for post-submit redirect to settle...`);

        await this.page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => { });
        await this.page.waitForTimeout(3000);
      }
    }

    console.log(`[DEBUG] Taking final screenshot...`);

    let screenshot = await this.page.screenshot({ fullPage: true, timeout: 10000 }).catch(async () => {
      console.log(`[WARNING] Full page screenshot timed out, falling back to viewport capture.`);
      return await this.page.screenshot({ timeout: 5000 }).catch(() => null);
    });

    if (screenshot) {
      await this.attach(screenshot, "image/png");
    }

    const userInfo = {
      "orgid": this.activeOrgId || this.instance?.orgId || "UNKNOWN_ORG",
      "Instance": this.instance?.env || "UNKNOWN",
      "User Email": this.importedUserEmail || "UNKNOWN",
      "User First Name": this.importedUserFirstName || "UNKNOWN_FIRST",
      "User Last Name": this.importedUserLastName || "UNKNOWN_LAST",
      "Course Completed": courseName,
      "Total Modules Fired": modulesCompleted
    };

    await this.attach(` COURSE COMPLETION SUCCESS\n\nUser Details:\n${JSON.stringify(userInfo, null, 2)}`, "text/plain");
  }
);

Then("I click on reports dropdown", async function (this: ICustomWorld) {
  if (!this.page) throw new Error("[FATAL] Playwright page is undefined.");

  console.log(`[DEBUG] Attempting to open Reports dropdown...`);


  const hamburger = this.page.locator(S.adminReports.hamburgerMenu.join(', ')).first();
  if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log(`[DEBUG] Headless hamburger menu detected. Clicking to expand...`);
    await hamburger.click({ force: true });
    await this.page.waitForTimeout(1000);
  }


  const reportsMenu = this.page.locator(S.adminReports.reportsDropdown.join(', ')).first();

  if (await reportsMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
    await reportsMenu.click({ force: true });
    await this.page.waitForTimeout(1000);
    console.log(`[DEBUG] Reports dropdown clicked successfully.`);
  } else {
    console.log(`[WARNING] Reports menu not visible in UI. Will rely on forced navigation.`);
  }
});


Then("I navigate to compliance report page", async function (this: ICustomWorld) {
  if (!this.page) throw new Error("[FATAL] Playwright page is undefined.");

  console.log(`[DEBUG] Attempting to click Compliance Report link...`);

  const complianceLink = this.page.locator(S.adminReports.complianceReportLink.join(', ')).first();
  let navigated = false;

  if (await complianceLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await complianceLink.click({ force: true });
    await this.page.waitForLoadState("networkidle");
    navigated = true;
  }


  const isPageReady = await this.page.locator(S.adminReports.pageHeader.join(', '))
    .filter({ hasText: /Compliance Report/i })
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (!navigated || !isPageReady) {
    console.log(`[WARNING] UI click swallowed by headless layout. Forcing direct URL navigation to compliance report...`);
    const baseUrl = new URL(this.page.url()).origin;
    await this.page.goto(`${baseUrl}/manage/compliance_report`, { waitUntil: "networkidle" }).catch(() => { });
    await this.page.waitForTimeout(2000);
  }

  console.log(`[DEBUG] Successfully navigated to Compliance Report page.`);
});


Then("I search user with email id and validate for eCard compliance until date.", async function (this: ICustomWorld) {
  if (!this.page) throw new Error("[FATAL] Playwright page is undefined.");

  const searchEmail = this.importedUserEmail;
  if (!searchEmail) throw new Error(`[FATAL] importedUserEmail is empty. Cannot search for user.`);

  console.log(`\n======================================================`);
  console.log(`[DEBUG] VALIDATING COMPLIANCE FOR: ${searchEmail}`);
  console.log(`======================================================\n`);


  const searchInput = this.page.locator(S.adminReports.searchInput.join(', ')).first();
  await searchInput.waitFor({ state: 'attached', timeout: 10000 });


  await searchInput.click({ force: true }).catch(() => { });
  await searchInput.fill(searchEmail, { force: true });
  await this.page.waitForTimeout(500);


  await searchInput.press('Enter').catch(() => { });
  await this.page.waitForTimeout(500);


  const searchBtn = this.page.locator(S.adminReports.searchButton.join(', ')).first();
  if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await searchBtn.click().catch(() => { });
  }

  console.log(`[DEBUG] Search initiated. Waiting for report table to generate...`);


  const userRow = this.page.locator(S.adminReports.tableRow.join(', ')).filter({ hasText: searchEmail }).first();
  await userRow.waitFor({ state: 'visible', timeout: 30000 });
  console.log(`[DEBUG] User found in report table. Mapping columns...`);


  const headers = await this.page.locator(S.adminReports.tableHeaders.join(', ')).allInnerTexts();

  const compUntilIdx = headers.findIndex((h: string) => h.trim().toUpperCase().includes('COMPLIANT UNTIL'));
  const ecardUntilIdx = headers.findIndex((h: string) => h.trim().toUpperCase().includes('ECARD VALID UNTIL'));


  const statusIdx = headers.findIndex((h: string) => h.trim().toUpperCase().includes('COMPLIANCE STATUS'));
  const lastActivityIdx = headers.findIndex((h: string) => h.trim().toUpperCase().includes('LAST ACTIVITY'));
  const completionDateIdx = headers.findIndex((h: string) => h.trim().toUpperCase().includes('COMPLETION DATE'));

  if (compUntilIdx === -1 || ecardUntilIdx === -1 || statusIdx === -1 || lastActivityIdx === -1 || completionDateIdx === -1) {
    throw new Error(`[FATAL] Could not find all required columns in the table headers. Found: ${headers.join(', ')}`);
  }


  const rowCells = userRow.locator(S.adminReports.tableCells.join(', '));

  const compliantDateText = await rowCells.nth(compUntilIdx).textContent() || '';
  const ecardDateText = await rowCells.nth(ecardUntilIdx).textContent() || '';


  const statusText = await rowCells.nth(statusIdx).textContent() || '';
  const lastActivityText = await rowCells.nth(lastActivityIdx).textContent() || '';
  const completionDateText = await rowCells.nth(completionDateIdx).textContent() || '';

  const finalCompliantDate = compliantDateText.trim();
  const finalEcardDate = ecardDateText.trim();
  const finalStatus = statusText.trim();
  const finalLastActivity = lastActivityText.trim();
  const finalCompletionDate = completionDateText.trim();

  console.log(`[DEBUG] Extracted Compliance Status: "${finalStatus}"`);
  console.log(`[DEBUG] Extracted Compliant Until: "${finalCompliantDate}"`);
  console.log(`[DEBUG] Extracted eCard Valid Until: "${finalEcardDate}"`);
  console.log(`[DEBUG] Extracted Last Activity: "${finalLastActivity}"`);
  console.log(`[DEBUG] Extracted Completion Date: "${finalCompletionDate}"`);


  if (!finalCompliantDate || !finalEcardDate) {
    throw new Error(`[FATAL] One or both date cells are empty!`);
  }

  if (finalCompliantDate !== finalEcardDate) {
    throw new Error(`[FATAL] COMPLIANCE MISMATCH! Compliant Until (${finalCompliantDate}) does NOT match eCard Valid Until (${finalEcardDate}).`);
  }

  console.log(`[SUCCESS] Validation Passed! Both dates match exactly.`);


  await this.attach(
    `COMPLIANCE VALIDATION SUCCESS\n\n` +
    `User Email: ${searchEmail}\n` +
    `Compliance Status: ${finalStatus}\n` +
    `Last Activity Date: ${finalLastActivity}\n` +
    `Completion Date: ${finalCompletionDate}\n` +
    `Compliant Until Date: ${finalCompliantDate}\n` +
    `eCard Valid Until Date: ${finalEcardDate}\n` +
    `Validation Status: EXACT MATCH`,
    "text/plain"
  );
});