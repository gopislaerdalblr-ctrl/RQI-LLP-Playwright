import fs from "node:fs";
import path from "node:path";

export type EnvName = "qa" | "preprod";

export type InstanceConfig = {
  env: EnvName;
  baseUrl: string;
  subdomain: string;
  orgId: string;
};

export type Secrets = {
  adminEmail: string;
  adminPassword: string;
};

export type CourseConfig = {
  courseName: string;
  courseId?: string;
  defaultTags?: string;
};

type InstancesFile = Record<string, InstanceConfig>;

function sanitizeJsonText(raw: string): string {
  // Remove UTF-8 BOM if present and any null characters
  return raw.replace(/^\uFEFF/, "").replace(/\u0000/g, "");
}

function readJson<T>(p: string): T {
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(sanitizeJsonText(raw)) as T;
}

export function loadInstance(instanceName: string): InstanceConfig {
  const filePath = path.resolve(__dirname, "instances.json");
  const instances = readJson<InstancesFile>(filePath);
  const cfg = instances[instanceName];

  if (!cfg) {
    const names = Object.keys(instances).join(", ");
    throw new Error(`Unknown instance "${instanceName}". Available: ${names}`);
  }
  return cfg;
}

export function loadSecrets(env: EnvName): Secrets {
  const filePath = path.resolve(__dirname, `../data/secrets/${env}.json`);
  return readJson<Secrets>(filePath);
}

export function loadCourseConfig(): CourseConfig {
  const filePath = path.resolve(__dirname, "course.json");
  return readJson<CourseConfig>(filePath);
}
