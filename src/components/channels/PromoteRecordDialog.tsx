import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useChannelViewScope } from "./ChannelQueryBoundary";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo, HelpCircle, Megaphone, MessageSquareQuote } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChannelMessage } from "@/lib/channels.functions";
import {
  promoteMessageToAction,
  listChannelAssigneeOptions,
  ACTION_PRIORITIES,
  type ActionPriority,
  type RecordKind,
} from "@/lib/channel-actions.functions";

const KIND_META: Record<RecordKind, { label: string; icon: typeof ListTodo; description: string }> =
  {
    action: {
      label: "Action Item",
      icon: ListTodo,
      description: "Something specific someone needs to do.",
    },
    decision: {
      label: "Decision",
      icon: HelpCircle,
      description: "A choice the team needs to make together.",
    },
    question: {
      label: "Open Question",
      icon: MessageSquareQuote,
      description: "Something that needs an answer from the group.",
    },
    feedback: {
      label: "Feedback",
      icon: Megaphone,
      description: "A note to log for the record.",
    },
  };

export type PromoteRecordDialogProps = {
  message: ChannelMessage | null;
  channelId: string | null;
  channelStudentId?: string | null;
  readOnly?: boolean;
  onOpenChange: (open: boolean) => void;
  onPromoted: () => void;
};
const promotionResult = z.object({
  action_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  message_id: z.string().uuid(),
  kind: z.enum(["action", "decision", "question", "feedback"]),
  action_item_id: z.string().uuid().nullable(),
  calendar_event_id: z.string().uuid().nullable(),
  sync: z.object({
    action_item: z.enum(["not_requested", "created", "unconfirmed"]),
    calendar: z.enum(["not_requested", "created", "unconfirmed"]),
    links: z.enum(["not_needed", "saved", "unconfirmed"]),
  }),
});
export function PromoteRecordDialog(props: PromoteRecordDialogProps) {
  return (
    <PromotionSession
      key={JSON.stringify([
        props.channelId,
        props.message?.id,
        props.channelStudentId,
        props.readOnly,
      ])}
      {...props}
    />
  );
}
function PromotionSession({
  message,
  channelId,
  channelStudentId,
  readOnly = false,
  onOpenChange,
  onPromoted,
}: PromoteRecordDialogProps) {
  const open = !!message && !!channelId;
  const scope = useChannelViewScope(
    JSON.stringify([
      channelId,
      channelStudentId,
      message?.id,
      message?.body,
      message?.deleted_at,
      readOnly,
    ]),
  );
  const eligible = open && !readOnly && message.channel_id === channelId && !message.deleted_at;
  const pending = useRef(false);
  const committed = useRef(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<RecordKind>("action");
  const [priority, setPriority] = useState<ActionPriority | "none">("normal");
  const [dueLocal, setDueLocal] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("none");
  const [note, setNote] = useState("");
  const [alsoActionItem, setAlsoActionItem] = useState(true);
  const [alsoCalendar, setAlsoCalendar] = useState(false);

  const listAssigneesFn = useServerFn(listChannelAssigneeOptions);
  const assigneesQuery = useQuery({
    queryKey: ["channel-assignees", channelId],
    queryFn: async () => {
      if (!scope.isCurrent() || !eligible) throw new Error("Conversation changed.");
      const result = await listAssigneesFn({
        data: { channel_id: channelId!, expected_viewer_id: scope.viewerId },
      });
      if (!scope.isCurrent()) throw new Error("Conversation changed.");
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
    enabled: eligible,
    retry: false,
  });
  const options = assigneesQuery.isSuccess ? assigneesQuery.data.options : [];
  const assigneeAvailable =
    assigneeId === "none" || options.some((option) => option.user_id === assigneeId);
  const promoteFn = useServerFn(promoteMessageToAction);
  const qc = useQueryClient();
  type Request = { data: Parameters<typeof promoteFn>[0]["data"]; currentView: () => boolean };
  const promoteMut = useMutation({
    mutationFn: async (request: Request) => {
      if (!request.currentView()) throw new Error("Conversation changed.");
      const result = promotionResult.parse(await promoteFn({ data: request.data }));
      if (
        result.channel_id !== request.data.channel_id ||
        result.message_id !== request.data.message_id ||
        result.kind !== request.data.kind ||
        (request.data.create_action_item
          ? result.sync.action_item === "not_requested"
          : result.sync.action_item !== "not_requested") ||
        (request.data.create_calendar_event
          ? result.sync.calendar === "not_requested"
          : result.sync.calendar !== "not_requested") ||
        (result.sync.action_item === "created") !== !!result.action_item_id ||
        (result.sync.calendar === "created") !== !!result.calendar_event_id ||
        (!!result.action_item_id || !!result.calendar_event_id
          ? result.sync.links === "not_needed"
          : result.sync.links !== "not_needed")
      )
        throw new Error("Record response mismatch.");
      return result;
    },
    onSuccess: (result, request) => {
      if (!request.currentView()) return;
      committed.current = true;
      setSaved(true);
      for (const queryKey of [
        "channel-actions",
        "channel-tile-summary",
        "next-actions",
        "calendar-events",
      ])
        void qc.invalidateQueries({ queryKey: [queryKey] });
      if (Object.values(result.sync).includes("unconfirmed"))
        toast.warning(
          "The channel record was saved, but some related items or links couldn't be confirmed. Review the record before creating any copies.",
        );
      try {
        onPromoted();
      } catch {
        toast.warning("The record was saved. Refresh the conversation to see it.");
      }
      try {
        onOpenChange(false);
      } catch {
        setError(
          "The record was saved. Close this window and refresh the conversation to review it.",
        );
      }
    },
    onError: (_error, request) => {
      if (request.currentView())
        setError(
          "We couldn't confirm this record was created. Your choices are still here. Check the conversation's records before trying again.",
        );
    },
    onSettled: () => {
      pending.current = false;
    },
  });
  const submit = () => {
    if (
      pending.current ||
      committed.current ||
      !scope.isCurrent() ||
      !eligible ||
      !assigneesQuery.isSuccess ||
      !assigneeAvailable
    )
      return;
    const due = dueLocal ? new Date(dueLocal) : null;
    if (due && !Number.isFinite(due.getTime())) {
      setError("Choose a valid due date and time.");
      return;
    }
    setError(null);
    pending.current = true;
    promoteMut.mutate({
      currentView: scope.isCurrent,
      data: {
        channel_id: channelId!,
        message_id: message!.id,
        expected_viewer_id: scope.viewerId,
        expected_student_id: channelStudentId ?? null,
        expected_message_body: message!.body,
        kind,
        priority: kind === "action" && priority !== "none" ? priority : null,
        due_at: due?.toISOString() ?? null,
        assignee_user_id: assigneeId !== "none" ? assigneeId : null,
        resolution: note.trim() || null,
        create_action_item: kind === "action" && !!channelStudentId && alsoActionItem,
        create_calendar_event: !!channelStudentId && !!due && alsoCalendar,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to Record</DialogTitle>
          <DialogDescription>
            Turn this message into a tracked item that shows up in the right tab.
          </DialogDescription>
        </DialogHeader>

        {message && (
          <blockquote className="rounded-md border-l-2 border-primary/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground line-clamp-3">
            {message.body}
          </blockquote>
        )}

        {readOnly && (
          <p className="text-sm">This conversation is archived. Its records are read-only.</p>
        )}
        {saved && (
          <p role="status" className="text-sm">
            Record saved. Close this window to review it.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        <fieldset
          disabled={saved || promoteMut.isPending || !eligible}
          className="min-w-0 space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(KIND_META) as RecordKind[]).map((k) => {
                const meta = KIND_META[k];
                const Icon = meta.icon;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promote-assignee">Assignee</Label>
              {assigneesQuery.isError && (
                <div role="alert" className="text-sm">
                  <p>We couldn't load this conversation's members.</p>
                  <Button size="sm" variant="outline" onClick={() => void assigneesQuery.refetch()}>
                    Reload Members
                  </Button>
                </div>
              )}
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={!assigneesQuery.isSuccess}
              >
                <SelectTrigger id="promote-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!assigneeAvailable && (
                <p role="alert" className="text-sm">
                  The selected assignee is no longer available. Choose a current member or
                  Unassigned.
                </p>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={assigneesQuery.isFetching}
                onClick={() => void assigneesQuery.refetch()}
              >
                Refresh Members
              </Button>
            </div>

            {kind === "action" && (
              <div className="space-y-1.5">
                <Label htmlFor="promote-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as ActionPriority | "none")}
                >
                  <SelectTrigger id="promote-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No priority</SelectItem>
                    {ACTION_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promote-due">Due</Label>
            <Input
              id="promote-due"
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promote-note">Notes (optional)</Label>
            <Textarea
              id="promote-note"
              maxLength={2000}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for the team…"
              className="resize-none"
            />
          </div>

          {channelStudentId && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Related Tools</p>
              {kind === "action" && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={alsoActionItem}
                    onChange={(e) => setAlsoActionItem(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Also add to the student's Action Items
                    <span className="block text-xs text-muted-foreground">
                      Creates a separate linked task on the student profile.
                    </span>
                  </span>
                </label>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alsoCalendar}
                  onChange={(e) => setAlsoCalendar(e.target.checked)}
                  disabled={!dueLocal}
                  className="mt-0.5"
                />
                <span>
                  Add to the Team Calendar
                  <span className="block text-xs text-muted-foreground">
                    {dueLocal
                      ? "Creates a separate calendar entry using the due date and existing team access."
                      : "Set a due date to enable this."}
                  </span>
                </span>
              </label>
            </div>
          )}
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {saved ? "Close" : "Cancel"}
          </Button>
          <Button
            onClick={submit}
            disabled={
              saved ||
              promoteMut.isPending ||
              !eligible ||
              !assigneesQuery.isSuccess ||
              !assigneeAvailable
            }
          >
            {saved ? "Saved" : promoteMut.isPending ? "Promoting…" : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
