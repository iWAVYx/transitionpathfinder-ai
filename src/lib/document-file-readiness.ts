/** Readiness does not grant permission. Callers must separately enforce current
 * student/document access and storage RLS. Previously minted URLs may outlive a
 * later state change; this guard only prevents issuing a new application link. */
export function assertDocumentFileReady(document: { scan_status?: unknown; scan_verdict?: unknown }): void {
  const verdict = document.scan_verdict;
  const code = verdict && typeof verdict === "object" && !Array.isArray(verdict)
    ? (verdict as Record<string, unknown>).code : null;
  if (document.scan_status !== "clean" || code === "infected") {
    throw new Error("This file is unavailable because its security review is incomplete or blocked.");
  }
}
