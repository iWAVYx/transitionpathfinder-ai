import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Shield } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import {
  ownerListAdminUsers,
  ADMIN_ROLE_LABELS,
  type AdminUserSummary,
} from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/admins")({
  head: () => ({ meta: [{ title: "Admin users — Admin Hub" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const list = useServerFn(ownerListAdminUsers);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list()
      .then((r) => setUsers(r.users))
      .finally(() => setLoading(false));
  }, []);

  return (
    <OwnerShell
      title="Admin Hub users"
      description="People who can access the TransitionForward Admin Hub. Granting and revoking is coming in Phase 2."
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No admin users yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Admin roles</th>
                  <th className="px-4 py-2.5 font-medium">Granted</th>
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
                          <Badge key={r} variant="secondary">
                            {ADMIN_ROLE_LABELS[r]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {u.granted_at ? new Date(u.granted_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </OwnerShell>
  );
}
