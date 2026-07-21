import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Send,
  MessageSquare,
  RefreshCw,
  Inbox,
  Check,
  Ban,
  Undo2,
  Megaphone,
  ListTodo,
  HelpCircle,
  MessageCircle,
  Users,
  Archive,
  Bell,
  Pin,
  Paperclip,
  X as XIcon,
} from "lucide-react";

import { FeatureShell } from "@/components/feature/FeatureShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyChannels,
  listChannelMessages,
  sendChannelMessage,
  markChannelRead,
  type ChannelSummary,
  type ChannelMessage,
} from "@/lib/channels.functions";
import { getMyRoles } from "@/lib/profile.functions";
import {
  getChannelTileSummary,
  type ChannelTileSummary,
} from "@/lib/channel-tile-summary.functions";
import {
  listMyMentions,
  listChannelActions,
  markMentionSeen,
  type ChannelMention,
  type ChannelActionRecord,
} from "@/lib/channel-tabs.functions";
import {
  listPinnedMessages,
  listChannelBookmarkIds,
  registerAttachment,
} from "@/lib/channel-messages.functions";
import { MessageItem, useMessageAttachments } from "@/components/channels/MessageItem";
import { ThreadPanel } from "@/components/channels/ThreadPanel";
import { PromoteRecordDialog } from "@/components/channels/PromoteRecordDialog";
import {
  updateChannelAction,
  listChannelAssigneeOptions,
  ACTION_STATUSES,
  type ActionStatus,
} from "@/lib/channel-actions.functions";
import {
  listMyConnectionRequests,
  respondToConnectionRequest,
  withdrawConnectionRequest,
  type ConnectionRequest,
} from "@/lib/channel-connection-requests.functions";
import { audiencesForRoles, fallbackPathFor, type RoleAudience } from "@/lib/role-policy";
import { ConnectionRequestsDrawer } from "@/components/channels/ConnectionRequestsDrawer";

const tabSchema = z.enum([
  "inbox",
  "channels",
  "mentions",
  "assigned",
  "decisions",
  "feedback",
  "connections",
  "archived",
]);

const filterSchema = z.object({
  tab: tabSchema.catch("inbox"),
  unread: z.enum(["all", "unread"]).catch("all"),
  student: z.string().optional().catch(undefined),
  type: z.string().optional().catch(undefined),
  org: z.string().optional().catch(undefined),
  opportunity: z.string().optional().catch(undefined),
  assignee: z.enum(["all", "me"]).catch("all"),
  due: z.enum(["all", "overdue", "today", "week", "future"]).catch("all"),
  status: z.enum(["all", "open", "in_progress", "resolved"]).catch("all"),
  archived: z.enum(["all", "archived", "active"]).catch("all"),
});

type TabId = z.infer<typeof tabSchema>;
type FilterState = z.infer<typeof filterSchema>;

type ChannelTileSummaryCountKey =
  | "unreadChannels"
  | "unreadMessages"
  | "mentions"
  | "assignedOpen"
  | "decisionsPending"
  | "connectionRequests";

const TAB_META: Record<
  TabId,
  {
    label: string;
    icon: React.ElementType;
    roles: RoleAudience[];
    countKey?: ChannelTileSummaryCountKey;
  }
> = {
  inbox: {
    label: "Inbox",
    icon: Inbox,
    roles: ["student", "family", "educator", "school_admin", "district_admin", "partner", "admin"],
    countKey: "unreadMessages",
  },
  channels: {
    label: "My Channels",
    icon: MessageSquare,
    roles: ["student", "family", "educator", "school_admin", "district_admin", "partner", "admin"],
    countKey: "unreadChannels",
  },
  mentions: {
    label: "Mentions",
    icon: Bell,
    roles: ["student", "family", "educator", "school_admin", "district_admin", "partner", "admin"],
    countKey: "mentions",
  },
  assigned: {
    label: "Assigned To Me",
    icon: ListTodo,
    roles: ["educator", "school_admin", "district_admin", "partner", "admin"],
    countKey: "assignedOpen",
  },
  decisions: {
    label: "Decisions",
    icon: HelpCircle,
    roles: ["educator", "school_admin", "district_admin", "partner", "admin"],
    countKey: "decisionsPending",
  },
  feedback: {
    label: "Feedback",
    icon: Megaphone,
    roles: ["student", "family", "educator", "school_admin", "district_admin", "partner", "admin"],
  },
  connections: {
    label: "Connections",
    icon: Users,
    roles: ["educator", "school_admin", "district_admin", "partner", "admin"],
    countKey: "connectionRequests",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    roles: ["student", "family", "educator", "school_admin", "district_admin", "partner", "admin"],
  },
};

