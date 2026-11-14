import { beforeEach, describe, it, expect, vi } from "vitest";
const admin = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b = {
      middleware: () => b,
      validator: (v: any) => {
        parse = v;
        return b;
      },
      handler:
        (fn: any) =>
        ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));
import { updateChannelAction, deleteChannelAction } from "@/lib/channel-actions.functions";
import { listChannelActions } from "@/lib/channel-tabs.functions";
const id = "11111111-1111-4111-8111-111111111111",
  channel = "22222222-2222-4222-8222-222222222222",
  student = "33333333-3333-4333-8333-333333333333",
  linkedId = "44444444-4444-4444-8444-444444444444",
  other = "55555555-5555-4555-8555-555555555555",
  viewer = "caller-viewer";
function row(patch: any = {}) {
  return {
    id,
    channel_id: channel,
    status: "open",
    priority: null,
    due_at: null,
    assignee_user_id: null,
    resolution: null,
    resolved_at: null,
    resolved_by: null,
    target_id: null,
    metadata: {},
    ...patch,
  };
}
function q(result: any) {
  const v: any = { patch: null, values: null };
  const resolve = () => (typeof result === "function" ? result(v) : result);
  v.then = (a: any, b: any) => Promise.resolve().then(resolve).then(a, b);
  v.single = vi.fn(async () => resolve());
  v.maybeSingle = vi.fn(async () => resolve());
  for (const method of ["select", "eq", "is", "delete", "order", "limit"])
    v[method] = vi.fn(() => v);
  v.update = vi.fn((patch: any) => {
    v.patch = patch;
    return v;
  });
  v.insert = vi.fn((values: any) => {
    v.values = values;
    return v;
  });
  return v;
}
function db(...queries: any[]) {
  return {
    from: vi.fn(() => {
      const next = queries.shift();
      if (!next) throw new Error("Unexpected query");
      return next;
    }),
  };
}
function base(
  record: any = row(),
  ch: any = { id: channel, title: "Synthetic channel", student_id: student, archived_at: null },
  member: any = { channel_id: channel, user_id: viewer },
) {
  return [
    q({ data: record, error: null }),
    q({ data: ch, error: null }),
    q({ data: member, error: null }),
  ];
}
const intent = {
  action_id: id,
  expected_channel_id: channel,
  expected_student_id: student,
  expected_viewer_id: viewer,
  expected_status: "open",
  expected_assignee_user_id: null,
};
const call = (fn: any, data: any, supabase: any) =>
  fn({ data, context: { userId: viewer, supabase } });
