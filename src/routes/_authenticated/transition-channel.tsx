import { ChannelPinnedMessages } from "@/components/channels/ChannelPinnedMessages";
import { validatePinnedRead, validateBookmarkRead } from "@/lib/channel-message-read-contract";
import { ChannelMentions } from "@/components/channels/ChannelMentions";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
import { ChannelQueryBoundary, useChannelViewScope } from "@/components/channels/ChannelQueryBoundary";
import { RetainedChatHistory } from "@/components/channels/RetainedChatHistory";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
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
import { listChannelActions } from "@/lib/channel-tabs.functions";
import {
  listPinnedMessages,
  listChannelBookmarkIds,
  prepareChannelAttachmentUpload,
  failChannelAttachmentUpload,
  scanChannelAttachment,
} from "@/lib/channel-messages.functions";
import { MessageItem, useMessageAttachments } from "@/components/channels/MessageItem";
import { ThreadPanel } from "@/components/channels/ThreadPanel";
import { PromoteRecordDialog } from "@/components/channels/PromoteRecordDialog";
import { ChannelActionCard as ActionCard } from "@/components/channels/ChannelActionCard";
import { ChannelConnectionRequests } from "@/components/channels/ChannelConnectionRequests";
import { audiencesForRoles, dashboardHomeForRoles, type RoleAudience } from "@/lib/role-policy";
import { ConnectionRequestsDrawer } from "@/components/channels/ConnectionRequestsDrawer";
import { StartStudentConversation } from "@/components/channels/StartStudentConversation";
import { ChannelMuteToggle } from "@/components/channels/ChannelMuteToggle";
import {
  SensitiveFilePrivacyReviewDialog,
} from "@/components/privacy/SensitiveFilePrivacyReviewDialog";
import type { SensitiveFileReviewSource } from "@/lib/sensitive-file-review.browser";
import { assertPrivacySafeDerivedUpload } from "@/lib/sensitive-text-redaction";
import {
  PROTECTED_FILE_UPLOADS_ENABLED,
  PROTECTED_FILE_UPLOADS_MESSAGE,
  assertProtectedFileUploadsEnabled,
} from "@/lib/protected-file-uploads";

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
  channel: z.string().uuid().optional().catch(undefined),
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
  const { user, loading } = useAuth();
  const scopeKey = JSON.stringify([user?.id ?? null, Boolean(loading)]);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  if (loading || !user)
    return (
      <ChannelAccessState message="Checking your sign-in before opening Transition Channel…" />
    );
  return (
    <OwnerWorkspaceGate>
      <ChannelQueryBoundary key={scopeKey} viewerId={user.id} scopeKey={scopeKey} currentScope={currentScope}>
        <TransitionChannelSession
          viewerId={user.id}
          scopeKey={scopeKey}
          currentScope={currentScope}
        />
      </ChannelQueryBoundary>
    </OwnerWorkspaceGate>
  );
}

function ChannelAccessState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <FeatureShell
      title="Transition Channel"
      backTo={{ to: "/dashboard", label: "Back to Your Workspace" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-12" role={retry ? "alert" : "status"}>
        <p>{message}</p>
        {retry && (
          <Button className="mt-4" onClick={retry}>
            Try Again
          </Button>
        )}
      </div>
    </FeatureShell>
  );
}

