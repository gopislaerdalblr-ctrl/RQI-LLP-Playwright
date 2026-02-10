import { loadApiDump } from "./api-loader";
import { HttpClient } from "./http-client";

export type CourseCompletionInput = {
  sourcedId: string;
  score?: string | number;        // default: 1
  messageId?: string;             // default: timestamp-based
};

function renderTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

export async function sendCourseCompletion(input: CourseCompletionInput) {
  const instance = (process.env.INSTANCE || "maurya").toLowerCase();
  const dump = loadApiDump(instance);

  const url = dump.url as string;
  const headers = (dump.headers || {}) as Record<string, string>;

  const messageId =
    input.messageId || String(Date.now());

  const xml = renderTemplate(dump.xmlTemplate as string, {
    SOURCED_ID: input.sourcedId,
    SCORE: String(input.score ?? 1),
    MESSAGE_ID: messageId
  });

  const http = new HttpClient();
  await http.init({
    // Full URL is used in post() below; no baseUrl required.
    headers
  });

  const res = await http.post(url, xml, {
    ...headers,
    "Content-Type": headers["Content-Type"] || "application/xml"
  });

  const status = res.status();
  const text = await res.text();

  await http.dispose();

  return { status, text };
}
