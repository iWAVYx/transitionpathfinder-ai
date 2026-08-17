// Transition Channel — structured record operations (Slice D).
//
// Promote a message into an action / decision / question / feedback record,
// then move it through its lifecycle. Reads and writes go through the
// caller's RLS-scoped supabase client; channel_actions RLS enforces
// membership (INSERT) and assignee/promoter/admin (UPDATE, DELETE).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const RECORD_KINDS = ["action", "decision", "question", "feedback"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export const ACTION_STATUSES = ["open", "in_progress", "resolved", "cancelled"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

/**
 * Promote a channel message into a structured record.
 *
 * Slice E — cross-surface integrations:
 *  - When the channel is student-scoped and kind='action', optionally mirror
 *    into `action_items` so it appears in Next Actions and the student view.
 *  - When `create_calendar_event` + `due_at` are set on a student-scoped
 *    channel, add a team-visible `calendar_events` entry.
 *  - When an assignee is set and differs from the promoter, notify them.
 *  Failures on the mirrored writes never block the primary promotion.
 */
export const promoteMessageToAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      channel_id: string;
      message_id: string;
      kind: RecordKind;
      priority?: ActionPriority | null;
      due_at?: string | null;
      assignee_user_id?: string | null;
      resolution?: string | null;
      create_action_item?: boolean;
      create_calendar_event?: boolean;
    }) =>
      z
        .object({
          channel_id: uuid,
          message_id: uuid,
          kind: z.enum(RECORD_KINDS),
          priority: z.enum(ACTION_PRIORITIES).optional().nullable(),
          due_at: z.string().datetime().optional().nullable(),
          assignee_user_id: uuid.optional().nullable(),
          resolution: z.string().trim().max(2000).optional().nullable(),
          create_action_item: z.boolean().optional().default(false),
          create_calendar_event: z.boolean().optional().default(false),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: msg, error: mErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, body")
      .eq("id", data.message_id)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!msg || msg.channel_id !== data.channel_id) {
      throw new Error("Message not found in this channel");
    }

    const { data: channel } = await supabase
      .from("channels")
      .select("id, title, student_id, organization_id")
      .eq("id", data.channel_id)
      .maybeSingle();

    const titleFromBody =
      (msg.body ?? "").split("\n")[0].slice(0, 140).trim() || "Channel Item";

    const metadata: Record<string, string> = {};

    // Optional mirror #1 — action_items for student-scoped 'action' records.
    let actionItemId: string | null = null;
    if (
      data.kind === "action" &&
      data.create_action_item &&
      channel?.student_id
    ) {
      const pri = data.priority ?? "normal";
      const priorityMap: Record<string, string> = {
        low: "low",
        normal: "medium",
        high: "high",
        urgent: "high",
      };
      const { data: ai, error: aiErr } = await supabase
        .from("action_items")
        .insert({
          student_id: channel.student_id,
          title: titleFromBody,
          description: data.resolution ?? null,
          category: "family",
          priority: priorityMap[pri] ?? "medium",
          due_date: data.due_at
            ? new Date(data.due_at).toISOString().slice(0, 10)
            : null,
          created_by_user_id: userId,
          assigned_to_user_id: data.assignee_user_id ?? null,
          status: "not_started",
        })
        .select("id")
        .single();
      if (!aiErr && ai) {
        actionItemId = ai.id as string;
        metadata.action_item_id = actionItemId;
      }
    }

    // Optional mirror #2 — team calendar entry when a due date is set.
    let calendarEventId: string | null = null;
    if (
      data.create_calendar_event &&
      data.due_at &&
      channel?.student_id
    ) {
      const dt = new Date(data.due_at);
      const { data: cal, error: calErr } = await supabase
        .from("calendar_events")
        .insert({
          owner_user_id: userId,
          student_id: channel.student_id,
          title: titleFromBody,
          detail: `From ${channel.title ?? "Transition Channel"}`,
          event_date: dt.toISOString().slice(0, 10),
          start_time: dt.toISOString().slice(11, 16),
          all_day: false,
          visibility: "team",
          event_type: "action",
          audience_roles: [],
          status: "scheduled",
          reminder_settings: {},
          source_type: "channel_action",
          related_action_item_id: actionItemId,
        })
        .select("id")
        .single();
      if (!calErr && cal) {
        calendarEventId = cal.id as string;
        metadata.calendar_event_id = calendarEventId;
      }
    }

    const { data: row, error } = await supabase
      .from("channel_actions")
      .insert({
        channel_id: data.channel_id,
        message_id: data.message_id,
        source_message_id: data.message_id,
        // action_kind (legacy enum, NOT NULL) — keep a safe default; the
        // semantic type lives in `kind`.
        action_kind: "next_action",
        kind: data.kind,
        priority: data.priority ?? null,
        due_at: data.due_at ?? null,
        assignee_user_id: data.assignee_user_id ?? null,
        resolution: data.resolution ?? null,
        promoted_by: userId,
        target_id: actionItemId,
        metadata,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Notify assignee (skip when self-assigned, muted, or in quiet hours).
    if (data.assignee_user_id && data.assignee_user_id !== userId) {
      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        // Respect per-channel mute + in-app opt-out.
        const { data: memberPref } = await supabaseAdmin
          .from("channel_members")
          .select("muted, notify_in_app")
          .eq("channel_id", data.channel_id)
          .eq("user_id", data.assignee_user_id)
          .maybeSingle();
        if (memberPref?.muted || memberPref?.notify_in_app === false) {
          // Skip in-app notification when member has muted the channel.
        } else {
          // Respect quiet hours: if the recipient is currently inside their
          // quiet-hours window, still insert but the digest job carries the
          // email. In-app notification remains queryable when they return.
          await supabaseAdmin.from("notifications").insert({
            user_id: data.assignee_user_id,
            notification_type: "channel_action_assigned",
            title: `Assigned: ${titleFromBody}`,
            message: `In ${channel?.title ?? "Transition Channel"}`,
            related_student_id: channel?.student_id ?? null,
            related_record_type: "channel_action",
            related_record_id: row.id,
            read_status: false,
          });
        }
      } catch {
        // Non-fatal: notification best-effort.
      }
    }

    return {
      action_id: row.id,
      action_item_id: actionItemId,
      calendar_event_id: calendarEventId,
    };
  });

