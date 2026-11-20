import { creatorTransportDiagnostics } from "./pathway-creator-diagnostics";
const PHASES = ["setup", "student-create", "intake-create", "report-create", "source-readback", "browser-signin", "reader-open", "suggest-click", "suggest-wait", "suggest-review", "translate-click", "translate-wait", "translate-review", "source-restore", "source-compare", "private-access", "complete"] as const;
export type ReportAssistPhase = typeof PHASES[number];
/** Fixed error categories only; never retain a toast, message, URL, body, header or stack. */
export function reportAssistUiFailure(text: string) {
  if (!text.trim()) return "none";
  for (const [pattern, code] of [
    [/Invalid name/i, "invalid-name"], [/not ready for (?:translation|next-step)/i, "report-context"],
    [/too long (?:to translate|for next-step)/i, "context-size"], [/sign-in changed/i, "viewer-changed"],
    [/AI service is not configured/i, "unconfigured"], [/AI is busy/i, "busy"], [/AI usage limit/i, "usage-limit"],
    [/couldn't generate next steps/i, "suggestions-failed"], [/couldn't translate the complete report/i, "translation-failed"],
  ] as const) if (pattern.test(text)) return code;
  return "unrecognized";
}
export function reportAssistDiagnostics() {
  const transport = creatorTransportDiagnostics();
  let phase: ReportAssistPhase = "setup";
  const uiErrors = new Set<string>();
  return {
    transport,
    step(next: ReportAssistPhase) { if (!(PHASES as readonly string[]).includes(next)) throw Error("Invalid diagnostic phase"); phase = next; },
    observingAction() { return ["suggest-click", "suggest-wait", "translate-click", "translate-wait"].includes(phase); },
    visibleError(text: string) { const code = reportAssistUiFailure(text); if (code !== "none" && uiErrors.size < 10) uiErrors.add(code); return code; },
    snapshot(error: unknown) { return { phase, ...transport.snapshot(error), visibleErrorCodes: [...uiErrors] }; },
  };
}
