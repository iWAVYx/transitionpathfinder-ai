import { beforeEach, describe, it, expect, vi } from "vitest";
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
import {
  listMyConnectionRequests,
  respondToConnectionRequest,
  withdrawConnectionRequest,
} from "@/lib/channel-connection-requests.functions";
const id = "11111111-1111-4111-8111-111111111111",
  viewer = "22222222-2222-4222-8222-222222222222",
  requester = "33333333-3333-4333-8333-333333333333",
  org = "44444444-4444-4444-8444-444444444444",
  channel = "55555555-5555-4555-8555-555555555555",
  other = "66666666-6666-4666-8666-666666666666";
const future = new Date(Date.now() + 86400000).toISOString(),
  past = new Date(Date.now() - 86400000).toISOString();
function request(patch: any = {}) {
  return {
    id,
    status: "pending",
    message: "Synthetic connection",
    purpose_category: "transition",
    proposed_next_step: null,
    created_at: new Date().toISOString(),
    expires_at: future,
    requester_id: requester,
    requester_organization_id: null,
    target_partner_organization_id: org,
    resulting_channel_id: null,
    responded_by: null,
    responded_at: null,
    ...patch,
  };
}
function q(result: any) {
  const v: any = { patch: null, values: null, filters: {}, window: [0, 499] };
  const resolve = () => (typeof result === "function" ? result(v) : result);
  v.then = (a: any, b: any) => Promise.resolve().then(resolve).then(a, b);
  v.maybeSingle = vi.fn(async () => resolve());
  v.single = vi.fn(async () => resolve());
  for (const m of ["select", "order"]) v[m] = vi.fn(() => v);
  for (const m of ["eq", "is", "gt", "in"])
    v[m] = vi.fn((key: string, value: any) => {
      v.filters[key] = value;
      return v;
    });
  v.range = vi.fn((a: number, b: number) => {
    v.window = [a, b];
    return v;
  });
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
    rpc: vi.fn(async (name: string) => ({ data: name === "is_org_admin", error: null })),
  };
}
const intent = {
  request_id: id,
  expected_viewer_id: viewer,
  expected_requester_id: requester,
  expected_requester_organization_id: null,
  expected_target_organization_id: org,
  expected_expires_at: future,
};
const call = (fn: any, data: any, supabase: any) =>
  fn({ data, context: { userId: viewer, supabase } });