function TransitionChannelSession({
  viewerId,
  scopeKey,
  currentScope,
}: {
  viewerId: string;
  scopeKey: string;
  currentScope: { current: string };
}) {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate();

  const getMyRolesFn = useServerFn(getMyRoles);
  const rolesQuery = useQuery({
    queryKey: ["my-roles", viewerId],
    queryFn: async () => {
      const result = await getMyRolesFn({ data: { expected_viewer_id: viewerId } });
      if (currentScope.current !== scopeKey) throw new Error("Your sign-in changed.");
      if (!Array.isArray(result?.roles) || !result.roles.every((role) => typeof role === "string"))
        throw new Error("Could not confirm your channel workspace.");
      return result;
    },
    staleTime: 0,
    retry: false,
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

  const rolesReady = rolesQuery.isSuccess && !audiences.has("admin") && visibleTabs.length > 0;
  const [navigationError, setNavigationError] = useState(false);
  const [navigationAttempt, setNavigationAttempt] = useState(0);
  // Wait for confirmed roles before correcting a tab. A loading/error result
  // must never select Inbox for another role or start conversation queries.
  useEffect(() => {
    if (!rolesReady) return;
    let cancelled = false;
    setNavigationError(false);
    if (!visibleTabs.includes(search.tab)) {
      void (async () => {
        try {
          await navigate({
            to: "/transition-channel",
            search: { ...search, tab: activeTab },
            replace: true,
          });
        } catch {
          if (!cancelled && currentScope.current === scopeKey) setNavigationError(true);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [
    rolesReady,
    search,
    visibleTabs,
    activeTab,
    navigate,
    navigationAttempt,
    currentScope,
    scopeKey,
  ]);

  const backTo = dashboardHomeForRoles(rolesQuery.data?.roles ?? [], false);
  const summaryFn = useServerFn(getChannelTileSummary);
  const summaryQuery = useQuery({
    queryKey: ["channel-tile-summary"],
    queryFn: async () => {
      const result = await summaryFn({ data: { expected_viewer_id: viewerId } });
      if (currentScope.current !== scopeKey) throw new Error("Your sign-in changed.");
      return result;
    },
    enabled: rolesReady,
    retry: false,
  });

  if (rolesQuery.isPending)
    return <ChannelAccessState message="Confirming the tools available to your account…" />;
  if (rolesQuery.isError)
    return (
      <ChannelAccessState
        message="We couldn't confirm your channel workspace. Please try again."
        retry={() => {
          void rolesQuery.refetch();
        }}
      />
    );
  if (!rolesReady)
    return (
      <ChannelAccessState message="No channel workspace is available for your current role. Return to your workspace to review access." />
    );
  if (navigationError)
    return (
      <ChannelAccessState
        message="We couldn't open this channel view. Please try again."
        retry={() => setNavigationAttempt((value) => value + 1)}
      />
    );
  const navigateWithin = async (next: FilterState) => {
    if (currentScope.current !== scopeKey || !visibleTabs.includes(next.tab)) return;
    try {
      await navigate({ to: "/transition-channel", search: next });
    } catch {
      if (currentScope.current === scopeKey) setNavigationError(true);
    }
  };

  const openConnectionChannel = async (channelId: string) => {
    if (currentScope.current !== scopeKey || !visibleTabs.includes("channels") || !z.string().uuid().safeParse(channelId).success) throw new Error("Channel access changed.");
    await navigate({ to: "/transition-channel", search: { ...search, tab: "channels", channel: channelId } });
  };
  const summary = summaryQuery.isError ? undefined : summaryQuery.data;

  return (
    <FeatureShell
      title="Transition Channel"
      description="Purpose-scoped conversations for the people supporting each transition. Every channel is access-controlled and audit-logged."
      backTo={{ to: backTo.to, label: `Back to ${backTo.label}` }}
      breadcrumbs={[{ label: "Transition Channel" }]}
      primaryAction={
        visibleTabs.includes("connections") ? (
          <ConnectionRequestsDrawerTrigger summary={summary} onOpenChannel={openConnectionChannel} />
        ) : undefined
      }
      maxWidth="wide"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          void navigateWithin({ ...search, tab: v as TabId });
        }}
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

        {summaryQuery.isError && (
          <div role="alert" className="mt-4 rounded-xl border p-3 text-sm">
            <p>
              We couldn't load your channel counts. Your conversations can still be opened below.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                void summaryQuery.refetch();
              }}
            >
              Reload Channel Counts
            </Button>
          </div>
        )}
        <div className="mt-4 rounded-xl border bg-card p-3 sm:p-4">
          <FilterBar
            search={search}
            onChange={(patch) => {
              void navigateWithin({ ...search, ...patch });
            }}
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
            <ConnectionsTab onOpenChannel={openConnectionChannel} />
          </TabsContent>
          <TabsContent value="archived" className="mt-0 focus-visible:outline-none">
            <ArchivedTab search={search} />
            <RetainedChatHistory />
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

function ConnectionRequestsDrawerTrigger({ summary, onOpenChannel }: { summary?: ChannelTileSummary; onOpenChannel: (channelId: string) => Promise<void> }) {
  return (
    <ConnectionRequestsDrawer
      onOpenChannel={onOpenChannel}
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
  return <ChannelConversationTab key={search.channel ?? "default"} search={search} />;
}

function MentionsTab() {
  return <ChannelMentions />;
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
  const scope = useChannelViewScope(JSON.stringify([kind, assigneeOnly, search]));
  const listFn = useServerFn(listChannelActions);
  const query = useQuery({
    queryKey: ["channel-actions", kind, assigneeOnly, search],
    queryFn: async () => {
      if (!scope.isCurrent()) throw new Error("View changed.");
      const result = await listFn({
        data: { kind, assignee_only: assigneeOnly, expected_viewer_id: scope.viewerId },
      });
      if (!scope.isCurrent()) throw new Error("View changed.");
      if (
        !Array.isArray(result?.actions) ||
        result.actions.some(
          (action) =>
            !z.string().uuid().safeParse(action.id).success ||
            !z.string().uuid().safeParse(action.channel_id).success ||
            !["open", "in_progress", "resolved", "cancelled"].includes(action.status),
        )
      )
        throw new Error("Records unavailable.");
      return result;
    },
    retry: false,
  });
  const actions = query.isSuccess ? query.data.actions : [];
  const icon = kind === "action" ? ListTodo : kind === "decision" ? HelpCircle : Megaphone;
  const label =
    kind === "action" ? "assigned action" : kind === "decision" ? "decision" : "feedback item";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">This view shows up to 50 recent records.</p>
      {query.isError ? (
        <div role="alert" className="text-sm">
          <p>We couldn't load these records.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Reload Records
          </Button>
        </div>
      ) : query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading {label}s…</p>
      ) : actions.length === 0 ? (
        <EmptyState icon={icon} message={`No recorded ${label}s in this view.`} />
      ) : (
        actions.map((a) => <ActionCard key={a.id} action={a} />)
      )}
    </div>
  );
}

function ConnectionsTab({ onOpenChannel }: { onOpenChannel: (channelId: string) => Promise<void> }) {
  return <ChannelConnectionRequests onOpenChannel={onOpenChannel} />;
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
  const navigate = useNavigate();
  const workspace = useChannelViewScope("conversation");
  const listFn = useServerFn(listMyChannels);
  const msgsFn = useServerFn(listChannelMessages);
  const sendFn = useServerFn(sendChannelMessage);
  const readFn = useServerFn(markChannelRead);
  const pinnedFn = useServerFn(listPinnedMessages);
  const bookmarksFn = useServerFn(listChannelBookmarkIds);
  const prepareAttachmentUploadFn = useServerFn(prepareChannelAttachmentUpload);
  const failAttachmentUploadFn = useServerFn(failChannelAttachmentUpload);
  const scanAttachmentFn = useServerFn(scanChannelAttachment);
  const qc = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ["transition-channels", "conversation", search],
    queryFn: async () => {
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      const result = await listFn({ data: { expected_viewer_id: workspace.viewerId } });
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      if (!Array.isArray(result?.channels)) throw new Error("Channels unavailable");
      return result;
    },
    retry: false,
  });

  const channels = useMemo(() => {
    let list = channelsQuery.isError ? [] : (channelsQuery.data?.channels ?? []);
    if (search.archived === "active") list = list.filter((c) => !c.archived_at);
    if (search.archived === "archived") list = list.filter((c) => !!c.archived_at);
    if (search.type) list = list.filter((c) => c.kind === search.type);
    if (search.unread === "unread") list = list.filter((c) => c.unread_count > 0);
    return list;
  }, [channelsQuery.data, channelsQuery.isError, search]);

  const [activeId, setActiveId] = useState<string | null>(search.channel ?? null);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [promoteMessage, setPromoteMessage] = useState<ChannelMessage | null>(null);
  const currentUserId = workspace.viewerId;

  useEffect(() => {
    if (!activeId && channels.length > 0) setActiveId(channels[0].id);
  }, [channels, activeId]);

  const active = useMemo(
    () => channels.find((c) => c.id === activeId) ?? null,
    [channels, activeId],
  );
  const isAdmin = active?.member_role === "admin" || active?.member_role === "owner";
  const view = useChannelViewScope(
    JSON.stringify([active?.id ?? null, active?.member_role ?? null, active?.archived_at ?? null]),
  );
  const [readError, setReadError] = useState<{
    channelId: string;
    currentView: () => boolean;
  } | null>(null);
  const [readAttempt, setReadAttempt] = useState(0);

  const messagesQuery = useQuery({
    queryKey: ["transition-channel-messages", activeId],
    queryFn: async () => {
      if (!view.isCurrent()) throw new Error("Conversation changed.");
      const result = await msgsFn({
        data: { channel_id: active!.id, expected_viewer_id: workspace.viewerId },
      });
      if (!view.isCurrent()) throw new Error("Conversation changed.");
      if (
        !Array.isArray(result?.messages) ||
        result.messages.some((message) => message.channel_id !== active!.id)
      )
        throw new Error("Conversation response mismatch");
      return result;
    },
    enabled: !!active,
    retry: false,
  });

  const allMessages = useMemo(
    () => (messagesQuery.isError ? [] : (messagesQuery.data?.messages ?? [])),
    [messagesQuery.data, messagesQuery.isError],
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
    queryFn: async () => {
      if (!view.isCurrent()) throw new Error("Conversation changed.");
      const result = await pinnedFn({ data: { channel_id: active!.id, expected_viewer_id: workspace.viewerId } });
      if (!view.isCurrent()) throw new Error("Conversation changed.");
      return validatePinnedRead(result, active!.id);
    },
    enabled: !!active, retry: false,
  });

  const bookmarksQuery = useQuery({
    queryKey: ["channel-bookmarks", activeId],
    queryFn: async () => {
      if (!view.isCurrent()) throw new Error("Conversation changed.");
      const result = await bookmarksFn({ data: { channel_id: active!.id, expected_viewer_id: workspace.viewerId } });
      if (!view.isCurrent()) throw new Error("Conversation changed.");
      return validateBookmarkRead(result, active!.id);
    },
    enabled: !!active, retry: false,
  });
  const bookmarkedIds = useMemo(
    () => new Set(bookmarksQuery.isSuccess ? bookmarksQuery.data.message_ids : []),
    [bookmarksQuery.data, bookmarksQuery.isSuccess],
  );

  const topLevelIds = useMemo(() => topLevel.map((m) => m.id), [topLevel]);
  const {
    byMessage: attachmentsByMessage,
    refetch: refetchAttachments,
    error: attachmentsError,
  } = useMessageAttachments(topLevelIds, active?.id);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo?.({ top: scrollerRef.current.scrollHeight });
  }, [topLevel.length, activeId]);

  useEffect(() => {
    if (!active || !view.isCurrent() || allMessages.length === 0) return;
    let cancelled = false;
    const last = allMessages[allMessages.length - 1];
    setReadError(null);
    readFn({
      data: {
        channel_id: active.id,
        last_read_message_id: last.id,
        expected_viewer_id: workspace.viewerId,
      },
    })
      .then((result) => {
        if (cancelled || !view.isCurrent()) return;
        if (result?.ok !== true) throw new Error("Read receipt unconfirmed");
        void qc.invalidateQueries({ queryKey: ["transition-channels"] });
        void qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
      })
      .catch(() => {
        if (!cancelled && view.isCurrent())
          setReadError({ channelId: active.id, currentView: view.isCurrent });
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id, allMessages, readFn, qc, view.isCurrent, workspace.viewerId, readAttempt]);

  useEffect(() => {
    if (!active || !view.isCurrent()) return;
    let cancelled = false;
    const channel = supabase
      .channel(`channel-messages-${workspace.viewerId}-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${active.id}`,
        },
        () => {
          if (cancelled || !view.isCurrent()) return;
          void qc.invalidateQueries({ queryKey: ["transition-channel-messages", active.id] });
          void qc.invalidateQueries({ queryKey: ["channel-pinned", active.id] });
          void qc.invalidateQueries({ queryKey: ["transition-channels"] });
          void qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void Promise.resolve(supabase.removeChannel(channel)).catch(() => {});
    };
  }, [active?.id, qc, view.isCurrent, workspace.viewerId]);

  type Composer = { body: string; file: File | null; revision: number };
  const [composers, setComposers] = useState<Record<string, Composer>>({});
  const composer = active
    ? (composers[active.id] ?? { body: "", file: null, revision: 0 })
    : { body: "", file: null, revision: 0 };
  const draft = composer.body;
  const pendingFile = composer.file;
  const updateComposer = (patch: Partial<Pick<Composer, "body" | "file">>) => {
    if (!active || !view.isCurrent()) return;
    const id = active.id;
    setComposers((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] ?? { body: "", file: null, revision: 0 }),
        ...patch,
        revision: (previous[id]?.revision ?? 0) + 1,
      },
    }));
  };
  const setDraft = (body: string) => updateComposer({ body });
  const setPendingFile = (file: File | null) => updateComposer({ file });
  const [privacyReview, setPrivacyReview] = useState<{
    channelId: string;
    source: SensitiveFileReviewSource;
  } | null>(null);
  const privacySource =
    privacyReview?.channelId === active?.id ? (privacyReview?.source ?? null) : null;
  const setPrivacySource = (source: SensitiveFileReviewSource | null) => {
    if (!view.isCurrent()) return;
    setPrivacyReview(source && active ? { channelId: active.id, source } : null);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSends = useRef(new Set<string>());
  const sendKeys = useRef(new Map<string, string>());
  const [pendingSendIds, setPendingSendIds] = useState<string[]>([]);
  const sending = !!active && pendingSendIds.includes(active.id);

  const invalidateOriginal = (channelId: string, currentView: () => boolean) => {
    if (!workspace.isWorkspaceCurrent()) return;
    const refetchType = currentView() ? ("active" as const) : ("none" as const);
    for (const queryKey of [
      ["transition-channel-messages", channelId],
      ["channel-pinned", channelId],
      ["channel-bookmarks", channelId],
      ["transition-channels"],
      ["channel-tile-summary"],
      ["channel-message-attachments"],
    ])
      void qc.invalidateQueries({ queryKey, refetchType });
    if (currentView()) void refetchAttachments();
  };
  const invalidateActive = () => {
    if (active && view.isCurrent()) invalidateOriginal(active.id, view.isCurrent);
  };

  type AttachmentRequest = {
    channelId: string;
    messageId: string;
    file: File;
    currentView: () => boolean;
  };
  const attachmentMutation = useMutation({
    mutationFn: async (request: AttachmentRequest) => {
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      assertProtectedFileUploadsEnabled();
      assertPrivacySafeDerivedUpload(request.file.name, request.file.type);
      const prepared = await prepareAttachmentUploadFn({
        data: {
          channel_id: request.channelId,
          message_id: request.messageId,
          file_name: request.file.name,
          content_type: request.file.type || null,
          size_bytes: request.file.size,
          expected_viewer_id: workspace.viewerId,
        },
      });
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      const upload = await supabase.storage
        .from("channel-attachments")
        .uploadToSignedUrl(prepared.upload.storage_path, prepared.upload.token, request.file, {
          contentType: request.file.type || "application/octet-stream",
          upsert: false,
        });
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      if (upload.error) {
        try {
          await failAttachmentUploadFn({
            data: { attachment_id: prepared.attachment.id, expected_viewer_id: workspace.viewerId },
          });
        } catch {}
        throw new Error("Attachment upload unconfirmed");
      }
      return { attachmentId: prepared.attachment.id, request };
    },
    onSuccess: (result) => {
      if (!workspace.isWorkspaceCurrent()) return;
      void scanAttachmentFn({
        data: { attachment_id: result.attachmentId, expected_viewer_id: workspace.viewerId },
      })
        .then(() => invalidateOriginal(result.request.channelId, result.request.currentView))
        .catch(() => {
          if (!workspace.isWorkspaceCurrent()) return;
          if (result.request.currentView())
            toast.error(
              "The attachment remains quarantined because its security scan did not complete.",
            );
          invalidateOriginal(result.request.channelId, result.request.currentView);
        });
    },
    onError: (_error, request) => {
      if (!workspace.isWorkspaceCurrent()) return;
      if (request.currentView())
        toast.error("Your message was sent, but its attachment could not be secured.");
      invalidateOriginal(request.channelId, request.currentView);
    },
  });

  type SendRequest = {
    body: string;
    channelId: string;
    attachment: File | null;
    revision: number;
    currentView: () => boolean;
    dedupeKey: string;
  };
  const sendMutation = useMutation({
    mutationFn: async (request: SendRequest) => {
      if (!workspace.isWorkspaceCurrent() || !request.currentView())
        throw new Error("Conversation changed.");
      const res = await sendFn({
        data: {
          channel_id: request.channelId,
          body: request.body,
          client_dedupe_key: request.dedupeKey,
          expected_viewer_id: workspace.viewerId,
        },
      });
      if (
        !res?.message ||
        !z.string().uuid().safeParse(res.message.id).success ||
        res.message.channel_id !== request.channelId ||
        res.message.author_id !== workspace.viewerId
      )
        throw new Error("Message response mismatch");
      return { ...res, request };
    },
    onSuccess: (result) => {
      if (!workspace.isWorkspaceCurrent()) return;
      const request = result.request;
      sendKeys.current.delete(JSON.stringify([request.channelId, request.revision]));
      setComposers((previous) =>
        previous[request.channelId]?.revision === request.revision
          ? {
              ...previous,
              [request.channelId]: { body: "", file: null, revision: request.revision + 1 },
            }
          : previous,
      );
      if (request.currentView() && fileInputRef.current) fileInputRef.current.value = "";
      invalidateOriginal(request.channelId, request.currentView);
      if (request.attachment)
        attachmentMutation.mutate({
          channelId: request.channelId,
          messageId: result.message.id,
          file: request.attachment,
          currentView: request.currentView,
        });
    },
    onError: (_error, request) => {
      if (workspace.isWorkspaceCurrent() && request.currentView())
        toast.error(
          "We couldn't confirm this message was sent. It remains in this channel's composer; check the conversation before trying again.",
        );
    },
    onSettled: (_data, _error, request) => {
      pendingSends.current.delete(request.channelId);
      if (workspace.isWorkspaceCurrent()) setPendingSendIds([...pendingSends.current]);
    },
  });
  const submitMessage = () => {
    if (
      !active ||
      active.archived_at ||
      !view.isCurrent() ||
      messagesQuery.isError ||
      messagesQuery.isPending ||
      pendingSends.current.has(active.id)
    )
      return;
    const body = draft.trim();
    if (!body) return;
    const intentKey = JSON.stringify([active.id, composer.revision]);
    let dedupeKey = sendKeys.current.get(intentKey);
    if (!dedupeKey) {
      dedupeKey = crypto.randomUUID();
      sendKeys.current.set(intentKey, dedupeKey);
    }
    pendingSends.current.add(active.id);
    setPendingSendIds([...pendingSends.current]);
    sendMutation.mutate({
      body,
      channelId: active.id,
      attachment: PROTECTED_FILE_UPLOADS_ENABLED ? pendingFile : null,
      revision: composer.revision,
      currentView: view.isCurrent,
      dedupeKey,
    });
  };

  const pinned = pinnedQuery.isSuccess ? pinnedQuery.data.pinned : [];
  const bookmarksAvailable = bookmarksQuery.isSuccess;

  return (
    <>
      <StartStudentConversation
        key={activeId ?? "no-conversation"}
        onCreated={async (channelId) => {
          if (!view.isCurrent()) throw new Error("Conversation view changed.");
          await navigate({
            to: "/transition-channel",
            search: {
              ...search, tab: "channels", channel: channelId,
              unread: "all", archived: "active", student: undefined,
              type: undefined, org: undefined, opportunity: undefined,
            },
          });
          if (!view.isCurrent()) throw new Error("Conversation view changed.");
          setActiveId(channelId);
          setThreadParentId(null);
          setPromoteMessage(null);
        }}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <aside className="max-h-[50vh] overflow-y-auto rounded-lg border bg-muted/30 md:max-h-[70vh]">
          <Button
            variant="outline"
            className="m-3"
            onClick={() => {
              void channelsQuery.refetch();
            }}
          >
            Refresh Conversations
          </Button>
          {channelsQuery.isError ? (
            <div role="alert" className="p-4 text-sm">
              <p>We couldn't load your conversations.</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => {
                  void channelsQuery.refetch();
                }}
              >
                Reload Conversations
              </Button>
            </div>
          ) : channelsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading channels…</div>
          ) : channels.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No channels match your filters. Adjust filters, or start a conversation with a
              connected student-team member above.
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
                      setPromoteMessage(null);
                      setPrivacyReview(null);
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
                {activeId
                  ? "This conversation is no longer available in the current list. Select another channel or reload conversations."
                  : "Select a channel to view its conversation."}
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
                  <div className="flex items-center gap-2 shrink-0">
                    {pinned.length > 0 && (
                      <Badge variant="outline">
                        <Pin className="h-3 w-3 mr-1" /> {pinned.length} pinned
                      </Badge>
                    )}
                    <ChannelMuteToggle channelId={active.id} muted={active.muted} />
                  </div>
                </div>
              </header>

              <div className="flex flex-wrap gap-2 border-b px-4 py-2">
                <Button size="sm" variant="outline" disabled={pinnedQuery.isFetching} onClick={() => { if (view.isCurrent()) void pinnedQuery.refetch(); }}>{pinnedQuery.isError ? "Reload Pinned Messages" : "Refresh Pinned Messages"}</Button>
                <Button size="sm" variant="outline" disabled={bookmarksQuery.isFetching} onClick={() => { if (view.isCurrent()) void bookmarksQuery.refetch(); }}>{bookmarksQuery.isError ? "Reload Bookmarks" : "Refresh Bookmarks"}</Button>
              </div>
              {pinnedQuery.isError && <p role="alert" className="px-4 py-2 text-sm">We couldn't load pinned messages. Reload them to try again.</p>}
              {pinnedQuery.isPending && <p className="px-4 py-2 text-sm">Loading pinned messages…</p>}
              {bookmarksQuery.isError && <p role="alert" className="px-4 py-2 text-sm">We couldn't load bookmarks. Bookmark controls are unavailable until you reload them.</p>}
              {bookmarksQuery.isPending && <p className="px-4 py-2 text-sm">Loading bookmarks…</p>}
              <ChannelPinnedMessages key={active.id} messages={pinned} onOpen={(messageId) => {
                if (view.isCurrent() && pinned.some(message => message.id === messageId && message.channel_id === active.id)) setThreadParentId(messageId);
              }} />

              <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {messagesQuery.isError ? (
                  <div role="alert" className="text-sm">
                    <p>We couldn't load this conversation. Your draft is kept.</p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        void messagesQuery.refetch();
                      }}
                    >
                      Reload Messages
                    </Button>
                  </div>
                ) : messagesQuery.isLoading ? (
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
                      readOnly={!!active.archived_at}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      bookmarked={bookmarksAvailable ? bookmarkedIds.has(m.id) : null}
                      attachments={attachmentsByMessage.get(m.id) ?? []}
                      replyCount={replyCounts.get(m.id) ?? 0}
                      onReply={(parent) => setThreadParentId(parent.id)}
                      onPromote={(msg) => setPromoteMessage(msg)}
                      onChanged={invalidateActive}
                    />
                  ))
                )}
              </div>

              {attachmentsError && (
                <div role="alert" className="border-t p-3 text-sm">
                  <p>We couldn't load this conversation's attachments.</p>
                  <Button size="sm" variant="outline" onClick={() => void refetchAttachments()}>
                    Reload Attachments
                  </Button>
                </div>
              )}
              {readError?.channelId === active.id && readError.currentView() && (
                <div role="alert" className="border-t p-3 text-sm">
                  <p>Your messages are available, but we couldn't update the read status.</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setReadAttempt((value) => value + 1)}
                  >
                    Retry Read Status
                  </Button>
                </div>
              )}
              <form
                className="border-t p-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMessage();
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
                {!PROTECTED_FILE_UPLOADS_ENABLED && (
                  <p role="status" className="text-xs leading-relaxed text-muted-foreground">
                    Attachments are temporarily unavailable while private security scanning is
                    finalized. You can still send messages normally.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className="sr-only"
                    disabled={!PROTECTED_FILE_UPLOADS_ENABLED || !!active.archived_at}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 25 * 1024 * 1024) {
                        alert("Attachments must be 25 MB or smaller.");
                        e.target.value = "";
                        return;
                      }
                      if (f) setPrivacySource({ kind: "file", file: f });
                      e.target.value = "";
                    }}
                    aria-label="Attach a file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (!PROTECTED_FILE_UPLOADS_ENABLED) {
                        toast.error(PROTECTED_FILE_UPLOADS_MESSAGE);
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    disabled={!PROTECTED_FILE_UPLOADS_ENABLED || !!active.archived_at || sending}
                    title={
                      PROTECTED_FILE_UPLOADS_ENABLED
                        ? "Attach file"
                        : PROTECTED_FILE_UPLOADS_MESSAGE
                    }
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
                        submitMessage();
                      }
                    }}
                    disabled={!!active.archived_at}
                    aria-label="Message"
                  />
                  <Button
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      sending ||
                      !!active.archived_at ||
                      messagesQuery.isError ||
                      messagesQuery.isPending
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

      <SensitiveFilePrivacyReviewDialog
        key={active?.id ?? "none"}
        source={privacySource}
        confirmLabel="Attach privacy-safe copy"
        onCancel={() => setPrivacySource(null)}
        onConfirm={({ file }) => {
          if (!view.isCurrent()) return;
          setPrivacySource(null);
          setPendingFile(file);
        }}
      />

      <ThreadPanel
        key={`thread:${active?.id ?? "none"}:${threadParentId ?? "none"}`}
        parentId={
          active && (allMessages.some((message) => message.id === threadParentId) || pinned.some((message) => message.id === threadParentId))
            ? threadParentId
            : null
        }
        channelId={active?.id ?? null}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        bookmarkedIds={bookmarkedIds}
        bookmarksAvailable={bookmarksAvailable}
        readOnly={!!active?.archived_at}
        onClose={() => setThreadParentId(null)}
        onChanged={invalidateActive}
      />

      <PromoteRecordDialog
        key={`promote:${active?.id ?? "none"}:${promoteMessage?.id ?? "none"}`}
        message={promoteMessage?.channel_id === active?.id ? promoteMessage : null}
        channelId={promoteMessage?.channel_id === active?.id ? (active?.id ?? null) : null}
        channelStudentId={active?.student_id ?? null}
        readOnly={!!active?.archived_at}
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
