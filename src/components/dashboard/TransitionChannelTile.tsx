import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import {
  getChannelTileSummary,
  type ChannelTileSummary,
} from "@/lib/channel-tile-summary.functions";
import { supabase } from "@/integrations/supabase/client";

type StatKey =
  | "unreadChannels"
  | "unreadMessages"
  | "mentions"
  | "assignedOpen"
  | "decisionsPending"
  | "upcomingDeadlines"
  | "connectionRequests";

const STAT_LABEL: Record<StatKey, string> = {
  unreadChannels: "Unread Channels",
  unreadMessages: "New Messages",
  mentions: "Mentions",
  assignedOpen: "Assigned To You",
  decisionsPending: "Decisions Pending",
  upcomingDeadlines: "Upcoming Deadlines",
  connectionRequests: "Connection Requests",
};

// Role determines which four stats show in the tile grid.
const ROLE_STATS: Record<string, StatKey[]> = {
  student: ["unreadChannels", "mentions", "assignedOpen", "upcomingDeadlines"],
  parent: ["unreadChannels", "decisionsPending", "assignedOpen", "upcomingDeadlines"],
  guardian: ["unreadChannels", "decisionsPending", "assignedOpen", "upcomingDeadlines"],
  educator: ["unreadChannels", "mentions", "assignedOpen", "upcomingDeadlines"],
  teacher: ["unreadChannels", "mentions", "assignedOpen", "upcomingDeadlines"],
  case_manager: ["unreadChannels", "mentions", "assignedOpen", "upcomingDeadlines"],
  school_admin: ["unreadChannels", "mentions", "decisionsPending", "upcomingDeadlines"],
  district_admin: ["unreadChannels", "mentions", "decisionsPending", "upcomingDeadlines"],
  partner: ["unreadChannels", "connectionRequests", "assignedOpen", "upcomingDeadlines"],
  default: ["unreadChannels", "mentions", "assignedOpen", "upcomingDeadlines"],
};

export type TransitionChannelTileProps = {
  /** Viewer role used to pick which stats to feature in the tile. */
  role?: string;
};

export function TransitionChannelTile({ role = "default" }: TransitionChannelTileProps) {
  const load = useServerFn(getChannelTileSummary);
  const [summary, setSummary] = useState<ChannelTileSummary | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      load()
        .then((r) => {
          if (cancelled) return;
          setSummary(r);
          setErrored(false);
        })
        .catch(() => {
          if (cancelled) return;
          setErrored(true);
          setSummary({
            unreadChannels: 0,
            unreadMessages: 0,
            mentions: 0,
            assignedOpen: 0,
            decisionsPending: 0,
            upcomingDeadlines: 0,
            connectionRequests: 0,
            recent: [],
          });
        });
    };
    refresh();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      channel = supabase
        .channel(`channel-tile-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "channel_messages" },
          () => refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "channel_mentions" },
          () => refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "channel_actions" },
          () => refresh(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const loading = summary === null;
  const statKeys = ROLE_STATS[role] ?? ROLE_STATS.default;
  const primary = summary
    ? statKeys.reduce((n, k) => n + (summary[k] ?? 0), 0)
    : 0;

  return (
    <Link
      to="/transition-channel"
      className="group block rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
      aria-label="Transition Channel"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-sky text-primary shadow-soft">
            <MessageSquare className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              Transition Channel
            </div>
            <div className="mt-0.5 font-display text-lg font-medium tracking-tight">
              {loading ? "Loading…" : primary > 0 ? `${primary} to review` : "All caught up"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Communicate, coordinate next steps, and keep important transition conversations
              connected.
            </p>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      {!loading && !errored && (
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {statKeys.map((k) => {
            const value = summary![k] ?? 0;
            const active = value > 0;
            return (
              <div
                key={k}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  active ? "bg-primary/10 text-foreground" : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <dt className="text-[11px] font-medium uppercase tracking-wide">
                  {STAT_LABEL[k]}
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold">{value}</dd>
              </div>
            );
          })}
        </dl>
      )}

      {!loading && !errored && summary!.recent.length > 0 && (
        <ul className="mt-4 space-y-2">
          {summary!.recent.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {!c.muted && c.unread > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && !errored && summary!.recent.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          When your Transition Team, family, school, or partners open a channel with you, it will
          appear here.
        </p>
      )}

      {errored && (
        <p className="mt-3 text-sm text-muted-foreground">
          Channel summary is temporarily unavailable. Open the channel to try again.
        </p>
      )}
    </Link>
  );
}
