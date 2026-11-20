// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  user: { id: "viewer-a" } as { id: string } | null,
  loading: false,
  create: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.user, loading: api.loading }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/action-items.functions", () => ({ createStudentActionItem: api.create }));
import { useCreatePlanningAction } from "../../src/hooks/use-create-planning-action";
const draft = {
  student_id: "student-a",
  title: "Fictional next step",
  category: "team" as const,
  priority: "medium" as const,
  pathway_report_id: "report-a",
};
const receipt = ({ data }: any) => ({
  item: {
    ...data,
    id: data.request_id,
    created_by_user_id: data.expected_viewer_id,
    status: "not_started",
  },
});
function deferred() {
  let resolve!: (v: any) => void, reject!: (e: any) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: "viewer-a" };
  api.loading = false;
  api.create.mockImplementation(async (args) => receipt(args));
});
afterEach(cleanup);
it("requires the actual new record receipt and binds request, actor, student and linked report", async () => {
  const { result } = renderHook(() => useCreatePlanningAction("student-a:report-a"));
  let saved: any;
  await act(async () => {
    saved = await result.current.run(draft);
  });
  expect(saved.student_id).toBe("student-a");
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.create.mock.calls[0][0].data).toMatchObject({
    ...draft,
    expected_viewer_id: "viewer-a",
    request_id: saved.id,
  });
  expect(result.current.uncertain).toBe(false);
});
it("normalizes only the same string fields as the server validator", async () => {
  const { result } = renderHook(() => useCreatePlanningAction());
  await act(async () => {
    expect(
      await result.current.run({
        ...draft,
        title: "  Fictional next step  ",
        description: "  Supporting detail  ",
      }),
    ).toMatchObject({ title: draft.title, description: "Supporting detail" });
  });
});
for (const change of [
  "missing",
  "id",
  "student_id",
  "created_by_user_id",
  "title",
  "status",
  "category",
  "priority",
  "pathway_report_id",
])
  it("blocks ambiguous or mismatched " + change + " receipts without retrying", async () => {
    api.create.mockImplementation(async (args) => {
      const reply = receipt(args);
      if (change === "missing") return {};
      return { item: { ...reply.item, [change]: "different" } };
    });
    const { result } = renderHook(() => useCreatePlanningAction());
    await act(async () => {
      await expect(result.current.run(draft)).rejects.toThrow("Check saved action items");
    });
    expect(result.current.uncertain).toBe(true);
    await act(async () => {
      expect(await result.current.run(draft)).toBeNull();
    });
    expect(api.create).toHaveBeenCalledOnce();
  });
it("serializes same-tick clicks across separate recommendations", async () => {
  const pending = deferred();
  api.create.mockReturnValue(pending.promise);
  const { result } = renderHook(() => useCreatePlanningAction());
  let first: Promise<any>;
  act(() => {
    first = result.current.run(draft);
  });
  await act(async () => {
    expect(await result.current.run({ ...draft, title: "Second" })).toBeNull();
    pending.resolve(receipt(api.create.mock.calls[0][0]));
    await first!;
  });
  expect(api.create).toHaveBeenCalledOnce();
});
for (const change of ["student", "account", "roundtrip", "signout", "loading", "unmount"])
  for (const fail of [false, true])
    it(
      "suppresses " + (fail ? "failed" : "successful") + " departed " + change + " replies",
      async () => {
        const pending = deferred();
        api.create.mockReturnValue(pending.promise);
        const { result, rerender, unmount } = renderHook(
          ({ key }) => useCreatePlanningAction(key),
          { initialProps: { key: "student-a" } },
        );
        let run: Promise<any>;
        act(() => {
          run = result.current.run(draft);
        });
        if (change === "account") api.user = { id: "viewer-b" };
        if (change === "signout") api.user = null;
        if (change === "loading") api.loading = true;
        if (change === "unmount") unmount();
        else {
          rerender({
            key: change === "student" || change === "roundtrip" ? "student-b" : "student-a",
          });
          if (change === "roundtrip") rerender({ key: "student-a" });
        }
        await act(async () => {
          if (fail) pending.reject(Error("PRIVATE error"));
          else pending.resolve(receipt(api.create.mock.calls[0][0]));
          expect(await run!).toBeNull();
        });
        expect(api.create).toHaveBeenCalledOnce();
        if (change !== "unmount") expect(result.current.uncertain).toBe(false);
      },
    );
it("signed-out/loading views cannot submit", async () => {
  api.user = null;
  const { result } = renderHook(() => useCreatePlanningAction());
  await act(async () => {
    expect(await result.current.run(draft)).toBeNull();
  });
  expect(api.create).not.toHaveBeenCalled();
});
