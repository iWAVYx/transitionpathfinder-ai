// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ register: vi.fn(), interrupted:vi.fn(), reserve: vi.fn(), recover: vi.fn(), preflight: vi.fn(), upload: vi.fn(), refresh: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn(), file: null as any, reviewConfirm: null as any, hash: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: any) => <a>{children}</a> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload: api.upload }) } } }));
vi.mock("@/lib/documents.functions", () => ({ registerDocument: api.register, reserveDocumentUpload: api.reserve, recoverDocumentUpload: api.recover, recoverInterruptedDocumentUpload:api.interrupted, assertCanUploadForStudent: api.preflight }));
vi.mock("@/lib/document-upload-fingerprint", () => ({ MAX_PRIVACY_SAFE_DOCUMENT_BYTES:20*1024*1024, documentUploadFingerprint: api.hash }));
vi.mock("@/lib/protected-file-uploads", () => ({ PROTECTED_FILE_UPLOADS_ENABLED: true, PROTECTED_FILE_UPLOADS_MESSAGE: "Paused" }));
vi.mock("@/components/privacy/SensitiveFilePrivacyReviewDialog", () => ({ SensitiveFilePrivacyReviewDialog: ({ source, onConfirm }: any) => {
  if (source) api.reviewConfirm = onConfirm;
  return source ? <button onClick={() => onConfirm({ file: api.file })}>Approve fictional copy</button> : null;
} }));
vi.mock("@/components/students/DocumentPermissionsDialog", () => ({ DocumentPermissionsDialog: () => null }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error, info: api.info } }));
import { FamilyDocumentUpload } from "../../src/components/students/FamilyDocumentUpload";
import { rememberUploadInterruption, readUploadInterruption } from "../../src/lib/document-upload-interruption";
import { DOCUMENT_UPLOAD_UNCONFIRMED } from "../../src/lib/document-upload-outcome";
const student = "11111111-1111-4111-8111-111111111111";
function receipt(patch: object = {}) { return { id: "22222222-2222-4222-8222-222222222222", student_id: student,
  storage_path: `${student}/44444444-4444-4444-8444-444444444444-privacy-safe-document.txt`, scan_status: "clean", review_status: "pending_review", archived_at: null, deleted_at: null, ...patch }; }
