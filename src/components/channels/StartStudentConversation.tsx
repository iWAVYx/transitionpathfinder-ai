import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquarePlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  listStartableStudentChannels,
  listStudentChannelRecipients,
  startStudentChannel,
} from "@/lib/channels.functions";

export function StartStudentConversation({ onCreated }: { onCreated: (channelId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const queryClient = useQueryClient();
  const loadStudents = useServerFn(listStartableStudentChannels);
  const loadRecipients = useServerFn(listStudentChannelRecipients);
  const start = useServerFn(startStudentChannel);

  const students = useQuery({
    queryKey: ["channel-start-students"],
    queryFn: () => loadStudents(),
    enabled: open,
  });
  const recipients = useQuery({
    queryKey: ["channel-start-recipients", studentId],
    queryFn: () => loadRecipients({ data: { student_id: studentId } }),
    enabled: open && !!studentId,
  });
  const create = useMutation({
    mutationFn: () => start({ data: {
      student_id: studentId,
      recipient_id: recipientId,
      title: title.trim(),
      first_message: firstMessage.trim(),
    } }),
    onSuccess: ({ channel_id }) => {
      setOpen(false);
      setStudentId("");
      setRecipientId("");
      setTitle("");
      setFirstMessage("");
      queryClient.invalidateQueries({ queryKey: ["transition-channels"] });
      queryClient.invalidateQueries({ queryKey: ["channel-tile-summary"] });
      onCreated(channel_id);
      toast.success("Conversation started and your first message was sent.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId || !recipientId || !title.trim() || !firstMessage.trim() || create.isPending) return;
    create.mutate();
  }

  return (
    <div className="mb-4" data-testid="start-student-conversation">
      <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden />
        {open ? "Close new conversation" : "Start conversation"}
      </Button>
      {open && (
        <form onSubmit={submit} className="mt-3 max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground/75">
            Start a private student-team conversation with someone already connected to the same student.
            Documents are not attached or shared by starting a thread.
          </p>
          {students.isError && <p role="alert" className="text-sm text-destructive">Could not load your student teams.</p>}
          {!students.isLoading && students.data?.students.length === 0 && (
            <p className="text-sm text-foreground/75">
              No connected student team is available yet. Connect a student or accept an invitation first.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="channel-start-student">Student team</Label>
              <Select value={studentId} onValueChange={(value) => { setStudentId(value); setRecipientId(""); }}>
                <SelectTrigger id="channel-start-student"><SelectValue placeholder="Choose a student" /></SelectTrigger>
                <SelectContent>
                  {(students.data?.students ?? []).map((student) => (
                    <SelectItem key={student.student_id} value={student.student_id}>{student.student_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="channel-start-recipient">Teammate</Label>
              <Select value={recipientId} onValueChange={setRecipientId} disabled={!studentId || recipients.isLoading}>
                <SelectTrigger id="channel-start-recipient"><SelectValue placeholder="Choose a teammate" /></SelectTrigger>
                <SelectContent>
                  {(recipients.data?.recipients ?? []).map((recipient) => (
                    <SelectItem key={recipient.user_id} value={recipient.user_id}>{recipient.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {studentId && !recipients.isLoading && recipients.data?.recipients.length === 0 && (
                <p className="text-xs text-foreground/75">No other connected teammate yet. Invite someone to this student team first.</p>
              )}
              {recipients.isError && <p role="alert" className="text-xs text-destructive">Could not load teammates.</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel-start-title">Conversation title</Label>
            <Input id="channel-start-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder="What should this conversation cover?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel-start-message">First message</Label>
            <Textarea id="channel-start-message" value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} maxLength={4000} required placeholder="Write your first message to this teammate" />
          </div>
          <Button type="submit" disabled={create.isPending || !studentId || !recipientId || !title.trim() || !firstMessage.trim()}>
            {create.isPending ? "Starting…" : "Start and send"}
          </Button>
        </form>
      )}
    </div>
  );
}
