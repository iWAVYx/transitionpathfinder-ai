import { z } from "zod";

// Draft RPC response boundary only. No transport, live caller, or enablement switch.
const uuid = z.string().uuid();
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const version = revision.refine((value) => value > 0);
const timestamp = z.string().datetime({ offset: true });
const targetSchema = z.object({
  directory_partner_id: uuid,
  directory_name: z.string().min(1),
  organization_id: uuid,
  organization_name: z.string().min(1),
  link_version: version,
  consent_version: version,
});
const pageSchema = z.object({
  enabled: z.boolean(),
  targets: z.array(targetSchema),
  next_cursor: uuid.nullable(),
});

export function validateConnectionTargetsV1(
  value: unknown,
  context: { sourceOrganizationId: string; after: string | null; limit: number },
) {
  uuid.parse(context.sourceOrganizationId);
  uuid.nullable().parse(context.after);
  z.number().int().min(1).max(100).parse(context.limit);
  const page = pageSchema.parse(value);
  const ids = page.targets.map((target) => target.directory_partner_id.toLowerCase());
  if (
    page.targets.length > context.limit ||
    (!page.enabled && (page.targets.length !== 0 || page.next_cursor !== null)) ||
    page.targets.some(
      (target) =>
        target.organization_id.toLowerCase() === context.sourceOrganizationId.toLowerCase(),
    ) ||
    ids.some(
      (id, index) => id <= (index === 0 ? (context.after?.toLowerCase() ?? "") : ids[index - 1]),
    ) ||
    (page.next_cursor !== null &&
      (page.targets.length !== context.limit || page.next_cursor.toLowerCase() !== ids.at(-1)))
  )
    throw new Error("Connection target response mismatch.");
  return page;
}

const outcomeSchema = z.object({
  request_id: uuid,
  status: z.enum(["pending", "accepted", "declined", "withdrawn", "expired"]),
  requester_id: uuid,
  requester_organization_id: uuid.nullable(),
  target_organization_id: uuid,
  expires_at: timestamp,
  updated_at: timestamp,
  revision,
  directory_partner_id: uuid.nullable(),
  directory_link_version: version.nullable(),
  receiver_consent_version: version.nullable(),
  saved_fields: z.object({
    purpose: z.string(),
    message: z.string(),
    next_step: z.string().nullable(),
  }),
  setup_state: z.enum(["not_started", "complete", "incomplete", "legacy_review", "not_applicable"]),
  channel_id: uuid.nullable(),
  channel_state: z.enum(["unavailable", "active", "archived"]),
  can_open_channel: z.boolean(),
});

export function validateConnectionOutcomeV1(value: unknown, expectedRequestId: string) {
  uuid.parse(expectedRequestId);
  const result = outcomeSchema.parse(value);
  const accepted = result.status === "accepted";
  const validSetup = accepted
    ? ["complete", "incomplete", "legacy_review"].includes(result.setup_state)
    : result.setup_state === (result.status === "pending" ? "not_started" : "not_applicable");
  const attribution = [
    result.directory_partner_id,
    result.directory_link_version,
    result.receiver_consent_version,
  ];
  const hasAttribution = attribution.every((field) => field !== null);
  if (
    result.request_id.toLowerCase() !== expectedRequestId.toLowerCase() ||
    !validSetup ||
    (!hasAttribution && attribution.some((field) => field !== null)) ||
    (hasAttribution && (result.revision < 1 || result.requester_organization_id === null)) ||
    (accepted && (result.setup_state === "legacy_review") === hasAttribution) ||
    (result.setup_state === "complete" && result.channel_id === null) ||
    (result.can_open_channel &&
      (!accepted ||
        result.setup_state !== "complete" ||
        result.channel_id === null ||
        result.channel_state === "unavailable")) ||
    (!result.can_open_channel && result.channel_state !== "unavailable")
  )
    throw new Error("Connection outcome response mismatch.");
  return result;
}
