import fs from "node:fs";
import path from "node:path";

export type ApiDump = {
  // Keep flexible until you share the dump format
  baseUrl?: string;
  endpoints?: Record<string, any>;
  [key: string]: any;
};

export function loadApiDump(instanceName: string): ApiDump {
  const file = path.resolve("src", "api", "dumps", `${instanceName}.json`);

  if (!fs.existsSync(file)) {
    const existing = fs
      .readdirSync(path.resolve("src", "api", "dumps"))
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""))
      .sort();

    throw new Error(
      `API dump not found for instance "${instanceName}". Expected: ${file}\n` +
      `Available dumps: ${existing.length ? existing.join(", ") : "(none)"}`
    );
  }

  const raw = fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, "").replace(/\u0000/g, "");
  return JSON.parse(raw) as ApiDump;
}
