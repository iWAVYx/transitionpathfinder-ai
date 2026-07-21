import { useState } from "react";
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

const KIND_META: Record<
  RecordKind,
  { label: string; icon: typeof ListTodo; description: string }
> = {
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

export function PromoteRecordDialog({
  message,
  channelId,
  channelStudentId,
  onOpenChange,
  onPromoted,
}: {
  message: ChannelMessage | null;
  channelId: string | null;
  channelStudentId?: string | null;
  onOpenChange: (open: boolean) => void;
  onPromoted: () => void;
}) {
  const open = !!message && !!channelId;

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
    queryFn: () => listAssigneesFn({ data: { channel_id: channelId! } }),
    enabled: open,
  });

  const promoteFn = useServerFn(promoteMessageToAction);
  const qc = useQueryClient();
  const promoteMut = useMutation({
    mutationFn: () =>
      promoteFn({
        data: {
          channel_id: channelId!,
          message_id: message!.id,
          kind,
          priority: kind === "action" && priority !== "none" ? priority : null,
          due_at: dueLocal ? new Date(dueLocal).toISOString() : null,
          assignee_user_id: assigneeId !== "none" ? assigneeId : null,
          resolution: note.trim() ? note.trim() : null,
          create_action_item:
            kind === "action" && !!channelStudentId && alsoActionItem,
          create_calendar_event:
            !!channelStudentId && !!dueLocal && alsoCalendar,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel-actions"] });
      qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
      qc.invalidateQueries({ queryKey: ["next-actions"] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onPromoted();
      onOpenChange(false);
      // Reset for next open.
      setPriority("normal");
      setDueLocal("");
      setAssigneeId("none");
      setNote("");
      setKind("action");
      setAlsoActionItem(true);
      setAlsoCalendar(false);
    },
  });

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

        <div className="space-y-4 py-2">
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
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/60"
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
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="promote-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(assigneesQuery.data?.options ?? []).map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for the team…"
              className="resize-none"
            />
          </div>

          {channelStudentId && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Cross-Surface Sync
              </p>
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
                      Shows up on the student profile and Next Actions dashboard.
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
                      ? "Uses the due date above; visible to the transition team."
                      : "Set a due date to enable this."}
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => promoteMut.mutate()} disabled={promoteMut.isPending}>
            {promoteMut.isPending ? "Promoting…" : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
