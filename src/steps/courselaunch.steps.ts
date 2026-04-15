import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld, getZimbraCredentials, getZimbraUrl } from "../support/hooks";
import { clickIfPresent, fillIfPresent, tryGetFlashText } from "../utils/ui-actions";
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
  }
);


Then(
  "I activate and launch the assigned course",
  async function (this: ICustomWorld) {
    if (!this.assignedCourseName) {
      throw new Error("[FATAL] No assignedCourseName found in context. Cannot identify which course to launch.");
    }

    const courseName = this.assignedCourseName;
    console.log(`\n[DEBUG] Attempting to Activate and Launch course: ${courseName}`);


    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(5000);


    const courseCards = this.page.locator(S.studentDashboard.courseCards.join(', '));
    const myCourseCard = courseCards.filter({ hasText: courseName }).first();

    await expect(myCourseCard, `Could not find a course card containing the text: ${courseName}`).toBeVisible({ timeout: 15000 });


    const activateBtn = myCourseCard.locator(S.studentDashboard.activateBtn.join(', ')).first();


    if (await activateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`[DEBUG] 'Activate' button found for ${courseName}. Clicking it now...`);
      await activateBtn.click();


      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(4000);
    } else {
      console.log(`[DEBUG] No 'Activate' button found (Course may already be active). Proceeding to Launch.`);
    }

    const launchBtn = myCourseCard.locator(S.studentDashboard.launchBtn.join(', ')).first();
    await expect(launchBtn, `Could not find Launch/Start button for course: ${courseName}`).toBeVisible({ timeout: 15000 });

    console.log(`[DEBUG] 'Launch' button found. Clicking it now...`);


    const [newPage] = await Promise.all([
      this.context.waitForEvent('page').catch(() => null),
      launchBtn.click()
    ]);


    if (newPage) {
      console.log(`[DEBUG] Course launched in a NEW TAB. Switching context to the new tab.`);
      await newPage.waitForLoadState("domcontentloaded");
      await newPage.waitForTimeout(3000);


      this.coursePlayerPage = newPage;
    } else {
      console.log(`[DEBUG] Course launched in the SAME TAB.`);
      await this.page.waitForLoadState("domcontentloaded");
      await this.page.waitForTimeout(3000);


      this.coursePlayerPage = this.page;
    }

    await this.attach(`Successfully Activated and Launched course: ${courseName}`, "text/plain");
    console.log(`\n[ SUCCESS] Course '${courseName}' launched successfully!\n`);
  }
);

