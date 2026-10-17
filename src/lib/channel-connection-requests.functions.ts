// Connection request operations use only the authenticated caller's RLS client.
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertExpectedViewer, optionalViewerIntent, viewerIntentSchema } from "./viewer-intent";
import { readReportPages, readReportBatches } from "./report-query-pages";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const uuid = z.string().uuid();
type Client = SupabaseClient<Database>;
type RequestRow = Database["public"]["Tables"]["channel_connection_requests"]["Row"];
export type ConnectionRequest = {
  id: string;
  status: "pending" | "accepted" | "declined" | "withdrawn" | "expired";
  message: string;
  purpose_category: string;
  proposed_next_step: string | null;
  created_at: string;
  expires_at: string;
  requester_id: string;
  requester_name: string | null;
  requester_organization_id: string | null;
  requester_organization_name: string | null;
  target_partner_organization_id: string;
  target_partner_organization_name: string | null;
  resulting_channel_id: string | null;
  direction: "incoming" | "outgoing";
  can_respond: boolean;
  can_withdraw: boolean;
  channel_ready: boolean;
};
const intent = z.object({
  request_id: uuid,
  ...viewerIntentSchema.shape,
  expected_requester_id: uuid.optional(),
  expected_requester_organization_id: uuid.optional().nullable(),
  expected_target_organization_id: uuid.optional(),
  expected_expires_at: z.string().datetime({ offset: true }).optional(),
  expected_message: z.string().optional(),
  expected_purpose_category: z.string().optional(),
  expected_proposed_next_step: z.string().optional().nullable(),
});
async function responder(supabase: Client, userId: string, orgId: string) {
  const results = await Promise.allSettled([
    supabase.rpc("is_org_admin", { _org_id: orgId, _user_id: userId }),
    supabase.rpc("is_platform_admin", { _user_id: userId }),
  ]);
  if (
    results.some(
      (result) =>
        result.status === "fulfilled" && !result.value.error && result.value.data === true,
    )
  )
    return;
  if (
    results.some(
      (result) => result.status === "rejected" || result.value.error || result.value.data !== false,
    )
  )
    throw new Error("We couldn't verify your response access. Reload requests.");
  throw new Error("Only the receiving organization's admins can respond here.");
}
async function requestFor(supabase: Client, input: z.infer<typeof intent>) {
  const { data: request, error } = await supabase
    .from("channel_connection_requests")
    .select("*")
    .eq("id", input.request_id)
    .maybeSingle();
  if (
    error ||
    !request ||
    request.id !== input.request_id ||
    (input.expected_message !== undefined && request.message !== input.expected_message) ||
    (input.expected_purpose_category !== undefined &&
      request.purpose_category !== input.expected_purpose_category) ||
    (input.expected_proposed_next_step !== undefined &&
      request.proposed_next_step !== input.expected_proposed_next_step) ||
    (input.expected_requester_id && request.requester_id !== input.expected_requester_id) ||
    (input.expected_requester_organization_id !== undefined &&
      request.requester_organization_id !== input.expected_requester_organization_id) ||
    (input.expected_target_organization_id &&
      request.target_partner_organization_id !== input.expected_target_organization_id) ||
    (input.expected_expires_at &&
      Date.parse(request.expires_at) !== Date.parse(input.expected_expires_at))
  )
    throw new Error("This request changed or is no longer available. Reload requests.");
  return request;
}
async function readyChannels(supabase: Client, userId: string, requests: RequestRow[]) {
  const ids = [
    ...new Set(
      requests
        .filter((r) => r.status === "accepted" && r.resulting_channel_id)
        .map((r) => r.resulting_channel_id!),
    ),
  ];
  const channels = await readReportBatches(ids, (batch, from, to) =>
    supabase
      .from("channels")
      .select("id,kind,created_by,partner_organization_id,organization_id", { count: "exact" })
      .in("id", batch)
      .order("id")
      .range(from, to),
  );
  const memberships = await readReportBatches(ids, (batch, from, to) =>
    supabase
      .from("channel_members")
      .select("id,channel_id,user_id", { count: "exact" })
      .in("channel_id", batch)
      .is("left_at", null)
      .order("id")
      .range(from, to),
  );
  return new Set(
    requests
      .filter((r) => {
        const ch = channels.find((c) => c.id === r.resulting_channel_id);
        if (
          !ch ||
          !["partner_outreach", "partner_relationship"].includes(ch.kind) ||
          ch.created_by !== r.responded_by ||
          ch.partner_organization_id !== r.target_partner_organization_id ||
          ch.organization_id !== r.requester_organization_id
        )
          return false;
        const users = new Set(
          memberships.filter((m) => m.channel_id === ch.id).map((m) => m.user_id),
        );
        return (
          users.has(userId) &&
          users.has(r.requester_id) &&
          !!r.responded_by &&
          users.has(r.responded_by)
        );
      })
      .map((r) => r.id),
  );
}
function acknowledgement(request: RequestRow, ready = false) {
  return {
    ok: true,
    request_id: request.id,
    status: request.status,
    channel_id: request.resulting_channel_id,
    channel_ready: ready,
  };
}
function pending(request: RequestRow, now: string) {
  if (
    request.status !== "pending" ||
    request.resulting_channel_id ||
    !Number.isFinite(Date.parse(request.expires_at)) ||
    Date.parse(request.expires_at) <= Date.parse(now)
  )
    throw new Error("This request has expired, changed or already been resolved. Reload requests.");
}
async function decide(
  supabase: Client,
  request: RequestRow,
  userId: string,
  status: "accepted" | "declined" | "withdrawn",
  now: string,
) {
  let decision = supabase
    .from("channel_connection_requests")
    .update({ status, responded_by: userId, responded_at: now })
    .eq("id", request.id)
    .eq("status", "pending")
    .eq("requester_id", request.requester_id)
    .eq("target_partner_organization_id", request.target_partner_organization_id)
    .is("resulting_channel_id", null)
    .eq("expires_at", request.expires_at)
    .eq("message", request.message)
    .eq("purpose_category", request.purpose_category)
    .gt("expires_at", now);
  decision =
    request.proposed_next_step !== null
      ? decision.eq("proposed_next_step", request.proposed_next_step)
      : decision.is("proposed_next_step", null);
  decision = request.requester_organization_id
    ? decision.eq("requester_organization_id", request.requester_organization_id)
    : decision.is("requester_organization_id", null);
  const { data: saved, error } = await decision.select("*").single();
  if (
    error ||
    !saved ||
    saved.id !== request.id ||
    saved.status !== status ||
    saved.message !== request.message ||
    saved.purpose_category !== request.purpose_category ||
    saved.proposed_next_step !== request.proposed_next_step ||
    saved.requester_id !== request.requester_id ||
    saved.target_partner_organization_id !== request.target_partner_organization_id ||
    saved.requester_organization_id !== request.requester_organization_id ||
    Date.parse(saved.expires_at) !== Date.parse(request.expires_at) ||
    saved.responded_by !== userId ||
    Date.parse(saved.responded_at ?? "") !== Date.parse(now) ||
    saved.resulting_channel_id !== null
  )
    throw new Error("We couldn't confirm this decision. Reload requests before trying again.");
  return saved;
}
export const listMyConnectionRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data ?? {}, context.userId);
    const { supabase, userId } = context;
    let rows: RequestRow[],
      orgs: { id: string; name: string }[],
      profiles: { id: string; full_name: string | null; preferred_name: string | null }[];
    let ready: Set<string>;
    try {
      rows = await readReportPages((from, to) =>
        supabase
          .from("channel_connection_requests")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      );
      const orgIds = rows
        .flatMap((r) => [r.requester_organization_id, r.target_partner_organization_id])
        .filter((id): id is string => !!id);
      [orgs, profiles, ready] = await Promise.all([
        readReportBatches(orgIds, (ids, from, to) =>
          supabase
            .from("organizations")
            .select("id,name", { count: "exact" })
            .in("id", ids)
            .order("id")
            .range(from, to),
        ),
        readReportBatches(
          rows.map((r) => r.requester_id),
          (ids, from, to) =>
            supabase
              .from("profiles")
              .select("id,full_name,preferred_name", { count: "exact" })
              .in("id", ids)
              .order("id")
              .range(from, to),
        ),
        readyChannels(supabase, userId, rows),
      ]);
    } catch {
      throw new Error(
        "We couldn't load all connection requests and access details. Please try again.",
      );
    }
    const now = Date.now(),
      orgNames = new Map(orgs.map((org) => [org.id, org.name])),
      names = new Map(
        profiles.map((profile) => [
          profile.id,
          (profile.preferred_name || profile.full_name || "").trim() || "Member",
        ]),
      );
    const targets = [
      ...new Set(
        rows
          .filter(
            (r) =>
              r.requester_id !== userId && r.status === "pending" && Date.parse(r.expires_at) > now,
          )
          .map((r) => r.target_partner_organization_id),
      ),
    ];
    await Promise.all(targets.map((orgId) => responder(supabase, userId, orgId)));
    const requests: ConnectionRequest[] = rows.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      purpose_category: r.purpose_category,
      proposed_next_step: r.proposed_next_step,
      created_at: r.created_at,
      expires_at: r.expires_at,
      requester_id: r.requester_id,
      requester_organization_id: r.requester_organization_id,
      target_partner_organization_id: r.target_partner_organization_id,
      resulting_channel_id: r.resulting_channel_id,
      requester_name: names.get(r.requester_id) ?? null,
      requester_organization_name: r.requester_organization_id
        ? (orgNames.get(r.requester_organization_id) ?? null)
        : null,
      target_partner_organization_name: orgNames.get(r.target_partner_organization_id) ?? null,
      direction: r.requester_id === userId ? "outgoing" : "incoming",
      can_respond:
        r.requester_id !== userId && r.status === "pending" && Date.parse(r.expires_at) > now,
      can_withdraw:
        r.requester_id === userId && r.status === "pending" && Date.parse(r.expires_at) > now,
      channel_ready: ready.has(r.id),
    }));
    return { requests };
  });
