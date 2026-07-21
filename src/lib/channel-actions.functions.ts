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
 */
export const promoteMessageToAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      channel_id: string;
      message_id: string;
      kind: RecordKind;
      priority?: ActionPriority | null;
      due_at?: string | null;
      assignee_user_id?: string | null;
      resolution?: string | null;
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
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: msg, error: mErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id")
      .eq("id", data.message_id)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!msg || msg.channel_id !== data.channel_id) {
      throw new Error("Message not found in this channel");
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
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { action_id: row.id };
  });

/**
 * Update lifecycle fields on a promoted record.
 */
export const updateChannelAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
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

    const { error } = await supabase
      .from("channel_actions")
      .update(patch)
      .eq("id", data.action_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Delete a promoted record (promoter or channel admin only, via RLS).
 */
export const deleteChannelAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action_id: string }) =>
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
  .inputValidator((input: { channel_id: string }) =>
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