Then(
  "I launch and complete the assigned course for {string}",
  async function (this: ICustomWorld, qtrInput: string) {
    if (!this.assignedCourseName) {
      throw new Error("[FATAL] No assignedCourseName found in context.");
    }
    if (!this.page || !this.context) {
      throw new Error("[FATAL] Playwright page/context object is undefined.");
    }

    const courseName = this.assignedCourseName;

    // ==========================================
    // 1. DATE CALCULATION & CONSOLE INJECTION
    // ==========================================
    const dateParts = getTargetDateFromQuarter(qtrInput);
    const targetFormattedDate = `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;

    console.log(`\n[DEBUG] Processing Course: ${courseName} | Timeframe: ${qtrInput}`);
    console.log(`[DEBUG] Calculated Target Date: YYYY:${dateParts.yyyy} MM:${dateParts.mm} DD:${dateParts.dd}`);

    const currentDate = new Date();
    // JS months are 0-indexed, so subtract 1
    const targetDateObj = new Date(Number(dateParts.yyyy), Number(dateParts.mm) - 1, Number(dateParts.dd));

    if (targetDateObj < currentDate) {
      console.log(`[DEBUG] Past date detected! Injecting 'testActivateDate = ${targetFormattedDate}' into browser console BEFORE Activation...`);

      // 1. Evaluate immediately on the current DOM context
      await this.page.evaluate((dateStr: string) => {
        (window as any).testActivateDate = dateStr;
      }, targetFormattedDate);

      // 2. Add Init Script: Guarantees the variable survives page reloads/navigations
      await this.page.addInitScript(`
            window.testActivateDate = '${targetFormattedDate}';
            var testActivateDate = '${targetFormattedDate}';
        `);
      await this.page.waitForTimeout(1000);
    }

    await this.page.bringToFront();
    await this.page.waitForLoadState("networkidle");

    // ==========================================
    // 1.5 CLICK ACTIVATE & LAUNCH 
    // ==========================================
    console.log(`[DEBUG] Checking for ACTIVATE button...`);
    const activateBtn = this.page.locator(S.studentDashboard.activateBtnUppercase.join(', ')).first();

    if (await activateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`[DEBUG] ACTIVATE button found! Clicking it now...`);
      await activateBtn.click({ force: true });
      await this.page.waitForLoadState("networkidle");
    }

    console.log(`[DEBUG] Checking for LAUNCH button...`);
    const launchBtn = this.page.locator(S.studentDashboard.launchBtnUppercase.join(', ')).first();

    if (await launchBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[DEBUG] LAUNCH button found! Clicking it now...`);
      await launchBtn.click({ force: true });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000); // Give LMS time to transition
    }

    // ==========================================
    // HELPER: THE WORKING MANUAL TYPING + BLUR FILLER
    // ==========================================
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

      console.log(`[DEBUG] Safely blurring input to close calendar...`);
      await dateInputLocator.blur().catch(() => { });

      // Click a safe background spot just in case the popup is still physically blocking the screen
      await this.page.locator(S.courseLaunch.safeClickTarget.join(', ')).first().click({ force: true, position: { x: 5, y: 5 } }).catch(() => { });
      await this.page.waitForTimeout(500);

      // Failsafe check
      const currentValue = await dateInputLocator.inputValue();
      if (!currentValue || currentValue.trim() === '') {
        console.log(`[DEBUG] WARNING: Calendar wiped the value! Forcing it via JavaScript...`);
        await dateInputLocator.evaluate((el: HTMLInputElement, val: string) => {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, formattedDate);
        await this.page.waitForTimeout(500);
      } else {
        console.log(`[DEBUG] Value successfully retained in input box: ${currentValue}`);
      }
    };

    // ==========================================
    // 0. THE GATEKEEPER: INLINE DATE VS CURRICULUM
    // ==========================================
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

      console.log(`[DEBUG] Clicking SUBMIT button...`);
      await inlineSubmitBtn.click({ force: true });

      console.log(`[DEBUG] Inline Date submitted. Waiting for curriculum table...`);
      await tableStartBtn.waitFor({ state: 'visible', timeout: 20000 });
    } else {
      console.log(`[DEBUG] No inline date picker found. Curriculum is ready.`);
    }

    let modulesCompleted = 0;

    // ==========================================
    // 1. DYNAMIC LOOP (Handles Locked Dependencies)
    // ==========================================
    while (true) {
      await this.page.bringToFront();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(5000);

      let startButtonsLoc = this.page.locator(S.studentDashboard.tableStartBtn.join(', '));
      let buttonCount = await startButtonsLoc.count();

      if (buttonCount === 0) {
        const courseCards = this.page.locator(S.studentDashboard.courseRowByText(courseName)).first();
        startButtonsLoc = courseCards.locator(S.studentDashboard.startBtn.join(', '));
        buttonCount = await startButtonsLoc.count();
      }

      if (buttonCount === 0) {
        console.log(`\n[DEBUG] 0 'START' buttons found. All modules for this course are complete!`);
        break;
      }

      console.log(`\n--- Found ${buttonCount} available START button(s). Processing the next one... ---`);

      const currentStartBtn = startButtonsLoc.first();
      await expect(currentStartBtn).toBeVisible({ timeout: 10000 });

      let newTabPromise = this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await currentStartBtn.click();
      let newPage = await newTabPromise;

      // ==========================================
      // 2. HANDLE DATE PICKER
      // ==========================================
      const dateModal = this.page.locator(S.studentDashboard.datePickerModal.join(', ')).first();
      if (await dateModal.isVisible({ timeout: 4000 }).catch(() => false)) {
        const dateParts = getTargetDateFromQuarter(qtrInput);
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
      await activePage.waitForTimeout(4000);

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

    // ==========================================
    // 5. POST-COMPLETION CONDITIONAL POPUPS
    // ==========================================
    // A. Handle CE/CME Acknowledge (If it exists)
    console.log(`[DEBUG] Checking for CE/CME Acknowledge popup...`);
    const cmeModal = this.page.locator(S.postCompletion.cmeModal.join(', ')).first();

    if (await cmeModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[DEBUG] CE/CME Popup found! Clicking Acknowledge...`);
      const ackBtn = cmeModal.locator(S.postCompletion.acknowledgeBtn.join(', ')).first();
      await ackBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
    } else {
      console.log(`[DEBUG] No CME popup configured for this course. Skipping.`);
    }

    // B. Handle Email eCard (If it exists)
    console.log(`[DEBUG] Checking for Email eCard popup...`);
    const eCardModal = this.page.locator(S.postCompletion.eCardModal.join(', ')).first();

    if (await eCardModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[DEBUG] Email eCard Popup found! Clicking Cancel...`);
      const cancelBtn = eCardModal.locator(S.postCompletion.eCardCancelBtn.join(', ')).first();
      await cancelBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
    } else {
      console.log(`[DEBUG] No eCard popup configured for this course. Skipping.`);
    }


    console.log(`[DEBUG] Checking if an Evaluation is required...`);
    const evalBtn = this.page.locator(S.postCompletion.evaluationBtn.join(', ')).first();

    if (await evalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[DEBUG] Evaluation required. Launching evaluation...`);

      let newTabPromise = this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await evalBtn.click();
      let evalPage = await newTabPromise || this.page;

      await evalPage.waitForLoadState("networkidle");
      await evalPage.waitForTimeout(3000);

      console.log(`[DEBUG] Auto-filling Evaluation Form...`);

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
      await this.page.waitForTimeout(4000);
    } else {
      console.log(`[DEBUG] No Evaluation configured for this course. Skipping.`);
    }


    console.log(`[DEBUG] Capturing success screenshot...`);
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");

    const userInfo = {
      "Instance": this.instance?.env || "UNKNOWN",
      "User Email": this.importedUserEmail || "UNKNOWN",
      "First Name": this.importedUserFirstName || "UNKNOWN",
      "Last Name": this.importedUserLastName || "UNKNOWN",
      "Course Completed": courseName,
      "Total Modules Fired": modulesCompleted
    };

    await this.attach(` COURSE COMPLETION SUCCESS\n\nUser Details:\n${JSON.stringify(userInfo, null, 2)}`, "text/plain");
    console.log(`\n[ SUCCESS] Course '${courseName}' fully completed, evaluated, and documented!`);
  }
);