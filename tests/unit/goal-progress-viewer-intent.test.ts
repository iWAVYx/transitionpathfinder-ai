import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  provider: vi.fn(() => {
    throw new Error("No provider calls permitted");
  }),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (data: unknown) => data;
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof parse) => {
        parse = fn;
        return builder;
      },
      handler:
        (fn: any) =>
        async ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: api.provider }));
import { listMyReports } from "@/lib/pathway.functions";
import { getPathwayReport } from "@/lib/ppt.functions";
import { listGoalStatuses, upsertGoalStatus } from "@/lib/goal-statuses.functions";
const reportId = "11111111-1111-4111-8111-111111111111";
const itemId = "step-v1:synthetic:0";
const userId = "actual-viewer";
function client(
  saved: any = { user_id: userId, report_id: reportId, item_id: itemId, status: "met" },
  error: unknown = null,
) {
  const query: any = {
    single: vi.fn().mockResolvedValue({ data: saved, error }),
    range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  for (const method of ["select", "eq", "order", "upsert"]) query[method] = vi.fn(() => query);
  const from = vi.fn(() => query);
  return { query, context: { userId, supabase: { from } } };
}
beforeEach(() => vi.clearAllMocks());
describe("Goal Tracker negative viewer intent and caller scope", () => {
  it.each([
    ["library", listMyReports, {}],
    ["report", getPathwayReport, { id: reportId }],
    ["progress", listGoalStatuses, { reportId }],
    ["save", upsertGoalStatus, { reportId, itemId, status: "met" }],
  ])("rejects departed %s intent before any query", async (_name, fn, data) => {
    const { context } = client();
    await expect(
      (fn as any)({ data: { ...data, expected_viewer_id: "previous-viewer" }, context }),
    ).rejects.toThrow("sign-in changed");
    expect(context.supabase.from).not.toHaveBeenCalled();
    expect(api.provider).not.toHaveBeenCalled();
  });
  it.each([undefined, { expected_viewer_id: userId }])(
    "keeps legacy and matching-intent library reads compatible %j",
    async (data) => {
      const { context } = client();
      expect(await (listMyReports as any)({ data, context })).toEqual({
        reports: [],
        loadFailed: false,
      });
      expect(context.supabase.from).toHaveBeenCalledWith("pathway_reports");
      expect(api.provider).not.toHaveBeenCalled();
    },
  );
  it("reads a requested report with matching caller intent and exact id filtering", async () => {
    const row = {
      id: reportId,
      created_at: "2026-10-14",
      content: {},
      student_intakes: { student_first_name: "Sample", grade_band: null },
    };
    const { context, query } = client(row);
    expect(
      await (getPathwayReport as any)({
        data: { id: reportId, expected_viewer_id: userId },
        context,
      }),
    ).toMatchObject({ id: reportId, student_first_name: "Sample" });
    expect(query.eq).toHaveBeenCalledWith("id", reportId);
    expect(api.provider).not.toHaveBeenCalled();
  });
  it("keeps both actual caller and report filters on saved-progress reads", async () => {
    const { context, query } = client();
    expect(
      await (listGoalStatuses as any)({ data: { reportId, expected_viewer_id: userId }, context }),
    ).toEqual({ statuses: {} });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.eq).toHaveBeenCalledWith("report_id", reportId);
  });
  it.each(["not-started", "in-progress", "met"])(
    "confirms %s only from an exact returned caller/report/item/status row",
    async (status) => {
      const { context, query } = client({
        user_id: userId,
        report_id: reportId,
        item_id: itemId,
        status,
      });
      expect(
        await (upsertGoalStatus as any)({
          data: { reportId, itemId, status, expected_viewer_id: userId, user_id: "forged-viewer" },
          context,
        }),
      ).toEqual({ ok: true });
      expect(query.upsert).toHaveBeenCalledExactlyOnceWith(
        { user_id: userId, report_id: reportId, item_id: itemId, status },
        { onConflict: "user_id,report_id,item_id" },
      );
      expect(query.select).toHaveBeenCalledWith("user_id,report_id,item_id,status");
      expect(query.single).toHaveBeenCalledOnce();
    },
  );
  it.each([
    null,
    {},
    { user_id: "wrong", report_id: reportId, item_id: itemId, status: "met" },
    { user_id: userId, report_id: "wrong", item_id: itemId, status: "met" },
    { user_id: userId, report_id: reportId, item_id: "wrong", status: "met" },
    { user_id: userId, report_id: reportId, item_id: itemId, status: "in-progress" },
  ])("does not claim a confirmed save from an absent or mismatched row %#", async (saved) => {
    const { context } = client(saved);
    await expect(
      (upsertGoalStatus as any)({ data: { reportId, itemId, status: "met" }, context }),
    ).rejects.toThrow("couldn't confirm this progress update");
  });
  it.each([false, true])(
    "keeps resolved/rejected write failures controlled (rejected %s)",
    async (rejected) => {
      const { context, query } = client(null, new Error("Private database detail"));
      if (rejected) query.single.mockRejectedValueOnce(new Error("Private database detail"));
      await expect(
        (upsertGoalStatus as any)({ data: { reportId, itemId, status: "met" }, context }),
      ).rejects.toThrow(
        "We couldn't confirm this progress update. Reload your saved progress before trying again.",
      );
      expect(api.provider).not.toHaveBeenCalled();
    },
  );
  it.each([
    { reportId: "invalid", itemId, status: "met" },
    { reportId, itemId: "", status: "met" },
    { reportId, itemId, status: "invalid" },
  ])("validates write input before queries %#", async (data) => {
    const { context } = client();
    await expect((upsertGoalStatus as any)({ data, context })).rejects.toThrow();
    expect(context.supabase.from).not.toHaveBeenCalled();
  });
});
