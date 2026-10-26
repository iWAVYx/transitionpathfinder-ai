import { expect, it } from "vitest";
import { reportAssistDiagnostics, reportAssistUiFailure } from "../e2e/helpers/report-assist-diagnostics";
it.each([
 ["Invalid name: PRIVATE PERSON", "invalid-name"], ["This report is not ready for translation", "report-context"],
 ["This report is too long for next-step suggestions", "context-size"], ["Your sign-in changed", "viewer-changed"],
 ["AI service is not configured.", "unconfigured"], ["The AI is busy right now", "busy"], ["AI usage limit reached", "usage-limit"],
 ["We couldn't generate next steps right now.", "suggestions-failed"], ["We couldn't translate the complete report.", "translation-failed"],
 ["PRIVATE content bearer token unknown detail", "unrecognized"], ["", "none"],
])("retains only a fixed UI failure category %#", (text, code) => expect(reportAssistUiFailure(text)).toBe(code));
it("retains the primary stage and request metadata without private exception or toast text", () => {
 const d = reportAssistDiagnostics(); d.step("suggest-wait"); d.transport.started(); d.transport.response(200); d.transport.finished();
 d.visibleError("Invalid name PRIVATE PERSON with token");
 const error = Object.assign(new Error("PRIVATE request body"), { name: "TimeoutError", headers: { token: "PRIVATE" }, url: "PRIVATE" });
 expect(d.snapshot(error)).toMatchObject({ phase: "suggest-wait", primaryFailureKind: "timeout", startedPostRequests: 1, finishedPostRequests: 1, pendingPostRequests: 0, postResponseStatuses: [200], visibleErrorCodes: ["invalid-name"] });
 expect(JSON.stringify(d.snapshot(error))).not.toMatch(/PRIVATE|PERSON|headers|url|stack|message|body|token/);
 const s = d.snapshot(error); s.visibleErrorCodes.push("private"); expect(d.snapshot(error).visibleErrorCodes).toEqual(["invalid-name"]);
});
it("observes requests only during fixed action stages and rejects arbitrary diagnostic data", () => {
 const d = reportAssistDiagnostics(); expect(d.observingAction()).toBe(false);
 for (const step of ["suggest-click", "suggest-wait", "translate-click", "translate-wait"] as const) { d.step(step); expect(d.observingAction()).toBe(true); }
 d.step("source-compare"); expect(d.observingAction()).toBe(false);
 expect(() => d.step("PRIVATE URL" as any)).toThrow("Invalid diagnostic phase"); expect(d.snapshot(null).phase).toBe("source-compare");
});
it("deduplicates visible errors and keeps request evidence bounded", () => {
 const d = reportAssistDiagnostics(); for(let i=0;i<100;i++) { d.visibleError("PRIVATE unknown message"); d.transport.started(); d.transport.response(500); }
 expect(d.snapshot(null)).toMatchObject({visibleErrorCodes:["unrecognized"],startedPostRequests:16,postResponseStatuses:Array(16).fill(500)});
});