export const Route = createFileRoute("/_authenticated/transition-channel")({
  validateSearch: filterSchema,
  head: () => ({
    meta: [{ title: "Transition Channel — TransitionForward" }],
  }),
  errorComponent: ({ reset }) => (
    <FeatureShell
      title="Transition Channel"
      backTo={{ to: "/dashboard", label: "Back to Dashboard" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-lg">Something went wrong loading channels.</p>
        <Button onClick={() => reset()} className="mt-4">
          Retry
        </Button>
      </div>
    </FeatureShell>
  ),
  notFoundComponent: () => (
    <FeatureShell
      title="Transition Channel"
      backTo={{ to: "/dashboard", label: "Back to Dashboard" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">Channel not found.</div>
    </FeatureShell>
  ),
  component: TransitionChannelPage,
});

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TransitionChannelPage() {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate();

  const getMyRolesFn = useServerFn(getMyRoles);
  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getMyRolesFn(),
  });

  const audiences = useMemo(() => {
    const roles = rolesQuery.data?.roles ?? [];
    return audiencesForRoles(roles);
  }, [rolesQuery.data]);

  const visibleTabs = useMemo(
    () =>
      (Object.keys(TAB_META) as TabId[]).filter((t) =>
        TAB_META[t].roles.some((r) => audiences.has(r)),
      ),
    [audiences],
  );

  const activeTab: TabId = useMemo(() => {
    if (visibleTabs.includes(search.tab)) return search.tab;
    return visibleTabs[0] ?? "inbox";
  }, [search.tab, visibleTabs]);

  // Redirect disallowed tab values to the first visible tab.
  useEffect(() => {
    if (!visibleTabs.includes(search.tab)) {
      navigate({
        to: "/transition-channel",
        search: { ...search, tab: activeTab },
      });
    }
  }, [search, visibleTabs, activeTab, navigate]);

  const backTo = useMemo(() => {
    const roles = rolesQuery.data?.roles ?? [];
    return fallbackPathFor(roles);
  }, [rolesQuery.data]);

  const summaryFn = useServerFn(getChannelTileSummary);
  const summaryQuery = useQuery({
    queryKey: ["channel-tile-summary"],
    queryFn: () => summaryFn(),
  });

  const summary = summaryQuery.data;

  return (
    <FeatureShell
      title="Transition Channel"
      description="Purpose-scoped conversations for the people supporting each transition. Every channel is access-controlled and audit-logged."
      backTo={{ to: backTo, label: "Back to Dashboard" }}
      breadcrumbs={[{ label: "Transition Channel" }]}
      primaryAction={<ConnectionRequestsDrawerTrigger summary={summary} />}
      maxWidth="wide"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          navigate({
            to: "/transition-channel",
            search: { ...search, tab: v as TabId },
          })
        }
        className="w-full"
      >
        <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1 sm:w-auto">
          {visibleTabs.map((tab) => {
            const meta = TAB_META[tab];
            const count = meta.countKey ? (summary?.[meta.countKey] ?? 0) : 0;
            const Icon = meta.icon;
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="sm:hidden">{tabLabelShort(tab)}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-5 justify-center px-1.5 text-xs"
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4 rounded-xl border bg-card p-3 sm:p-4">
          <FilterBar
            search={search}
            onChange={(patch) =>
              navigate({ to: "/transition-channel", search: { ...search, ...patch } })
            }
          />

          <TabsContent value="inbox" className="mt-0 focus-visible:outline-none">
            <InboxTab search={search} />
          </TabsContent>
          <TabsContent value="channels" className="mt-0 focus-visible:outline-none">
            <ChannelsTab search={search} />
          </TabsContent>
          <TabsContent value="mentions" className="mt-0 focus-visible:outline-none">
            <MentionsTab />
          </TabsContent>
          <TabsContent value="assigned" className="mt-0 focus-visible:outline-none">
            <ActionsTab kind="action" assigneeOnly search={search} />
          </TabsContent>
          <TabsContent value="decisions" className="mt-0 focus-visible:outline-none">
            <ActionsTab kind="decision" search={search} />
          </TabsContent>
          <TabsContent value="feedback" className="mt-0 focus-visible:outline-none">
            <ActionsTab kind="feedback" search={search} />
          </TabsContent>
          <TabsContent value="connections" className="mt-0 focus-visible:outline-none">
            <ConnectionsTab />
          </TabsContent>
          <TabsContent value="archived" className="mt-0 focus-visible:outline-none">
            <ArchivedTab search={search} />
          </TabsContent>
        </div>
      </Tabs>
    </FeatureShell>
  );
}

function tabLabelShort(tab: TabId): string {
  switch (tab) {
    case "assigned":
      return "Assigned";
    case "connections":
      return "Connect";
    case "channels":
      return "Channels";
    default:
      return TAB_META[tab].label;
  }
}

function ConnectionRequestsDrawerTrigger({ summary }: { summary?: ChannelTileSummary }) {
  return (
    <ConnectionRequestsDrawer
      triggerLabel={
        summary?.connectionRequests ? `Requests (${summary.connectionRequests})` : "Requests"
      }
    />
  );
}

function FilterBar({
  search,
  onChange,
}: {
  search: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="channel-filter-bar">
      <FilterSelect
        label="Status"
        value={search.status}
        options={[
          { value: "all", label: "All statuses" },
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In progress" },
          { value: "resolved", label: "Resolved" },
        ]}
        onChange={(v) => onChange({ status: v as FilterState["status"] })}
      />
      <FilterSelect
        label="Unread"
        value={search.unread}
        options={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread only" },
        ]}
        onChange={(v) => onChange({ unread: v as FilterState["unread"] })}
      />
      <FilterSelect
        label="Due"
        value={search.due}
        options={[
          { value: "all", label: "Any time" },
          { value: "overdue", label: "Overdue" },
          { value: "today", label: "Today" },
          { value: "week", label: "This week" },
          { value: "future", label: "Future" },
        ]}
        onChange={(v) => onChange({ due: v as FilterState["due"] })}
      />
      <FilterSelect
        label="Archived"
        value={search.archived}
        options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
        onChange={(v) => onChange({ archived: v as FilterState["archived"] })}
      />
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={() =>
          onChange({
            status: "all",
            unread: "all",
            due: "all",
            archived: "all",
            student: undefined,
            type: undefined,
            org: undefined,
            opportunity: undefined,
            assignee: "all",
          })
        }
      >
        Clear
      </Button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[9.5rem] text-xs sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InboxTab({ search }: { search: FilterState }) {
  const listFn = useServerFn(listMyChannels);
  const query = useQuery({
    queryKey: ["transition-channels", "inbox", search],
    queryFn: () => listFn(),
  });
  const channels = (query.data?.channels ?? []).filter((c) => c.unread_count > 0);
  return (
    <ChannelListView channels={channels} loading={query.isLoading} empty="No unread messages." />
  );
}

function ChannelsTab({ search }: { search: FilterState }) {
  return <ChannelConversationTab search={search} />;
}

function MentionsTab() {
  const listFn = useServerFn(listMyMentions);
  const markFn = useServerFn(markMentionSeen);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["channel-mentions"],
    queryFn: () => listFn(),
  });
  const markMutation = useMutation({
    mutationFn: (id: string) => markFn({ data: { mention_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel-mentions"] });
      qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
    },
  });
  const mentions = query.data?.mentions ?? [];

  return (
    <div className="space-y-2">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading mentions…</p>
      ) : mentions.length === 0 ? (
        <EmptyState icon={Bell} message="No mentions yet." />
      ) : (
        mentions.map((m) => (
          <article key={m.id} className="rounded-lg border p-3 hover:bg-muted/40 transition">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {m.author_name} mentioned you in {m.channel_title}
              </p>
              <span className="text-xs text-muted-foreground">{formatWhen(m.created_at)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.message_body}</p>
            {!m.seen_at && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs"
                onClick={() => markMutation.mutate(m.id)}
                disabled={markMutation.isPending}
              >
                Mark seen
              </Button>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function ActionsTab({
  kind,
  assigneeOnly,
  search,
}: {
  kind: "action" | "decision" | "feedback";
  assigneeOnly?: boolean;
  search: FilterState;
}) {
  const listFn = useServerFn(listChannelActions);
  const query = useQuery({
    queryKey: ["channel-actions", kind, assigneeOnly, search],
    queryFn: () => listFn({ data: { kind, assignee_only: assigneeOnly } }),
  });
  const actions = query.data?.actions ?? [];
  const icon = kind === "action" ? ListTodo : kind === "decision" ? HelpCircle : Megaphone;
  const label =
    kind === "action" ? "assigned action" : kind === "decision" ? "decision" : "feedback item";

  return (
    <div className="space-y-2">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading {label}s…</p>
      ) : actions.length === 0 ? (
        <EmptyState icon={icon} message={`No ${label}s match your filters.`} />
      ) : (
        actions.map((a) => <ActionCard key={a.id} action={a} />)
      )}
    </div>
  );
}

function ActionCard({ action }: { action: ChannelActionRecord }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateChannelAction);
  const listAssigneesFn = useServerFn(listChannelAssigneeOptions);

  const [assignOpen, setAssignOpen] = useState(false);
  const assigneesQuery = useQuery({
    queryKey: ["channel-assignees", action.channel_id],
    queryFn: () => listAssigneesFn({ data: { channel_id: action.channel_id } }),
    enabled: assignOpen,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["channel-actions"] });
    qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
  };

  const statusMut = useMutation({
    mutationFn: (status: ActionStatus) =>
      updateFn({ data: { action_id: action.id, status } }),
    onSuccess: invalidate,
  });
  const assignMut = useMutation({
    mutationFn: (assignee_user_id: string | null) =>
      updateFn({ data: { action_id: action.id, assignee_user_id } }),
    onSuccess: () => {
      setAssignOpen(false);
      invalidate();
    },
  });

  return (
    <article className="rounded-lg border p-3 hover:bg-muted/40 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={actionStatusVariant(action.status)}>
              {action.status.replace("_", " ")}
            </Badge>
            {action.priority && <Badge variant="outline">{action.priority}</Badge>}
            <span className="text-xs text-muted-foreground">in {action.channel_title}</span>
          </div>
          {action.resolution && (
            <p className="mt-2 text-sm">{action.resolution}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Promoted by {action.promoter_name}
            {action.assignee_name ? ` · Assigned to ${action.assignee_name}` : " · Unassigned"}
            {action.due_at ? ` · Due ${formatWhen(action.due_at)}` : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Select
            value={action.status}
            onValueChange={(v) => statusMut.mutate(v as ActionStatus)}
            disabled={statusMut.isPending}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={action.assignee_user_id ?? "none"}
            onValueChange={(v) => assignMut.mutate(v === "none" ? null : v)}
            onOpenChange={setAssignOpen}
            disabled={assignMut.isPending}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="Assign…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Unassigned</SelectItem>
              {(assigneesQuery.data?.options ?? []).map((o) => (
                <SelectItem key={o.user_id} value={o.user_id} className="text-xs">
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </article>
  );
}

function actionStatusVariant(status: string) {
  switch (status) {
    case "open":
      return "default";
    case "in_progress":
      return "secondary";
    case "resolved":
      return "outline";
    default:
      return "secondary";
  }
}

function ConnectionsTab() {
  const listFn = useServerFn(listMyConnectionRequests);
  const respondFn = useServerFn(respondToConnectionRequest);
  const withdrawFn = useServerFn(withdrawConnectionRequest);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["channel-connection-requests"],
    queryFn: () => listFn(),
  });

  const respondMutation = useMutation({
    mutationFn: (args: { request_id: string; decision: "accepted" | "declined" }) =>
      respondFn({ data: args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel-connection-requests"] });
      qc.invalidateQueries({ queryKey: ["transition-channels"] });
      qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => withdrawFn({ data: { request_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channel-connection-requests"] }),
  });

  const requests = query.data?.requests ?? [];
  const pendingIncoming = requests.filter(
    (r) => r.direction === "incoming" && r.status === "pending",
  );
  const pendingOutgoing = requests.filter(
    (r) => r.direction === "outgoing" && r.status === "pending",
  );
  const resolved = requests.filter((r) => r.status !== "pending").slice(0, 10);

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : requests.length === 0 ? (
        <EmptyState icon={Users} message="No connection requests yet." />
      ) : (
        <>
          <RequestSection
            title="Awaiting your response"
            count={pendingIncoming.length}
            requests={pendingIncoming}
            actions={(r) => (
              <>
                <Button
                  size="sm"
                  onClick={() => respondMutation.mutate({ request_id: r.id, decision: "accepted" })}
                  disabled={respondMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondMutation.mutate({ request_id: r.id, decision: "declined" })}
                  disabled={respondMutation.isPending}
                >
                  <Ban className="h-4 w-4 mr-1" /> Decline
                </Button>
              </>
            )}
          />
          <RequestSection
            title="Your open requests"
            count={pendingOutgoing.length}
            requests={pendingOutgoing}
            actions={(r) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => withdrawMutation.mutate(r.id)}
                disabled={withdrawMutation.isPending}
              >
                <Undo2 className="h-4 w-4 mr-1" /> Withdraw
              </Button>
            )}
          />
          <RequestSection
            title="Recently resolved"
            count={resolved.length}
            requests={resolved}
            actions={(r) => (
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {r.status}
              </span>
            )}
          />
        </>
      )}
    </div>
  );
}

function RequestSection({
  title,
  count,
  requests,
  actions,
}: {
  title: string;
  count: number;
  requests: ConnectionRequest[];
  actions: (r: ConnectionRequest) => React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title} {count > 0 && <span className="text-foreground">({count})</span>}
      </h3>
      <div className="space-y-3">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in this category.</p>
        ) : (
          requests.map((r) => <RequestCard key={r.id} r={r} actions={actions(r)} />)
        )}
      </div>
    </section>
  );
}

function RequestCard({ r, actions }: { r: ConnectionRequest; actions: React.ReactNode }) {
  const who =
    r.direction === "incoming"
      ? `${r.requester_name ?? "A member"}${
          r.requester_organization_name ? ` (${r.requester_organization_name})` : ""
        }`
      : `To ${r.target_partner_organization_name ?? "partner org"}`;
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium truncate">{who}</p>
        <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(r.created_at)}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Purpose: {r.purpose_category}</p>
      <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{r.message}</p>
      {r.proposed_next_step && (
        <p className="mt-2 text-xs text-muted-foreground">
          Next step: <span className="text-foreground">{r.proposed_next_step}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">{actions}</div>
    </article>
  );
}

function ArchivedTab({ search }: { search: FilterState }) {
  const listFn = useServerFn(listMyChannels);
  const query = useQuery({
    queryKey: ["transition-channels", "archived", search],
    queryFn: () => listFn(),
  });
  const channels = (query.data?.channels ?? []).filter((c) => !!c.archived_at);
  return (
    <ChannelListView channels={channels} loading={query.isLoading} empty="No archived channels." />
  );
}

function ChannelListView({
  channels,
  loading,
  empty,
}: {
  channels: ChannelSummary[];
  loading: boolean;
  empty: string;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (channels.length === 0) return <EmptyState icon={MessageCircle} message={empty} />;
  return (
    <ul className="divide-y rounded-lg border">
      {channels.map((c) => (
        <li key={c.id} className="p-3 hover:bg-muted/40 transition">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {labelForKind(c.kind)} · {formatWhen(c.last_message_at) || "No messages yet"}
              </p>
            </div>
            {c.unread_count > 0 && <Badge className="shrink-0">{c.unread_count}</Badge>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ChannelConversationTab({ search }: { search: FilterState }) {
  const listFn = useServerFn(listMyChannels);
  const msgsFn = useServerFn(listChannelMessages);
  const sendFn = useServerFn(sendChannelMessage);
  const readFn = useServerFn(markChannelRead);
  const pinnedFn = useServerFn(listPinnedMessages);
  const bookmarksFn = useServerFn(listChannelBookmarkIds);
  const registerAttachmentFn = useServerFn(registerAttachment);
  const qc = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ["transition-channels", "conversation", search],
    queryFn: () => listFn(),
  });

  const channels = useMemo(() => {
    let list = channelsQuery.data?.channels ?? [];
    if (search.archived === "active") list = list.filter((c) => !c.archived_at);
    if (search.archived === "archived") list = list.filter((c) => !!c.archived_at);
    if (search.type) list = list.filter((c) => c.kind === search.type);
    if (search.unread === "unread") list = list.filter((c) => c.unread_count > 0);
    return list;
  }, [channelsQuery.data, search]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [promoteMessage, setPromoteMessage] = useState<ChannelMessage | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!activeId && channels.length > 0) setActiveId(channels[0].id);
  }, [channels, activeId]);

  const active = useMemo(
    () => channels.find((c) => c.id === activeId) ?? null,
    [channels, activeId],
  );
  const isAdmin = active?.member_role === "admin";

  const messagesQuery = useQuery({
    queryKey: ["transition-channel-messages", activeId],
    queryFn: () => msgsFn({ data: { channel_id: activeId! } }),
    enabled: !!activeId,
  });

  const allMessages = useMemo(
    () => messagesQuery.data?.messages ?? [],
    [messagesQuery.data],
  );

  // Split top-level messages from thread replies, and index reply counts.
  const { topLevel, replyCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of allMessages) {
      if (m.parent_id) counts.set(m.parent_id, (counts.get(m.parent_id) ?? 0) + 1);
    }
    return {
      topLevel: allMessages.filter((m) => !m.parent_id),
      replyCounts: counts,
    };
  }, [allMessages]);

  const pinnedQuery = useQuery({
    queryKey: ["channel-pinned", activeId],
    queryFn: () => pinnedFn({ data: { channel_id: activeId! } }),
    enabled: !!activeId,
  });

  const bookmarksQuery = useQuery({
    queryKey: ["channel-bookmarks", activeId],
    queryFn: () => bookmarksFn({ data: { channel_id: activeId! } }),
    enabled: !!activeId,
  });
  const bookmarkedIds = useMemo(
    () => new Set(bookmarksQuery.data?.message_ids ?? []),
    [bookmarksQuery.data],
  );

  const topLevelIds = useMemo(() => topLevel.map((m) => m.id), [topLevel]);
  const { byMessage: attachmentsByMessage, refetch: refetchAttachments } =
    useMessageAttachments(topLevelIds);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [topLevel.length, activeId]);

  useEffect(() => {
    if (!activeId || allMessages.length === 0) return;
    const last = allMessages[allMessages.length - 1];
    readFn({ data: { channel_id: activeId, last_read_message_id: last.id } }).then(() => {
      qc.invalidateQueries({ queryKey: ["transition-channels"] });
      qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
    });
  }, [activeId, allMessages, readFn, qc]);

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`channel-messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${activeId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["transition-channel-messages", activeId] });
          qc.invalidateQueries({ queryKey: ["channel-pinned", activeId] });
          qc.invalidateQueries({ queryKey: ["transition-channels"] });
          qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, qc]);

  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidateActive = () => {
    qc.invalidateQueries({ queryKey: ["transition-channel-messages", activeId] });
    qc.invalidateQueries({ queryKey: ["channel-pinned", activeId] });
    qc.invalidateQueries({ queryKey: ["channel-bookmarks", activeId] });
    qc.invalidateQueries({ queryKey: ["transition-channels"] });
    qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
    refetchAttachments();
  };

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await sendFn({
        data: {
          channel_id: activeId!,
          body,
          client_dedupe_key: `${activeId}:${Date.now()}`,
        },
      });
      if (pendingFile && activeId) {
        setUploading(true);
        try {
          const cleanName = pendingFile.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
          const path = `${activeId}/${res.message.id}/${crypto.randomUUID()}-${cleanName}`;
          const up = await supabase.storage
            .from("channel-attachments")
            .upload(path, pendingFile, {
              contentType: pendingFile.type || "application/octet-stream",
              upsert: false,
            });
          if (up.error) throw new Error(up.error.message);
          await registerAttachmentFn({
            data: {
              channel_id: activeId,
              message_id: res.message.id,
              storage_path: path,
              file_name: pendingFile.name,
              content_type: pendingFile.type || null,
              size_bytes: pendingFile.size,
            },
          });
        } finally {
          setUploading(false);
        }
      }
      return res;
    },
    onSuccess: () => {
      setDraft("");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      invalidateActive();
    },
  });

  const pinned = pinnedQuery.data?.pinned ?? [];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <aside className="max-h-[50vh] overflow-y-auto rounded-lg border bg-muted/30 md:max-h-[70vh]">
          {channelsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading channels…</div>
          ) : channels.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              You don't have any channels matching your filters. Adjust filters or wait for your
              team, family, or partner network channels to appear.
            </div>
          ) : (
            <ul className="divide-y">
              {channels.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      setThreadParentId(null);
                    }}
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

        <section className="flex flex-col min-h-[40vh] rounded-lg border md:min-h-[60vh]">
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
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{active.title}</div>
                    {active.purpose && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {active.purpose}
                      </div>
                    )}
                  </div>
                  {pinned.length > 0 && (
                    <Badge variant="outline" className="shrink-0">
                      <Pin className="h-3 w-3 mr-1" /> {pinned.length} pinned
                    </Badge>
                  )}
                </div>
              </header>

              {pinned.length > 0 && (
                <div className="border-b bg-muted/30 px-4 py-2 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Pinned
                  </p>
                  {pinned.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setThreadParentId(p.id)}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground truncate"
                      title={p.body}
                    >
                      <span className="font-medium text-foreground">
                        {p.author_name ?? "Member"}:
                      </span>{" "}
                      {p.body}
                    </button>
                  ))}
                </div>
              )}

              <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {messagesQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading messages…</div>
                ) : topLevel.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Be the first to write in this channel.
                  </div>
                ) : (
                  topLevel.map((m) => (
                    <MessageItem
                      key={m.id}
                      m={m}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      bookmarked={bookmarkedIds.has(m.id)}
                      attachments={attachmentsByMessage.get(m.id) ?? []}
                      replyCount={replyCounts.get(m.id) ?? 0}
                      onReply={(parent) => setThreadParentId(parent.id)}
                      onPromote={(msg) => setPromoteMessage(msg)}
                      onChanged={invalidateActive}
                    />
                  ))
                )}
              </div>

              <form
                className="border-t p-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = draft.trim();
                  if (!body || sendMutation.isPending || uploading) return;
                  sendMutation.mutate(body);
                }}
              >
                {pendingFile && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate flex-1">{pendingFile.name}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-muted"
                      onClick={() => {
                        setPendingFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label="Remove attachment"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 25 * 1024 * 1024) {
                        alert("Attachments must be 25 MB or smaller.");
                        e.target.value = "";
                        return;
                      }
                      setPendingFile(f);
                    }}
                    aria-label="Attach a file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!active.archived_at || uploading}
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
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
                        if (body && !sendMutation.isPending && !uploading) {
                          sendMutation.mutate(body);
                        }
                      }
                    }}
                    disabled={!!active.archived_at}
                    aria-label="Message"
                  />
                  <Button
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      sendMutation.isPending ||
                      uploading ||
                      !!active.archived_at
                    }
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      <ThreadPanel
        parentId={threadParentId}
        channelId={activeId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        bookmarkedIds={bookmarkedIds}
        onClose={() => setThreadParentId(null)}
        onChanged={invalidateActive}
      />

      <PromoteRecordDialog
        message={promoteMessage}
        channelId={promoteMessage ? activeId : null}
        onOpenChange={(open: boolean) => {
          if (!open) setPromoteMessage(null);
        }}
        onPromoted={invalidateActive}
      />
    </>
  );
}


function labelForKind(kind: string): string {
  switch (kind) {
    case "student_team":
      return "Transition Team";
    case "student_family":
      return "Family";
    case "school_team":
      return "School";
    case "district_impl":
      return "District";
    case "partner_relationship":
      return "Partner";
    case "opportunity_referral":
      return "Referral";
    case "partner_internal":
      return "Partner Team";
    case "platform_support":
      return "Support";
    default:
      return kind;
  }
}
