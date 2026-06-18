import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, Loader2, Shield, User } from "lucide-react";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
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
import {
  inviteSchoolTeammate,
  updateMembershipStatus,
} from "@/lib/school-admin.functions";

export const Route = createFileRoute("/_authenticated/school/team")({
  head: () => ({ meta: [{ title: "Staff & Team — TransitionForward" }] }),
  component: SchoolTeamPage,
});

function SchoolTeamPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/team"
      title="Staff & Team"
      subtitle="Add educators and case managers to your school, set their roles, and manage access."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {(org, d) => <TeamPanel orgId={org.id} members={d.members} pending={d.pending_members} onChanged={() => reload(org.id)} />}
    </SchoolPageShell>
  );
}

function TeamPanel({
  orgId,
  members,
  pending,
  onChanged,
}: {
  orgId: string;
  members: Array<{ membership_id: string; full_name: string | null; email: string | null; role_within_org: string; primary_role: string | null; joined_at: string }>;
  pending: Array<{ membership_id: string; full_name: string | null; email: string | null; role_within_org: string }>;
  onChanged: () => void;
}) {
  const invite = useServerFn(inviteSchoolTeammate);
  const updateMember = useServerFn(updateMembershipStatus);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "school_admin">("member");
  const [sending, setSending] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await invite({ data: { organization_id: orgId, email: email.trim(), role_within_org: role } });
      toast.success("Teammate added.");
      setEmail("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add teammate.");
    } finally {
      setSending(false);
    }
  }

  async function handleRemove(membership_id: string) {
    if (!confirm("Remove this teammate?")) return;
    try {
      await updateMember({ data: { membership_id, status: "removed" } });
      toast.success("Teammate removed.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove.");
    }
  }

  async function handleRoleChange(membership_id: string, next: string) {
    try {
      await updateMember({ data: { membership_id, role_within_org: next as "member" | "admin" | "school_admin" } });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg">Add a Teammate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The person must already have a TransitionForward account. They'll get access to org-scoped views.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="grid min-w-[260px] flex-1 gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.org" required />
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="school_admin">School Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={sending || !email.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add Teammate
          </Button>
        </div>
      </form>

      {pending.length > 0 && (
        <div className="rounded-2xl border bg-card shadow-soft">
          <div className="border-b px-5 py-3 text-sm font-medium">Pending ({pending.length})</div>
          <ul className="divide-y">
            {pending.map((m) => (
              <li key={m.membership_id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>{m.full_name ?? m.email ?? "—"}</span>
                <Button size="sm" variant="outline" onClick={() => updateMember({ data: { membership_id: m.membership_id, status: "active" } }).then(onChanged)}>
                  Approve
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="border-b px-5 py-3 text-sm font-medium">Active Team ({members.length})</div>
        {members.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No teammates yet. Add educators and case managers above.
          </p>
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.membership_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {m.role_within_org === "school_admin" || m.role_within_org === "admin" || m.role_within_org === "owner" ? (
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {m.full_name ?? m.email ?? "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.email ?? ""} {m.primary_role ? `· ${m.primary_role}` : ""} · joined {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={m.role_within_org} onValueChange={(v) => handleRoleChange(m.membership_id, v)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="school_admin">School Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(m.membership_id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
