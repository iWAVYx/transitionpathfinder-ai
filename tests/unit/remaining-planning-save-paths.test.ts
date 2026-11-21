import { it, expect, vi, beforeEach } from "vitest";
const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/planning-record-write.server", () => ({
  createPlanningRecordAtomically: api.create,
}));
vi.mock("@/lib/atomic-action-update.server", () => ({ updateActionAtomically: api.update }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b: any = {
      middleware: () => b,
      validator: (p: any) => {
        parse = p;
        return b;
      },
      handler:
        (fn: any) =>
        async ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
import { addRecommendationToActionItems } from "../../src/lib/recommendation-actions.functions";
import { setActionItemStatus } from "../../src/lib/golden-path.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { userId: id(1), supabase: { from: vi.fn() } },
  data = {
    student_id: id(2),
    request_id: id(3),
    expected_viewer_id: id(1),
    source_kind: "resource",
    source_id: "reference",
    title: "  A useful resource  ",
  };
beforeEach(() => {
  vi.clearAllMocks();
  api.create.mockResolvedValue({ id: id(3) });
  api.update.mockResolvedValue({ id: id(3) });
});
for (const source_kind of ["resource", "partner"])
  it(`routes ${source_kind} recommendation through receipt-checked transaction`, async () => {
    expect(
      await (addRecommendationToActionItems as any)({
        data: { ...data, source_kind, created_by_user_id: id(9) },
        context,
      }),
    ).toEqual({ ok: true, item: { id: id(3) } });
    expect(api.create).toHaveBeenCalledExactlyOnceWith(
      context.supabase,
      context.userId,
      "action_items",
      expect.objectContaining({
        student_id: id(2),
        request_id: id(3),
        expected_viewer_id: id(1),
        title: `${source_kind === "resource" ? "Review:" : "Follow up with:"} A useful resource`,
        status: "not_started",
        category: "family",
      }),
    );
    expect(api.create.mock.calls[0][3]).not.toHaveProperty("created_by_user_id");
    expect(context.supabase.from).not.toHaveBeenCalled();
  });
it("rejects departed account before recommendation write", async () => {
  await expect(
    (addRecommendationToActionItems as any)({
      data: { ...data, expected_viewer_id: id(8) },
      context,
    }),
  ).rejects.toThrow("sign-in changed");
  expect(api.create).not.toHaveBeenCalled();
});
it("does not retry uncertain recommendation save", async () => {
  api.create.mockRejectedValue(Error("Unconfirmed"));
  await expect((addRecommendationToActionItems as any)({ data, context })).rejects.toThrow(
    "Unconfirmed",
  );
  expect(api.create).toHaveBeenCalledOnce();
});
const intent = {
  id: id(3),
  student_id: id(2),
  expected_updated_at: "2026-11-21T10:00:00.123456Z",
  expected_viewer_id: id(1),
  status: "complete",
};
it("legacy status path preserves completion effects and exact student/version", async () => {
  await (setActionItemStatus as any)({ data: intent, context });
  expect(api.update).toHaveBeenCalledExactlyOnceWith(context.supabase, context.userId, intent, {
    status: "completed",
  });
  expect(context.supabase.from).not.toHaveBeenCalled();
});
for (const field of ["student_id", "expected_updated_at"])
  it(`rejects missing ${field} on legacy status`, async () => {
    await expect(
      (setActionItemStatus as any)({ data: { ...intent, [field]: undefined }, context }),
    ).rejects.toThrow();
    expect(api.update).not.toHaveBeenCalled();
  });
it("does not retry uncertain status change", async () => {
  api.update.mockRejectedValue(Error("Unconfirmed"));
  await expect((setActionItemStatus as any)({ data: intent, context })).rejects.toThrow(
    "Unconfirmed",
  );
  expect(api.update).toHaveBeenCalledOnce();
});
