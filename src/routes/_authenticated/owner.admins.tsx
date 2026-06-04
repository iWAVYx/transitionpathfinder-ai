import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Shield,
  Mail,
  Copy,
  Check,
  Trash2,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
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
  ownerListAdminUsers,
  ownerListAdminInvitations,
  ownerCreateAdminInvitation,
  ownerRevokeAdminInvitation,
  ownerRemoveAdminRole,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLES,
  type AdminUserSummary,
  type AdminInvitation,
  type AdminRole,
} from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/admins")({
  head: () => ({ meta: [{ title: "Admin users — Admin Hub" }] }),
  component: AdminUsersPage,
});

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/admin-invite/${token}`;
  return `${window.location.origin}/admin-invite/${token}`;
}

function AdminUsersPage() {
  const listUsers = useServerFn(ownerListAdminUsers);
  const listInvites = useServerFn(ownerListAdminInvitations);
  const createInvite = useServerFn(ownerCreateAdminInvitation);
  const revokeInvite = useServerFn(ownerRevokeAdminInvitation);
  const removeRole = useServerFn(ownerRemoveAdminRole);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("content_manager");
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [u, i] = await Promise.all([listUsers(), listInvites()]);
    setUsers(u.users);
    setInvitations(i.invitations);
  }, [listUsers, listInvites]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const result = await createInvite({
        data: { email: email.trim(), role },
      });
      const { invitation, email: emailResult } = result;
      const url = inviteUrl(invitation.token);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* clipboard unavailable */
      }
      if (emailResult?.status === "sent") {
        toast.success(`Invitation emailed to ${invitation.email} — link also copied.`);
      } else if (emailResult?.status === "failed") {
        toast.warning(
          `Invitation created and link copied, but email failed to send${emailResult.error ? `: ${emailResult.error}` : "."}`,
        );
      } else {
        toast.success("Invitation created — link copied to clipboard.");
      }
      setEmail("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCopy = async (inv: AdminInvitation) => {
    const url = inviteUrl(inv.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((id) => (id === inv.id ? null : id)), 1500);
    } catch {
      toast.error("Couldn't copy link.");
    }
  };

  const onMail = (inv: AdminInvitation) => {
    const url = inviteUrl(inv.token);
    const subject = encodeURIComponent("You're invited to the TransitionForward Admin Hub");
    const body = encodeURIComponent(
      `You've been invited as ${ADMIN_ROLE_LABELS[inv.role]} on the TransitionForward Admin Hub.\n\nAccept your invitation here:\n${url}\n\nThis link expires ${new Date(inv.expires_at).toLocaleDateString()}.`,
    );
    window.location.href = `mailto:${inv.email}?subject=${subject}&body=${body}`;
  };

  const onRevoke = async (inv: AdminInvitation) => {
    if (!confirm(`Revoke invitation for ${inv.email}?`)) return;
    try {
      await revokeInvite({ data: { id: inv.id } });
      toast.success("Invitation revoked.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't revoke.");
    }
  };

  const onRemoveRole = async (u: AdminUserSummary, r: AdminRole) => {
    if (
      !confirm(
        `Remove ${ADMIN_ROLE_LABELS[r]} from ${u.email || u.full_name || "this user"}?`,
      )
    )
      return;
    try {
      await removeRole({ data: { user_id: u.user_id, role: r } });
      toast.success("Role removed.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove role.");
    }
  };

  const pending = invitations.filter((i) => i.status === "pending");
  const past = invitations.filter((i) => i.status !== "pending");

  return (
    <OwnerShell
      title="Admin users"
      description="Invite teammates to the Admin Hub and manage who has access."
    >
      {/* Invite form */}
      <div className="rounded-lg border border-border bg-background p-5">
        <h2 className="text-sm font-semibold">Invite a new admin</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          We'll generate a one-time invitation link. The invitee must sign in (or sign up) with the
          invited email address to accept.
        </p>
        <form
          onSubmit={onInvite}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr,200px,auto] sm:items-end"
        >
          <div>
            <Label htmlFor="invite-email" className="text-xs">
              Email
            </Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <Label htmlFor="invite-role" className="text-xs">
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ADMIN_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send invitation
              </>
            )}
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Pending invitations */}
          {pending.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pending invitations
              </div>
              <ul className="divide-y divide-border">
                {pending.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{inv.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {ADMIN_ROLE_LABELS[inv.role]} · invited{" "}
                        {new Date(inv.invited_at).toLocaleDateString()} · expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onCopy(inv)}>
                      {copiedId === inv.id ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onMail(inv)}>
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onRevoke(inv)}>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" /> Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current admins */}
          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background">
            <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active admins
            </div>
            {users.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No admin users yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Admin roles</th>
                    <th className="px-4 py-2.5 font-medium">Granted</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.user_id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <div>
                            <div className="font-medium">{u.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.email || u.user_id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {u.admin_roles.map((r) => (
                            <Badge key={r} variant="secondary" className="gap-1">
                              {ADMIN_ROLE_LABELS[r]}
                              <button
                                type="button"
                                onClick={() => onRemoveRole(u, r)}
                                className="ml-0.5 text-muted-foreground hover:text-destructive"
                                aria-label={`Remove ${ADMIN_ROLE_LABELS[r]}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {u.granted_at ? new Date(u.granted_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* History */}
          {past.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Invitation history
              </div>
              <ul className="divide-y divide-border">
                {past.slice(0, 25).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{inv.email}</span>
                    <span className="text-xs">{ADMIN_ROLE_LABELS[inv.role]}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {inv.status}
                    </Badge>
                    <span className="ml-auto text-xs">
                      {new Date(inv.invited_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </OwnerShell>
  );
}
