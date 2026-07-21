import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, RefreshCw } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyChannels,
  listChannelMessages,
  sendChannelMessage,
  markChannelRead,
  type ChannelSummary,
  type ChannelMessage,
} from "@/lib/channels.functions";
import { ConnectionRequestsDrawer } from "@/components/channels/ConnectionRequestsDrawer";

export const Route = createFileRoute("/_authenticated/transition-channel")({
  head: () => ({ meta: [{ title: "Transition Channel — TransitionForward" }] }),
  component: TransitionChannelPage,
  errorComponent: ({ reset }) => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-lg">Something went wrong loading channels.</p>
        <Button onClick={() => reset()} className="mt-4">Retry</Button>
      </div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">Channel not found.</div>
    </SiteShell>
  ),
});

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function TransitionChannelPage() {
  const listFn = useServerFn(listMyChannels);
  const msgsFn = useServerFn(listChannelMessages);
  const sendFn = useServerFn(sendChannelMessage);
  const readFn = useServerFn(markChannelRead);
  const qc = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ["transition-channels"],
    queryFn: () => listFn(),
  });

  const channels = channelsQuery.data?.channels ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && channels.length > 0) setActiveId(channels[0].id);
  }, [channels, activeId]);

  const active = useMemo(
    () => channels.find((c) => c.id === activeId) ?? null,
    [channels, activeId],
  );

  const messagesQuery = useQuery({
    queryKey: ["transition-channel-messages", activeId],
    queryFn: () => msgsFn({ data: { channel_id: activeId! } }),
    enabled: !!activeId,
  });

  const messages = messagesQuery.data?.messages ?? [];
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages.length, activeId]);

  // Mark read whenever we view a channel with messages
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    readFn({ data: { channel_id: activeId, last_read_message_id: last.id } }).then(() => {
      qc.invalidateQueries({ queryKey: ["transition-channels"] });
    });
  }, [activeId, messages, readFn, qc]);

  // Realtime: subscribe to new messages in active channel
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`channel-messages-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${activeId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["transition-channel-messages", activeId] });
          qc.invalidateQueries({ queryKey: ["transition-channels"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, qc]);

  const [draft, setDraft] = useState("");
  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      sendFn({
        data: {
          channel_id: activeId!,
          body,
          client_dedupe_key: `${activeId}:${Date.now()}`,
        },
      }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["transition-channel-messages", activeId] });
      qc.invalidateQueries({ queryKey: ["transition-channels"] });
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        <Breadcrumbs trail={[{ label: "Transition Channel" }]} />
        <div className="mt-4 mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Transition Channel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Purpose-scoped conversations for the people supporting each transition. Every channel is access-controlled and audit-logged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionRequestsDrawer onOpenChannel={(id) => setActiveId(id)} />
            <Button variant="outline" size="sm" onClick={() => channelsQuery.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 border rounded-lg overflow-hidden bg-card">
          {/* Channel list */}
          <aside className="border-b md:border-b-0 md:border-r bg-muted/30 max-h-[70vh] overflow-y-auto">
            {channelsQuery.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading channels…</div>
            ) : channels.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                You don't have any channels yet. Your team, family, or partner
                network channels will appear here once created.
              </div>
            ) : (
              <ul className="divide-y">
                {channels.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted transition ${
                        activeId === c.id ? "bg-muted" : ""
                      }`}
                      aria-current={activeId === c.id ? "true" : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.title}</span>
                        {c.unread_count > 0 && (
                          <span className="text-xs rounded-full bg-primary text-primary-foreground px-2 py-0.5">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {labelForKind(c.kind)} · {formatWhen(c.last_message_at) || "No messages yet"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Conversation pane */}
          <section className="flex flex-col min-h-[60vh]">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Select a channel to view its conversation.
                </div>
              </div>
            ) : (
              <>
                <header className="px-4 py-3 border-b">
                  <div className="font-medium">{active.title}</div>
                  {active.purpose && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{active.purpose}</div>
                  )}
                </header>
                <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {messagesQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Be the first to write in this channel.</div>
                  ) : (
                    messages.map((m) => <MessageRow key={m.id} m={m} />)
                  )}
                </div>
                <form
                  className="border-t p-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const body = draft.trim();
                    if (!body || sendMutation.isPending) return;
                    sendMutation.mutate(body);
                  }}
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const body = draft.trim();
                        if (body && !sendMutation.isPending) sendMutation.mutate(body);
                      }
                    }}
                    disabled={!!active.archived_at}
                    aria-label="Message"
                  />
                  <Button type="submit" disabled={!draft.trim() || sendMutation.isPending || !!active.archived_at}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          <Link to="/settings" className="underline">Manage notifications</Link>
        </div>
      </div>
    </SiteShell>
  );
}

function MessageRow({ m }: { m: ChannelMessage }) {
  return (
    <article className="text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-medium">{m.author_name ?? "Member"}</span>
        <span className="text-xs text-muted-foreground">{formatWhen(m.created_at)}</span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.body}</p>
    </article>
  );
}

function labelForKind(kind: string): string {
  switch (kind) {
    case "student_team": return "Transition Team";
    case "student_family": return "Family";
    case "school_team": return "School";
    case "district_impl": return "District";
    case "partner_relationship": return "Partner";
    case "opportunity_referral": return "Referral";
    case "partner_internal": return "Partner Team";
    case "platform_support": return "Support";
    default: return kind;
  }
}
