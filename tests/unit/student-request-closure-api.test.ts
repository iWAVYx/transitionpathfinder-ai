import { it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ close: vi.fn() }));
vi.mock("@/lib/student-lifecycle.server", () => ({
  closeCreationRequest: api.close,
  readCreationOutcome: vi.fn(),
  ensureSelfProfile: vi.fn(),
  createStudentWithReceipt: vi.fn(),
  deleteStudentWithReceipt: vi.fn(),
}));
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
import { closeStudentCreationRequest } from "../../src/lib/students.functions";
const actor = "00000000-0000-4000-8000-000000000001",
  request = "00000000-0000-4000-8000-000000000002",
  context = { userId: actor, supabase: {} };
for (const patch of [
  { kind: "self" },
  { kind: undefined },
  { request_id: undefined },
  { expected_viewer_id: undefined },
])
  it("rejects incomplete or unsupported closure intent " + JSON.stringify(patch), async () => {
    api.close.mockClear();
    await expect(
      (closeStudentCreationRequest as any)({
        data: { expected_viewer_id: actor, request_id: request, kind: "linked", ...patch },
        context,
      }),
    ).rejects.toThrow();
    expect(api.close).not.toHaveBeenCalled();
  });
it("passes actual authenticated actor separately from request intent", async () => {
  api.close.mockClear();
  await (closeStudentCreationRequest as any)({
    data: { expected_viewer_id: actor, request_id: request, kind: "linked" },
    context,
  });
  expect(api.close).toHaveBeenCalledExactlyOnceWith(context.supabase, actor, {
    expected_viewer_id: actor,
    request_id: request,
    kind: "linked",
  });
});
