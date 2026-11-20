import { describe, expect, it, vi } from "vitest";
import { createConnectionV1ServerAdapter } from "../../src/lib/channel-connection-v1-adapter.server";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const input = () => ({
  expected_viewer_id: id(2),
  client_request_key: id(10),
  source_organization_id: id(3),
  target: {
    directory_partner_id: id(5),
    organization_id: id(4),
    link_version: 2,
    consent_version: 3,
  },
  purpose: "program_information",
  message: " Hello ",
  next_step: null,
});
const pending = () => ({
  request_id: id(1),
  status: "pending",
  requester_id: id(2),
  requester_organization_id: id(3),
  target_organization_id: id(4),
  expires_at: "2026-11-15T12:00:00Z",
  updated_at: "2026-10-15T12:00:00Z",
  revision: 1,
  client_request_key: id(10),
  directory_partner_id: id(5),
  directory_link_version: 2,
  receiver_consent_version: 3,
  saved_fields: { purpose: "program_information", message: "Hello", next_step: null },
  setup_state: "not_started",
  channel_id: null,
  channel_state: "unavailable",
  can_open_channel: false,
});
const decision = (action = "respond") => ({
  action,
  ...(action === "respond" ? { decision: "accepted" } : {}),
  expected_viewer_id: action === "withdraw" ? id(2) : id(7),
  operation_key: id(11),
  original: pending(),
});
const targets = () => ({
  expected_viewer_id: id(2),
  source_organization_id: id(3),
  after: null,
  limit: 2,
});
function harness(data: unknown = pending(), userId = id(2)) {
  const rpc = vi.fn(async (..._args: unknown[]) => ({ data, error: null as unknown }));
  const authenticate = vi.fn(async () => ({ userId, rpc }));
  const requireProtocol = vi.fn(async (..._args: unknown[]) => true);
  return {
    rpc,
    authenticate,
    requireProtocol,
    adapter: createConnectionV1ServerAdapter({ authenticate, requireProtocol }),
  };
}
describe("dormant connection v1 server adapter with fake ports only", () => {
  it("authenticates, checks server readiness and invokes only exact narrow creation parameters", async () => {
    const h = harness();
    const order: string[] = [];
    h.authenticate.mockImplementation(async () => {
      order.push("auth");
      return { userId: id(2), rpc: h.rpc };
    });
    h.requireProtocol.mockImplementation(async () => {
      order.push("gate");
      return true;
    });
    h.rpc.mockImplementation(async () => {
      order.push("rpc");
      return { data: pending(), error: null };
    });
    await expect(h.adapter.create(input())).resolves.toMatchObject({ request_id: id(1) });
    expect(order).toEqual(["auth", "gate", "rpc"]);
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("tf_connection_create_v1", {
      p_directory: id(5),
      p_link_version: 2,
      p_consent_version: 3,
      p_source_organization: id(3),
      p_client_key: id(10),
      p_purpose: "program_information",
      p_message: "Hello",
      p_next_step: null,
    });
  });
  it("detaches original intent before awaiting authentication", async () => {
    const h = harness();
    const original = input();
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    h.authenticate.mockImplementation(async () => {
      await wait;
      return { userId: id(2), rpc: h.rpc };
    });
    const result = h.adapter.create(original);
    original.message = "Changed";
    original.target.organization_id = id(99);
    release();
    await expect(result).resolves.toMatchObject({ request_id: id(1) });
    expect(h.rpc.mock.calls[0][1]).toMatchObject({ p_message: "Hello" });
  });
  it("refreshes authentication and readiness for each operation", async () => {
    const h = harness({ found: false });
    await h.adapter.lookup({ intent: input() });
    h.authenticate.mockResolvedValue({ userId: id(99), rpc: h.rpc });
    await expect(h.adapter.lookup({ intent: input() })).rejects.toMatchObject({
      code: "viewer_changed",
    });
    expect(h.authenticate).toHaveBeenCalledTimes(2);
    expect(h.requireProtocol).toHaveBeenCalledTimes(1);
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });
  it.each(["create", "lookup", "decide", "targets"] as const)(
    "does not call RPCs after authentication failure: %s",
    async (method) => {
      const h = harness();
      h.authenticate.mockRejectedValue(new Error("secret auth detail"));
      const value =
        method === "lookup"
          ? { intent: input() }
          : method === "decide"
            ? decision("withdraw")
            : method === "targets"
              ? targets()
              : input();
      await expect(h.adapter[method](value)).rejects.toMatchObject({
        code: "authentication_required",
        recovery: "sign_in",
      });
      expect(h.requireProtocol).not.toHaveBeenCalled();
      expect(h.rpc).not.toHaveBeenCalled();
    },
  );
  it.each(["create", "lookup", "decide", "targets"] as const)(
    "does not call RPCs after failed or uninstalled server gate: %s",
    async (method) => {
      const h = harness();
      h.requireProtocol.mockRejectedValue(new Error("not reviewed"));
      const value =
        method === "lookup"
          ? { intent: input() }
          : method === "decide"
            ? decision("withdraw")
            : method === "targets"
              ? targets()
              : input();
      await expect(h.adapter[method](value)).rejects.toMatchObject({
        code: "protocol_unavailable",
      });
      expect(h.rpc).not.toHaveBeenCalled();
    },
  );
  it.each([false, null, undefined, { ready: true }])(
    "rejects unknown/non-boolean readiness acknowledgements: %j",
    async (ready) => {
      const h = harness();
      h.requireProtocol.mockResolvedValue(ready as boolean);
      await expect(h.adapter.create(input())).rejects.toMatchObject({
        code: "protocol_unavailable",
      });
      expect(h.rpc).not.toHaveBeenCalled();
    },
  );
  it("rejects client enablement and actor hints before authentication", async () => {
    const h = harness();
    await expect(h.adapter.create({ ...input(), protocol_ready: true })).rejects.toThrow();
    await expect(h.adapter.targets({ ...targets(), actor_id: id(2) })).rejects.toThrow();
    await expect(h.adapter.lookup({ intent: input(), enabled: true })).rejects.toThrow();
    expect(h.authenticate).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { data: null, error: null },
    { data: pending(), error: { message: "secret database text" } },
    { data: pending() },
  ])("keeps uncertain creation unconfirmed without retry/fallback: %j", async (reply) => {
    const h = harness();
    h.rpc.mockResolvedValue(reply as any);
    await expect(h.adapter.create(input())).rejects.toMatchObject({
      code: "outcome_unconfirmed",
      recovery: "lookup_same_key",
    });
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });
  it("does not leak transport errors or automatically retry writes", async () => {
    const h = harness();
    h.rpc.mockRejectedValue(new Error("secret-token private-message"));
    const error = await h.adapter.create(input()).catch((error: Error) => error);
    expect(error).toMatchObject({ code: "outcome_unconfirmed" });
    expect(String(error)).not.toContain("secret-token");
    expect(String(error)).not.toContain("private-message");
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects another request's successful-looking create response", async () => {
    const h = harness({ ...pending(), client_request_key: id(99) });
    await expect(h.adapter.create(input())).rejects.toMatchObject({ code: "outcome_unconfirmed" });
  });
  it("looks up exactly the retained key and keeps not-found separate from a failed read", async () => {
    const h = harness({ found: false });
    await expect(h.adapter.lookup({ intent: input() })).resolves.toEqual({ found: false });
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("tf_connection_lookup_v1", {
      p_client_key: id(10),
    });
    h.rpc.mockResolvedValue({ data: { found: false, error: "read failed" }, error: null });
    await expect(h.adapter.lookup({ intent: input() })).rejects.toMatchObject({
      code: "read_unavailable",
    });
  });
  it("checks a known request ID during saved-result lookup", async () => {
    const h = harness({ found: true, outcome: pending() });
    await expect(
      h.adapter.lookup({ intent: input(), expected_request_id: id(99) }),
    ).rejects.toMatchObject({ code: "read_unavailable" });
  });
  it("accepts completed acceptance without requiring current opening access", async () => {
    const h = harness(
      { ...pending(), status: "accepted", revision: 2, setup_state: "complete", channel_id: id(6) },
      id(7),
    );
    await expect(h.adapter.decide(decision())).resolves.toMatchObject({
      setup_state: "complete",
      can_open_channel: false,
    });
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("tf_connection_respond_v1", {
      p_request: id(1),
      p_expected_revision: 1,
      p_operation_key: id(11),
      p_decision: "accepted",
    });
  });
  it("withdraws through only the recorded request/revision/operation key", async () => {
    const h = harness({
      ...pending(),
      status: "withdrawn",
      revision: 2,
      setup_state: "not_applicable",
    });
    await expect(h.adapter.decide(decision("withdraw"))).resolves.toMatchObject({
      status: "withdrawn",
    });
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("tf_connection_withdraw_v1", {
      p_request: id(1),
      p_expected_revision: 1,
      p_operation_key: id(11),
    });
  });
  it("does not fall back after an unconfirmed response", async () => {
    const h = harness(pending(), id(7));
    await expect(h.adapter.decide(decision())).rejects.toMatchObject({
      code: "outcome_unconfirmed",
      recovery: "reload_same_request",
    });
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });
  it("validates target pagination and paused states", async () => {
    const h = harness({ enabled: false, targets: [], next_cursor: null });
    await expect(h.adapter.targets(targets())).resolves.toEqual({
      enabled: false,
      targets: [],
      next_cursor: null,
    });
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("tf_connection_targets_v1", {
      p_source_organization: id(3),
      p_after: null,
      p_limit: 2,
    });
    h.rpc.mockResolvedValue({
      data: { enabled: false, targets: [], next_cursor: id(9) },
      error: null,
    });
    await expect(h.adapter.targets(targets())).rejects.toMatchObject({ code: "read_unavailable" });
  });
});
