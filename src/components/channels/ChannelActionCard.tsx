import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateChannelAction,
  listChannelAssigneeOptions,
  ACTION_STATUSES,
  type ActionStatus,
} from "@/lib/channel-actions.functions";
import type { ChannelActionRecord } from "@/lib/channel-tabs.functions";
import { useChannelViewScope } from "./ChannelQueryBoundary";
const acknowledgement = z.object({
  ok: z.literal(true),
  action_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  status: z.enum(ACTION_STATUSES),
  assignee_user_id: z.string().uuid().nullable(),
  sync: z.object({ action_item: z.enum(["not_requested", "updated", "unconfirmed"]) }),
});
export function ChannelActionCard({ action }: { action: ChannelActionRecord }) {
  return <ActionSession key={JSON.stringify([action.id, action.channel_id])} action={action} />;
}
function ActionSession({ action }: { action: ChannelActionRecord }) {
  const scope = useChannelViewScope(
    JSON.stringify([
      action.id,
      action.channel_id,
      action.status,
      action.assignee_user_id,
      action.student_id,
    ]),
  );
  const qc = useQueryClient();
  const updateFn = useServerFn(updateChannelAction);
  const listAssigneesFn = useServerFn(listChannelAssigneeOptions);
  const [assignOpen, setAssignOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);
  const pending = useRef(false);
  const awaiting = useRef(false);
  useEffect(() => {
    awaiting.current = false;
    setAwaitingRefresh(false);
    setError(null);
  }, [action.status, action.assignee_user_id, action.student_id]);
  const assigneesQuery = useQuery({
    queryKey: ["channel-assignees", action.channel_id],
    queryFn: async () => {
      if (!scope.isCurrent()) throw new Error("Record changed.");
      const result = await listAssigneesFn({
        data: { channel_id: action.channel_id, expected_viewer_id: scope.viewerId },
      });
      if (!scope.isCurrent()) throw new Error("Record changed.");
      if (
        !Array.isArray(result?.options) ||
        result.options.some(
          (option) =>
            !z.string().uuid().safeParse(option.user_id).success || typeof option.name !== "string",
        ) ||
        new Set(result.options.map((option) => option.user_id)).size !== result.options.length
      )
        throw new Error("Conversation members unavailable.");
      return result;
    },
    enabled: assignOpen,
    retry: false,
  });
  const options = assigneesQuery.isSuccess ? assigneesQuery.data.options : [];
  const invalidate = () => {
    if (!scope.isCurrent()) return;
    void qc.invalidateQueries({ queryKey: ["channel-actions"] });
    void qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
  };
  type Change = { status: ActionStatus } | { assignee_user_id: string | null };
  type Request = {
    data: Parameters<typeof updateFn>[0]["data"];
    currentView: () => boolean;
    beforeStatus: string;
    beforeAssignee: string | null;
  };
  const update = useMutation({
    mutationFn: async (request: Request) => {
      if (!request.currentView()) throw new Error("Record changed.");
      const result = acknowledgement.parse(await updateFn({ data: request.data }));
      if (
        result.action_id !== request.data.action_id ||
        result.channel_id !== request.data.expected_channel_id ||
        result.status !== (request.data.status ?? request.beforeStatus) ||
        result.assignee_user_id !==
          (request.data.assignee_user_id === undefined
            ? request.beforeAssignee
            : request.data.assignee_user_id)
      )
        throw new Error("Record response mismatch.");
      return result;
    },
    onSuccess: (result, request) => {
      if (!request.currentView()) return;
      awaiting.current = true;
      setAwaitingRefresh(true);
      setAssignOpen(false);
      if (result.sync.action_item === "unconfirmed")
        toast.warning(
          "The channel record was updated, but its linked student task couldn't be confirmed. Review both before making another change.",
        );
      invalidate();
    },
    onError: (_error, request) => {
      if (request.currentView())
        setError("We couldn't confirm this change. Reload the records before trying again.");
    },
    onSettled: () => {
      pending.current = false;
    },
  });
  const change = (change: Change) => {
    if (pending.current || awaiting.current || !scope.isCurrent()) return;
    if ("status" in change) {
      if (
        !z.enum(ACTION_STATUSES).safeParse(change.status).success ||
        change.status === action.status
      )
        return;
    } else if (
      !assigneesQuery.isSuccess ||
      change.assignee_user_id === action.assignee_user_id ||
      (change.assignee_user_id &&
        !options.some((option) => option.user_id === change.assignee_user_id))
    )
      return;
    pending.current = true;
    setError(null);
    update.mutate({
      data: {
        action_id: action.id,
        expected_channel_id: action.channel_id,
        expected_student_id: action.student_id,
        expected_viewer_id: scope.viewerId,
        expected_status: action.status as ActionStatus,
        expected_assignee_user_id: action.assignee_user_id,
        ...change,
      },
      currentView: scope.isCurrent,
      beforeStatus: action.status,
      beforeAssignee: action.assignee_user_id,
    });
  };
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
          {action.resolution && <p className="mt-2 text-sm">{action.resolution}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Promoted by {action.promoter_name}
            {action.assignee_name ? ` · Assigned to ${action.assignee_name}` : " · Unassigned"}
            {action.due_at ? ` · Due ${formatWhen(action.due_at)}` : null}
          </p>
          {(action.action_item_id || action.calendar_event_id) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {action.action_item_id && z.string().uuid().safeParse(action.student_id).success && (
                <a
                  href={`/students/${action.student_id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                >
                  <ListTodo className="h-3 w-3" /> Student Profile
                </a>
              )}
              {z.string().uuid().safeParse(action.calendar_event_id).success && (
                <a
                  href="/calendar"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                >
                  <Bell className="h-3 w-3" /> Calendar
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Select
            value={action.status}
            onValueChange={(v) => change({ status: v as ActionStatus })}
            disabled={update.isPending || awaitingRefresh}
          >
            <SelectTrigger aria-label="Record Status" className="h-7 w-[130px] text-xs">
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
            onValueChange={(v) => change({ assignee_user_id: v === "none" ? null : v })}
            onOpenChange={setAssignOpen}
            disabled={update.isPending || awaitingRefresh}
          >
            <SelectTrigger aria-label="Record Assignee" className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="Assign…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled={!assigneesQuery.isSuccess} className="text-xs">
                Unassigned
              </SelectItem>
              {action.assignee_user_id &&
                !options.some((option) => option.user_id === action.assignee_user_id) && (
                  <SelectItem value={action.assignee_user_id} disabled>
                    {action.assignee_name ?? "Assigned member"} (Unavailable)
                  </SelectItem>
                )}
              {options.map((o) => (
                <SelectItem key={o.user_id} value={o.user_id} className="text-xs">
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assigneesQuery.isError && (
            <div role="alert" className="max-w-[180px] text-xs">
              <p>We couldn't load conversation members.</p>
              <Button size="sm" variant="outline" onClick={() => void assigneesQuery.refetch()}>
                Reload Members
              </Button>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={assigneesQuery.isFetching || update.isPending || awaitingRefresh}
            onClick={() => {
              setAssignOpen(true);
              void assigneesQuery.refetch();
            }}
          >
            Refresh Members
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
      {awaitingRefresh && (
        <p role="status" className="mt-2 text-sm">
          Change saved. Reloading the recorded details.
        </p>
      )}
      {(error || awaitingRefresh) && (
        <Button size="sm" variant="outline" className="mt-2" onClick={invalidate}>
          Reload Records
        </Button>
      )}
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

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