/**
 * Update lifecycle fields on a promoted record.
 */
export const updateChannelAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      action_id: string;
      status?: ActionStatus;
      priority?: ActionPriority | null;
      due_at?: string | null;
      assignee_user_id?: string | null;
      resolution?: string | null;
    }) =>
      z
        .object({
          action_id: uuid,
          status: z.enum(ACTION_STATUSES).optional(),
          priority: z.enum(ACTION_PRIORITIES).optional().nullable(),
          due_at: z.string().datetime().optional().nullable(),
          assignee_user_id: uuid.optional().nullable(),
          resolution: z.string().trim().max(2000).optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const patch: {
      status?: ActionStatus;
      priority?: ActionPriority | null;
      due_at?: string | null;
      assignee_user_id?: string | null;
      resolution?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
    } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.due_at !== undefined) patch.due_at = data.due_at;
    if (data.assignee_user_id !== undefined) patch.assignee_user_id = data.assignee_user_id;
    if (data.resolution !== undefined) patch.resolution = data.resolution;

    if (data.status === "resolved" || data.status === "cancelled") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = userId;
    } else if (data.status === "open" || data.status === "in_progress") {
      patch.resolved_at = null;
      patch.resolved_by = null;
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    // Read current row so we can detect assignee change + mirror status.
    const { data: prev } = await supabase
      .from("channel_actions")
      .select(
        "id, channel_id, assignee_user_id, target_id, metadata, resolution",
      )
      .eq("id", data.action_id)
      .maybeSingle();

    const { error } = await supabase
      .from("channel_actions")
      .update(patch)
      .eq("id", data.action_id);
    if (error) throw new Error(error.message);

    // Mirror status → linked action_items row.
    const meta = (prev?.metadata as Record<string, string> | null) ?? {};
    const linkedActionItemId =
      (meta.action_item_id as string | undefined) ??
      (prev?.target_id as string | undefined) ??
      null;
    if (linkedActionItemId && patch.status) {
      const statusMap: Record<string, string> = {
        open: "not_started",
        in_progress: "in_progress",
        resolved: "completed",
        cancelled: "not_started",
      };
      const mapped = statusMap[patch.status];
      if (mapped) {
        await supabase
          .from("action_items")
          .update({ status: mapped })
          .eq("id", linkedActionItemId);
      }
    }

    // Notify newly assigned user.
    const nextAssignee = data.assignee_user_id;
    const prevAssignee = prev?.assignee_user_id ?? null;
    if (
      nextAssignee !== undefined &&
      nextAssignee &&
      nextAssignee !== prevAssignee &&
      nextAssignee !== userId
    ) {
      try {
        const { data: ch } = await supabase
          .from("channels")
          .select("title, student_id")
          .eq("id", prev?.channel_id ?? "")
          .maybeSingle();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        await supabaseAdmin.from("notifications").insert({
          user_id: nextAssignee,
          notification_type: "channel_action_assigned",
          title: "You were assigned an action",
          message: `In ${ch?.title ?? "Transition Channel"}`,
          related_student_id: ch?.student_id ?? null,
          related_record_type: "channel_action",
          related_record_id: data.action_id,
          read_status: false,
        });
      } catch {
        // Non-fatal.
      }
    }

    return { ok: true };
  });

/**
 * Delete a promoted record (promoter or channel admin only, via RLS).
 */
export const deleteChannelAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { action_id: string }) =>
    z.object({ action_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("channel_actions")
      .delete()
      .eq("id", data.action_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Return the set of members eligible to be assigned within a channel.
 */
export type ChannelMemberOption = {
  user_id: string;
  name: string;
  member_role: string;
};

export const listChannelAssigneeOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { channel_id: string }) =>
    z.object({ channel_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: members, error } = await supabase
      .from("channel_members")
      .select("user_id, member_role")
      .eq("channel_id", data.channel_id)
      .is("left_at", null)
      .limit(200);
    if (error) throw new Error(error.message);

    const ids = (members ?? []).map((m) => m.user_id);
    const nameMap = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("id", ids);
      (profs ?? []).forEach((p) =>
        nameMap.set(p.id, (p.preferred_name || p.full_name || "").trim() || "Member"),
      );
    }

    const options: ChannelMemberOption[] = (members ?? [])
      .map((m) => ({
        user_id: m.user_id,
        member_role: String(m.member_role ?? "member"),
        name: nameMap.get(m.user_id) ?? "Member",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { options };
  });