function pending() { let resolve!: (value: any) => void, reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => {
  window.sessionStorage.clear();
  vi.resetAllMocks(); api.interrupted.mockRejectedValue(new Error("PRIVATE unknown interrupted upload")); vi.spyOn(crypto, "randomUUID").mockReturnValue("44444444-4444-4444-8444-444444444444"); api.hash.mockResolvedValue("a".repeat(64));
  api.file = new File(["Fictional reviewed routine: two steps using written directions."], "privacy-safe-document.txt", { type: "text/plain" });
  api.reserve.mockImplementation(async({data}:any)=>({schema:"document-upload-reservation-v1",attempt_id:data.attempt_id,actor_id:data.expected_viewer_id,student_id:data.student_id,storage_path:`${data.student_id}/${data.attempt_id}-privacy-safe-document.txt`,state:"reserved",review_context_sha256:"b".repeat(64)})); api.recover.mockRejectedValue(new Error("PRIVATE unavailable status"));
  api.preflight.mockResolvedValue({ ok: true }); api.upload.mockResolvedValue({ error: null }); api.register.mockResolvedValue(receipt()); api.refresh.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function open() {
  const view = render(<FamilyDocumentUpload viewerId="current-viewer" studentId={student} studentFirstName="Fictional" docs={[]} onChange={api.refresh} />);
  fireEvent.change(screen.getByLabelText("Short title (optional)"), { target: { value: "Fictional planning notes" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Acknowledge privacy notice" }));
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [api.file] } });
  return { ...view, input, approve: () => fireEvent.click(screen.getByRole("button", { name: "Approve fictional copy" })) };
}
it("reports a persisted clean scan as saved without claiming educational approval or summary completion", async () => {
  const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.success).toHaveBeenCalledWith("Document saved. Review its status in the document list."));
  expect(api.refresh).toHaveBeenCalledOnce(); expect(api.error).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("");
});
it("keeps a pending security review blocked without success or completion wording", async () => {
  api.register.mockResolvedValue(receipt({ scan_status: "pending" })); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith(DOCUMENT_UPLOAD_UNCONFIRMED));
  expect(api.success).not.toHaveBeenCalled(); expect(api.refresh).not.toHaveBeenCalled();expect(view.input.disabled).toBe(true);
});
it.each([
  { scan_status: "failed" }, { scan_status: "infected" }, { scan_status: "deleted" },
  { review_status: "rejected" }, { archived_at: "2026-10-27" }, { deleted_at: "2026-10-27" },
])("does not congratulate a blocked or archived upload (%j)", async patch => {
  api.register.mockResolvedValue(receipt(patch)); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith("This file could not be cleared for use. Review its status before trying again."));
  expect(api.success).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled(); expect(api.refresh).toHaveBeenCalledOnce();
});
it.each([null, {}, receipt({ student_id: "33333333-3333-4333-8333-333333333333" }), receipt({ storage_path: "another-file" }), receipt({ scan_status: "unknown" })])("pauses an unconfirmed receipt without clearing or replaying the upload (%j)", async value => {
  api.register.mockResolvedValue(value); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("An earlier upload still needs confirmation"));
  expect(view.input.disabled).toBe(true); expect(api.refresh).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("Fictional planning notes");
  expect(api.upload).toHaveBeenCalledOnce(); expect(api.register).toHaveBeenCalledOnce();
});
it.each(["storage", "registration"])("does not expose or replay an uncertain %s error", async stage => {
  if (stage === "storage") api.upload.mockResolvedValue({ error: { message: "PRIVATE object path and filename" } });
  else api.register.mockRejectedValue(new Error("PRIVATE database details"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {}); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("An earlier upload still needs confirmation"));
  expect(api.success).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); expect(api.error.mock.calls.flat().join(" ")).not.toContain("PRIVATE");
  expect(api.upload).toHaveBeenCalledOnce(); expect(api.register).toHaveBeenCalledTimes(stage === "storage" ? 0 : 1); expect(view.input.disabled).toBe(true);
});
it("distinguishes a list refresh failure from an uncertain upload", async () => {
  api.refresh.mockRejectedValue(new Error("PRIVATE read error")); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith(expect.stringContaining("document list couldn't be refreshed")));
  expect(api.success).toHaveBeenCalledOnce(); expect(screen.queryByRole("alert")).toBeNull(); expect(view.input.disabled).toBe(false);
  expect(api.register).toHaveBeenCalledOnce();
});
it("stops before storage on permission failure and uses a friendly error", async () => {
  api.preflight.mockRejectedValue(new Error("PRIVATE access detail")); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith(expect.stringContaining("couldn't confirm permission to upload")));
  expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled(); expect(view.input.disabled).toBe(false);
});
it("blocks two synchronous confirmations before React updates busy state", async () => {
  const request = pending(); api.preflight.mockReturnValueOnce(request.promise); const view = open();
  const button = screen.getByRole("button", { name: "Approve fictional copy" });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  expect(api.preflight).toHaveBeenCalledOnce(); expect(api.upload).not.toHaveBeenCalled();
  await act(async () => request.resolve({ ok: true })); await waitFor(() => expect(api.register).toHaveBeenCalledOnce());
});
it("keeps upload controls absent for read-only users", () => {
  const view = render(<FamilyDocumentUpload viewerId="current-viewer" studentId={student} docs={[]} canEdit={false} onChange={api.refresh} />);
  expect(view.container.querySelector('input[type="file"]')).toBeNull(); expect(api.upload).not.toHaveBeenCalled();
});

