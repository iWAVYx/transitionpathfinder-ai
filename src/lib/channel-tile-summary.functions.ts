// Transition Channel — tile summary server function.
//
// Returns role-appropriate counts for the dashboard tile: unread channels,
// unread messages, mention count, assigned open action items, pending
// decisions, upcoming deadlines, and pending connection requests. All reads
// go through the caller's RLS-scoped supabase client so no channel data is
// visible outside verified membership.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChannelTileSummary = {
  unreadChannels: number;
  unreadMessages: number;
  mentions: number;
  assignedOpen: number;
  decisionsPending: number;
  upcomingDeadlines: number;
  connectionRequests: number;
  recent: Array<{
    id: string;
    title: string;
    kind: string;
    unread: number;
    muted: boolean;
    last_message_at: string | null;
  }>;
};

const EMPTY: ChannelTileSummary = {
  unreadChannels: 0,
  unreadMessages: 0,
  mentions: 0,
  assignedOpen: 0,
  decisionsPending: 0,
  upcomingDeadlines: 0,
  connectionRequests: 0,
  recent: [],
};

export const getChannelTileSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChannelTileSummary> => {
    const { supabase, userId } = context;

    // Memberships → channels
    const { data: memberships, error: mErr } = await supabase
      .from("channel_members")
      .select(
        "channel_id, muted, channels(id, kind, title, last_message_at, archived_at)",
      )
      .eq("user_id", userId)
      .is("left_at", null);
    if (mErr) return EMPTY;

    const rows = (memberships ?? []).filter(
      (r: any) => r.channels && !r.channels.archived_at,
    );
    const channelIds = rows.map((r: any) => r.channel_id as string);

    // Last-read map
    const readMap = new Map<string, string>();
    if (channelIds.length > 0) {
      const { data: reads } = await supabase
        .from("channel_message_reads")
        .select("channel_id, last_read_at")
        .in("channel_id", channelIds)
        .eq("user_id", userId);
      (reads ?? []).forEach((r: any) => readMap.set(r.channel_id, r.last_read_at));
    }

    // Per-channel unread counts (respecting mute)
    let unreadChannels = 0;
    let unreadMessages = 0;
    const perChannelUnread = new Map<string, number>();
    for (const r of rows) {
      const cid = r.channel_id as string;
      const lastRead = readMap.get(cid) ?? "1970-01-01T00:00:00Z";
      const { count } = await supabase
        .from("channel_messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", cid)
        .is("deleted_at", null)
        .gt("created_at", lastRead);
      const n = count ?? 0;
      perChannelUnread.set(cid, n);
      if (!r.muted && n > 0) {
        unreadChannels += 1;
        unreadMessages += n;
      }
    }

    // Mentions unseen
    const { count: mentions } = await supabase
      .from("channel_mentions")
      .select("id", { count: "exact", head: true })
      .eq("mentioned_user_id", userId)
      .is("seen_at", null);

    // Assigned open actions
    const { count: assignedOpen } = await supabase
      .from("channel_actions")
      .select("id", { count: "exact", head: true })
      .eq("assignee_user_id", userId)
      .in("status", ["open", "in_progress"])
      .eq("kind", "action");

    // Pending decisions in channels the user belongs to
    let decisionsPending = 0;
    let upcomingDeadlines = 0;
    if (channelIds.length > 0) {
      const { count: dc } = await supabase
        .from("channel_actions")
        .select("id", { count: "exact", head: true })
        .in("channel_id", channelIds)
        .eq("kind", "decision")
        .in("status", ["open", "in_progress"]);
      decisionsPending = dc ?? 0;

      const soon = new Date();
      soon.setDate(soon.getDate() + 14);
      const { count: dd } = await supabase
        .from("channel_actions")
        .select("id", { count: "exact", head: true })
        .in("channel_id", channelIds)
        .in("status", ["open", "in_progress"])
        .not("due_at", "is", null)
        .lte("due_at", soon.toISOString());
      upcomingDeadlines = dd ?? 0;
    }

    // Pending connection requests addressed to this user
    const { count: connectionRequests } = await supabase
      .from("channel_connection_requests")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", userId)
      .eq("status", "pending");

    // Recent 3 (by last_message_at)
    const recent = rows
      .map((r: any) => ({
        id: r.channels.id as string,
        title: r.channels.title as string,
        kind: r.channels.kind as string,
        unread: perChannelUnread.get(r.channel_id) ?? 0,
        muted: !!r.muted,
        last_message_at: (r.channels.last_message_at as string | null) ?? null,
      }))
      .sort((a, b) => {
        const ta = a.last_message_at ? Date.parse(a.last_message_at) : 0;
        const tb = b.last_message_at ? Date.parse(b.last_message_at) : 0;
        return tb - ta;
      })
      .slice(0, 3);

    return {
      unreadChannels,
      unreadMessages,
      mentions: mentions ?? 0,
      assignedOpen: assignedOpen ?? 0,
      decisionsPending,
      upcomingDeadlines,
      connectionRequests: connectionRequests ?? 0,
      recent,
    };
  });
