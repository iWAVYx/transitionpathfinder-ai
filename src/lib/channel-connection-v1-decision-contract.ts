import { z } from "zod";
import { validateConnectionOutcomeV1 } from "./channel-connection-v1-contract";

// Unused proposal preparation. This module has no RPC, role authority or activation path.
const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const intentSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("respond"),
      decision: z.enum(["accepted", "declined"]),
      expected_viewer_id: uuid,
      operation_key: uuid,
      original: z.unknown(),
    })
    .strict(),
  z
    .object({
      action: z.literal("withdraw"),
      expected_viewer_id: uuid,
      operation_key: uuid,
      original: z.unknown(),
    })
    .strict(),
]);

export function prepareConnectionDecisionV1(value: unknown) {
  const input = intentSchema.parse(value);
  const requestId = z.object({ request_id: uuid }).parse(input.original).request_id;
  const parsed = validateConnectionOutcomeV1(input.original, requestId);
  // Parse creates a detached snapshot; freezing prevents edits from changing a retry.
  const original = Object.freeze({ ...parsed, saved_fields: Object.freeze(parsed.saved_fields) });
  const decision = input.action === "withdraw" ? "withdrawn" : input.decision;
  if (
    (input.action === "withdraw") !==
      (original.requester_id.toLowerCase() === input.expected_viewer_id) ||
    (original.status !== "pending" && original.status !== decision) ||
    (original.status === "pending" && original.channel_id !== null) ||
    (input.action === "respond" &&
      input.decision === "accepted" &&
      original.status === "pending" &&
      original.directory_partner_id === null)
  )
    throw new Error("Reload the recorded request before choosing this action.");
  const params =
    input.action === "withdraw"
      ? Object.freeze({
          p_request: requestId,
          p_expected_revision: original.revision,
          p_operation_key: input.operation_key,
        })
      : Object.freeze({
          p_request: requestId,
          p_expected_revision: original.revision,
          p_operation_key: input.operation_key,
          p_decision: input.decision,
        });
  return Object.freeze({
    action: input.action,
    decision,
    expected_viewer_id: input.expected_viewer_id,
    original,
    rpc: input.action === "withdraw" ? "tf_connection_withdraw_v1" : "tf_connection_respond_v1",
    params,
  });
}

export type ConnectionDecisionV1 = ReturnType<typeof prepareConnectionDecisionV1>;

export function confirmConnectionDecisionV1(
  value: unknown,
  prepared: ConnectionDecisionV1,
  currentViewerId: string,
) {
  // Revalidate the recorded intent; it never establishes caller authorization.
  const intent = prepareConnectionDecisionV1({
    action: prepared.action,
    ...(prepared.action === "respond" ? { decision: prepared.decision } : {}),
    expected_viewer_id: prepared.expected_viewer_id,
    operation_key: prepared.params.p_operation_key,
    original: prepared.original,
  });
  if (uuid.parse(currentViewerId) !== intent.expected_viewer_id)
    throw new Error("The signed-in account changed. Reload before continuing.");
  const original = intent.original;
  const saved = validateConnectionOutcomeV1(value, original.request_id);
  const sameId = (a: string | null, b: string | null) => a?.toLowerCase() === b?.toLowerCase();
  // Date.parse drops PostgreSQL microseconds. Preserve them when comparing terms.
  const fraction = (timestamp: string) =>
    (timestamp.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? "").replace(/0+$/, "");
  if (
    saved.status !== intent.decision ||
    !sameId(saved.requester_id, original.requester_id) ||
    !sameId(saved.requester_organization_id, original.requester_organization_id) ||
    !sameId(saved.target_organization_id, original.target_organization_id) ||
    !sameId(saved.directory_partner_id, original.directory_partner_id) ||
    !sameId(saved.client_request_key, original.client_request_key) ||
    saved.directory_link_version !== original.directory_link_version ||
    saved.receiver_consent_version !== original.receiver_consent_version ||
    saved.saved_fields.purpose !== original.saved_fields.purpose ||
    saved.saved_fields.message !== original.saved_fields.message ||
    saved.saved_fields.next_step !== original.saved_fields.next_step ||
    Date.parse(saved.expires_at) !== Date.parse(original.expires_at) ||
    fraction(saved.expires_at) !== fraction(original.expires_at) ||
    saved.revision !== original.revision + (original.status === "pending" ? 1 : 0) ||
    (original.status !== "pending" && saved.setup_state !== original.setup_state) ||
    (original.status !== "pending" && !sameId(saved.channel_id, original.channel_id)) ||
    (intent.decision !== "accepted" && saved.channel_id !== null) ||
    (intent.decision === "accepted" &&
      original.status === "pending" &&
      saved.setup_state !== "complete")
  )
    throw new Error(
      "The saved decision did not match the recorded request. Reload to check its status.",
    );
  return saved;
}