function depart(view: ReturnType<typeof open>, change: string) {
  if (change === "leave") { view.unmount(); return; }
  view.rerender(<FamilyDocumentUpload viewerId={change === "account" ? "other-viewer" : "current-viewer"}
    studentId={change === "student" ? "33333333-3333-4333-8333-333333333333" : student}
    studentFirstName="New session" canEdit={change !== "access"} docs={[]} onChange={api.refresh} />);
}
it("binds both upload checks to the viewer who approved this file", async () => {
  const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.register).toHaveBeenCalledOnce());
  expect(api.preflight).toHaveBeenCalledWith({ data: { student_id: student, expected_viewer_id: "current-viewer", content_hash: "a".repeat(64) } });
  expect(api.register.mock.calls[0][0].data).toMatchObject({ student_id: student, expected_viewer_id: "current-viewer" });
});
it.each([null, {}, { ok: false }, { ok: true, duplicate: "yes" }])("does not store bytes without a confirmed preflight (%j)", async result => {
  api.preflight.mockResolvedValue(result); const view = open(); await act(async () => view.approve());
  expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled();
  expect(api.error).toHaveBeenCalledWith(expect.stringContaining("couldn't confirm permission to upload"));
});
it.each(["preflight", "storage", "registration"].flatMap(stage => ["student", "account", "access", "leave"].map(change => [stage, change])))
("stops after a departed %s request when %s changes", async (stage, change) => {
  const request = pending();
  if (stage === "preflight") api.preflight.mockReturnValueOnce(request.promise);
  if (stage === "storage") api.upload.mockReturnValueOnce(request.promise);
  if (stage === "registration") api.register.mockReturnValueOnce(request.promise);
  const view = open(); await act(async () => view.approve());
  await act(async () => depart(view, change));
  await act(async () => request.resolve(stage === "preflight" ? { ok: true } : stage === "storage" ? { error: null } : receipt()));
  expect(api.upload).toHaveBeenCalledTimes(stage === "preflight" ? 0 : 1);
  expect(api.register).toHaveBeenCalledTimes(stage === "registration" ? 1 : 0);
  expect(api.refresh).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled(); expect(api.error).not.toHaveBeenCalled();
  if (["student", "account"].includes(change)) expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("");
});
it.each(["preflight", "storage", "registration"])("ignores a late %s rejection after leaving", async stage => {
  const request = pending();
  if (stage === "preflight") api.preflight.mockReturnValueOnce(request.promise);
  if (stage === "storage") api.upload.mockReturnValueOnce(request.promise);
  if (stage === "registration") api.register.mockReturnValueOnce(request.promise);
  const view = open(); await act(async () => view.approve()); view.unmount();
  await act(async () => request.reject(new Error("PRIVATE late failure")));
  expect(api.error).not.toHaveBeenCalled(); expect(api.refresh).not.toHaveBeenCalled();
});
it.each(["student", "account", "access", "leave"])("rejects the old privacy approval callback after %s changes", async change => {
  const view = open(); const oldConfirm = api.reviewConfirm;
  await act(async () => depart(view, change));
  await act(async () => oldConfirm({ file: api.file }));
  expect(api.preflight).not.toHaveBeenCalled(); expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled();
});
it("does not report a late list-refresh failure in the new account session", async () => {
  const request = pending(); api.refresh.mockReturnValueOnce(request.promise);
  const view = open(); await act(async () => view.approve());
  expect(api.success).toHaveBeenCalledOnce(); await act(async () => depart(view, "account")); api.success.mockClear();
  await act(async () => request.reject(new Error("PRIVATE late refresh failure")));
  expect(api.error).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});

it("does not upload a verified duplicate or overwrite its metadata", async () => {
  api.preflight.mockResolvedValue({ ok: true, duplicate: true }); const view = open(); await act(async () => view.approve());
  expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
  expect(api.info).toHaveBeenCalledWith(expect.stringContaining("new upload details have not been saved"));
  expect(api.refresh).toHaveBeenCalledOnce(); expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("Fictional planning notes");
});
it("distinguishes a duplicate-list refresh failure from upload permission or save failure", async () => {
  api.preflight.mockResolvedValue({ ok: true, duplicate: true }); api.refresh.mockRejectedValue(new Error("PRIVATE refresh error"));
  const view = open(); await act(async () => view.approve());
  expect(api.error).toHaveBeenCalledWith("We found the existing file, but couldn't refresh the document list. Refresh this page to review it.");
  expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled(); expect(screen.queryByRole("alert")).toBeNull();
});
it("keeps fingerprint errors private and stops before permission or storage requests", async () => {
  api.hash.mockRejectedValue(new Error("PRIVATE content read")); const view = open(); await act(async () => view.approve());
  expect(api.error).toHaveBeenCalledWith("We couldn't prepare this privacy-safe copy. Choose it again before continuing.");
  expect(api.preflight).not.toHaveBeenCalled(); expect(api.upload).not.toHaveBeenCalled();
});
it.each(["student", "account", "access", "leave"])("does not start preflight after departing during local fingerprinting (%s)", async change => {
  const request = pending(); api.hash.mockReturnValueOnce(request.promise); const view = open(); await act(async () => view.approve());
  await act(async () => depart(view, change)); await act(async () => request.resolve("a".repeat(64)));
  expect(api.preflight).not.toHaveBeenCalled(); expect(api.upload).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled(); expect(api.error).not.toHaveBeenCalled();
});
it("uses different object IDs for separate attempts even without a clock change", async () => {
  api.register.mockImplementation(async ({ data }: any) => receipt({ storage_path: data.storage_path }));
  const view = open(); await act(async () => view.approve());
  vi.mocked(crypto.randomUUID).mockReturnValueOnce("55555555-5555-4555-8555-555555555555");
  fireEvent.change(view.input, { target: { files: [api.file] } }); await act(async () => view.approve());
  expect(api.upload).toHaveBeenCalledTimes(2); expect(api.upload.mock.calls[0][0]).not.toBe(api.upload.mock.calls[1][0]);
  expect(api.upload.mock.calls[1][2]).toMatchObject({ upsert: false });
  expect(api.register.mock.calls[1][0].data.content_hash).toBe("a".repeat(64));
});