function decision(row = request()) {
  return q((v: any) => ({ data: { ...row, ...v.patch }, error: null }));
}
function accepted() {
  return request({
    status: "accepted",
    responded_by: viewer,
    responded_at: new Date().toISOString(),
  });
}
function channelRow(patch: any = {}) {
  return {
    id: channel,
    kind: "partner_outreach",
    created_by: viewer,
    partner_organization_id: org,
    organization_id: null,
    ...patch,
  };
}
function setupQueries() {
  return [
    q({ data: { id: org, name: "Synthetic partner" }, error: null }),
    q((v: any) => ({ data: { id: channel, ...v.values }, error: null })),
    q((v: any) => ({ data: { ...accepted(), ...v.patch }, error: null })),
    q((v: any) => ({ data: v.values.map((m: any) => ({ ...m, left_at: null })), error: null })),
  ];
}
describe("connection caller/request authority", () => {
  it.each([
    [listMyConnectionRequests, {}],
    [respondToConnectionRequest, { ...intent, decision: "accepted" }],
    [withdrawConnectionRequest, intent],
  ])("rejects stale caller before database/RPC %#", async (fn, data) => {
    const supabase = db();
    await expect(call(fn, { ...data, expected_viewer_id: "departed" }, supabase)).rejects.toThrow(
      "sign-in changed",
    );
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it.each([
    null,
    request({ id: other }),
    request({ requester_id: other }),
    request({ target_partner_organization_id: other }),
    request({ requester_organization_id: other }),
    request({ expires_at: past }),
  ])("rejects missing/changed captured request before writes %#", async (row) => {
    const supabase = db(q({ data: row, error: null }));
    await expect(
      call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ).rejects.toThrow("changed or is no longer available");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([
    { expected_message: "Old request text" },
    { expected_purpose_category: "Old category" },
    { expected_proposed_next_step: "Old next step" },
  ])("rejects changed displayed terms before permission checks or writes %#", async (terms) => {
    const supabase = db(q({ data: request(), error: null }));
    await expect(
      call(respondToConnectionRequest, { ...intent, ...terms, decision: "accepted" }, supabase),
    ).rejects.toThrow("changed or is no longer available");
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("prevents a requester responding to their own request before org checks", async () => {
    const supabase = db(q({ data: request({ requester_id: viewer }), error: null }));
    await expect(
      call(
        respondToConnectionRequest,
        { ...intent, expected_requester_id: viewer, decision: "accepted" },
        supabase,
      ),
    ).rejects.toThrow("withdraw your own");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it.each([false, null, "true", 1])(
    "does not accept without an actual true org/platform role %#",
    async (value) => {
      const supabase = db(q({ data: request(), error: null }));
      supabase.rpc.mockResolvedValue({ data: value, error: null } as any);
      await expect(
        call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
      ).rejects.toThrow();
      expect(supabase.from).toHaveBeenCalledOnce();
    },
  );
  it("retains existing platform-admin permission while preserving source caller", async () => {
    const supabase = db(q({ data: request(), error: null }), decision());
    supabase.rpc.mockImplementation(async (name: string) => ({
      data: name === "is_platform_admin",
      error: null,
    }));
    expect(
      (await call(respondToConnectionRequest, { ...intent, decision: "declined" }, supabase))
        .status,
    ).toBe("declined");
    expect(supabase.rpc).toHaveBeenCalledWith("is_org_admin", { _org_id: org, _user_id: viewer });
  });
  it.each([
    request({ status: "withdrawn" }),
    request({ resulting_channel_id: channel }),
    request({ expires_at: past }),
  ])("does not create resources for nonpending/already-linked/expired request %#", async (row) => {
    const supabase = db(q({ data: row, error: null }));
    await expect(
      call(respondToConnectionRequest, { request_id: id, decision: "accepted" }, supabase),
    ).rejects.toThrow("expired, changed or already");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
});
describe("confirmed decisions before channel setup", () => {
  it("confirms decline with full original predicates and no channel writes", async () => {
    const save = decision(),
      supabase = db(q({ data: request(), error: null }), save);
    const result = await call(
      respondToConnectionRequest,
      { ...intent, decision: "declined" },
      supabase,
    );
    expect(result).toEqual({
      ok: true,
      request_id: id,
      status: "declined",
      channel_id: null,
      channel_ready: false,
    });
    expect(save.eq).toHaveBeenCalledWith("status", "pending");
    expect(save.eq).toHaveBeenCalledWith("requester_id", requester);
    expect(save.eq).toHaveBeenCalledWith("target_partner_organization_id", org);
    expect(save.eq).toHaveBeenCalledWith("expires_at", future);
    expect(save.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(save.is).toHaveBeenCalledWith("resulting_channel_id", null);
    expect(save.is).toHaveBeenCalledWith("requester_organization_id", null);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it.each([
    null,
    request({ status: "accepted", responded_by: other }),
    request({ id: other, status: "accepted", responded_by: viewer }),
  ])("does not create channels after unconfirmed decision %#", async (row) => {
    const supabase = db(q({ data: request(), error: null }), q({ data: row, error: null }));
    await expect(
      call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ).rejects.toThrow("couldn't confirm");
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it("records acceptance before channel/link/member writes and confirms two exact active members", async () => {
    const setup = setupQueries(),
      save = decision(),
      supabase = db(q({ data: request(), error: null }), save, ...setup);
    const result = await call(
      respondToConnectionRequest,
      { ...intent, decision: "accepted" },
      supabase,
    );
    expect(result).toEqual({
      ok: true,
      request_id: id,
      status: "accepted",
      channel_id: channel,
      channel_ready: true,
    });
    expect(supabase.from.mock.calls.map(([table]) => table)).toEqual([
      "channel_connection_requests",
      "channel_connection_requests",
      "organizations",
      "channels",
      "channel_connection_requests",
      "channel_members",
    ]);
    expect(setup[1].values.created_by).toBe(viewer);
    expect(setup[2].eq).toHaveBeenCalledWith("responded_by", viewer);
    expect(setup[3].values).toEqual([
      { channel_id: channel, user_id: viewer, member_role: "admin", added_by: viewer },
      { channel_id: channel, user_id: requester, member_role: "member", added_by: viewer },
    ]);
  });
  it.each([null, { id: other, name: "Wrong org" }])(
    "keeps accepted decision but does no channel work for unavailable organization %#",
    async (row) => {
      const supabase = db(
        q({ data: request(), error: null }),
        decision(),
        q({ data: row, error: null }),
      );
      expect(
        (await call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase))
          .channel_ready,
      ).toBe(false);
      expect(supabase.from).toHaveBeenCalledTimes(3);
    },
  );
  it("keeps accepted setup incomplete after rejected channel creation", async () => {
    const supabase = db(
      q({ data: request(), error: null }),
      decision(),
      q({ data: { id: org, name: "Partner" }, error: null }),
      q(() => {
        throw new Error("network");
      }),
    );
    expect(
      await call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ).toEqual({
      ok: true,
      request_id: id,
      status: "accepted",
      channel_id: null,
      channel_ready: false,
    });
  });
  it.each([
    null,
    channelRow({ created_by: other }),
    channelRow({ partner_organization_id: other }),
    channelRow({ organization_id: other }),
    channelRow({ kind: "student_team" }),
  ])("does not link or grant membership for unconfirmed channel identity %#", async (row) => {
    const supabase = db(
      q({ data: request(), error: null }),
      decision(),
      q({ data: { id: org, name: "Partner" }, error: null }),
      q({ data: row, error: null }),
    );
    expect(
      (await call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase))
        .channel_ready,
    ).toBe(false);
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });
  it("does not grant memberships if channel linking is unconfirmed", async () => {
    const setup = setupQueries();
    const supabase = db(
      q({ data: request(), error: null }),
      decision(),
      setup[0],
      setup[1],
      q({ data: null, error: { message: "link denied" } }),
    );
    const result = await call(
      respondToConnectionRequest,
      { ...intent, decision: "accepted" },
      supabase,
    );
    expect(result.channel_ready).toBe(false);
    expect(supabase.from).toHaveBeenCalledTimes(5);
  });
  it.each([
    null,
    [],
    [
      {
        channel_id: channel,
        user_id: viewer,
        member_role: "admin",
        added_by: viewer,
        left_at: null,
      },
    ],
    [
      {
        channel_id: channel,
        user_id: viewer,
        member_role: "admin",
        added_by: viewer,
        left_at: past,
      },
      {
        channel_id: channel,
        user_id: requester,
        member_role: "member",
        added_by: viewer,
        left_at: null,
      },
    ],
  ])("does not call a channel ready on missing/partial/inactive memberships %#", async (rows) => {
    const setup = setupQueries();
    expect(
      (
        await call(
          respondToConnectionRequest,
          { ...intent, decision: "accepted" },
          db(
            q({ data: request(), error: null }),
            decision(),
            ...setup.slice(0, 3),
            q({ data: rows, error: null }),
          ),
        )
      ).channel_ready,
    ).toBe(false);
  });
  it("does not recreate a channel for an already accepted incomplete decision", async () => {
    const supabase = db(q({ data: accepted(), error: null }));
    expect(
      await call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ).toEqual({
      ok: true,
      request_id: id,
      status: "accepted",
      channel_id: null,
      channel_ready: false,
    });
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("reuses a confirmed accepted channel without another decision or channel insert", async () => {
    const row = request({
      status: "accepted",
      resulting_channel_id: channel,
      responded_by: viewer,
    });
    const supabase = db(
      q({ data: row, error: null }),
      q({ data: [channelRow()], count: 1, error: null }),
      q({
        data: [
          { id: "a", channel_id: channel, user_id: viewer },
          { id: "b", channel_id: channel, user_id: requester },
        ],
        count: 2,
        error: null,
      }),
    );
    expect(
      await call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ).toEqual({
      ok: true,
      request_id: id,
      status: "accepted",
      channel_id: channel,
      channel_ready: true,
    });
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
  it("returns an already-declined decision without rewriting", async () => {
    const supabase = db(q({ data: request({ status: "declined" }), error: null }));
    expect(
      (await call(respondToConnectionRequest, { ...intent, decision: "declined" }, supabase))
        .status,
    ).toBe("declined");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("stops before decisions if role reads fail without another known grant", async () => {
    const supabase = db(q({ data: request(), error: null }));
    supabase.rpc.mockImplementation(async (name: string) =>
      name === "is_org_admin"
        ? ({ data: null, error: { message: "lookup failed" } } as any)
        : { data: false, error: null },
    );
    await expect(
      call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ).rejects.toThrow("couldn't verify");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("does not withdraw an expired pending request", async () => {
    const supabase = db(
      q({ data: request({ requester_id: viewer, expires_at: past }), error: null }),
    );
    await expect(call(withdrawConnectionRequest, { request_id: id }, supabase)).rejects.toThrow(
      "expired, changed or already",
    );
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("models competing pending acceptances creating at most one channel", async () => {
    let state = request(),
      created = 0;
    const supabase = {
      rpc: vi.fn(async (name: string) => ({ data: name === "is_org_admin", error: null })),
      from: vi.fn((table: string) => {
        if (table === "channel_connection_requests") {
          const query = q((v: any) => {
            if (!v.patch) return { data: { ...state }, error: null };
            if (state.status !== "pending") return { data: null, error: null };
            state = { ...state, ...v.patch };
            return { data: { ...state }, error: null };
          });
          return query;
        }
        if (table === "organizations")
          return q({ data: { id: org, name: "Partner" }, error: null });
        if (table === "channels")
          return q(() => {
            created += 1;
            return { data: null, error: { message: "synthetic stop after creation attempt" } };
          });
        throw new Error("Unexpected");
      }),
    };
    const result = await Promise.allSettled([
      call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
      call(respondToConnectionRequest, { ...intent, decision: "accepted" }, supabase),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(created).toBe(1);
    expect(state.status).toBe("accepted");
  });
});
describe("requester-only withdrawal", () => {
  it("rejects someone else's withdrawal before any mutation", async () => {
    const supabase = db(q({ data: request(), error: null }));
    await expect(call(withdrawConnectionRequest, intent, supabase)).rejects.toThrow(
      "Only the requester",
    );
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("confirms an owned withdrawal and retains legacy no-hint input", async () => {
    const own = request({ requester_id: viewer }),
      save = decision(own);
    expect(
      await call(
        withdrawConnectionRequest,
        { request_id: id },
        db(q({ data: own, error: null }), save),
      ),
    ).toEqual({
      ok: true,
      request_id: id,
      status: "withdrawn",
      channel_id: null,
      channel_ready: false,
    });
    expect(save.eq).toHaveBeenCalledWith("requester_id", viewer);
  });
  it("returns existing withdrawn state without rewriting", async () => {
    const supabase = db(
      q({
        data: request({ requester_id: viewer, status: "withdrawn", expires_at: past }),
        error: null,
      }),
    );
    expect((await call(withdrawConnectionRequest, { request_id: id }, supabase)).status).toBe(
      "withdrawn",
    );
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([null, request({ requester_id: viewer, status: "pending" })])(
    "does not acknowledge missing/unconfirmed withdrawal %#",
    async (row) => {
      const own = request({ requester_id: viewer });
      await expect(
        call(
          withdrawConnectionRequest,
          { request_id: id },
          db(q({ data: own, error: null }), q({ data: row, error: null })),
        ),
      ).rejects.toThrow("couldn't confirm");
    },
  );
});
describe("complete request lists and current channel readiness", () => {
  it("keeps verified empty legacy list reads", async () => {
    expect(
      await call(listMyConnectionRequests, undefined, db(q({ data: [], count: 0, error: null }))),
    ).toEqual({ requests: [] });
  });
  it.each([
    { data: [], count: 1, error: null },
    { data: [], count: null, error: null },
    { data: null, count: 0, error: null },
  ])("rejects incomplete list pages %#", async (result) => {
    await expect(call(listMyConnectionRequests, {}, db(q(result)))).rejects.toThrow(
      "couldn't load all",
    );
  });
  it("loads 605 requests and bounds organization/profile lookups", async () => {
    const rows = Array.from({ length: 605 }, (_, i) =>
        request({
          id: `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
          requester_id: viewer,
        }),
      ),
      queries: any[] = [];
    const supabase = {
      rpc: vi.fn(),
      from: vi.fn((table: string) => {
        const query = q((v: any) => {
          const dataset =
            table === "channel_connection_requests"
              ? rows
              : table === "organizations"
                ? [{ id: org, name: "Partner" }]
                : [{ id: viewer, full_name: "Caller", preferred_name: null }];
          return {
            data: dataset.slice(v.window[0], v.window[1] + 1),
            count: dataset.length,
            error: null,
          };
        });
        queries.push({ table, query });
        return query;
      }),
    };
    const result = await call(listMyConnectionRequests, { expected_viewer_id: viewer }, supabase);
    expect(result.requests).toHaveLength(605);
    expect(
      result.requests.every(
        (r: any) => r.direction === "outgoing" && r.can_withdraw && !r.can_respond,
      ),
    ).toBe(true);
    expect(queries.filter((v) => v.table === "channel_connection_requests")).toHaveLength(2);
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(result.requests[0]).not.toHaveProperty("responded_by");
  });
  it("requires complete metadata rather than hide lookup failures", async () => {
    await expect(
      call(
        listMyConnectionRequests,
        {},
        db(
          q({ data: [request({ requester_id: viewer })], count: 1, error: null }),
          q({ data: null, count: null, error: { message: "org denied" } }),
          q({ data: [], count: 0, error: null }),
        ),
      ),
    ).rejects.toThrow("couldn't load all");
  });
  it("returns ready only for visible linked channels with all required active users", async () => {
    const row = request({
      status: "accepted",
      resulting_channel_id: channel,
      responded_by: viewer,
    });
    const result = await call(
      listMyConnectionRequests,
      {},
      db(
        q({ data: [row], count: 1, error: null }),
        q({ data: [{ id: org, name: "Partner" }], count: 1, error: null }),
        q({ data: [], count: 0, error: null }),
        q({ data: [channelRow()], count: 1, error: null }),
        q({
          data: [
            { id: "a", channel_id: channel, user_id: viewer },
            { id: "b", channel_id: channel, user_id: requester },
          ],
          count: 2,
          error: null,
        }),
      ),
    );
    expect(result.requests[0].channel_ready).toBe(true);
    expect(result.requests[0].can_respond).toBe(false);
  });
  it("does not mark another org admin's inaccessible accepted channel ready", async () => {
    const row = request({ status: "accepted", resulting_channel_id: channel, responded_by: other });
    const result = await call(
      listMyConnectionRequests,
      {},
      db(
        q({ data: [row], count: 1, error: null }),
        q({ data: [], count: 0, error: null }),
        q({ data: [], count: 0, error: null }),
        q({ data: [], count: 0, error: null }),
        q({ data: [], count: 0, error: null }),
      ),
    );
    expect(result.requests[0].channel_ready).toBe(false);
  });
});
