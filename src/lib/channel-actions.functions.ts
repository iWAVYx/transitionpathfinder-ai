// Transition Channel — structured record operations (Slice D).
//
// Promote a message into an action / decision / question / feedback record,
// then move it through its lifecycle. Reads and writes go through the
// caller's RLS-scoped supabase client; channel_actions RLS enforces
// membership (INSERT) and assignee/promoter/admin (UPDATE, DELETE).

import { z } from "zod";
import { assertExpectedViewer, viewerIntentSchema } from "./viewer-intent";
import { readReportPages, readReportBatches } from "./report-query-pages";
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
 *  The primary promotion is confirmed before optional writes; each optional result is reported separately.
 */
export const promoteMessageToAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      channel_id: string;
      message_id: string;
      expected_viewer_id?: string;
      expected_student_id?: string | null;
      expected_message_body?: string;
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
          ...viewerIntentSchema.shape,
          expected_student_id: uuid.optional().nullable(),
          expected_message_body: z.string().max(4000).optional(),
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
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    const { data: msg, error: mErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, body, deleted_at")
      .eq("id", data.message_id)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (
      !msg ||
      msg.id !== data.message_id ||
      msg.channel_id !== data.channel_id ||
      msg.deleted_at ||
      (data.expected_message_body !== undefined && msg.body !== data.expected_message_body)
    ) {
      throw new Error("Message not found in this channel");
    }

    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, title, student_id, organization_id, archived_at")
      .eq("id", data.channel_id)
      .maybeSingle();

    if (
      channelError ||
      !channel ||
      channel.id !== data.channel_id ||
      channel.archived_at ||
      (data.expected_student_id !== undefined &&
        (channel.student_id ?? null) !== data.expected_student_id)
    )
      throw new Error(
        "This conversation's student or access changed. Refresh before creating a record.",
      );
    const { data: membership, error: membershipError } = await supabase
      .from("channel_members")
      .select("channel_id,user_id")
      .eq("channel_id", data.channel_id)
      .eq("user_id", userId)
      .is("left_at", null)
      .maybeSingle();
    if (
      membershipError ||
      !membership ||
      membership.channel_id !== data.channel_id ||
      membership.user_id !== userId
    )
      throw new Error("Current conversation membership could not be confirmed.");
    if (data.assignee_user_id) {
      const { data: assignee, error: assigneeError } = await supabase
        .from("channel_members")
        .select("channel_id,user_id")
        .eq("channel_id", data.channel_id)
        .eq("user_id", data.assignee_user_id)
        .is("left_at", null)
        .maybeSingle();
      if (
        assigneeError ||
        !assignee ||
        assignee.channel_id !== data.channel_id ||
        assignee.user_id !== data.assignee_user_id
      )
        throw new Error("The selected assignee is no longer available in this conversation.");
    }
    if (
      (data.create_action_item && (data.kind !== "action" || !channel.student_id)) ||
      (data.create_calendar_event && (!channel.student_id || !data.due_at))
    )
      throw new Error(
        "Related student tasks and calendar entries need the matching student and a valid due date where required.",
      );

    const titleFromBody = (msg.body ?? "").split("\n")[0].slice(0, 140).trim() || "Channel Item";

    const metadata: Record<string, string> = {};

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
        target_id: null,
        metadata,
      })
      .select("id,channel_id,message_id,kind,promoted_by")
      .single();
    if (
      error ||
      !row ||
      !uuid.safeParse(row.id).success ||
      row.channel_id !== data.channel_id ||
      row.message_id !== data.message_id ||
      row.kind !== data.kind ||
      row.promoted_by !== userId
    )
      throw new Error(
        "We couldn't confirm this record was created. Check the conversation's records before trying again.",
      );

    const sync = {
      action_item: "not_requested",
      calendar: "not_requested",
      links: "not_needed",
    } as {
      action_item: "not_requested" | "created" | "unconfirmed";
      calendar: "not_requested" | "created" | "unconfirmed";
      links: "not_needed" | "saved" | "unconfirmed";
    };
    // Optional mirror #1 — action_items for student-scoped 'action' records.
    let actionItemId: string | null = null;
    if (data.kind === "action" && data.create_action_item && channel?.student_id) {
      const pri = data.priority ?? "normal";
      const priorityMap: Record<string, string> = {
        low: "low",
        normal: "medium",
        high: "high",
        urgent: "high",
      };
      sync.action_item = "unconfirmed";
      try {
        const { data: ai, error: aiErr } = await supabase
          .from("action_items")
          .insert({
            student_id: channel.student_id,
            title: titleFromBody,
            description: data.resolution ?? null,
            category: "family",
            priority: priorityMap[pri] ?? "medium",
            due_date: data.due_at ? new Date(data.due_at).toISOString().slice(0, 10) : null,
            created_by_user_id: userId,
            assigned_to_user_id: data.assignee_user_id ?? null,
            status: "not_started",
          })
          .select("id,student_id,created_by_user_id")
          .single();
        if (
          !aiErr &&
          ai &&
          uuid.safeParse(ai.id).success &&
          ai.student_id === channel.student_id &&
          ai.created_by_user_id === userId
        ) {
          sync.action_item = "created";
          actionItemId = ai.id as string;
          metadata.action_item_id = actionItemId;
        }
      } catch {
        /* Primary record is saved; optional task is unconfirmed. */
      }
    }

    // Optional mirror #2 — team calendar entry when a due date is set.
    let calendarEventId: string | null = null;
    if (data.create_calendar_event && data.due_at && channel?.student_id) {
      sync.calendar = "unconfirmed";
      try {
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
          .select("id,student_id,owner_user_id")
          .single();
        if (
          !calErr &&
          cal &&
          uuid.safeParse(cal.id).success &&
          cal.student_id === channel.student_id &&
          cal.owner_user_id === userId
        ) {
          sync.calendar = "created";
          calendarEventId = cal.id as string;
          metadata.calendar_event_id = calendarEventId;
        }
      } catch {
        /* Primary record is saved; optional calendar entry is unconfirmed. */
      }
    }

    if (Object.keys(metadata).length > 0) {
      sync.links = "unconfirmed";
      try {
        const { data: linked, error: linkError } = await supabase
          .from("channel_actions")
          .update({ target_id: actionItemId, metadata })
          .eq("id", row.id)
          .eq("channel_id", data.channel_id)
          .eq("promoted_by", userId)
          .select("id,target_id,metadata")
          .single();
        const savedMetadata = linked?.metadata as Record<string, string> | null;
        if (
          !linkError &&
          linked?.id === row.id &&
          linked.target_id === actionItemId &&
          Object.entries(metadata).every(([key, value]) => savedMetadata?.[key] === value)
        )
          sync.links = "saved";
      } catch {
        /* Related entries may exist; linking is unconfirmed. */
      }
    }

    // Notify assignee (skip when self-assigned, muted, or in quiet hours).
    if (data.assignee_user_id && data.assignee_user_id !== userId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Respect per-channel mute + in-app opt-out.
        const { data: memberPref, error: preferenceError } = await supabaseAdmin
          .from("channel_members")
          .select("muted, notify_in_app")
          .eq("channel_id", data.channel_id)
          .eq("user_id", data.assignee_user_id)
          .is("left_at", null)
          .maybeSingle();
        if (
          preferenceError ||
          !memberPref ||
          memberPref.muted !== false ||
          memberPref.notify_in_app !== true
        ) {
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
      channel_id: data.channel_id,
      message_id: data.message_id,
      kind: data.kind,
      sync,
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
  .validator((input: { channel_id: string; expected_viewer_id?: string }) =>
    z.object({ channel_id: uuid, ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;
    let members: { id: string; user_id: string; member_role: string }[];
    let profiles: { id: string; full_name: string | null; preferred_name: string | null }[];
    try {
      members = await readReportPages((from, to) =>
        supabase
          .from("channel_members")
          .select("id,user_id,member_role", { count: "exact" })
          .eq("channel_id", data.channel_id)
          .is("left_at", null)
          .order("id")
          .range(from, to),
      );
      profiles = await readReportBatches(
        members.map((member) => member.user_id),
        (ids, from, to) =>
          supabase
            .from("profiles")
            .select("id,full_name,preferred_name", { count: "exact" })
            .in("id", ids)
            .order("id")
            .range(from, to),
      );
    } catch {
      throw new Error("We couldn't load all conversation members. Please try again.");
    }
    const names = new Map(
      profiles.map((profile) => [
        profile.id,
        (profile.preferred_name || profile.full_name || "").trim() || "Member",
      ]),
    );
    const options: ChannelMemberOption[] = members
      .map((member) => ({
        user_id: member.user_id,
        member_role: String(member.member_role ?? "member"),
        name: names.get(member.user_id) ?? "Member",
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.user_id.localeCompare(b.user_id));
    return { options };
  });
