import { z } from "zod";
import { validateConnectionOutcomeV1 } from "./channel-connection-v1-contract";

// Unused protocol preparation only: no transport, persistence, key generation or activation.
const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const version = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const text = z.string().refine(
  (value) =>
    !value.includes("\0") &&
    Array.from(value).every((char) => {
      const code = char.codePointAt(0)!;
      return code < 0xd800 || code > 0xdfff;
    }),
  "Use valid text without null characters.",
);
// Matches the proposed SQL clean helper; internal whitespace and Unicode stay intact.
const clean = (value: string) => value.replace(/^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g, "");
const message = text.transform(clean).refine((value) => {
  const size = Array.from(value).length;
  return size >= 1 && size <= 4000;
}, "Enter a message of up to 4,000 characters.");
const nextStep = text
  .nullable()
  .transform((value) => (value === null ? null : clean(value) || null))
  .refine(
    (value) => value === null || Array.from(value).length <= 1000,
    "Use up to 1,000 characters for the next step.",
  );
const createSchema = z
  .object({
    expected_viewer_id: uuid,
    client_request_key: uuid,
    source_organization_id: uuid,
    target: z
      .object({
        directory_partner_id: uuid,
        organization_id: uuid,
        link_version: version,
        consent_version: version,
      })
      .strict(),
    purpose: z.enum([
      "program_information",
      "opportunity_discussion",
      "referral_process",
      "resource_exchange",
      "other",
    ]),
    message,
    next_step: nextStep,
  })
  .strict();

export function prepareConnectionCreateV1(value: unknown) {
  const parsed = createSchema.parse(value);
  if (parsed.source_organization_id === parsed.target.organization_id)
    throw new Error("Choose a partner workspace outside your own organization.");
  const original = Object.freeze({ ...parsed, target: Object.freeze(parsed.target) });
  return Object.freeze({
    original,
    rpc: "tf_connection_create_v1" as const,
    params: Object.freeze({
      p_directory: original.target.directory_partner_id,
      p_link_version: original.target.link_version,
      p_consent_version: original.target.consent_version,
      p_source_organization: original.source_organization_id,
      p_client_key: original.client_request_key,
      p_purpose: original.purpose,
      p_message: original.message,
      p_next_step: original.next_step,
    }),
    lookup: Object.freeze({
      rpc: "tf_connection_lookup_v1" as const,
      params: Object.freeze({ p_client_key: original.client_request_key }),
    }),
  });
}
export type ConnectionCreateV1 = ReturnType<typeof prepareConnectionCreateV1>;

function currentIntent(prepared: ConnectionCreateV1, currentViewerId: string) {
  const original = prepareConnectionCreateV1(prepared.original).original;
  if (uuid.parse(currentViewerId) !== original.expected_viewer_id)
    throw new Error("The signed-in account changed. Reload before continuing.");
  return original;
}

export function confirmConnectionCreateV1(
  value: unknown,
  prepared: ConnectionCreateV1,
  currentViewerId: string,
  expectedRequestId?: string,
) {
  const original = currentIntent(prepared, currentViewerId);
  const requestId = z.object({ request_id: uuid }).parse(value).request_id;
  const saved = validateConnectionOutcomeV1(value, expectedRequestId ?? requestId);
  const sameId = (a: string | null, b: string) => a?.toLowerCase() === b;
  if (
    !sameId(saved.client_request_key, original.client_request_key) ||
    !sameId(saved.requester_id, original.expected_viewer_id) ||
    !sameId(saved.requester_organization_id, original.source_organization_id) ||
    !sameId(saved.target_organization_id, original.target.organization_id) ||
    !sameId(saved.directory_partner_id, original.target.directory_partner_id) ||
    saved.directory_link_version !== original.target.link_version ||
    saved.receiver_consent_version !== original.target.consent_version ||
    saved.saved_fields.purpose !== original.purpose ||
    saved.saved_fields.message !== original.message ||
    saved.saved_fields.next_step !== original.next_step ||
    (saved.status === "accepted" && saved.setup_state !== "complete") ||
    (saved.status !== "accepted" && saved.channel_id !== null)
  )
    throw new Error(
      "The saved request did not match your original request. Reload to check its status.",
    );
  return saved;
}

const lookupSchema = z.discriminatedUnion("found", [
  z.object({ found: z.literal(false) }).strict(),
  z.object({ found: z.literal(true), outcome: z.unknown() }).strict(),
]);
export function confirmConnectionLookupV1(
  value: unknown,
  prepared: ConnectionCreateV1,
  currentViewerId: string,
  expectedRequestId?: string,
) {
  currentIntent(prepared, currentViewerId);
  if (expectedRequestId !== undefined) uuid.parse(expectedRequestId);
  const lookup = lookupSchema.parse(value);
  // Not found is an observation, never permission to generate a new key or auto-send.
  if (!lookup.found) return { found: false } as const;
  return {
    found: true,
    outcome: confirmConnectionCreateV1(
      lookup.outcome,
      prepared,
      currentViewerId,
      expectedRequestId,
    ),
  } as const;
}
