export function extractSourceId(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.searchParams.get("sourceId") || undefined;
  } catch {
    return undefined;
  }
}
