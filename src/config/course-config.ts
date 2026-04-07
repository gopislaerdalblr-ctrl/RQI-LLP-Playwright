import fs from "node:fs";
import path from "node:path";

export type CourseConfig = {
  courseName: string;
  courseId: string;
  defaultTags?: string;
};

export function readCourseConfig(): CourseConfig {
  const p = path.resolve("src/config/course.json");
  const raw = fs
    .readFileSync(p, "utf-8")
    .replace(/^\uFEFF/, "") 
    .trim();

  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`course.json is not valid JSON. Error: ${(e as Error).message}`);
  }
}

