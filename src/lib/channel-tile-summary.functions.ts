// Transition Channel — tile summary server function.
//
// Returns role-appropriate counts for the dashboard tile: unread channels,
// unread messages, mention count, assigned open action items, pending
// decisions, upcoming deadlines, and pending connection requests. All reads
// go through the caller's RLS-scoped supabase client so no channel data is
// visible outside verified membership.
import { assertExpectedViewer, optionalViewerIntent } from "./viewer-intent";
import { readReportPages, readReportBatches } from "./report-query-pages";
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

async function readCount(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const result = await query;
  if (result.error || !Number.isSafeInteger(result.count) || result.count! < 0)
    throw new Error("Channel counts unavailable");
  return result.count!;
}

async function countChannelBatches(ids: string[], read: (ids: string[]) => Promise<number>) {
  let total = 0;
  const unique = [...new Set(ids)];
  for (let start = 0; start < unique.length; start += 100)
    total += await read(unique.slice(start, start + 100));
  return total;
}

export const getChannelTileSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }): Promise<ChannelTileSummary> => {
    assertExpectedViewer(data ?? {}, context.userId);
    try {
      const { supabase, userId } = context;

      // Memberships → channels
      const memberships = await readReportPages((from, to) =>
        supabase
          .from("channel_members")
          .select(
            "id, channel_id, muted, channels(id, kind, title, last_message_at, archived_at)",
            { count: "exact" },
          )
          .eq("user_id", userId)
          .is("left_at", null)
          .order("id")
          .range(from, to),
      );

      const rows = (memberships ?? []).filter((r: any) => r.channels && !r.channels.archived_at);
      const channelIds = rows.map((r: any) => r.channel_id as string);

      // Last-read map
      const readMap = new Map<string, string>();
      if (channelIds.length > 0) {
        const reads = await readReportBatches<{ channel_id: string; last_read_at: string }>(
          channelIds,
          (ids, from, to) =>
            supabase
              .from("channel_message_reads")
              .select("channel_id, last_read_at", { count: "exact" })
              .in("channel_id", ids)
              .eq("user_id", userId)
              .order("channel_id")
              .range(from, to),
        );
        (reads ?? []).forEach((r: any) => readMap.set(r.channel_id, r.last_read_at));
      }

      // Per-channel unread counts (respecting mute)
      let unreadChannels = 0;
      let unreadMessages = 0;
      const perChannelUnread = new Map<string, number>();
      for (const r of rows) {
        const cid = r.channel_id as string;
        const lastRead = readMap.get(cid) ?? "1970-01-01T00:00:00Z";
        const count = await readCount(
          supabase
            .from("channel_messages")
            .select("id", { count: "exact", head: true })
            .eq("channel_id", cid)
            .is("deleted_at", null)
            .gt("created_at", lastRead),
        );
        const n = count;
        perChannelUnread.set(cid, n);
        if (!r.muted && n > 0) {
          unreadChannels += 1;
          unreadMessages += n;
        }
      }

      // Mentions unseen
      const mentions = await readCount(
        supabase
          .from("channel_mentions")
          .select(
            "id,channel_messages!inner(id,deleted_at),channels!inner(id)",
            { count: "exact", head: true },
          )
          .eq("mentioned_user_id", userId)
          .is("channel_messages.deleted_at", null)
          .is("seen_at", null),
      );

      // Assigned open actions
      const assignedOpen = await readCount(
        supabase
          .from("channel_actions")
          .select("id", { count: "exact", head: true })
          .eq("assignee_user_id", userId)
          .in("status", ["open", "in_progress"])
          .eq("kind", "action"),
      );

      // Pending decisions in channels the user belongs to
      let decisionsPending = 0;
      let upcomingDeadlines = 0;
      if (channelIds.length > 0) {
        const dc = await countChannelBatches(channelIds, (ids) =>
          readCount(
            supabase
              .from("channel_actions")
              .select("id", { count: "exact", head: true })
              .in("channel_id", ids)
              .eq("kind", "decision")
              .in("status", ["open", "in_progress"]),
          ),
        );
        decisionsPending = dc;

        const soon = new Date();
        soon.setDate(soon.getDate() + 14);
        const dd = await countChannelBatches(channelIds, (ids) =>
          readCount(
            supabase
              .from("channel_actions")
              .select("id", { count: "exact", head: true })
              .in("channel_id", ids)
              .in("status", ["open", "in_progress"])
              .not("due_at", "is", null)
              .lte("due_at", soon.toISOString()),
          ),
        );
        upcomingDeadlines = dd;
      }

      // Pending connection requests visible to the caller (RLS scopes to
      // requester + target-org admins).
      const connectionRequests = await readCount(
        supabase
          .from("channel_connection_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      );

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
        mentions,
        assignedOpen,
        decisionsPending,
        upcomingDeadlines,
        connectionRequests,
        recent,
      };
    } catch {
      throw new Error("We couldn't load all your channel counts. Please try again.");
    }
  });
