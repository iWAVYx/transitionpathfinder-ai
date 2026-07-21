// Connection requests for Transition Channel — server functions.
//
// Reads flow via caller's RLS-scoped client (SELECT policy covers requester and
// target-org admins). Accept creates a partner channel + memberships as the
// responder (channel.created_by = auth.uid() satisfies channel_members INSERT).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

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
};

export const listMyConnectionRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("channel_connection_requests")
      .select(
        "id, status, message, purpose_category, proposed_next_step, created_at, expires_at, requester_id, requester_organization_id, target_partner_organization_id, resulting_channel_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const orgIds = Array.from(
      new Set(
        list
          .flatMap((r) => [r.requester_organization_id, r.target_partner_organization_id])
          .filter((v): v is string => !!v),
      ),
    );
    const requesterIds = Array.from(new Set(list.map((r) => r.requester_id)));

    const [orgs, profs] = await Promise.all([
      orgIds.length
        ? supabase.from("organizations").select("id, name").in("id", orgIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      requesterIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, preferred_name")
            .in("id", requesterIds)
        : Promise.resolve({
            data: [] as { id: string; full_name: string | null; preferred_name: string | null }[],
          }),
    ]);

    const orgName = new Map<string, string>();
    (orgs.data ?? []).forEach((o) => orgName.set(o.id, o.name));
    const profName = new Map<string, string>();
    (profs.data ?? []).forEach((p) =>
      profName.set(
        p.id,
        (p.preferred_name || p.full_name || "").trim() || "Member",
      ),
    );

    const requests: ConnectionRequest[] = list.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      purpose_category: r.purpose_category,
      proposed_next_step: r.proposed_next_step,
      created_at: r.created_at,
      expires_at: r.expires_at,
      requester_id: r.requester_id,
      requester_name: profName.get(r.requester_id) ?? null,
      requester_organization_id: r.requester_organization_id,
      requester_organization_name: r.requester_organization_id
        ? orgName.get(r.requester_organization_id) ?? null
        : null,
      target_partner_organization_id: r.target_partner_organization_id,
      target_partner_organization_name:
        orgName.get(r.target_partner_organization_id) ?? null,
      resulting_channel_id: r.resulting_channel_id,
      direction: r.requester_id === userId ? "outgoing" : "incoming",
    }));

    return { requests };
  });

export const respondToConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { request_id: string; decision: "accepted" | "declined" }) =>
    z
      .object({
        request_id: uuid,
        decision: z.enum(["accepted", "declined"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: req, error: rErr } = await supabase
      .from("channel_connection_requests")
      .select(
        "id, status, message, purpose_category, requester_id, requester_organization_id, target_partner_organization_id, resulting_channel_id",
      )
      .eq("id", data.request_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already resolved");

    if (data.decision === "declined") {
      const { error: uErr } = await supabase
        .from("channel_connection_requests")
        .update({
          status: "declined",
          responded_at: new Date().toISOString(),
          responded_by: userId,
        })
        .eq("id", req.id);
      if (uErr) throw new Error(uErr.message);
      return { ok: true, channel_id: null as string | null };
    }

    // Accept: create the partner channel as the responder, add both parties as
    // members, then link the resulting channel back on the request.
    const { data: targetOrg } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", req.target_partner_organization_id)
      .maybeSingle();
    const title = `Partner: ${targetOrg?.name ?? "Connection"}`;

    const { data: channel, error: cErr } = await supabase
      .from("channels")
      .insert({
        kind: "partner_outreach",
        title,
        purpose: req.message.slice(0, 500),
        partner_organization_id: req.target_partner_organization_id,
        organization_id: req.requester_organization_id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    const memberRows = [
      {
        channel_id: channel.id,
        user_id: userId,
        member_role: "admin" as const,
        added_by: userId,
      },
      {
        channel_id: channel.id,
        user_id: req.requester_id,
        member_role: "member" as const,
        added_by: userId,
      },
    ];
    const { error: mErr } = await supabase.from("channel_members").insert(memberRows);
    if (mErr) throw new Error(mErr.message);

    const { error: uErr } = await supabase
      .from("channel_connection_requests")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        responded_by: userId,
        resulting_channel_id: channel.id,
      })
      .eq("id", req.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, channel_id: channel.id };
  });

export const withdrawConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { request_id: string }) =>
    z.object({ request_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("channel_connection_requests")
      .update({
        status: "withdrawn",
        responded_at: new Date().toISOString(),
        responded_by: userId,
      })
      .eq("id", data.request_id)
      .eq("requester_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
