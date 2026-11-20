import { describe, expect, it } from "vitest";
import {
  confirmConnectionCreateV1,
  confirmConnectionLookupV1,
  prepareConnectionCreateV1,
} from "../../src/lib/channel-connection-v1-create-contract";
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
  message: "  Hello\nWorld  ",
  next_step: " \t ",
});
const saved = () => ({
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
  saved_fields: { purpose: "program_information", message: "Hello\nWorld", next_step: null },
  setup_state: "not_started",
  channel_id: null,
  channel_state: "unavailable",
  can_open_channel: false,
});
const prepared = () => prepareConnectionCreateV1(input());
describe("draft connection v1 creation and uncertain-result recovery", () => {
  it("detaches canonical intent and maps only narrow creation arguments", () => {
    const source = input();
    const intent = prepareConnectionCreateV1(source);
    source.target.organization_id = id(99);
    source.message = "Other";
    expect(intent.params).toEqual({
      p_directory: id(5),
      p_link_version: 2,
      p_consent_version: 3,
      p_source_organization: id(3),
      p_client_key: id(10),
      p_purpose: "program_information",
      p_message: "Hello\nWorld",
      p_next_step: null,
    });
    expect(Object.isFrozen(intent.original.target)).toBe(true);
    expect(Object.isFrozen(intent.params)).toBe(true);
    expect(intent.lookup).toEqual({
      rpc: "tf_connection_lookup_v1",
      params: { p_client_key: id(10) },
    });
    expect(confirmConnectionCreateV1(saved(), intent, id(2)).request_id).toBe(id(1));
  });
  it("retains the same key after failed confirmation and not-found lookup", () => {
    const intent = prepared();
    expect(() =>
      confirmConnectionCreateV1({ ...saved(), client_request_key: id(99) }, intent, id(2)),
    ).toThrow();
    expect(confirmConnectionLookupV1({ found: false }, intent, id(2))).toEqual({ found: false });
    expect(intent.params.p_client_key).toBe(id(10));
    expect(
      confirmConnectionLookupV1({ found: true, outcome: saved() }, intent, id(2)),
    ).toMatchObject({ found: true, outcome: { request_id: id(1) } });
  });
  it("counts Unicode code points and preserves internal and non-ASCII whitespace", () => {
    expect(
      prepareConnectionCreateV1({ ...input(), message: "😀".repeat(4000) }).params.p_message,
    ).toHaveLength(8000);
    expect(() => prepareConnectionCreateV1({ ...input(), message: "😀".repeat(4001) })).toThrow();
    expect(
      prepareConnectionCreateV1({
        ...input(),
        message: "\u00a0Hello\u00a0",
        next_step: "\r Next\n ",
      }).params,
    ).toMatchObject({ p_message: "\u00a0Hello\u00a0", p_next_step: "Next" });
  });
  it.each([
    { message: " \t\r\n\v\f " },
    { message: "hello\0" },
    { message: "\ud800" },
    { message: "\udc00" },
    { message: "a".repeat(4001) },
    { next_step: "a".repeat(1001) },
    { next_step: "\0" },
    { purpose: "made_up" },
    { client_request_key: "bad" },
    { source_organization_id: id(4) },
    { actor_id: id(99) },
    { status: "accepted" },
    { target: { ...input().target, link_version: "2" } },
    { target: { ...input().target, consent_version: 0 } },
    { target: { ...input().target, link_version: Number.MAX_SAFE_INTEGER + 1 } },
  ])("rejects incomplete, oversized or authority-bearing input: %j", (patch) => {
    expect(() => prepareConnectionCreateV1({ ...input(), ...patch })).toThrow();
  });
  it.each([
    { client_request_key: id(99) },
    { requester_id: id(99) },
    { requester_organization_id: id(99) },
    { target_organization_id: id(99) },
    { directory_partner_id: id(99) },
    { directory_link_version: 99 },
    { receiver_consent_version: 99 },
    { saved_fields: { ...saved().saved_fields, purpose: "other" } },
    { saved_fields: { ...saved().saved_fields, message: "Hello World" } },
    { saved_fields: { ...saved().saved_fields, next_step: "" } },
    { client_request_key: null },
    { channel_id: id(6) },
  ])("rejects another creation intent even with a valid-looking response: %j", (patch) => {
    expect(() => confirmConnectionCreateV1({ ...saved(), ...patch }, prepared(), id(2))).toThrow();
  });
  it("rejects a departed account and a changed known record", () => {
    expect(() => confirmConnectionCreateV1(saved(), prepared(), id(99))).toThrow();
    expect(() => confirmConnectionLookupV1({ found: false }, prepared(), id(99))).toThrow();
    expect(() =>
      confirmConnectionLookupV1({ found: true, outcome: saved() }, prepared(), id(2), id(99)),
    ).toThrow();
    expect(confirmConnectionCreateV1(saved(), prepared(), id(2), id(1)).request_id).toBe(id(1));
  });
  it.each([
    { found: "false" },
    { found: true },
    { found: true, outcome: null },
    { found: false, outcome: saved() },
    { found: false, error: "failed read" },
  ])("does not treat malformed/failed reads as a verified missing request: %j", (value) => {
    expect(() => confirmConnectionLookupV1(value, prepared(), id(2))).toThrow();
  });
  it.each(["declined", "withdrawn", "expired"])(
    "recovers a request already %s without creating another",
    (status) => {
      expect(
        confirmConnectionLookupV1(
          {
            found: true,
            outcome: { ...saved(), status, revision: 2, setup_state: "not_applicable" },
          },
          prepared(),
          id(2),
        ),
      ).toMatchObject({ found: true, outcome: { status } });
    },
  );
  it("recovers completed acceptance after channel access is lost", () => {
    const outcome = {
      ...saved(),
      status: "accepted",
      revision: 2,
      setup_state: "complete",
      channel_id: id(6),
    };
    expect(confirmConnectionCreateV1(outcome, prepared(), id(2)).can_open_channel).toBe(false);
    expect(() =>
      confirmConnectionCreateV1({ ...outcome, setup_state: "incomplete" }, prepared(), id(2)),
    ).toThrow();
  });
});
