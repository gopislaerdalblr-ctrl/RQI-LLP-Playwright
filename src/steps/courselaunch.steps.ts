import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import { clickIfPresent, fillIfPresent, tryGetFlashText } from "../utils/ui-actions";
import { readCourseConfig } from "../config/course-config";


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

    //after next button script

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
    await this.page.waitForTimeout(1500);

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