import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Users, Mail } from "lucide-react";

import {
  DistrictPageShell,
  useDistrictDashboard,
} from "@/components/district/DistrictPageShell";
import { inviteDistrictTeammate } from "@/lib/district-admin.functions";
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

export const Route = createFileRoute("/_authenticated/district/team")({
  head: () => ({ meta: [{ title: "District Team — TransitionForward" }] }),
  component: withRoleGuard(["district_admin", "admin"], DistrictTeamPage),
});

function DistrictTeamPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/team"
      title="People &amp; Access"
      subtitle="Invite school administrators and educators, assign roles, and manage district-level access."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(district, d) => (
        <TeamBody districtId={district.id} dashboard={d} onChanged={reload} />
      )}
    </DistrictPageShell>
  );
}

function TeamBody({
  districtId,
  dashboard,
  onChanged,
}: {
  districtId: string;
  dashboard: ReturnType<typeof useDistrictDashboard>["data"] & object;
  onChanged: (id?: string) => void;
}) {
  const invite = useServerFn(inviteDistrictTeammate);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "district_admin">(
    "member",
  );
  const [saving, setSaving] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await invite({
        data: {
          district_id: districtId,
          email: email.trim().toLowerCase(),
          role_within_org: role,
        },
      });
      toast.success("Teammate added.");
      setEmail("");
      onChanged(districtId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg">Add District Staff</h2>
        <p className="text-sm text-muted-foreground">
          District staff can view aggregate progress, manage connected schools,
          and oversee implementation. Platform Admin access is granted
          separately by TransitionForward and cannot be assigned here.
        </p>
        <form
          onSubmit={handleInvite}
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto]"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="leader@district.edu"
              required
              maxLength={255}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Staff Member</SelectItem>
                <SelectItem value="admin">District Admin</SelectItem>
                <SelectItem value="district_admin">
                  District Administrator
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving || !email.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Invite
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          The user must already have a TransitionForward account. Ask them to
          sign up first if needed.
        </p>
      </div>

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="border-b p-5">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <Users className="h-4 w-4" /> District Team
          </h2>
          <p className="text-sm text-muted-foreground">
            {dashboard.team.length} active ·{" "}
            {dashboard.pending_team.length} pending
          </p>
        </div>
        {dashboard.team.length === 0 && dashboard.pending_team.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No teammates yet — invite your first colleague above.
          </div>
        ) : (
          <ul className="divide-y">
            {[...dashboard.team, ...dashboard.pending_team].map((m) => (
              <li
                key={m.membership_id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <div className="font-medium">
                    {m.full_name ?? m.email ?? "Unknown user"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {m.email}
                      </span>
                    )}
                    {m.primary_role && (
                      <span className="ml-3 capitalize">
                        {m.primary_role.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {labelFor(m.role_within_org)}
                  </span>
                  <span
                    className={
                      m.status === "active"
                        ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
                        : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                    }
                  >
                    {m.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function labelFor(role: string): string {
  switch (role) {
    case "district_admin":
      return "District Administrator";
    case "admin":
      return "Admin";
    case "owner":
      return "Owner";
    case "school_admin":
      return "School Admin";
    default:
      return "Staff";
  }
}
