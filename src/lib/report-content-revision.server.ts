/** Read-version proof only: authorization always comes from the authenticated caller and RLS. */
export type ReportRevisionSource = { id: string; student_id?: string | null; content: unknown };
const reloadMessage = "This report has changed. Reload it before trying again.";

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, ordered((value as Record<string, unknown>)[key])]),
    );
  return value;
}

/** Includes the linked student so changing a report's context also invalidates old actions. */
export async function reportContentRevision(report: ReportRevisionSource): Promise<string> {
  const json = JSON.parse(
    JSON.stringify({
      id: report.id,
      student_id: report.student_id ?? null,
      content: report.content,
    }),
  );
  const bytes = new TextEncoder().encode(JSON.stringify(ordered(json)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Missing/old clients fail closed; no server read may replace the browser's observed revision. */
export async function assertObservedReportRevision(
  expected: unknown,
  report: ReportRevisionSource,
) {
  if (
    typeof expected !== "string" ||
    !/^[a-f0-9]{64}$/.test(expected) ||
    expected !== (await reportContentRevision(report))
  )
    throw new Error(reloadMessage);
}
