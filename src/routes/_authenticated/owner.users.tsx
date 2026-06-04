import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Users as UsersIcon, Shield } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { platformListUsers, type PlatformUserRow } from "@/lib/owner/platform-admin.functions";

export const Route = createFileRoute("/_authenticated/owner/users")({
  head: () => ({ meta: [{ title: "Users — Admin Hub" }] }),
  component: UsersPage,
});

function UsersPage() {
  const list = useServerFn(platformListUsers);
  const [users, setUsers] = useState<PlatformUserRow[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setUsers(null);
    const t = setTimeout(() => {
      list({ data: { search: search || undefined } })
        .then((r) => setUsers(r.users))
        .catch(() => setUsers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search, list]);

  return (
    <OwnerShell
      title="Users"
      description="All accounts on the platform with their roles."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by email or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {users && (
          <span className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? "user" : "users"}
          </span>
        )}
      </div>

      {users === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <UsersIcon className="mx-auto mb-2 h-6 w-6" />
          No users found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Roles</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? u.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {u.admin_roles.map((r) => (
                        <Badge key={r} className="bg-primary/10 text-primary hover:bg-primary/10">
                          <Shield className="mr-1 h-3 w-3" />
                          {r.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="capitalize">
                          {r.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {u.roles.length === 0 && u.admin_roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OwnerShell>
  );
}
