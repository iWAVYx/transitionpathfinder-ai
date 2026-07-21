import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  MessageSquare,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDemoChannels } from "@/lib/demo/use-demo-channels";
import type { DemoRoleId } from "@/lib/demo/role-previews";
import { DEMO_ROLES } from "@/lib/demo/role-previews";
import { DEFAULT_DEMO_PROFILE_ID } from "@/lib/demo/demo-profiles";

const VALID_ROLES: DemoRoleId[] = [
  "student",
  "family",
  "educator",
  "school-admin",
  "district-admin",
  "partner",
];

const DEFAULT_CONTEXT: Record<DemoRoleId, string> = {
  student: DEFAULT_DEMO_PROFILE_ID,
  family: DEFAULT_DEMO_PROFILE_ID,
  educator: DEFAULT_DEMO_PROFILE_ID,
  "school-admin": "comprehensive",
  "district-admin": "regional-network",
  partner: "free",
};

const ROLE_DEMO_PATH: Record<DemoRoleId, string> = {
  student: "/demo/student",
  family: "/demo/family",
  educator: "/demo/educator",
  "school-admin": "/demo/school-admin",
  "district-admin": "/demo/district-admin",
  partner: "/demo/partner",
};

type Search = { role?: string; ctx?: string; student?: string; channel?: string };

export const Route = createFileRoute("/demo_/transition-channel")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    role: typeof s.role === "string" ? s.role : undefined,
    ctx: typeof s.ctx === "string" ? s.ctx : undefined,
    student: typeof s.student === "string" ? s.student : undefined,
    channel: typeof s.channel === "string" ? s.channel : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Transition Channel Preview — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Interactive preview of the Transition Channel: role-aware channels, replies, action items, and connection requests — with no real messages sent.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoTransitionChannelPage,
});

function DemoTransitionChannelPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const role: DemoRoleId = (VALID_ROLES.includes(search.role as DemoRoleId)
    ? (search.role as DemoRoleId)
    : "family");
  const contextId = search.ctx || search.student || DEFAULT_CONTEXT[role];

  const {
    bundle,
    sendMessage,
    markRead,
    togglePin,
    addActionItem,
    setNotifyPref,
    respondToRequest,
    resetDemoState,
    relativeLabel,
  } = useDemoChannels(role, contextId);

  const [activeId, setActiveId] = useState<string | null>(
    search.channel ?? bundle.channels[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => bundle.channels.find((c) => c.id === activeId) ?? bundle.channels[0] ?? null,
    [bundle.channels, activeId],
  );

  const filtered = query.trim()
    ? bundle.channels.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.messages.some((m) => m.body.toLowerCase().includes(query.toLowerCase())),
      )
    : bundle.channels;

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [active?.id, active?.messages.length]);

  useEffect(() => {
    if (active && active.unread > 0) markRead(active.id);
  }, [active, markRead]);

  const roleMeta = DEMO_ROLES[role];
  const backTo = ROLE_DEMO_PATH[role];
  const pendingRequests = bundle.connectionRequests.filter((r) => r.status === "incoming");

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        <Breadcrumbs
          trail={[
            { label: "Demo", to: "/demo" },
            { label: roleMeta.label, to: backTo },
            { label: "Transition Channel" },
          ]}
        />

        <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold">Transition Channel</h1>
              <Badge variant="secondary" className="uppercase tracking-wide">Demo</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Preview of {roleMeta.label.toLowerCase()} conversations for
              <span className="font-medium text-foreground"> {bundle.contextLabel}</span>. Every
              action is isolated — nothing is sent, saved to the real database, or delivered.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShowRequests((v) => !v)}>
              <Bell className="h-4 w-4 mr-2" />
              Requests
              {pendingRequests.length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {pendingRequests.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetDemoState} title="Reset demo state">
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Reset demo state</span>
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <span>
            This is a fictional preview. Live routes and real messages remain protected —
            <Link to="/get-started" className="ml-1 underline">sign in</Link> to use the real Transition Channel.
          </span>
        </div>

        {showRequests && (
          <ConnectionRequests
            requests={bundle.connectionRequests}
            onRespond={(id, d) => respondToRequest(id, d)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 border rounded-lg overflow-hidden bg-card">
          <aside className="border-b md:border-b-0 md:border-r bg-muted/30 max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b bg-background/60">
              <label className="relative block">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search channels & messages"
                  className="w-full rounded-md border border-border bg-background pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Search sample conversations"
                />
              </label>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Notifications</span>
                <div className="flex gap-1">
                  {(["all", "mentions", "muted"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNotifyPref(p)}
                      className={
                        bundle.notifyPref === p
                          ? "rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground"
                          : "rounded-full px-2 py-0.5 text-[10px] hover:text-foreground"
                      }
                    >
                      {p === "muted" ? <BellOff className="inline h-3 w-3" /> : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No channels match your search.</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(c.id);
                        navigate({
                          to: "/demo/transition-channel",
                          search: (prev) => ({ ...prev, channel: c.id }),
                          replace: false,
                        });
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-muted transition ${
                        active?.id === c.id ? "bg-muted" : ""
                      }`}
                      aria-current={active?.id === c.id ? "true" : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.title}</span>
                        {!c.muted && c.unread > 0 && (
                          <span className="text-xs rounded-full bg-primary text-primary-foreground px-2 py-0.5">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {labelForKind(c.kind)} · {c.lastActivityLabel}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{active.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {active.purpose}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                      {active.members.slice(0, 4).map((m) => (
                        <span
                          key={m.id}
                          className="rounded-full border px-2 py-0.5 bg-background"
                          title={m.role}
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </header>

                {active.messages.some((m) => m.pinned) && (
                  <div className="border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold mr-1">Pinned:</span>
                    {active.messages
                      .filter((m) => m.pinned)
                      .map((m) => `${m.authorName}: ${m.body}`)
                      .join(" · ")}
                  </div>
                )}

                <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {active.messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No messages yet.</div>
                  ) : (
                    active.messages.map((m) => (
                      <article key={m.id} className="text-sm group">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">{m.authorName}</span>
                          <span className="text-[11px] text-muted-foreground">{m.authorRole}</span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <time className="text-[11px] text-muted-foreground" dateTime={m.createdAt}>
                            {relativeLabel(m.createdAt)}
                          </time>
                          <button
                            type="button"
                            className="ml-auto opacity-0 group-hover:opacity-100 transition text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                            onClick={() => togglePin(active.id, m.id)}
                          >
                            <Pin className={`h-3 w-3 ${m.pinned ? "fill-current text-primary" : ""}`} />
                            {m.pinned ? "Unpin" : "Pin"}
                          </button>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        {m.attachment && (
                          <div className="mt-1 inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-[12px]">
                            <span aria-hidden>📎</span>
                            <span className="font-medium">{m.attachment.name}</span>
                            <span className="text-muted-foreground uppercase text-[10px]">
                              {m.attachment.kind} · {m.attachment.sizeKb} KB
                            </span>
                            <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">preview</span>
                          </div>
                        )}
                        {m.actionItem && (
                          <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[12px]">
                            <span className="font-semibold text-primary">Action:</span>
                            <span>Assigned to {m.actionItem.assignee}</span>
                            {m.actionItem.due && (
                              <span className="text-muted-foreground">· due {m.actionItem.due}</span>
                            )}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>

                <form
                  className="border-t p-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(active.id, draft);
                    setDraft("");
                  }}
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a sample reply… (Enter to post, Shift+Enter for newline)"
                    rows={2}
                    className="resize-none"
                    aria-label="Sample message"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(active.id, draft);
                        setDraft("");
                      }
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <Button type="submit" disabled={!draft.trim()}>
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Post sample reply</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addActionItem(active.id, draft || "Follow up before next meeting");
                        setDraft("");
                      }}
                      title="Create sample action item"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Create sample action item</span>
                    </Button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </SiteShell>
  );
}

function ConnectionRequests({
  requests,
  onRespond,
}: {
  requests: ReturnType<typeof useDemoChannels>["bundle"]["connectionRequests"];
  onRespond: (id: string, d: "accepted" | "declined") => void;
}) {
  const incoming = requests.filter((r) => r.status === "incoming");
  const resolved = requests.filter((r) => r.status !== "incoming");
  return (
    <div className="mb-4 rounded-lg border bg-card p-4">
      <h2 className="font-semibold mb-2">Connection Requests (preview)</h2>
      {incoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">No incoming requests.</p>
      ) : (
        <ul className="space-y-2">
          {incoming.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {r.from.name}{" "}
                  <span className="text-xs text-muted-foreground">({r.from.org})</span>
                </div>
                <div className="text-xs text-muted-foreground">{r.purpose}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onRespond(r.id, "declined")}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => onRespond(r.id, "accepted")}>
                  Accept
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {resolved.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {resolved.map((r) => (
            <li key={r.id}>
              {r.from.name} — {r.status}
            </li>
          ))}
        </ul>
      )}
    </div>
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
