import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, Users, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listCollaborators,
  inviteCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  type Collaborator,
} from "@/lib/collaborators.functions";

export function CollaboratorsPanel({ studentId }: { studentId: string }) {
  const fetchList = useServerFn(listCollaborators);
  const invite = useServerFn(inviteCollaborator);
  const updateRole = useServerFn(updateCollaboratorRole);
  const remove = useServerFn(removeCollaborator);

  const [rows, setRows] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      const { collaborators } = await fetchList({ data: { student_id: studentId } });
      setRows(collaborators);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await invite({ data: { student_id: studentId, email: email.trim(), role } });
      toast.success(`Invited ${email}.`);
      setEmail("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setSending(false);
    }
  }

  async function handleRoleChange(id: string, next: "viewer" | "editor") {
    await updateRole({ data: { id, role: next } });
    await reload();
  }

  async function handleRemove(c: Collaborator) {
    if (!confirm(`Remove ${c.invited_email} from this student?`)) return;
    await remove({ data: { id: c.id } });
    await reload();
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Collaborators</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite a co-parent, teacher, or case manager. Editors can update goals and documents;
            viewers can only read.
          </p>
        </div>
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>

      <form
        onSubmit={handleInvite}
        className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3"
      >
        <Input
          type="email"
          required
          placeholder="name@school.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[220px] flex-1"
        />
        <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Invite
            </>
          )}
        </Button>
      </form>

      <ul className="mt-5 divide-y rounded-xl border">
        {loading ? (
          <li className="p-6 text-center text-sm text-muted-foreground">Loading…</li>
        ) : rows.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">
            No collaborators yet. Invite someone above.
          </li>
        ) : (
          rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.invited_email}</p>
                <p className="text-xs text-muted-foreground">
                  {c.status === "accepted" ? "Active" : "Pending"} ·{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={c.role}
                  onValueChange={(v) => handleRoleChange(c.id, v as "viewer" | "editor")}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(c)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
