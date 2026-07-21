/**
 * Channel Moderation & Retention — platform-admin surface.
 *
 * Server functions powering the "Moderation" tab in the Operator Console.
 * All calls run as the authenticated user through `requireSupabaseAuth`,
 * so PostgREST enforces RLS end-to-end:
 *   - `channel_reports` UPDATE is restricted to `is_platform_admin`
 *   - `channels` UPDATE (legal hold, retention) is restricted to
 *     `is_channel_admin`, which resolves platform admins as admins
 *   - `channel_messages` DELETE is restricted to authors OR channel admins
 *
 * Every moderation write also appends a `channel_audit_events` row so the
 * action is discoverable in the channel audit trail (RLS on that table
 * grants insert to any member, and platform admins are treated as members
 * via `is_channel_admin`).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ModerationReportRow = {
  id: string;
  channel_id: string;
  channel_kind: string | null;
  channel_purpose: string | null;
  message_id: string | null;
  message_body: string | null;
  message_author_id: string | null;
  message_author_name: string | null;
  reason: string;
  details: string | null;
  reporter_id: string;
  reporter_name: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  legal_hold: boolean;
  retention_days: number;
};

async function assertPlatformAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_platform_admin", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---------------------------------------------------------------- list

export const listChannelReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z.enum(["open", "resolved", "dismissed", "all"]).default("open"),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ reports: ModerationReportRow[] }> => {
    await assertPlatformAdmin(context.supabase, context.userId);

    let q = context.supabase
      .from("channel_reports")
      .select(
        `id, channel_id, message_id, reason, details, reporter_id, status, created_at, resolved_at, resolved_by,
         channel:channels ( kind, purpose, legal_hold, retention_days ),
         message:channel_messages ( body, author_id )`,
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = new Set<string>();
    for (const r of rows ?? []) {
      const rr = r as any;
      if (rr.reporter_id) ids.add(rr.reporter_id);
      if (rr.message?.author_id) ids.add(rr.message.author_id);
    }
    const nameMap = new Map<string, string>();
    if (ids.size) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", [...ids]);
      for (const p of profs ?? []) nameMap.set((p as any).id, (p as any).full_name ?? "");
    }

    return {
      reports: (rows ?? []).map((r) => {
        const rr = r as any;
        return {
          id: rr.id,
          channel_id: rr.channel_id,
          channel_kind: rr.channel?.kind ?? null,
          channel_purpose: rr.channel?.purpose ?? null,
          legal_hold: Boolean(rr.channel?.legal_hold),
          retention_days: Number(rr.channel?.retention_days ?? 0),
          message_id: rr.message_id,
          message_body: rr.message?.body ?? null,
          message_author_id: rr.message?.author_id ?? null,
          message_author_name: rr.message?.author_id ? nameMap.get(rr.message.author_id) ?? null : null,
          reason: rr.reason,
          details: rr.details,
          reporter_id: rr.reporter_id,
          reporter_name: nameMap.get(rr.reporter_id) ?? null,
          status: rr.status,
          created_at: rr.created_at,
          resolved_at: rr.resolved_at,
          resolved_by: rr.resolved_by,
        };
      }),
    };
  });

// ---------------------------------------------------------------- resolve/dismiss

export const resolveChannelReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        report_id: z.string().uuid(),
        outcome: z.enum(["resolved", "dismissed"]),
        note: z.string().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const { data: existing, error: readErr } = await context.supabase
      .from("channel_reports")
      .select("id, channel_id")
      .eq("id", data.report_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!existing) throw new Error("Report not found");

    const { error } = await context.supabase
      .from("channel_reports")
      .update({
        status: data.outcome,
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.report_id);
    if (error) throw new Error(error.message);

    await context.supabase.from("channel_audit_events").insert({
      channel_id: (existing as any).channel_id,
      event_type: `report_${data.outcome}`,
      actor_id: context.userId,
      metadata: { report_id: data.report_id, note: data.note ?? null },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------- delete message

export const removeChannelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ message_id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const { data: msg, error: readErr } = await context.supabase
      .from("channel_messages")
      .select("id, channel_id, author_id")
      .eq("id", data.message_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!msg) throw new Error("Message not found");

    const { error } = await context.supabase
      .from("channel_messages")
      .delete()
      .eq("id", data.message_id);
    if (error) throw new Error(error.message);

    await context.supabase.from("channel_audit_events").insert({
      channel_id: (msg as any).channel_id,
      event_type: "message_removed",
      actor_id: context.userId,
      target_user_id: (msg as any).author_id,
      metadata: { message_id: data.message_id, reason: data.reason ?? null },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------- retention & legal hold

export const setChannelRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        channel_id: z.string().uuid(),
        legal_hold: z.boolean().optional(),
        retention_days: z.number().int().min(0).max(3650).optional(),
        note: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const patch: { legal_hold?: boolean; retention_days?: number } = {};
    if (typeof data.legal_hold === "boolean") patch.legal_hold = data.legal_hold;
    if (typeof data.retention_days === "number") patch.retention_days = data.retention_days;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("channels")
      .update(patch)
      .eq("id", data.channel_id);
    if (error) throw new Error(error.message);

    await context.supabase.from("channel_audit_events").insert({
      channel_id: data.channel_id,
      event_type: "retention_updated",
      actor_id: context.userId,
      metadata: { ...patch, note: data.note ?? null },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------- export bundle

export type ChannelExportBundle = {
  exported_at: string;
  channel: Record<string, unknown>;
  members: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  audit_events: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
};

export const exportChannelBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ channel_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<ChannelExportBundle> => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const cid = data.channel_id;

    const [ch, members, messages, actions, audit, attachments] = await Promise.all([
      s.from("channels").select("*").eq("id", cid).maybeSingle(),
      s.from("channel_members").select("*").eq("channel_id", cid),
      s
        .from("channel_messages")
        .select("*")
        .eq("channel_id", cid)
        .order("created_at", { ascending: true }),
      s
        .from("channel_actions")
        .select("*")
        .eq("channel_id", cid)
        .order("created_at", { ascending: true }),
      s
        .from("channel_audit_events")
        .select("*")
        .eq("channel_id", cid)
        .order("created_at", { ascending: true }),
      s.from("channel_attachments").select("*").eq("channel_id", cid),
    ]);

    for (const q of [ch, members, messages, actions, audit, attachments]) {
      if (q.error) throw new Error(q.error.message);
    }

    await s.from("channel_audit_events").insert({
      channel_id: cid,
      event_type: "export_bundle_generated",
      actor_id: context.userId,
      metadata: {
        message_count: (messages.data ?? []).length,
        action_count: (actions.data ?? []).length,
      },
    });

    return {
      exported_at: new Date().toISOString(),
      channel: (ch.data ?? {}) as Record<string, unknown>,
      members: (members.data ?? []) as Array<Record<string, unknown>>,
      messages: (messages.data ?? []) as Array<Record<string, unknown>>,
      actions: (actions.data ?? []) as Array<Record<string, unknown>>,
      audit_events: (audit.data ?? []) as Array<Record<string, unknown>>,
      attachments: (attachments.data ?? []) as Array<Record<string, unknown>>,
    };
  });
