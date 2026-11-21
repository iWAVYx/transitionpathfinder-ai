import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/planning-record-write.server", () => ({
  createPlanningRecordAtomically: api.create,
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b: any = {
      middleware: () => b,
      validator: (fn: any) => {
        parse = fn;
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
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import {
  quickAssignActionItem,
  getCaseload,
  addCaseManagerNote,
} from "../../src/lib/caseload.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1),
  student = id(2),
  request = id(3);
beforeEach(() => {
  vi.clearAllMocks();
  api.create.mockResolvedValue({ id: request });
});
it.each(["family", "student", "teacher", "educator", "school", "team"])(
  "quick action %s delegates to held-authority RPC with legacy teacher normalized",
  async (category) => {
    const context = { userId: actor, supabase: { from: vi.fn() } };
    await (quickAssignActionItem as any)({
      data: {
        student_id: student,
        title: " Practice ",
        category,
        request_id: request,
        expected_viewer_id: actor,
      },
      context,
    });
    expect(api.create).toHaveBeenCalledExactlyOnceWith(context.supabase, actor, "action_items", {
      student_id: student,
      title: "Practice",
      category: category === "teacher" ? "educator" : category,
      priority: "medium",
      due_date: null,
      status: "not_started",
      request_id: request,
      expected_viewer_id: actor,
    });
    expect(context.supabase.from).not.toHaveBeenCalled();
  },
);
it("quick action never falls back to a raw insert on uncertainty", async () => {
  api.create.mockRejectedValue(Error("Unconfirmed"));
  const context = { userId: actor, supabase: { from: vi.fn() } };
  await expect(
    (quickAssignActionItem as any)({ data: { student_id: student, title: "Practice" }, context }),
  ).rejects.toThrow("Unconfirmed");
  expect(context.supabase.from).not.toHaveBeenCalled();
  expect(api.create).toHaveBeenCalledOnce();
});
it("note rejects departed viewer before access checks or writes", async () => {
  const context = { userId: actor, supabase: { from: vi.fn(), rpc: vi.fn() } };
  await expect(
    (addCaseManagerNote as any)({
      data: { student_id: student, content: "Observe", expected_viewer_id: id(9) },
      context,
    }),
  ).rejects.toThrow("sign-in changed");
  expect(context.supabase.rpc).not.toHaveBeenCalled();
  expect(context.supabase.from).not.toHaveBeenCalled();
});
function noteDatabase(change: (row: any) => any = (r) => r, edit: unknown = true) {
  const inserted = vi.fn();
  const q: any = {
    insert: (payload: any) => {
      inserted(payload);
      return q;
    },
    select: () => q,
    single: async () => ({ data: change(inserted.mock.calls[0][0]), error: null }),
  };
  const supabase = {
    from: vi.fn(() => q),
    rpc: vi.fn(async (name: string) => ({
      data: name === "is_partner_only" ? false : name === "can_edit_student" ? edit : true,
      error: null,
    })),
  };
  return { supabase, inserted };
}
it.each([null, "true", false])("note requires literal editing proof %j", async (edit) => {
  const db = noteDatabase(undefined, edit);
  await expect(
    (addCaseManagerNote as any)({
      data: { student_id: student, content: "Observe", request_id: request },
      context: { userId: actor, supabase: db.supabase },
    }),
  ).rejects.toThrow();
  expect(db.inserted).not.toHaveBeenCalled();
});
it.each(["id", "student_id", "created_by_user_id", "content", "visibility", "note_type"])(
  "note rejects mismatched %s instead of reporting success",
  async (field) => {
    const db = noteDatabase((r) => ({ ...r, [field]: "unexpected" }));
    await expect(
      (addCaseManagerNote as any)({
        data: { student_id: student, content: "Observe", request_id: request },
        context: { userId: actor, supabase: db.supabase },
      }),
    ).rejects.toThrow("Could not save note");
    expect(db.inserted).toHaveBeenCalledOnce();
  },
);
it("note derives creator identity and verifies its request-bound saved row", async () => {
  const db = noteDatabase();
  const result = await (addCaseManagerNote as any)({
    data: { student_id: student, content: " Observe ", request_id: request, visibility: "private" },
    context: { userId: actor, supabase: db.supabase },
  });
  expect(result).toEqual({
    id: request,
    student_id: student,
    created_by_user_id: actor,
    content: "Observe",
    visibility: "private",
    note_type: "private_note",
  });
});
