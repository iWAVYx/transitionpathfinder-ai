import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = {
    validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async (input: { data: unknown }) => fn({ data: validate(input.data) }),
  };
  return builder;
} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import { resolveShareToken } from "../../src/lib/share.functions";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
beforeEach(() => mocks.rpc.mockReset());
const token = "synthetic-share-token";
const call = () => (resolveShareToken as any)({ data: { token } });
it.each(["family", "educator"])("returns only the current document contract for a %s link", async audience => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ audience, content: { ...DEMO_STUDENTS.maya.report,
    inputs_used: { iep_doc_ids: ["private-record"] }, hidden_notes: "Private" }, created_at: "2026-10-06" }], error: null });
  mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
  const result = await call();
  expect(result.ok).toBe(true);
  expect(result.audience).toBe(audience);
  expect(result.report.summary).toBe(DEMO_STUDENTS.maya.report.summary);
  expect(JSON.stringify(result.report)).not.toContain("private-record");
  expect(JSON.stringify(result.report)).not.toContain("hidden_notes");
  expect(mocks.rpc).toHaveBeenNthCalledWith(2, "track_share_view", { _token: token });
});
it.each(["owner", "student", "", null])("rejects unsupported share audience %s before returning or tracking content", async audience => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ audience, content: DEMO_STUDENTS.maya.report }], error: null });
  expect(await call()).toEqual({ ok: false });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it("rejects malformed report content without tracking a successful view", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ audience: "family", content: { summary: "Missing document fields" } }], error: null });
  expect(await call()).toEqual({ ok: false });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it.each([{ data: [], error: null }, { data: null, error: { message: "Unavailable" } }])(
  "does not return content for revoked, expired, missing or failed links", async result => {
    mocks.rpc.mockResolvedValueOnce(result);
    expect(await call()).toEqual({ ok: false });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  },
);
it("rejects invalid tokens before any database request", async () => {
  await expect((resolveShareToken as any)({ data: { token: "short" } })).rejects.toThrow();
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it.each(["family", "educator"] as const)("uses the token's %s audience when projecting newer content", async audience => {
  const { richerSharedFixture } = await import("../fixtures/shared-report");
  mocks.rpc.mockResolvedValueOnce({ data: [{ audience, content: richerSharedFixture() }], error: null });
  mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
  const result = await call();
  expect(result.ok).toBe(true);
  expect(result.report.schema_version).toBe(2);
  expect(result.report.educator_action_plan_v2 !== undefined).toBe(audience === "educator");
  expect(result.report.student_action_plan !== undefined).toBe(audience === "family");
  expect(JSON.stringify(result)).not.toContain("a1111111");
});
