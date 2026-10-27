import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, gate: vi.fn(), from: vi.fn(), rpc: vi.fn(), pipeline: vi.fn(), sniff: vi.fn(), scan: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async ({ data }: any) => fn({ data: validate(data), context: api.context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/protected-file-uploads", () => ({ assertProtectedFileUploadsEnabled: api.gate }));
vi.mock("../../src/lib/document-pipeline.server", () => ({ recordPipelineRun: api.pipeline, newCorrelationId: () => "fictional-correlation" }));
vi.mock("../../src/lib/document-sniff.server", () => ({ sniffUploadedDocument: api.sniff }));
vi.mock("../../src/lib/document-av-scan.server", () => ({ scanUploadedDocument: api.scan }));
import { registerDocument } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const filename = "123-privacy-safe-document.txt";
const input = { student_id: student, title: "Fictional reviewed text", storage_path: `${student}/${filename}`, mime_type: "text/plain", consent_acknowledged: true };
const register = (patch: object = {}) => (registerDocument as any)({ data: { ...input, ...patch } });
beforeEach(() => {
  vi.resetAllMocks();
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
it.each([false, true])("requires edit access before duplicate lookup as well (%s hash)", async hash => {
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
