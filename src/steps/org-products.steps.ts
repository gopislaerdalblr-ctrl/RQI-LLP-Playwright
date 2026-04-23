import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { S } from "../pages/selectors";
import { ICustomWorld } from "../support/hooks";
import {
  clickIfPresent,
  fillIfPresent,
  tryGetFlashText,
  ensureDir,
  deleteIfExists,
  parseCsvHeader,
  buildRowByHeader,
  readCourseConfig,
} from "../utils/ui-actions";

Then(
  "Check if course is available or add the course as {string} and {string}",
  async function (this: ICustomWorld, courseArg1: string, courseArg2: string) {
    const courseCfg = readCourseConfig();

    const resolveCourse = (arg: string) => {
      const key = (arg || "").trim();
      const isCourseKey =
        /^courseid(\d+)?$/i.test(key) || key.toUpperCase() === "COURSEID";
      const defaultCourseId = String((courseCfg as any).courseId || "").trim();
      const defaultCourseName = String(
        (courseCfg as any).courseName || "",
      ).trim();

      let courseId = "";
      let courseName = "";

      if (!key || key.toUpperCase() === "COURSEID") {
        courseId = defaultCourseId;
        courseName = defaultCourseName;
      } else if (isCourseKey) {
        const resolvedCourseId = String(
          (courseCfg as any)[key] ??
          (courseCfg as any)[key.toLowerCase()] ??
          "",
        ).trim();
        const suffix = key.match(/^courseid(\d+)?$/i)?.[1] || "";
        const nameKey = `courseName${suffix}`;
        const resolvedCourseName = String(
          (courseCfg as any)[nameKey] ??
          (courseCfg as any)[nameKey.toLowerCase()] ??
          "",
        ).trim();
        courseId = resolvedCourseId || key;
        courseName = resolvedCourseName || defaultCourseName;
      } else {
        courseId = key;
        courseName = defaultCourseName;
      }

      if (!courseId)
        throw new Error(
          `CourseId is empty. Step passed "${arg}". Check src/config/course.json.`,
        );
      return { courseId, courseName };
    };

    const courses = [resolveCourse(courseArg1), resolveCourse(courseArg2)];

    const productsTable = this.page
      .locator(S.adminLogin.orgProducts.productsTable.join(', '))
      .first();
    await expect(productsTable).toBeVisible({ timeout: 15000 });

    const getEntriesInfoText = async (): Promise<string> => {
      const infoLoc = this.page
        .locator(S.adminLogin.orgProducts.dataTablesInfo.join(', '))
        .first();
      const visible = await infoLoc
        .isVisible({ timeout: 2000 })
        .then(() => true)
        .catch(() => false);
      if (!visible) return "";
      return (await infoLoc.innerText().catch(() => "")).trim();
    };

    const getProductsTableSnapshot = async (): Promise<string> => {
      const table = this.page
        .locator(S.adminLogin.orgProducts.productsTable.join(', '))
        .first();
      const visible = await table
        .isVisible({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (!visible) return "";
      return (await table.innerText().catch(() => "")).trim();
    };

    const attachCombinedReportBlock = async (
      title: string,
      flashText: string,
    ) => {
      const tableSnap = await getProductsTableSnapshot();
      const entriesInfo = await getEntriesInfoText();
      const lines: string[] = [`✅ ${title}`, ""];

      if (flashText) lines.push(`✅ Flash Message: ${flashText}`, "");
      if (tableSnap) lines.push("📋 PRODUCTS TABLE:", tableSnap, "");
      if (entriesInfo) lines.push(`📌 Entries info: ${entriesInfo}`);

      const finalText = lines.join("\n");
      await this.attach(finalText, "text/plain");
      console.log(finalText);
    };

    for (const { courseId, courseName } of courses) {
      const noRecords = await productsTable
        .locator("text=No records are available")
        .isVisible()
        .catch(() => false);
      let alreadyThere = false;

      if (!noRecords) {
        const tbody = productsTable.locator("tbody");
        const hasById =
          (await tbody
            .locator("tr", { hasText: courseId })
            .count()
            .catch(() => 0)) > 0;
        const hasByName =
          (await tbody
            .locator("tr", { hasText: courseName })
            .count()
            .catch(() => 0)) > 0;
        alreadyThere = hasById || hasByName;
      }

      if (alreadyThere) {
        await attachCombinedReportBlock(
          `Course already exists: ${courseId} (${courseName})`,
          "",
        );
        continue;
      }

      const addLinkClicked = await clickIfPresent(
        this,
        S.adminLogin.orgProducts.addProductLink,
      );
      if (!addLinkClicked) throw new Error("Add Product link not found.");

      await this.page.waitForLoadState("domcontentloaded").catch(() => { });
      await expect(this.page.locator(S.adminLogin.orgProducts.submitAddProduct.join(', '))).toBeVisible({
        timeout: 15000,
      });

      const opened = await clickIfPresent(
        this,
        S.adminLogin.orgProducts.productDropdown,
      );
      if (!opened) throw new Error("Product dropdown not found.");

      await expect(this.page.locator(S.adminLogin.orgProducts.productSearchInput.join(', '))).toBeVisible({
        timeout: 15000,
      });
      await fillIfPresent(
        this,
        S.adminLogin.orgProducts.productSearchInput,
        courseId,
      );
      await this.page.waitForTimeout(500);

      const optionById = this.page.locator(
        S.adminLogin.orgProducts.productOptionByText(courseId),
      );
      const optionExists = await optionById
        .first()
        .isVisible()
        .then(() => true)
        .catch(() => false);

      if (optionExists) {
        await optionById.first().click();
      } else {
        const optionByName = this.page.locator(
          S.adminLogin.orgProducts.productOptionByText(courseName),
        );
        await expect(optionByName.first()).toBeVisible({ timeout: 8000 });
        await optionByName.first().click();
      }

      await clickIfPresent(this, S.adminLogin.orgProducts.organizationPayLabel);
      await clickIfPresent(this, S.adminLogin.orgProducts.unlimitedRadio);

      const submitted = await clickIfPresent(
        this,
        S.adminLogin.orgProducts.submitAddProduct,
      );
      if (!submitted)
        throw new Error("Submit Add Product button (#submitBtn) not found.");

      let flashText = "";
      const flashLocator = this.page.locator(
        S.adminLogin.orgProducts.flashSuccess.join(', '),
      );
      const flashVisible = await flashLocator
        .first()
        .isVisible({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (flashVisible)
        flashText = (await flashLocator.first().innerText()).trim();

      await this.page.waitForLoadState("domcontentloaded").catch(() => { });
      await this.page.waitForTimeout(1000);
      await attachCombinedReportBlock(
        `Course added: ${courseId} (${courseName})`,
        flashText,
      );
    }
  },
);

Then("Navigate to manage students page", async function (this: ICustomWorld) {
  const ok = await clickIfPresent(
    this,
    S.adminLogin.manageStudents.manageStudentsNav,
  );
  if (!ok) throw new Error("Manage Students nav not found.");
});

Then(
  "Import {int} students from file {string}",
  async function (this: ICustomWorld, count: number, fileName: string) {
    if (!count || count <= 0)
      throw new Error(`Invalid student count: ${count}`);

    await this.page.waitForLoadState("domcontentloaded").catch(() => { });
    await this.page.evaluate(() => window.scrollTo(0, 0)).catch(() => { });
    await this.page.waitForTimeout(300);

    let importClicked = await clickIfPresent(
      this,
      S.adminLogin.manageStudents.importDemographicBtn,
    );

    if (!importClicked) {
      const importBtnByRole = this.page.getByRole("button", {
        name: /import demographic data/i,
      });
      const importLinkByRole = this.page.getByRole("link", {
        name: /import demographic data/i,
      });

      if (
        await importBtnByRole
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await importBtnByRole
          .first()
          .scrollIntoViewIfNeeded()
          .catch(() => { });
        await importBtnByRole.first().click();
        importClicked = true;
      } else if (
        await importLinkByRole
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await importLinkByRole
          .first()
          .scrollIntoViewIfNeeded()
          .catch(() => { });
        await importLinkByRole.first().click();
        importClicked = true;
      }
    }

    if (!importClicked) {
      await this.attach(
        `❌ Import Demographic Data not found on: ${this.page.url()}`,
        "text/plain",
      );
      throw new Error("Import Demographic Data button not found.");
    }

    await this.page.waitForLoadState("domcontentloaded").catch(() => { });
    await this.page.waitForTimeout(500);

    const downloadsDir = path.resolve("reports/_tmp/downloads");
    ensureDir(downloadsDir);

    const downloadLinkByRole = this.page.getByRole("link", {
      name: /click here to download/i,
    });
    const downloadLinkVisible = await downloadLinkByRole
      .first()
      .isVisible()
      .catch(() => false);

    let templateDownload: any = null;

    try {
      const [dl] = await Promise.all([
        this.page.waitForEvent("download", { timeout: 30000 }),
        (async () => {
          if (downloadLinkVisible) {
            await downloadLinkByRole
              .first()
              .scrollIntoViewIfNeeded()
              .catch(() => { });
            await downloadLinkByRole.first().click();
            return;
          }

          const ok = await clickIfPresent(
            this,
            S.adminLogin.manageStudents.downloadTemplateLink,
          );
          if (!ok) {
            const anyCsvLink = this.page.locator(
              S.adminLogin.manageStudents.csvDownloadFallback.join(', '),
            );
            if ((await anyCsvLink.count().catch(() => 0)) > 0) {
              await anyCsvLink
                .first()
                .scrollIntoViewIfNeeded()
                .catch(() => { });
              await anyCsvLink.first().click();
              return;
            }
            throw new Error("Download template link not clickable.");
          }
        })(),
      ]);
      templateDownload = dl;
    } catch {
      templateDownload = null;
    }

    if (!templateDownload) {
      const links = await this.page
        .locator("a")
        .allInnerTexts()
        .catch(() => []);
      await this.attach(
        `❌ Download template link not found.\nURL: ${this.page.url()}\n\nLinks on page:\n` +
        links
          .filter(Boolean)
          .map((t: string) => `- ${t}`)
          .join("\n"),
        "text/plain",
      );
      throw new Error("Download template link not found.");
    }

    const runName =
      String(process.env.RUN_NAME || process.env.REPORT_NAME || "").trim() ||
      new Date().toISOString().replace(/[:.]/g, "-");
    const suggested = templateDownload.suggestedFilename?.() || "template.csv";

    // Create a unique template path for THIS specific worker thread to avoid collision
    const uniqueThreadId = `${process.pid}_${Math.floor(Math.random() * 100000)}`;
    const templatePath = path.join(downloadsDir, `${runName}_${uniqueThreadId}_${suggested}`);

    await templateDownload.saveAs(templatePath);

    await this.page.waitForLoadState("networkidle").catch(() => { });
    await this.page.waitForTimeout(500);

    const templateText = fs.readFileSync(templatePath, "utf-8");
    const headers = parseCsvHeader(templateText);
    if (!headers.length)
      throw new Error("Downloaded template CSV header is empty/unreadable.");

    const createdUsers: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      orgUnitNames?: string;
    }> = [];
    const base = Date.now();

    for (let i = 0; i < count; i++) {
      const suf = `${base}${i}${Math.floor(Math.random() * 1000)}`.slice(-20);
      const firstName = `auto_first_${suf}`.slice(0, 49);
      const lastName = `auto_last_${suf}`.slice(0, 49);
      const userId = `${firstName}@rqimail.laerdalblr.in`;
      const email = `${firstName}@rqimail.laerdalblr.in`;
      const orgUnitNames = `L1_${suf}|L2_${suf}|L3_${suf}`;
      createdUsers.push({ userId, firstName, lastName, email, orgUnitNames });
    }

    const rows: string[] = [headers.join(",")];
    for (const u of createdUsers) {
      const values: Record<string, string> = {};
      values["org unit names"] = u.orgUnitNames ?? "";
      values["userid"] = u.userId;
      values["user id"] = u.userId;
      values["first name"] = u.firstName;
      values["firstname"] = u.firstName;
      values["last name"] = u.lastName;
      values["lastname"] = u.lastName;
      values["email"] = u.email;
      values["status : active or inactive"] = "Active";
      values["status"] = "Active";
      rows.push(buildRowByHeader(headers, values));
    }

    // =================================================================================
    // THE FIX: Guarantee file isolation so parallel workers never overwrite each other
    // =================================================================================
    const safeFileName = fileName.replace('.csv', '');
    const generatedPath = path.join(downloadsDir, `${runName}_${safeFileName}_${uniqueThreadId}.csv`);

    fs.writeFileSync(generatedPath, rows.join("\n"), "utf-8");

    this.importedUserEmail = createdUsers[0].email;
    this.importedUserFirstName = createdUsers[0].firstName;
    this.importedUserLastName = createdUsers[0].lastName;

    await this.attach(
      `✅ Created ${createdUsers.length} users:\n` +
      createdUsers
        .map(
          (u) => `${u.userId} | ${u.firstName} | ${u.lastName} | ${u.email}`,
        )
        .join("\n"),
      "text/plain",
    );

    let fileInput = this.page
      .locator(S.adminLogin.manageStudents.chooseFileInput[0])
      .first();
    const isHidden = await fileInput
      .evaluate((el: Element) => (el as HTMLInputElement).offsetParent === null)
      .catch(() => true);

    if (isHidden)
      fileInput = this.page.locator(S.adminLogin.manageStudents.hiddenFileInput.join(', ')).first();
    await fileInput.setInputFiles(generatedPath);

    // ==========================================
    // ✅ Upload CSV: Robust Locator Resolution
    // ==========================================
    await this.page.waitForTimeout(1000);

    const uploadSelectors = S.adminLogin.manageStudents.uploadBtn;
    let uploadLoc = null;

    for (const sel of uploadSelectors) {
      const loc = this.page.locator(sel).first();
      if ((await loc.count().catch(() => 0)) > 0) {
        uploadLoc = loc;
        break;
      }
    }

    if (!uploadLoc) {
      const inputUpload = this.page
        .locator(
          S.adminLogin.manageStudents.inputUploadBtn.join(', '),
        )
        .first();
      if ((await inputUpload.count().catch(() => 0)) > 0)
        uploadLoc = inputUpload;
    }

    if (!uploadLoc) {
      const anyUpload = this.page
        .locator(S.adminLogin.manageStudents.anyUploadBtn.join(', '))
        .first();
      if ((await anyUpload.count().catch(() => 0)) > 0) uploadLoc = anyUpload;
    }

    if (!uploadLoc) {
      const btnTexts = await this.page
        .locator("button, input[type=submit], input[type=button], a")
        .allInnerTexts()
        .catch(() => []);
      await this.attach(
        `❌ Upload button not found.\nURL: ${this.page.url()}\n\nClickable texts found:\n` +
        btnTexts
          .filter(Boolean)
          .map((t: string) => `- ${t.trim()}`)
          .join("\n"),
        "text/plain",
      );
      throw new Error("Upload button not found.");
    }

    await uploadLoc.scrollIntoViewIfNeeded().catch(() => { });
    await this.page.waitForTimeout(300);
    await expect(uploadLoc)
      .toBeEnabled({ timeout: 15000 })
      .catch(() => { });
    await uploadLoc.click().catch(async () => {
      await uploadLoc.click({ force: true }).catch(() => { });
    });

    // ==========================================
    // ✅ Success Modal Handling (Fixed Locator)
    // ==========================================
    const successMsg = this.page
      .locator(S.adminLogin.manageStudents.importSuccessMsg.join(', '))
      .first();

    // Wait for the background processing to finish
    await expect(successMsg).toBeVisible({ timeout: 60000 });

    const statusModal = this.page
      .locator(".modal-content")
      .filter({ has: successMsg })
      .first();

    let statusText = "";
    if (await statusModal.isVisible().catch(() => false)) {
      statusText = (await statusModal.innerText().catch(() => "")).trim();
    } else {
      statusText = (await successMsg.innerText().catch(() => "")).trim();
    }

    await this.attach(
      `✅ Import Status Popup (Success):\n${statusText || "(no text)"}`,
      "text/plain",
    );

    // Close the Success Modal so it doesn't block the Search button
    let statusCloseBtn = statusModal
      .locator(
        S.adminLogin.manageStudents.modalCloseBtn.join(', '),
      )
      .first();
    if (!(await statusCloseBtn.isVisible().catch(() => false))) {
      statusCloseBtn = statusModal.locator(S.adminLogin.manageStudents.modalCloseBtnX.join(', ')).first();
    }

    if (await statusCloseBtn.isVisible().catch(() => false)) {
      await statusCloseBtn.click({ force: true }).catch(() => { });
      await expect(statusModal)
        .toBeHidden({ timeout: 20000 })
        .catch(() => { });
    }

    // Give UI a moment to clear the modal overlay
    await this.page.waitForTimeout(1000);

    const flash = await tryGetFlashText(this.page);
    if (flash) {
      await this.attach(`✅ Import success message:\n${flash}`, "text/plain");
    } else {
      await this.attach(
        "⚠️ No import success message displayed.",
        "text/plain",
      );
    }

    // ==========================================
    // ✅ Search Execution & Validation
    // ==========================================
    const statusSelect = this.page
      .locator("select")
      .filter({ has: this.page.locator("option", { hasText: "Active" }) })
      .first();
    await expect(statusSelect).toBeVisible({ timeout: 20000 });

    // Select Active
    await statusSelect.selectOption({ label: "Active" }).catch(async () => {
      await statusSelect.selectOption("Active").catch(() => { });
    });

    await this.page.waitForTimeout(1000); // Crucial wait for UI to unlock after select

    // Find the Search Button
    let searchBtnLoc = null;
    const selectorsToTry = [
      ...(S.adminLogin.manageStudents.searchBtn || []),
      "button:has(.glyphicon-search)",
      "button:has(.fa-search)",
      "button:has(svg)", // Modern React/Angular SVG icons
      ".glyphicon-search", // Click the icon directly if button is hidden
      ".fa-search", // Click the icon directly
      'button[title*="Search" i]',
      'button[aria-label*="search" i]',
    ];

    // Pass 1: Try explicit selectors
    for (const sel of selectorsToTry) {
      const loc = this.page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        searchBtnLoc = loc;
        break;
      }
    }

    // Pass 2: The Structural Safety Net (Restored!)
    if (!searchBtnLoc) {
      const btnAfterSelect = statusSelect
        .locator("xpath=following::button[1]")
        .first();
      if (await btnAfterSelect.isVisible().catch(() => false)) {
        searchBtnLoc = btnAfterSelect;
      }
    }

    if (!searchBtnLoc) {
      throw new Error(
        "Could not locate the Search button. Check UI for changes.",
      );
    }

    // Click aggressively to bypass overlapping toast messages
    await searchBtnLoc.scrollIntoViewIfNeeded().catch(() => { });
    await searchBtnLoc.dispatchEvent("click").catch(async () => {
      await searchBtnLoc.click({ force: true }).catch(() => { });
    });

    // Wait for the AJAX call / DataTables render
    await this.page.waitForLoadState("networkidle").catch(() => { });
    await this.page.waitForTimeout(2000);

    // Validation: Did the empty state disappear?
    const emptyStateText = this.page.locator(
      S.adminLogin.manageStudents.emptyStateText.join(', '),
    );
    if (await emptyStateText.isVisible().catch(() => false)) {
      // Retry click if it didn't register
      await searchBtnLoc.click({ force: true }).catch(() => { });
      await this.page.waitForTimeout(2000);
    }

    // Locate the Results Table directly by its ID to prevent hidden match errors
    const resultsTable = this.page
      .locator(S.adminLogin.manageStudents.resultsTable.join(', '))
      .first();

    // Check if the table is hidden because of a "No records found" state
    const noRecords = this.page
      .locator(S.adminLogin.manageStudents.noRecordsText.join(', '))
      .first();
    if (await noRecords.isVisible().catch(() => false)) {
      throw new Error(
        "Search returned 0 results. The background import may have failed or is delayed.",
      );
    }

    await expect(resultsTable).toBeVisible({ timeout: 20000 });

    const tbody = resultsTable.locator("tbody");
    await expect(tbody)
      .toBeVisible({ timeout: 20000 })
      .catch(() => { });

    const readCurrentPageUserIds = async (): Promise<Set<string>> => {
      const ids = new Set<string>();
      const rows = tbody.locator("tr");
      const rowTexts = await rows.allInnerTexts().catch(() => []);
      for (const txt of rowTexts) {
        if (!txt) continue;
        for (const u of createdUsers) {
          if (txt.includes(u.userId)) ids.add(u.userId);
        }
      }
      return ids;
    };

    const clickNextIfEnabled = async (): Promise<boolean> => {
      const nextBtn = this.page
        .locator(S.adminLogin.manageStudents.paginationContainer.join(', '))
        .locator(S.adminLogin.manageStudents.paginationNextBtn.join(', '))
        .first();
      if ((await nextBtn.count().catch(() => 0)) === 0) return false;

      const disabled = await nextBtn
        .evaluate((el: Element) => {
          const a = el as HTMLElement;
          return (
            a.getAttribute("aria-disabled") === "true" ||
            /disabled/i.test(a.className || "") ||
            /disabled/i.test(a.parentElement?.className || "")
          );
        })
        .catch(() => false);

      if (disabled) return false;
      await nextBtn.click().catch(async () => {
        await nextBtn.click({ force: true }).catch(() => { });
      });
      await this.page.waitForTimeout(800);
      return true;
    };

    const page1 = this.page
      .locator(S.adminLogin.manageStudents.paginationContainer.join(', '))
      .locator(S.adminLogin.manageStudents.paginationPage1Btn.join(', '))
      .first();
    if ((await page1.count().catch(() => 0)) > 0) {
      await page1.click().catch(() => { });
      await this.page.waitForTimeout(500);
    }

    const seen = new Set<string>();
    let safety = 0;

    do {
      const ids = await readCurrentPageUserIds();
      ids.forEach((x) => seen.add(x));
      safety++;
      if (safety > 25) break;
    } while (await clickNextIfEnabled());

    const expectedIds = createdUsers.map((u) => u.userId);
    const missing = expectedIds.filter((id) => !seen.has(id));

    if (missing.length > 0) {
      const snap = (await resultsTable.innerText().catch(() => "")).trim();
      await this.attach(
        `❌ Missing imported users.\nMissing:\n` +
        missing.map((m) => `- ${m}`).join("\n") +
        `\n\nTable Snapshot:\n` +
        snap.slice(0, 1200),
        "text/plain",
      );
      throw new Error(
        `Some imported users not found in results table (${missing.length}).`,
      );
    }

    await this.attach(
      `✅ All imported users found. Expected: ${expectedIds.length}, Seen: ${seen.size}`,
      "text/plain",
    );

    deleteIfExists(generatedPath);
    deleteIfExists(templatePath);

    await this.attach(
      `🧹 Cleaned up files:\n- ${generatedPath}\n- ${templatePath}`,
      "text/plain",
    );
  },
);