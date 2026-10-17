import { beforeEach, expect, it, vi } from "vitest";
import { richerSharedFixture } from "../fixtures/shared-report";

const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const builder = {
    validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: { data: any }) => unknown) => async (input: { data: unknown }) => fn({ data: validate(input.data) }),
  };
  return builder;
} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: state.rpc } }));
import { resolveShareToken } from "../../src/lib/share.functions";
const call = (token = "synthetic-share-token") => (resolveShareToken as any)({ data: { token } });
beforeEach(() => state.rpc.mockReset());

it.each(["short", "x".repeat(129)])("rejects invalid token bounds before accessing the database", async token => {
  await expect(call(token)).rejects.toThrow();
  expect(state.rpc).not.toHaveBeenCalled();
});
it.each([
  { data: [], error: null }, // The RPC returns no row for expired or revoked links.
  { data: null, error: { message: "Unavailable" } },
  { data: [{ audience: "student", content: richerSharedFixture() }], error: null },
  { data: [{ audience: "family", content: { summary: "Incomplete document" } }], error: null },
])("does not return or track an unresolved or unrenderable report", async result => {
  state.rpc.mockResolvedValueOnce(result);
  expect(await call()).toEqual({ ok: false });
  expect(state.rpc.mock.calls).toEqual([["resolve_share_token", { _token: "synthetic-share-token" }]]);
});
it.each(["family", "educator"] as const)("returns only the fixed %s projection and then tracks the valid link", async audience => {
  state.rpc.mockResolvedValueOnce({ data: [{ report_id: "internal-report-id", audience, content: richerSharedFixture(), created_at: "2026-10-09T00:00:00Z" }], error: null });
  state.rpc.mockResolvedValueOnce({ data: null, error: null });
  const result = await call();
  expect(result).toMatchObject({ ok: true, audience, created_at: "2026-10-09T00:00:00Z" });
  expect(Object.keys(result).sort()).toEqual(["audience", "created_at", "ok", "report"]);
  expect(result.report.inputs_used).toBeUndefined();
  if (audience === "family") expect(result.report.educator_action_plan_v2).toBeUndefined();
  else {
    expect(result.report.educator_action_plan_v2).toEqual(richerSharedFixture().educator_action_plan_v2);
    expect(result.report.student_action_plan).toBeUndefined();
  }
  expect(JSON.stringify(result)).not.toMatch(/internal-report-id|private-answer|source_doc_ids/);
  expect(state.rpc.mock.calls).toEqual([
    ["resolve_share_token", { _token: "synthetic-share-token" }],
    ["track_share_view", { _token: "synthetic-share-token" }],
  ]);
});