it.each([null,{}, {schema:"old"}])("stops before storage and pauses an uncertain reservation %j",async value=>{
  api.reserve.mockResolvedValue(value);const view=open();await act(async()=>view.approve());
  expect(api.upload).not.toHaveBeenCalled();expect(api.register).not.toHaveBeenCalled();expect(view.input.disabled).toBe(true);expect(api.error).toHaveBeenCalledWith(DOCUMENT_UPLOAD_UNCONFIRMED);
});
it("does not replay an unknown reservation write or expose its error",async()=>{
  api.reserve.mockRejectedValue(new Error("PRIVATE reservation failure"));const view=open();await act(async()=>view.approve());
  expect(api.upload).not.toHaveBeenCalled();expect(view.input.disabled).toBe(true);expect(api.error.mock.calls.flat().join(" ")).not.toContain("PRIVATE");
  await act(async()=>api.reviewConfirm({file:api.file}));expect(api.reserve).toHaveBeenCalledOnce();
});
it.each(["pending","clean","failed"])("reconciles one lost registration response as %s without reupload or scan",async scan_status=>{
  api.register.mockRejectedValue(new Error("PRIVATE lost response"));api.recover.mockResolvedValue(receipt({scan_status}));const view=open();await act(async()=>view.approve());
  expect(api.reserve).toHaveBeenCalledOnce();expect(api.upload).toHaveBeenCalledOnce();expect(api.register).toHaveBeenCalledOnce();expect(api.recover).toHaveBeenCalledOnce();expect(api.refresh).toHaveBeenCalledTimes(scan_status==="pending"?0:1);
  expect(api.recover.mock.calls[0][0].data).toMatchObject({attempt_id:"44444444-4444-4444-8444-444444444444",review_context_sha256:"b".repeat(64),expected_viewer_id:"current-viewer"});
  expect(api.success).toHaveBeenCalledTimes(scan_status==="clean"?1:0);
});
it("freezes metadata while permission/reservation work is pending",async()=>{
  const request=pending();api.preflight.mockReturnValueOnce(request.promise);const view=open();await act(async()=>view.approve());
  fireEvent.change(screen.getByLabelText("Short title (optional)"),{target:{value:"Later changed title"}});
  await act(async()=>request.resolve({ok:true}));expect(api.reserve.mock.calls[0][0].data.title).toBe("Fictional planning notes");expect(api.register.mock.calls[0][0].data.title).toBe("Fictional planning notes");
});
it.each(["reservation","recovery"].flatMap(stage=>["student","account","access","leave"].map(change=>[stage,change])))("stops departed %s work after %s changes",async(stage,change)=>{
  const request=pending();if(stage==="reservation")api.reserve.mockReturnValueOnce(request.promise);else {api.register.mockRejectedValue(new Error("Lost"));api.recover.mockReturnValueOnce(request.promise);}
  const view=open();await act(async()=>view.approve());await act(async()=>depart(view,change));await act(async()=>request.resolve(stage==="reservation"?{}:receipt()));
  if(stage==="reservation")expect(api.upload).not.toHaveBeenCalled();expect(api.refresh).not.toHaveBeenCalled();expect(api.success).not.toHaveBeenCalled();expect(api.error).not.toHaveBeenCalled();
});


