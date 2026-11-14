import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquarePlus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { useChannelViewScope } from "./ChannelQueryBoundary";

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
import {
  listStartableStudentChannels,
  listStudentChannelRecipients,
  startStudentChannel,
} from "@/lib/channels.functions";

const uuid = z.string().uuid();
const studentsSchema = z.object({
  students: z.array(z.object({ student_id: uuid, student_name: z.string() })),
  may_have_more: z.boolean(),
});
const recipientsSchema = z.object({
  student_id: uuid,
  recipients: z.array(z.object({ user_id: uuid, display_name: z.string() })),
});
const savedSchema = z.object({ channel_id: uuid, student_id: uuid, recipient_id: uuid });
type Saved = z.infer<typeof savedSchema>;
export function StartStudentConversation({
  onCreated,
}: {
  onCreated: (channelId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4" data-testid="start-student-conversation">
      {!open ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)} aria-expanded={false}>
          <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden />
          Start conversation
        </Button>
      ) : (
        <ConversationForm onCreated={onCreated} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
function ConversationForm({
  onCreated,
  onClose,
}: {
  onCreated: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [pending, setPending] = useState(false),
    [opening, setOpening] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null),
    [error, setError] = useState("");
  const lock = useRef(false),
    savedRef = useRef<Saved | null>(null),
    navigationLock = useRef(false);
  const scope = useChannelViewScope("new-conversation");
  const recipientsScope = useChannelViewScope("new-conversation:" + studentId);
  const studentRead = useRef(0),
    recipientRead = useRef(0);
  const queryClient = useQueryClient();
  const loadStudents = useServerFn(listStartableStudentChannels);
  const loadRecipients = useServerFn(listStudentChannelRecipients);
  const start = useServerFn(startStudentChannel);
  const students = useQuery({
    queryKey: ["channel-start-students"],
    retry: false,
    queryFn: async () => {
      if (!scope.isCurrent()) throw new Error("View changed.");
      const token = ++studentRead.current;
      const result = await loadStudents({ data: { expected_viewer_id: scope.viewerId } });
      if (!scope.isCurrent() || token !== studentRead.current) throw new Error("View changed.");
      const parsed = studentsSchema.parse(result);
      if (new Set(parsed.students.map((s) => s.student_id)).size !== parsed.students.length)
        throw new Error("Student response mismatch.");
      return parsed;
    },
  });
  const recipients = useQuery({
    queryKey: ["channel-start-recipients", studentId],
    enabled:
      !!studentId &&
      students.isSuccess &&
      students.data.students.some((s) => s.student_id === studentId),
    retry: false,
    queryFn: async () => {
      if (!recipientsScope.isCurrent()) throw new Error("Team changed.");
      const token = ++recipientRead.current;
      const result = await loadRecipients({
        data: { student_id: studentId, expected_viewer_id: scope.viewerId },
      });
      if (!recipientsScope.isCurrent() || token !== recipientRead.current)
        throw new Error("Team changed.");
      const parsed = recipientsSchema.parse(result);
      if (
        parsed.student_id !== studentId ||
        parsed.recipients.some((r) => r.user_id === scope.viewerId) ||
        new Set(parsed.recipients.map((r) => r.user_id)).size !== parsed.recipients.length
      )
        throw new Error("Team response mismatch.");
      return parsed;
    },
  });
  const availableStudents = students.isSuccess ? students.data.students : [];
  const availableRecipients =
    recipients.isSuccess && recipients.data.student_id === studentId
      ? recipients.data.recipients
      : [];
  const studentAvailable = availableStudents.some((s) => s.student_id === studentId);
  const recipientAvailable =
    studentAvailable && availableRecipients.some((r) => r.user_id === recipientId);
  const disabled = pending || !!saved;
  async function openChannel(result: Saved) {
    if (!scope.isCurrent() || navigationLock.current) return;
    navigationLock.current = true;
    setOpening(true);
    setError("");
    try {
      await onCreated(result.channel_id);
      if (scope.isCurrent()) onClose();
    } catch {
      if (scope.isCurrent())
        setError("Your conversation is saved. We couldn't open it. Try Open Conversation again.");
    } finally {
      navigationLock.current = false;
      if (scope.isCurrent()) setOpening(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !scope.isCurrent() ||
      lock.current ||
      savedRef.current ||
      students.isFetching ||
      recipients.isFetching ||
      !studentAvailable ||
      !recipientAvailable ||
      !title.trim() ||
      !firstMessage.trim()
    )
      return;
    lock.current = true;
    setPending(true);
    setError("");
    const input = {
      student_id: studentId,
      recipient_id: recipientId,
      title: title.trim(),
      first_message: firstMessage.trim(),
      expected_viewer_id: scope.viewerId,
    };
    try {
      const result = savedSchema.parse(await start({ data: input }));
      if (!scope.isCurrent()) return;
      if (result.student_id !== input.student_id || result.recipient_id !== input.recipient_id)
        throw new Error("Saved context mismatch.");
      savedRef.current = result;
      setSaved(result);
      // Refresh failures must not turn confirmed creation into an invitation to send again.
      void queryClient.invalidateQueries({ queryKey: ["transition-channels"] }).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: ["channel-tile-summary"] }).catch(() => {});
      await openChannel(result);
    } catch {
      if (scope.isCurrent())
        setError(
          "We couldn't confirm this conversation. Your draft is here. Check your conversations before trying again.",
        );
    } finally {
      lock.current = false;
      if (scope.isCurrent()) setPending(false);
    }
  }
  return (
    <div className="mb-4" data-testid="start-student-conversation">
      <Button
        type="button"
        variant="outline"
        disabled={pending || opening}
        onClick={() => {
          if (scope.isCurrent() && !lock.current && !navigationLock.current) onClose();
        }}
        aria-expanded={true}
      >
        <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden />
        Close new conversation
      </Button>
      <form
        onSubmit={submit}
        className="mt-3 max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <p className="text-sm text-foreground/75">
          Start a private student-team conversation with someone already connected to the same
          student. Documents are not attached or shared by starting a thread.
        </p>
        {students.isError && (
          <div role="alert" className="text-sm text-destructive">
            Could not load your student teams.{" "}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (scope.isCurrent()) void students.refetch();
              }}
            >
              Reload Student Teams
            </Button>
          </div>
        )}
        {students.isPending && <p className="text-sm">Loading student teams…</p>}
        {students.isSuccess && students.data.may_have_more && (
          <p className="text-sm text-muted-foreground">
            Up to 100 available student teams are shown. More teams may be available outside this
            list.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <div role="status" className="space-y-2 text-sm">
            <p>Your conversation and first message are saved.</p>
            <Button type="button" disabled={opening} onClick={() => void openChannel(saved)}>
              {opening ? "Opening…" : "Open Conversation"}
            </Button>
          </div>
        )}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={students.isFetching}
            onClick={() => {
              if (scope.isCurrent()) void students.refetch();
            }}
          >
            Refresh Student Teams
          </Button>
        )}
        {students.isSuccess && availableStudents.length === 0 && (
          <p className="text-sm text-foreground/75">
            No connected student team is available yet. Connect a student or accept an invitation
            first.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="channel-start-student">Student team</Label>
            <Select
              value={studentId}
              disabled={disabled || !students.isSuccess}
              onValueChange={(value) => {
                if (scope.isCurrent() && !lock.current && !savedRef.current) {
                  setStudentId(value);
                  setRecipientId("");
                }
              }}
            >
              <SelectTrigger id="channel-start-student">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {studentId && !studentAvailable && (
                  <SelectItem value={studentId}>Selected team unavailable</SelectItem>
                )}
                {availableStudents.map((student) => (
                  <SelectItem key={student.student_id} value={student.student_id}>
                    {student.student_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel-start-recipient">Teammate</Label>
            <Select
              value={recipientId}
              onValueChange={(value) => {
                if (scope.isCurrent() && !lock.current && !savedRef.current) setRecipientId(value);
              }}
              disabled={disabled || !studentAvailable || !recipients.isSuccess}
            >
              <SelectTrigger id="channel-start-recipient">
                <SelectValue placeholder="Choose a teammate" />
              </SelectTrigger>
              <SelectContent>
                {recipientId && !recipientAvailable && (
                  <SelectItem value={recipientId}>Selected teammate unavailable</SelectItem>
                )}
                {availableRecipients.map((recipient) => (
                  <SelectItem key={recipient.user_id} value={recipient.user_id}>
                    {recipient.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {studentAvailable && recipients.isSuccess && availableRecipients.length === 0 && (
              <p className="text-xs text-foreground/75">
                No other connected teammate yet. Invite someone to this student team first.
              </p>
            )}
            {studentId && !studentAvailable && (
              <p role="alert" className="text-xs">
                Your selected student team is unavailable. Reload teams or choose another team.
              </p>
            )}
            {recipientId && !recipientAvailable && (
              <p role="alert" className="text-xs">
                Your selected teammate is unavailable. Reload teammates or choose someone else.
              </p>
            )}
            {studentAvailable && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || recipients.isFetching}
                onClick={() => {
                  if (recipientsScope.isCurrent()) void recipients.refetch();
                }}
              >
                {recipients.isError ? "Reload Teammates" : "Refresh Teammates"}
              </Button>
            )}
            {recipients.isError && (
              <p role="alert" className="text-xs text-destructive">
                Could not load teammates.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="channel-start-title">Conversation title</Label>
          <Input
            id="channel-start-title"
            disabled={disabled}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            placeholder="What should this conversation cover?"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="channel-start-message">First message</Label>
          <Textarea
            id="channel-start-message"
            disabled={disabled}
            value={firstMessage}
            onChange={(event) => setFirstMessage(event.target.value)}
            maxLength={4000}
            required
            placeholder="Write your first message to this teammate"
          />
        </div>
        <Button
          type="submit"
          disabled={
            disabled ||
            students.isFetching ||
            recipients.isFetching ||
            !studentAvailable ||
            !recipientAvailable ||
            !title.trim() ||
            !firstMessage.trim()
          }
        >
          {pending ? "Starting…" : "Start and send"}
        </Button>
      </form>
    </div>
  );
}
