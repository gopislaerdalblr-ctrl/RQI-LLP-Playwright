import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve(process.cwd(), "src/config/executionUsers.json");

export interface ExecutionUser {
  courseName: string;
  UserId: string;
  UserFirstName: string;
  UserLastName: string;
  UserEmailId: string;
  Password: string;
  executionTimestamp?: string;
}

export function saveCreatedUser(userData: ExecutionUser) {
  let registry: ExecutionUser[] = [];

  // 1. Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 2. Read existing users
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      registry = JSON.parse(fileContent);
    } catch (e) {
      registry = [];
    }
  }

  // 3. Add new user with timestamp
  const newUserEntry: ExecutionUser = {
    executionTimestamp: new Date().toLocaleString(),
    ...userData,
  };

  registry.push(newUserEntry);

  // 4. Maintenance: Rolling log (Max 50)
  if (registry.length > 50) {
    registry.shift();
  }

  // 5. Save back to file
  fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), "utf-8");
  return newUserEntry;
}

/**
 * Fetches users created during the current execution context or by course name
 */
export function getRegisteredUsersByCourse(
  courseName: string,
): ExecutionUser[] {
  if (!fs.existsSync(filePath)) return [];
  const registry: ExecutionUser[] = JSON.parse(
    fs.readFileSync(filePath, "utf-8"),
  );
  return registry.filter((u) => u.courseName === courseName);
}