export const respondToConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.input<typeof intent> & { decision: "accepted" | "declined" }) =>
    intent.extend({ decision: z.enum(["accepted", "declined"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    const request = await requestFor(supabase, data);
    if (request.requester_id === userId)
      throw new Error(
        "You can withdraw your own request; the receiving organization must respond.",
      );
    await responder(supabase, userId, request.target_partner_organization_id);
    if (request.status === data.decision) {
      let ready = false;
      if (request.status === "accepted")
        try {
          ready = (await readyChannels(supabase, userId, [request])).has(request.id);
        } catch {}
      return acknowledgement(request, ready);
    }
    const now = new Date().toISOString();
    pending(request, now);
    const saved = await decide(supabase, request, userId, data.decision, now);
    if (data.decision === "declined") return acknowledgement(saved);
    // The accepted decision is committed first. Later setup failures require review,
    // never another pending acceptance that can create a second channel.
    try {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id,name")
        .eq("id", request.target_partner_organization_id)
        .maybeSingle();
      if (orgError || !org || org.id !== request.target_partner_organization_id)
        return acknowledgement(saved);
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert({
          kind: "partner_outreach",
          title: `Partner: ${org.name}`,
          purpose: request.message.slice(0, 500),
          partner_organization_id: request.target_partner_organization_id,
          organization_id: request.requester_organization_id,
          created_by: userId,
        })
        .select("id,kind,created_by,partner_organization_id,organization_id")
        .single();
      if (
        channelError ||
        !channel ||
        !uuid.safeParse(channel.id).success ||
        channel.created_by !== userId ||
        channel.partner_organization_id !== request.target_partner_organization_id ||
        channel.organization_id !== request.requester_organization_id ||
        channel.kind !== "partner_outreach"
      )
        return acknowledgement(saved);
      const { data: linked, error: linkError } = await supabase
        .from("channel_connection_requests")
        .update({ resulting_channel_id: channel.id })
        .eq("id", saved.id)
        .eq("status", "accepted")
        .eq("responded_by", userId)
        .is("resulting_channel_id", null)
        .select("*")
        .single();
      if (
        linkError ||
        !linked ||
        linked.id !== saved.id ||
        linked.status !== "accepted" ||
        linked.responded_by !== userId ||
        linked.requester_id !== request.requester_id ||
        linked.requester_organization_id !== request.requester_organization_id ||
        linked.target_partner_organization_id !== request.target_partner_organization_id ||
        linked.resulting_channel_id !== channel.id
      )
        return acknowledgement(saved);
      const members = [
        {
          channel_id: channel.id,
          user_id: userId,
          member_role: "admin" as const,
          added_by: userId,
        },
        {
          channel_id: channel.id,
          user_id: request.requester_id,
          member_role: "member" as const,
          added_by: userId,
        },
      ];
      const { data: inserted, error: memberError } = await supabase
        .from("channel_members")
        .insert(members)
        .select("channel_id,user_id,member_role,added_by,left_at");
      const confirmed =
        !memberError &&
        Array.isArray(inserted) &&
        inserted.length === 2 &&
        members.every(
          (expected) =>
            inserted.filter(
              (row) =>
                row.channel_id === expected.channel_id &&
                row.user_id === expected.user_id &&
                row.member_role === expected.member_role &&
                row.added_by === userId &&
                row.left_at === null,
            ).length === 1,
        );
      return acknowledgement(linked, confirmed);
    } catch {
      return acknowledgement(saved);
    }
  });
export const withdrawConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.input<typeof intent>) => intent.parse(input))
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    const request = await requestFor(supabase, data);
    if (request.requester_id !== userId)
      throw new Error("Only the requester can withdraw this request.");
    if (request.status === "withdrawn") return acknowledgement(request);
    const now = new Date().toISOString();
    pending(request, now);
    return acknowledgement(await decide(supabase, request, userId, "withdrawn", now));
  });
