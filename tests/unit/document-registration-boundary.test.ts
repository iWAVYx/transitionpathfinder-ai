import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, gate: vi.fn(), from: vi.fn(), rpc: vi.fn(), pipeline: vi.fn(), sniff: vi.fn(), scan: vi.fn(), duplicate: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async ({ data }: any) => fn({ data: validate(data), context: api.context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/protected-file-uploads", () => ({ assertProtectedFileUploadsEnabled: api.gate }));
vi.mock("../../src/lib/document-upload-duplicate.server", () => ({ hasVerifiedDocumentDuplicate: api.duplicate }));
vi.mock("../../src/lib/document-pipeline.server", () => ({ recordPipelineRun: api.pipeline, newCorrelationId: () => "fictional-correlation" }));
vi.mock("../../src/lib/document-sniff.server", () => ({ sniffUploadedDocument: api.sniff }));
vi.mock("../../src/lib/document-av-scan.server", () => ({ scanUploadedDocument: api.scan }));
import { registerDocument, assertCanUploadForStudent } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const filename = "123-privacy-safe-document.txt";
const input = { student_id: student, title: "Fictional reviewed text", storage_path: `${student}/${filename}`, mime_type: "text/plain", consent_acknowledged: true };
const register = (patch: object = {}) => (registerDocument as any)({ data: { ...input, ...patch } });
beforeEach(() => {
  vi.resetAllMocks(); api.duplicate.mockResolvedValue(false);
  api.context = { userId: "current-viewer", supabase: { from: api.from, rpc: api.rpc } };
  api.rpc.mockResolvedValue({ data: true, error: null });
  // A stop after authorization proves invalid inputs never enter table/pipeline work.
  api.from.mockImplementation(() => { throw new Error("reached caller table boundary"); });
});
function noProcessing() {
  expect(api.from).not.toHaveBeenCalled(); expect(api.pipeline).not.toHaveBeenCalled();
  expect(api.sniff).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled();
}
it.each([
  `${other}/${filename}`, filename, `/${student}/${filename}`, `${student}/nested/${filename}`,
  `${student}/../${filename}`, `${student}\\${filename}`, `${student}/%2e%2e-${filename}`,
  `${student}/${filename}?download=1`, `${student}/${filename}#fragment`, `${student}//${filename}`,
])("rejects a foreign or noncanonical path before database or privileged work: %s", async storage_path => {
  await expect(register({ storage_path })).rejects.toThrow("does not match this student");
  expect(api.rpc).not.toHaveBeenCalled(); noProcessing();
});
it.each([false, null, "true", 1])("rejects missing or non-boolean edit permission (%s)", async data => {
  api.rpc.mockResolvedValue({ data, error: null });
  await expect(register()).rejects.toThrow("couldn't confirm permission");
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith("can_edit_student", { _user_id: "current-viewer", _student_id: student }); noProcessing();
});
it("does not process even when an errored permission response also contains true", async () => {
  api.rpc.mockResolvedValue({ data: true, error: { message: "PRIVATE database detail" } });
  await expect(register()).rejects.toThrow("couldn't confirm permission"); noProcessing();
});
it("keeps rejected permission requests private and does not retry them", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  api.rpc.mockRejectedValue(new Error("PRIVATE database detail"));
  await expect(register()).rejects.toThrow("couldn't confirm permission");
  expect(api.rpc).toHaveBeenCalledOnce(); expect(log).not.toHaveBeenCalled(); noProcessing(); log.mockRestore();
});
it.each([false, true])("requires edit access before stored-byte work as well (%s hash)", async hash => {
  api.rpc.mockResolvedValue({ data: false, error: null });
  await expect(register(hash ? { content_hash: "a".repeat(64) } : {})).rejects.toThrow("couldn't confirm permission"); noProcessing();
});
it.each([filename, "privacy-safe-document.txt"])("preserves canonical reviewed-text registration (%s)", async name => {
  await expect(register({ storage_path: `${student}/${name}` })).rejects.toThrow("reached caller table boundary");
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith("can_edit_student", { _user_id: "current-viewer", _student_id: student });
  expect(api.from).toHaveBeenCalledExactlyOnceWith("user_roles");
  expect(api.rpc.mock.invocationCallOrder[0]).toBeLessThan(api.from.mock.invocationCallOrder[0]);
  expect(api.pipeline).not.toHaveBeenCalled(); expect(api.sniff).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled();
});
it("preserves the protected upload gate before permission or storage work", async () => {
  api.gate.mockImplementation(() => { throw new Error("Uploads remain paused"); });
  await expect(register()).rejects.toThrow("Uploads remain paused"); expect(api.rpc).not.toHaveBeenCalled(); noProcessing();
});

it.each([registerDocument, assertCanUploadForStudent])("rejects departed viewer intent before any database work", async fn => {
  await expect((fn as any)({ data: { ...input, expected_viewer_id: "departed-viewer" } })).rejects.toThrow("sign-in changed");
  expect(api.rpc).not.toHaveBeenCalled(); noProcessing();
});
it("retains authenticated ownership when viewer intent matches", async () => {
  await expect(register({ expected_viewer_id: "current-viewer" })).rejects.toThrow("reached caller table boundary");
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith("can_edit_student", { _user_id: "current-viewer", _student_id: student });
});
it.each([
  { edit: false, partner: false }, { edit: null, partner: false }, { edit: "true", partner: false },
  { edit: true, partner: true }, { edit: true, partner: null }, { edit: true, partner: "false" },
  { edit: true, partner: false, error: "can_edit_student" }, { edit: true, partner: false, error: "is_partner_only" },
])("fails closed on uncertain preflight permission responses (%j)", async test => {
  api.rpc.mockImplementation(async (name: string) => ({ data: name === "can_edit_student" ? test.edit : test.partner, error: name === test.error ? { message: "PRIVATE permission detail" } : null }));
  await expect((assertCanUploadForStudent as any)({ data: { student_id: student, expected_viewer_id: "current-viewer" } })).rejects.toThrow("couldn't confirm permission to upload"); noProcessing();
});
it("confirms preflight only with current edit access and explicit non-partner status", async () => {
  api.rpc.mockImplementation(async (name: string) => ({ data: name === "can_edit_student", error: null }));
  expect(await (assertCanUploadForStudent as any)({ data: { student_id: student, expected_viewer_id: "current-viewer" } })).toEqual({ ok: true, duplicate: false });
  expect(api.rpc).toHaveBeenNthCalledWith(1, "can_edit_student", { _user_id: "current-viewer", _student_id: student });
  expect(api.rpc).toHaveBeenNthCalledWith(2, "is_partner_only", { _user_id: "current-viewer" }); noProcessing();
});
it("does not leak or retry a rejected preflight request", async () => {
  api.rpc.mockRejectedValue(new Error("PRIVATE permission detail"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect((assertCanUploadForStudent as any)({ data: { student_id: student } })).rejects.toThrow("couldn't confirm permission to upload");
  expect(api.rpc).toHaveBeenCalledOnce(); expect(log).not.toHaveBeenCalled(); noProcessing(); log.mockRestore();
});

it("runs verified duplicate discovery only after both current permission checks", async () => {
  api.rpc.mockImplementation(async (name: string) => ({ data: name === "can_edit_student", error: null })); api.duplicate.mockResolvedValue(true);
  expect(await (assertCanUploadForStudent as any)({ data: { student_id: student, expected_viewer_id: "current-viewer", content_hash: "a".repeat(64) } })).toEqual({ ok: true, duplicate: true });
  expect(api.duplicate).toHaveBeenCalledExactlyOnceWith(api.context.supabase, "current-viewer", student, "a".repeat(64));
  expect(api.rpc.mock.invocationCallOrder[1]).toBeLessThan(api.duplicate.mock.invocationCallOrder[0]);
});
it("does not inspect duplicate candidates after permission denial", async () => {
  api.rpc.mockResolvedValue({ data: false, error: null });
  await expect((assertCanUploadForStudent as any)({ data: { student_id: student, content_hash: "a".repeat(64) } })).rejects.toThrow("couldn't confirm permission");
  expect(api.duplicate).not.toHaveBeenCalled();
});
