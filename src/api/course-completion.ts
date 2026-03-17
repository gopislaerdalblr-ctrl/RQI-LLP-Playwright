import { loadApiDump } from "./api-loader";
import { HttpClient } from "./http-client";
import fs from "node:fs";
import path from "node:path";

export type CourseCompletionInput = {
  sourcedId: string;
  score?: string | number; // default: 1
  messageId?: string; // default: timestamp-based
};

/**
 * Reads the instance from the instance.json file.
 * This ensures the API matches whatever the runner is currently executing.
 */
function getActiveInstance(): string {
  try {
    const configPath = path.resolve("instance.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      // Adjust 'instance' to match the key name in your JSON (e.g., 'activeInstance' or 'name')
      return (
        config.instance ||
        config.activeInstance ||
        "maurya"
      ).toLowerCase();
    }
  } catch (err) {
    console.warn(
      "Could not read instance.json, falling back to process.env or default.",
    );
  }
  return (process.env.INSTANCE || "maurya").toLowerCase();
}

function renderTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/**
 * Enterprise Course Completion Sender:
 * Automatically detects the current instance from instance.json and sends the XML payload.
 */
export async function sendCourseCompletion(input: CourseCompletionInput) {
  // ✅ DYNAMIC: No longer hardcoded to process.env
  const instance = getActiveInstance();
  const dump = loadApiDump(instance);

  const url = dump.url as string;
  const headers = (dump.headers || {}) as Record<string, string>;

  const messageId = input.messageId || String(Date.now());

  const xml = renderTemplate(dump.xmlTemplate as string, {
    SOURCED_ID: input.sourcedId,
    SCORE: String(input.score ?? 1),
    MESSAGE_ID: messageId,
  });

  const http = new HttpClient();
  await http.init({
    headers,
  });

  const res = await http.post(url, xml, {
    ...headers,
    "Content-Type": headers["Content-Type"] || "application/xml",
  });

  const status = res.status();
  const text = await res.text();

  await http.dispose();

  return { status, text };
}