function saved(record: any = row()) {
  return q((v: any) => ({ data: { ...record, ...v.patch }, error: null }));
}
beforeEach(() => {
  vi.clearAllMocks();
  admin.from.mockImplementation(() => {
    throw new Error("Unexpected notification access");
  });
});
describe("action request scope and active context", () => {
  it.each([
    [updateChannelAction, { ...intent, status: "resolved" }],
    [deleteChannelAction, intent],
    [listChannelActions, { kind: "action" }],
  ])("rejects changed caller before every query %#", async (fn, input) => {
    const supabase = db();
    await expect(call(fn, { ...input, expected_viewer_id: "departed" }, supabase)).rejects.toThrow(
      "sign-in changed",
    );
    expect(supabase.from).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });
  it.each([
    null,
    row({ id: other }),
    row({ channel_id: other }),
    row({ status: "resolved" }),
    row({ assignee_user_id: other }),
  ])("rejects missing or changed record before channel/member/effects %#", async (record) => {
    const supabase = db(q({ data: record, error: null }));
    await expect(
      call(updateChannelAction, { ...intent, status: "resolved" }, supabase),
    ).rejects.toThrow("changed or is no longer available");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([
    null,
    { id: channel, student_id: other },
    { id: channel, student_id: student, archived_at: "2026-10-15" },
  ])("rejects missing/different-student/archived channel before writes %#", async (ch) => {
    const supabase = db(...base(row(), ch));
    await expect(
      call(updateChannelAction, { ...intent, status: "resolved" }, supabase),
    ).rejects.toThrow("student or access changed");
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it.each([
    null,
    { channel_id: channel, user_id: "other" },
    { channel_id: other, user_id: viewer },
  ])("requires active caller membership %#", async (member) => {
    const supabase = db(...base(row(), undefined, member));
    await expect(
      call(updateChannelAction, { ...intent, status: "resolved" }, supabase),
    ).rejects.toThrow("membership could not be confirmed");
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
  it.each([null, { channel_id: channel, user_id: viewer }, { channel_id: other, user_id: other }])(
    "rejects unavailable or cross-channel assignee before update %#",
    async (assignee) => {
      const supabase = db(...base(), q({ data: assignee, error: null }));
      await expect(
        call(updateChannelAction, { ...intent, assignee_user_id: other }, supabase),
      ).rejects.toThrow("assignee is no longer available");
      expect(supabase.from).toHaveBeenCalledTimes(4);
    },
  );
  it("keeps legacy no-patch calls behind a confirmed read rather than returning blind success", async () => {
    const supabase = db(...base());
    expect(await call(updateChannelAction, { action_id: id }, supabase)).toEqual({
      ok: true,
      action_id: id,
      channel_id: channel,
      status: "open",
      assignee_user_id: null,
      sync: { action_item: "not_requested" },
    });
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
});
describe("confirmed lifecycle and assignment writes", () => {
  it.each(["open", "in_progress", "resolved", "cancelled"])(
    "confirms status=%s with completion attribution",
    async (status) => {
      const save = saved();
      const result = await call(updateChannelAction, { ...intent, status }, db(...base(), save));
      expect(result.status).toBe(status);
      expect(save.eq).toHaveBeenCalledWith("id", id);
      expect(save.eq).toHaveBeenCalledWith("channel_id", channel);
      expect(save.eq).toHaveBeenCalledWith("status", "open");
      expect(save.is).toHaveBeenCalledWith("assignee_user_id", null);
      expect(save.patch.resolved_by).toBe(
        ["resolved", "cancelled"].includes(status) ? viewer : null,
      );
    },
  );
  it("accepts equivalent database timestamp formatting", async () => {
    const save = q((v: any) => ({
      data: row({ ...v.patch, resolved_at: v.patch.resolved_at.replace("Z", "+00:00") }),
      error: null,
    }));
    expect(
      (await call(updateChannelAction, { ...intent, status: "resolved" }, db(...base(), save))).ok,
    ).toBe(true);
  });
  it.each([
    null,
    row({ id: other, status: "resolved" }),
    row({ channel_id: other, status: "resolved" }),
    row({ status: "open" }),
  ])("rejects unconfirmed updated identity/state %#", async (record) => {
    const supabase = db(...base(), q({ data: record, error: null }));
    await expect(
      call(updateChannelAction, { ...intent, status: "resolved" }, supabase),
    ).rejects.toThrow("couldn't confirm");
    expect(admin.from).not.toHaveBeenCalled();
  });
  it("does not perform linked or notification effects after a denied primary update", async () => {
    const supabase = db(
      ...base(row({ target_id: linkedId })),
      q({ data: null, error: { message: "RLS denied" } }),
    );
    await expect(
      call(updateChannelAction, { ...intent, status: "resolved" }, supabase),
    ).rejects.toThrow("couldn't confirm");
    expect(supabase.from).toHaveBeenCalledTimes(4);
    expect(admin.from).not.toHaveBeenCalled();
  });
  it("confirms new active assignee and saved assignment before notification", async () => {
    const assignee = q({ data: { channel_id: channel, user_id: other }, error: null }),
      save = saved();
    const supabase = db(...base(), assignee, save);
    const result = await call(
      updateChannelAction,
      { ...intent, assignee_user_id: other },
      supabase,
    );
    expect(result.assignee_user_id).toBe(other);
    expect(assignee.is).toHaveBeenCalledWith("left_at", null);
    expect(save.patch.assignee_user_id).toBe(other);
  });
  it("preserves the old-assignee predicate when unassigning", async () => {
    const previous = row({ assignee_user_id: other }),
      save = saved(previous);
    const result = await call(
      updateChannelAction,
      { ...intent, expected_assignee_user_id: other, assignee_user_id: null },
      db(...base(previous), save),
    );
    expect(result.assignee_user_id).toBeNull();
    expect(save.eq).toHaveBeenCalledWith("assignee_user_id", other);
    expect(admin.from).not.toHaveBeenCalled();
  });
  it("supports existing priority/note/due updates with returned values checked", async () => {
    const save = saved();
    const result = await call(
      updateChannelAction,
      {
        ...intent,
        priority: "high",
        resolution: "Recorded context",
        due_at: "2026-10-16T09:30:00Z",
      },
      db(...base(), save),
    );
    expect(result.ok).toBe(true);
    expect(save.patch).toEqual({
      priority: "high",
      resolution: "Recorded context",
      due_at: "2026-10-16T09:30:00Z",
    });
  });
});
describe("linked student status outcomes", () => {
  it("updates only the link matching the verified channel student", async () => {
    const previous = row({ metadata: { action_item_id: linkedId } }),
      task = q({ data: { id: linkedId, student_id: student, status: "completed" }, error: null });
    const result = await call(
      updateChannelAction,
      { ...intent, status: "resolved" },
      db(...base(previous), saved(previous), task),
    );
    expect(result.sync.action_item).toBe("updated");
    expect(task.eq).toHaveBeenCalledWith("id", linkedId);
    expect(task.eq).toHaveBeenCalledWith("student_id", student);
  });
  it.each([
    { data: null, error: { message: "denied" } },
    { data: null, error: null },
    { data: { id: linkedId, student_id: other, status: "completed" }, error: null },
    { data: { id: linkedId, student_id: student, status: "not_started" }, error: null },
  ])("reports linked failure while retaining confirmed primary %#", async (task) => {
    const previous = row({ target_id: linkedId });
    const result = await call(
      updateChannelAction,
      { ...intent, status: "resolved" },
      db(...base(previous), saved(previous), q(task)),
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe("resolved");
    expect(result.sync.action_item).toBe("unconfirmed");
  });
  it("retains primary success after linked transport rejection", async () => {
    const previous = row({ target_id: linkedId });
    const result = await call(
      updateChannelAction,
      { ...intent, status: "resolved" },
      db(
        ...base(previous),
        saved(previous),
        q(() => {
          throw new Error("network");
        }),
      ),
    );
    expect(result.sync.action_item).toBe("unconfirmed");
  });
  it("does not query an invalid link id", async () => {
    const previous = row({ target_id: "invalid" });
    const supabase = db(...base(previous), saved(previous));
    expect(
      (await call(updateChannelAction, { ...intent, status: "resolved" }, supabase)).sync
        .action_item,
    ).toBe("unconfirmed");
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });
  it("does not update a linked task without a verified student", async () => {
    const previous = row({ target_id: linkedId }),
      supabase = db(
        ...base(previous, { id: channel, title: "Unscoped", student_id: null, archived_at: null }),
        saved(previous),
      );
    expect(
      (
        await call(
          updateChannelAction,
          { ...intent, expected_student_id: null, status: "resolved" },
          supabase,
        )
      ).sync.action_item,
    ).toBe("unconfirmed");
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });
});
describe("assignment notification preferences", () => {
  it.each([
    { data: null, error: null },
    { data: {}, error: null },
    { data: { muted: true, notify_in_app: true }, error: null },
    { data: { muted: false, notify_in_app: false }, error: null },
    { data: null, error: { message: "failed" } },
  ])("stays quiet on unknown/failed/muted preference %#", async (pref) => {
    admin.from.mockReturnValue(q(pref));
    await call(
      updateChannelAction,
      { ...intent, assignee_user_id: other },
      db(...base(), q({ data: { channel_id: channel, user_id: other }, error: null }), saved()),
    );
    expect(admin.from.mock.calls.map(([table]) => table)).toEqual(["channel_members"]);
  });
  it("only notifies confirmed assignment with known allowed preference", async () => {
    const pref = q({ data: { muted: false, notify_in_app: true }, error: null }),
      notification = q({ error: null });
    admin.from.mockReturnValueOnce(pref).mockReturnValueOnce(notification);
    await call(
      updateChannelAction,
      { ...intent, assignee_user_id: other },
      db(...base(), q({ data: { channel_id: channel, user_id: other }, error: null }), saved()),
    );
    expect(pref.is).toHaveBeenCalledWith("left_at", null);
    expect(notification.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: other, related_record_id: id }),
    );
  });
});
describe("existing deletion endpoint confirmation", () => {
  it("confirms exactly the deleted record without touching related tools", async () => {
    const deleted = q({ data: { id, channel_id: channel }, error: null }),
      supabase = db(...base(row({ target_id: linkedId })), deleted);
    expect(await call(deleteChannelAction, intent, supabase)).toEqual({
      ok: true,
      action_id: id,
      channel_id: channel,
    });
    expect(deleted.eq).toHaveBeenCalledWith("id", id);
    expect(deleted.eq).toHaveBeenCalledWith("channel_id", channel);
    expect(deleted.is).toHaveBeenCalledWith("assignee_user_id", null);
    expect(supabase.from).toHaveBeenCalledTimes(4);
    expect(admin.from).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: null },
    { data: { id: other, channel_id: channel }, error: null },
    { data: null, error: { message: "RLS denied" } },
  ])("does not acknowledge empty/mismatched/denied deletion %#", async (result) => {
    await expect(call(deleteChannelAction, intent, db(...base(), q(result)))).rejects.toThrow(
      "couldn't confirm",
    );
  });
});
