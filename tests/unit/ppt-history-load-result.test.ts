import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ provider: vi.fn(() => { throw new Error("No provider requests in list checks"); }) }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, validator: () => builder, handler: (fn: any) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: state.provider }));
import { listPptPreps } from "@/lib/ppt.functions";
afterEach(() => { vi.restoreAllMocks(); state.provider.mockClear(); });
function context(result: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue(result) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
  return { context: { userId: "synthetic-owner", supabase: { from: vi.fn().mockReturnValue(query) } }, query };
}
it("a failed history read is distinguished from an empty successful history", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const failed = context({ data: null, error: { message: "Unavailable" } });
  expect(await (listPptPreps as any)({ context: failed.context })).toEqual({ preps: [], loadFailed: true });
  const empty = context({ data: [], error: null });
  expect(await (listPptPreps as any)({ context: empty.context })).toEqual({ preps: [], loadFailed: false });
  expect(failed.query.eq).toHaveBeenCalledWith("user_id", "synthetic-owner");
  expect(empty.query.eq).toHaveBeenCalledWith("user_id", "synthetic-owner"); expect(state.provider).not.toHaveBeenCalled();
});
it("a successful read preserves saved rows and caller scoping", async () => {
  const rows = [{ id: "synthetic-prep", student_name: "Fictional Student", meeting_date: null, created_at: "2026-10-12T12:00:00Z" }];
  const input = context({ data: rows, error: null });
  expect(await (listPptPreps as any)({ context: input.context })).toEqual({ preps: rows, loadFailed: false });
  expect(input.query.eq).toHaveBeenCalledWith("user_id", "synthetic-owner"); expect(state.provider).not.toHaveBeenCalled();
});
