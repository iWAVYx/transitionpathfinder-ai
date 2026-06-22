import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mail, Send, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inviteCollaborator,
  listCollaborators,
  resendCollaboratorInvite,
  type Collaborator,
} from "@/lib/collaborators.functions";

type Mode = "co-parent" | "educator";

/**
 * Parent-dashboard "Invite People" card — one-click flows for Co-Parent
 * and Educator. Reuses student_collaborators.
 *
 * Co-Parent → editor (full collaborate); Educator → viewer (read-only by
 * default; owner can promote later from the student hub).
 */
export function InvitePeopleCard({
  studentId,
  studentFirstName,
}: {
  studentId: string;
  studentFirstName: string | null;
}) {
  const list = useServerFn(listCollaborators);
  const invite = useServerFn(inviteCollaborator);
  const resend = useServerFn(resendCollaboratorInvite);

  const [pending, setPending] = useState<Collaborator[]>([]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function reload() {
    try {
      const { collaborators } = await list({ data: { student_id: studentId } });
      setPending(collaborators.filter((c) => c.status === "pending"));
    } catch {
      // ignore — keep prior state
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!mode || !email.trim()) return;
    setSending(true);
    try {
      await invite({
        data: {
          student_id: studentId,
          email: email.trim(),
          role: mode === "co-parent" ? "editor" : "viewer",
        },
      });
      toast.success(
        mode === "co-parent" ? "Co-parent invited." : "Educator invited.",
      );
      setEmail("");
      setMode(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setSending(false);
    }
  }

  async function handleResend(id: string) {
    setResendingId(id);
    try {
      await resend({ data: { id } });
      toast.success("Invite email resent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend.");
    } finally {
      setResendingId(null);
    }
  }

  const nameLabel = studentFirstName ? `${studentFirstName}'s team` : "this student's team";

  return (
    <section
      aria-labelledby="invite-people-heading"
      className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Invite People
          </p>
          <h2
            id="invite-people-heading"
            className="mt-1 font-display text-xl font-medium tracking-tight"
          >
            Bring others into {nameLabel}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Add a co-parent so they can update the plan with you, or an
            educator so they can read the Pathway Report and coordinate on
            meetings.
          </p>
        </div>
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
        >
          <Users className="h-5 w-5" />
        </div>
      </div>

      {mode === null ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => setMode("co-parent")}
          >
            <UserPlus className="h-4 w-4" /> Invite Co-Parent
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => setMode("educator")}
          >
            <UserPlus className="h-4 w-4" /> Invite Educator
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSend} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="invite-email" className="text-xs uppercase tracking-wider">
              {mode === "co-parent" ? "Co-parent's email" : "Educator's email"}
            </Label>
            <Input
              id="invite-email"
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1"
              maxLength={255}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "co-parent"
                ? "Co-parents can edit the plan, goals, and documents."
                : "Educators get read access — you can promote to editor anytime."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send invite
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(null);
                setEmail("");
              }}
              disabled={sending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {pending.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pending invites
          </p>
          <ul className="mt-2 space-y-2">
            {pending.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.invited_email}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {c.role}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResend(c.id)}
                  disabled={resendingId === c.id}
                >
                  {resendingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Resend
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
