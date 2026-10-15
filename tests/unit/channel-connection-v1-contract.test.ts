import { describe, expect, it } from "vitest";
import {
  validateConnectionOutcomeV1,
  validateConnectionTargetsV1,
} from "../../src/lib/channel-connection-v1-contract";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const outcome = () => ({
  request_id: id(1),
  status: "accepted",
  requester_id: id(2),
  requester_organization_id: id(3),
  target_organization_id: id(4),
  expires_at: "2026-10-15T12:00:00+00:00",
  updated_at: "2026-10-15T11:00:00Z",
  revision: 2,
  directory_partner_id: id(5),
  directory_link_version: 1,
  receiver_consent_version: 1,
  saved_fields: { purpose: "other", message: "Hello", next_step: null },
  setup_state: "complete",
  channel_id: id(6),
  channel_state: "active",
  can_open_channel: true,
});
const target = (n: number) => ({
  directory_partner_id: id(n),
  directory_name: "Program",
  organization_id: id(n + 10),
  organization_name: "Workspace",
  link_version: 1,
  consent_version: 2,
});
const context = { sourceOrganizationId: id(3), after: null, limit: 2 };

describe("draft connection v1 response contracts", () => {
  it("keeps completed setup separate from current channel access", () => {
    expect(
      validateConnectionOutcomeV1(
        { ...outcome(), can_open_channel: false, channel_state: "unavailable" },
        id(1),
      ).setup_state,
    ).toBe("complete");
    expect(
      validateConnectionOutcomeV1({ ...outcome(), channel_state: "archived" }, id(1))
        .can_open_channel,
    ).toBe(true);
  });
  it("preserves legacy review without promising channel access", () => {
    const legacy = {
      ...outcome(),
      setup_state: "legacy_review",
      revision: 0,
      directory_partner_id: null,
      directory_link_version: null,
      receiver_consent_version: null,
      requester_organization_id: null,
      can_open_channel: false,
      channel_state: "unavailable",
    };
    expect(validateConnectionOutcomeV1(legacy, id(1)).setup_state).toBe("legacy_review");
    expect(() =>
      validateConnectionOutcomeV1({ ...legacy, can_open_channel: true }, id(1)),
    ).toThrow();
  });
  it.each([
    { request_id: id(99) },
    { revision: Number.MAX_SAFE_INTEGER + 1 },
    { revision: "2" },
    { directory_link_version: null },
    { setup_state: "incomplete" },
    { channel_id: null },
    { status: "pending" },
    { can_open_channel: false },
    { updated_at: "yesterday" },
    { requester_organization_id: null },
    { channel_state: "unavailable" },
  ])("rejects foreign, malformed or contradictory outcomes: %j", (patch) => {
    expect(() => validateConnectionOutcomeV1({ ...outcome(), ...patch }, id(1))).toThrow();
  });
  it.each(["pending", "declined", "withdrawn", "expired"])(
    "validates %s without fabricating setup",
    (status) => {
      expect(
        validateConnectionOutcomeV1(
          {
            ...outcome(),
            status,
            setup_state: status === "pending" ? "not_started" : "not_applicable",
            channel_id: null,
            channel_state: "unavailable",
            can_open_channel: false,
          },
          id(1),
        ).status,
      ).toBe(status);
    },
  );
  it("accepts paused targets and a bounded cursor page", () => {
    expect(
      validateConnectionTargetsV1({ enabled: false, targets: [], next_cursor: null }, context)
        .enabled,
    ).toBe(false);
    expect(
      validateConnectionTargetsV1(
        { enabled: true, targets: [target(5), target(6)], next_cursor: id(6) },
        context,
      ).targets,
    ).toHaveLength(2);
  });
  it.each([
    { enabled: false, targets: [target(5)], next_cursor: null },
    { enabled: true, targets: [target(5), target(5)], next_cursor: null },
    { enabled: true, targets: [target(6), target(5)], next_cursor: null },
    { enabled: true, targets: [target(5)], next_cursor: id(5) },
    { enabled: true, targets: [target(5), target(6)], next_cursor: id(7) },
    { enabled: true, targets: [{ ...target(5), organization_id: id(3) }], next_cursor: null },
    { enabled: true, targets: [{ ...target(5), link_version: 0 }], next_cursor: null },
  ])("rejects unsafe target pages: %j", (page) => {
    expect(() => validateConnectionTargetsV1(page, context)).toThrow();
  });
  it("rejects replayed pages and invalid request bounds", () => {
    const page = { enabled: true, targets: [target(5)], next_cursor: null };
    expect(() => validateConnectionTargetsV1(page, { ...context, after: id(5) })).toThrow();
    expect(() => validateConnectionTargetsV1(page, { ...context, limit: 101 })).toThrow();
  });
});
