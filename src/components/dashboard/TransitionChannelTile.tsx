import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { listMyChannels, type ChannelSummary } from "@/lib/channels.functions";
import { supabase } from "@/integrations/supabase/client";

export function TransitionChannelTile() {
  const list = useServerFn(listMyChannels);
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      list()
        .then((r) => {
          if (!cancelled) setChannels(r.channels);
        })
        .catch(() => {
          if (!cancelled) setChannels([]);
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
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [list]);

  const loading = channels === null;
  const active = (channels ?? []).filter((c) => !c.archived_at);
  const unread = active.reduce((sum, c) => sum + (c.muted ? 0 : c.unread_count), 0);
  const preview = active.slice(0, 3);

  return (
    <Link
      to="/transition-channel"
      className="group block rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-sky text-primary shadow-soft">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              Transition Channel
            </div>
            <div className="mt-0.5 font-display text-lg font-medium tracking-tight">
              {loading
                ? "Loading…"
                : active.length === 0
                  ? "No channels yet"
                  : `${active.length} channel${active.length === 1 ? "" : "s"}`}
              {unread > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {unread} new
                </span>
              )}
            </div>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      {preview.length > 0 && (
        <ul className="mt-4 space-y-2">
          {preview.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {!c.muted && c.unread_count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {c.unread_count}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && active.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          When your Transition Team, family, school, or partners open a channel with you, it will
          appear here.
        </p>
      )}
    </Link>
  );
}