const attempt="44444444-4444-4444-8444-444444444444";
function statusReceipt(patch:object={}) {const row=receipt();return {...row,schema:"document-upload-registration-v1",actor_id:"current-viewer",attempt_id:attempt,document_id:row.id,...patch};}
function panel(viewer="current-viewer") {return <FamilyDocumentUpload viewerId={viewer} studentId={student} studentFirstName="Fictional" docs={[]} onChange={api.refresh} />;}
it("retains a reservation interruption through unmount/remount and never repeats its write",async()=>{
 const request=pending();api.reserve.mockReturnValueOnce(request.promise);const view=open();await act(async()=>view.approve());
 expect(readUploadInterruption("current-viewer",student)).toEqual({state:"pending",attemptId:attempt});view.unmount();
 const resumed=render(panel());await waitFor(()=>expect(api.interrupted).toHaveBeenCalledTimes(1));
 expect(resumed.container.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(true);
 expect(api.reserve).toHaveBeenCalledTimes(1);expect(api.upload).not.toHaveBeenCalled();expect(api.register).not.toHaveBeenCalled();
 await act(async()=>request.resolve({}));expect(api.upload).not.toHaveBeenCalled();expect(api.refresh).not.toHaveBeenCalled();expect(readUploadInterruption("current-viewer",student).state).toBe("pending");
});
it("checks an old reminder once and clears it only after the exact completed result",async()=>{
 rememberUploadInterruption("current-viewer",student,attempt);api.interrupted.mockResolvedValue(statusReceipt());const view=render(panel());
 await waitFor(()=>expect(api.refresh).toHaveBeenCalledTimes(1));expect(readUploadInterruption("current-viewer",student)).toEqual({state:"clear"});
 expect(view.container.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(false);
 expect(api.interrupted).toHaveBeenCalledExactlyOnceWith({data:{student_id:student,attempt_id:attempt,expected_viewer_id:"current-viewer"}});
 expect(api.reserve).not.toHaveBeenCalled();expect(api.upload).not.toHaveBeenCalled();expect(api.register).not.toHaveBeenCalled();expect(api.recover).not.toHaveBeenCalled();
});
it.each([null,{},statusReceipt({actor_id:"other-viewer"}),statusReceipt({attempt_id:"55555555-5555-4555-8555-555555555555"}),statusReceipt({scan_status:"pending"})])("retains a reminder for unclear or foreign restored status %#",async result=>{
 rememberUploadInterruption("current-viewer",student,attempt);api.interrupted.mockResolvedValue(result);const view=render(panel());
 await waitFor(()=>expect(api.interrupted).toHaveBeenCalledTimes(1));expect(view.container.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(true);
 expect(readUploadInterruption("current-viewer",student).state).toBe("pending");expect(api.refresh).not.toHaveBeenCalled();expect(api.reserve).not.toHaveBeenCalled();
});
it("manual status checks only read the old attempt and never replay failed work",async()=>{
 rememberUploadInterruption("current-viewer",student,attempt);render(panel());await waitFor(()=>expect((screen.getByRole("button",{name:"Check Upload Status"}) as HTMLButtonElement).disabled).toBe(false));
 api.interrupted.mockResolvedValueOnce(statusReceipt());await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Check Upload Status"})));
 expect(api.interrupted).toHaveBeenCalledTimes(2);expect(api.reserve).not.toHaveBeenCalled();expect(api.upload).not.toHaveBeenCalled();expect(api.register).not.toHaveBeenCalled();
 expect(readUploadInterruption("current-viewer",student).state).toBe("clear");
});
it("cannot clear the departed account's reminder from a late status response",async()=>{
 const request=pending();rememberUploadInterruption("current-viewer",student,attempt);api.interrupted.mockReturnValueOnce(request.promise);
 const view=render(panel());await waitFor(()=>expect(api.interrupted).toHaveBeenCalledTimes(1));view.rerender(panel("other-viewer"));
 await act(async()=>request.resolve(statusReceipt()));expect(readUploadInterruption("current-viewer",student).state).toBe("pending");expect(api.refresh).not.toHaveBeenCalled();expect(screen.queryByRole("alert")).toBeNull();
});
it("blocks before reservation when this tab cannot retain an attempt reminder",async()=>{
 vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw Error("PRIVATE");});const view=open();await act(async()=>view.approve());
 expect(api.reserve).not.toHaveBeenCalled();expect(api.upload).not.toHaveBeenCalled();expect(api.register).not.toHaveBeenCalled();expect(view.input.disabled).toBe(true);expect(api.error.mock.calls.flat().join(" ")).not.toContain("PRIVATE");
});
it("does not overlap initial read-only status checks in StrictMode",async()=>{
 rememberUploadInterruption("current-viewer",student,attempt);const request=pending();api.interrupted.mockReturnValueOnce(request.promise);
 render(<StrictMode>{panel()}</StrictMode>);await waitFor(()=>expect(api.interrupted).toHaveBeenCalledTimes(1));await act(async()=>request.reject(Error("PRIVATE")));expect(readUploadInterruption("current-viewer",student).state).toBe("pending");
});
