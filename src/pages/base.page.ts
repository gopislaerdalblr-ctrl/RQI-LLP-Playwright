import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  getRegisteredUsersByCourse,
  ExecutionUser,
} from "../utils/user-registry";

export class BasePage {
  protected page: Page;

  // Static cache prevents blocking disk I/O on parallel test runs
  private static cachedMoodleSecrets: any = null;

  constructor(page: Page) {
    this.page = page;
  }

  // Inherited method to access the user registry
  public getLatestUserForCourse(courseName: string): ExecutionUser | undefined {
    const users = getRegisteredUsersByCourse(courseName);
    return users.length > 0 ? users[users.length - 1] : undefined;
  }

  // Inherited method to safely fetch Moodle secrets (Cached)
  public getMoodleSecrets() {
    if (!BasePage.cachedMoodleSecrets) {
      const secretPath = path.resolve(
        process.cwd(),
        "src/data/secrets/moodle.json",
      );
      if (!fs.existsSync(secretPath)) {
        throw new Error(`Moodle secrets file not found at: ${secretPath}`);
      }
      // Read once and store in memory
      BasePage.cachedMoodleSecrets = JSON.parse(
        fs.readFileSync(secretPath, "utf-8"),
      );
    }
    return BasePage.cachedMoodleSecrets;
  }
}
