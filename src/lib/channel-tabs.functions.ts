// Transition Channel — tab-scoped server functions (Slice B).
//
// These helpers feed the role-filtered tabs on /transition-channel. All reads
// flow through the caller's RLS-scoped supabase client so the underlying
// channel_* policies enforce membership. No tab bypasses those rules.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type ChannelMention = {
  id: string;
  channel_id: string;
  message_id: string;
  author_id: string;
  author_name: string | null;
  mentioned_user_id: string;
  channel_title: string;
  channel_kind: string;
  message_body: string;
  seen_at: string | null;
  created_at: string;
};

export type ChannelActionRecord = {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_kind: string;
  kind: string;
  status: string;
  priority: string | null;
  due_at: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  promoted_by: string;
  promoter_name: string | null;
  source_message_id: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
};

/** Mentions where the caller is the target. */
export const listMyMentions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("channel_mentions")
      .select(
        "id, channel_id, message_id, author_id, mentioned_user_id, seen_at, created_at, channel_messages!inner(body), channels!inner(title, kind)",
      )
      .eq("mentioned_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const authorIds = Array.from(
      new Set((rows ?? []).map((r) => r.author_id).filter((v): v is string => !!v)),
    );
    const nameMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("id", authorIds);
      (profs ?? []).forEach((p) =>
        nameMap.set(p.id, (p.preferred_name || p.full_name || "").trim() || "Member"),
      );
    }

    const mentions: ChannelMention[] = (rows ?? []).map((r) => ({
      id: r.id,
      channel_id: r.channel_id,
      message_id: r.message_id,
      author_id: r.author_id,
      author_name: nameMap.get(r.author_id) ?? "Member",
      mentioned_user_id: r.mentioned_user_id,
      channel_title: (r.channels as any).title,
      channel_kind: (r.channels as any).kind,
      message_body: (r.channel_messages as any).body,
      seen_at: r.seen_at,
      created_at: r.created_at,
    }));

    return { mentions };
  });

/** Channel actions filtered by kind and optional assignee. */
export const listChannelActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind:
        | "action"
        | "decision"
        | "question"
        | "feedback"
        | "meeting_item"
        | "opportunity_followup"
        | "referral_followup";
      assignee_only?: boolean;
    }) =>
      z
        .object({
          kind: z.enum([
            "action",
            "decision",
            "question",
            "feedback",
            "meeting_item",
            "opportunity_followup",
            "referral_followup",
          ]),
          assignee_only: z.boolean().default(false),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let q = supabase
      .from("channel_actions")
      .select(
        "id, channel_id, kind, status, priority, due_at, assignee_user_id, promoted_by, source_message_id, resolution, created_at, resolved_at, channels!inner(title, kind)",
      )
      .eq("kind", data.kind)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data.assignee_only) {
      q = q.eq("assignee_user_id", userId);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set(
        (rows ?? [])
          .flatMap((r) => [r.assignee_user_id, r.promoted_by])
          .filter((v): v is string => !!v),
      ),
    );
    const nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("id", userIds);
      (profs ?? []).forEach((p) =>
        nameMap.set(p.id, (p.preferred_name || p.full_name || "").trim() || "Member"),
      );
    }

    const actions: ChannelActionRecord[] = (rows ?? []).map((r) => ({
      id: r.id,
      channel_id: r.channel_id,
      channel_title: (r.channels as any).title,
      channel_kind: (r.channels as any).kind,
      kind: r.kind,
      status: r.status,
      priority: r.priority,
      due_at: r.due_at,
      assignee_user_id: r.assignee_user_id,
      assignee_name: r.assignee_user_id ? (nameMap.get(r.assignee_user_id) ?? "Member") : null,
      promoted_by: r.promoted_by,
      promoter_name: nameMap.get(r.promoted_by) ?? "Member",
      source_message_id: r.source_message_id,
      resolution: r.resolution,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
    }));

    return { actions };
  });

/**
 * Mark a mention as seen. Only the mentioned user can do this.
 */
export const markMentionSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mention_id: string }) => z.object({ mention_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("channel_mentions")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", data.mention_id)
      .eq("mentioned_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
