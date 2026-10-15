import { describe, expect, it } from "vitest";
import {
  confirmConnectionDecisionV1,
  prepareConnectionDecisionV1,
} from "../../src/lib/channel-connection-v1-decision-contract";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const original = () => ({
  request_id: id(1),
  status: "pending",
  requester_id: id(2),
  requester_organization_id: id(3),
  target_organization_id: id(4),
  expires_at: "2026-10-17T12:00:00+00:00",
  updated_at: "2026-10-15T12:00:00Z",
  revision: 1,
  directory_partner_id: id(5),
  directory_link_version: 2,
  receiver_consent_version: 3,
  saved_fields: { purpose: "other", message: "Program information", next_step: "Please reply" },
  setup_state: "not_started",
  channel_id: null,
  channel_state: "unavailable",
  can_open_channel: false,
});
const respond = (record: unknown = original()) =>
  prepareConnectionDecisionV1({
    action: "respond",
    decision: "accepted",
    expected_viewer_id: id(7),
    operation_key: id(8),
    original: record,
  });
const accepted = () => ({
  ...original(),
  status: "accepted",
  revision: 2,
  setup_state: "complete",
  channel_id: id(6),
  channel_state: "active",
  can_open_channel: true,
});

describe("draft connection v1 recorded decision intent", () => {
  it("maps only narrow RPC arguments and keeps retries stable", () => {
    const record = original();
    const intent = respond(record);
    record.saved_fields.message = "Changed after click";
    record.revision = 10;
    expect(intent.rpc).toBe("tf_connection_respond_v1");
    expect(intent.params).toEqual({
      p_request: id(1),
      p_expected_revision: 1,
      p_operation_key: id(8),
      p_decision: "accepted",
    });
    expect(intent.original.saved_fields.message).toBe("Program information");
    expect(Object.isFrozen(intent.params)).toBe(true);
    expect(Object.isFrozen(intent.original.saved_fields)).toBe(true);
    expect(confirmConnectionDecisionV1(accepted(), intent, id(7)).status).toBe("accepted");
    expect(intent.params.p_operation_key).toBe(id(8));
  });
  it("confirms completed acceptance without restoring lost channel access", () => {
    expect(
      confirmConnectionDecisionV1(
        { ...accepted(), can_open_channel: false, channel_state: "unavailable" },
        respond(),
        id(7),
      ).setup_state,
    ).toBe("complete");
  });
  it("confirms exact decline and own-request withdrawal", () => {
    const decline = prepareConnectionDecisionV1({
      action: "respond",
      decision: "declined",
      expected_viewer_id: id(7),
      operation_key: id(8),
      original: original(),
    });
    expect(
      confirmConnectionDecisionV1(
        { ...original(), status: "declined", revision: 2, setup_state: "not_applicable" },
        decline,
        id(7),
      ).status,
    ).toBe("declined");
    const withdrawal = prepareConnectionDecisionV1({
      action: "withdraw",
      expected_viewer_id: id(2),
      operation_key: id(8),
      original: original(),
    });
    expect(withdrawal.rpc).toBe("tf_connection_withdraw_v1");
    expect(withdrawal.params).not.toHaveProperty("p_decision");
    expect(
      confirmConnectionDecisionV1(
        { ...original(), status: "withdrawn", revision: 2, setup_state: "not_applicable" },
        withdrawal,
        id(2),
      ).status,
    ).toBe("withdrawn");
  });
  it("allows recorded terminal read-back without advancing its revision", () => {
    const record = { ...accepted(), can_open_channel: false, channel_state: "unavailable" };
    expect(confirmConnectionDecisionV1(record, respond(record), id(7)).revision).toBe(2);
    expect(() =>
      confirmConnectionDecisionV1({ ...record, channel_id: id(9) }, respond(record), id(7)),
    ).toThrow();
  });
  it.each([
    { request_id: id(99) },
    { requester_id: id(99) },
    { requester_organization_id: id(99) },
    { target_organization_id: id(99) },
    { directory_partner_id: id(99) },
    { directory_link_version: 9 },
    { receiver_consent_version: 9 },
    { saved_fields: { purpose: "other", message: "Different terms", next_step: "Please reply" } },
    { expires_at: "2026-10-18T12:00:00Z" },
    { revision: 1 },
    { revision: 0 },
    { revision: 3 },
    {
      status: "declined",
      setup_state: "not_applicable",
      channel_id: null,
      channel_state: "unavailable",
      can_open_channel: false,
    },
    { setup_state: "incomplete", channel_state: "unavailable", can_open_channel: false },
  ])("rejects mismatched/stale decisions: %j", (patch) => {
    expect(() =>
      confirmConnectionDecisionV1({ ...accepted(), ...patch }, respond(), id(7)),
    ).toThrow();
  });
  it("rejects a departed viewer and accepts equivalent timestamp offsets", () => {
    expect(() => confirmConnectionDecisionV1(accepted(), respond(), id(9))).toThrow();
    expect(
      confirmConnectionDecisionV1(
        { ...accepted(), expires_at: "2026-10-17T08:00:00-04:00" },
        respond(),
        id(7),
      ).status,
    ).toBe("accepted");
  });
  it.each([
    { action: "respond", decision: "accepted", expected_viewer_id: id(2) },
    { action: "withdraw", expected_viewer_id: id(7) },
    { action: "respond", decision: "withdrawn", expected_viewer_id: id(7) },
    { action: "respond", decision: "accepted", expected_viewer_id: id(7), actor_id: id(9) },
    { action: "respond", decision: "accepted", expected_viewer_id: id(7), operation_key: "bad" },
  ])("rejects invalid or client-authority-bearing intent: %j", (fields) => {
    expect(() =>
      prepareConnectionDecisionV1({ operation_key: id(8), original: original(), ...fields }),
    ).toThrow();
  });
  it("compares PostgreSQL microseconds without losing precision", () => {
    const record = { ...original(), expires_at: "2026-10-17T12:00:00.123456Z" };
    const intent = respond(record);
    expect(() =>
      confirmConnectionDecisionV1(
        { ...accepted(), expires_at: "2026-10-17T12:00:00.123457Z" },
        intent,
        id(7),
      ),
    ).toThrow();
    expect(
      confirmConnectionDecisionV1(
        { ...accepted(), expires_at: "2026-10-17T08:00:00.1234560-04:00" },
        intent,
        id(7),
      ).status,
    ).toBe("accepted");
  });
  it("rejects an opposite terminal decision and a partial pending channel", () => {
    expect(() =>
      respond({ ...original(), status: "declined", setup_state: "not_applicable" }),
    ).toThrow();
    expect(() => respond({ ...original(), channel_id: id(6) })).toThrow();
  });
  it("permits legacy decline/withdraw cleanup but never confirms a legacy acceptance as newly completed", () => {
    const record = {
      ...original(),
      revision: 0,
      directory_partner_id: null,
      directory_link_version: null,
      receiver_consent_version: null,
      requester_organization_id: null,
    };
    expect(() => respond(record)).toThrow();
    const intent = prepareConnectionDecisionV1({
      action: "respond",
      decision: "declined",
      expected_viewer_id: id(7),
      operation_key: id(8),
      original: record,
    });
    expect(
      confirmConnectionDecisionV1(
        { ...record, status: "declined", revision: 1, setup_state: "not_applicable" },
        intent,
        id(7),
      ).status,
    ).toBe("declined");
  });
});
