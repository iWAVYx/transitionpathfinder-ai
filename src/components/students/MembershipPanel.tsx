import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, GraduationCap, ShieldCheck, Mail, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listStudentMembership,
  updateGuardian,
  deleteGuardian,
  updateTeamMember,
  deleteTeamMember,
  type Guardian,
  type TeamMember,
} from "@/lib/student-membership.functions";

const TEAM_ROLES = [
  "teacher",
  "case_manager",
  "educator",
  "school_admin",
  "admin",
  "partner",
  "other",
] as const;

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MembershipPanel({ studentId }: { studentId: string }) {
  const fetchMembership = useServerFn(listStudentMembership);
  const saveGuardian = useServerFn(updateGuardian);
  const removeGuardian = useServerFn(deleteGuardian);
  const saveTeam = useServerFn(updateTeamMember);
  const removeTeam = useServerFn(deleteTeamMember);

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMembership({ data: { student_id: studentId } });
      setGuardians(res.guardians);
      setTeam(res.team);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [fetchMembership, studentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function startEditGuardian(g: Guardian) {
    setEditingId(g.id);
    setDraft({
      relationship: g.relationship ?? "",
      is_primary: g.is_primary,
      verified: g.verified,
    });
  }
  function startEditTeam(t: TeamMember) {
    setEditingId(t.id);
    setDraft({ role_on_team: t.role_on_team, status: t.status });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function commitGuardian(id: string) {
    setSavingId(id);
    try {
      await saveGuardian({
        data: {
          id,
          relationship: (draft.relationship as string) || undefined,
          is_primary: draft.is_primary as boolean,
          verified: draft.verified as boolean,
        },
      });
      toast.success("Guardian updated.");
      cancelEdit();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function commitTeam(id: string) {
    setSavingId(id);
    try {
      await saveTeam({
        data: {
          id,
          role_on_team: draft.role_on_team as never,
          status: draft.status as never,
        },
      });
      toast.success("Team member updated.");
      cancelEdit();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemoveGuardian(id: string) {
    if (!confirm("Remove this guardian from the student?")) return;
    try {
      await removeGuardian({ data: { id } });
      toast.success("Guardian removed.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed.");
    }
  }
  async function handleRemoveTeam(id: string) {
    if (!confirm("Remove this team member from the student?")) return;
    try {
      await removeTeam({ data: { id } });
      toast.success("Team member removed.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed.");
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div>
        <h2 className="font-display text-2xl">Student membership</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guardians and team members assigned to this student. Click edit to
          update roles or toggle primary/verified flags.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Guardians
            <span className="text-xs font-normal text-muted-foreground">
              ({guardians.length})
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : guardians.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guardians yet.</p>
          ) : (
            <ul className="space-y-2">
              {guardians.map((g) => {
                const isEditing = editingId === g.id;
                return (
                  <li key={g.id} className="rounded-xl border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {g.full_name || g.guardian_email}
                      </span>
                      {!isEditing && (
                        <div className="flex items-center gap-1 text-xs">
                          {g.is_primary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                              Primary
                            </span>
                          )}
                          {g.verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {g.guardian_email}
                      </span>
                      {!isEditing && g.relationship && (
                        <span>{titleCase(g.relationship)}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <Label className="text-xs">Relationship</Label>
                          <Input
                            value={(draft.relationship as string) ?? ""}
                            onChange={(e) =>
                              setDraft({ ...draft, relationship: e.target.value })
                            }
                            placeholder="parent, guardian, grandparent…"
                            className="mt-1 h-8"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Primary contact</Label>
                          <Switch
                            checked={!!draft.is_primary}
                            onCheckedChange={(v) => setDraft({ ...draft, is_primary: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Verified</Label>
                          <Switch
                            checked={!!draft.verified}
                            onCheckedChange={(v) => setDraft({ ...draft, verified: v })}
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => commitGuardian(g.id)}
                            disabled={savingId === g.id}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {savingId === g.id ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEditGuardian(g)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveGuardian(g.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="h-4 w-4 text-primary" />
            Team members
            <span className="text-xs font-normal text-muted-foreground">
              ({team.length})
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <ul className="space-y-2">
              {team.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <li key={t.id} className="rounded-xl border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {t.full_name || t.member_email}
                      </span>
                      {!isEditing && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {titleCase(t.role_on_team)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {t.member_email}
                      </span>
                      {!isEditing && t.status && t.status !== "active" && (
                        <span>{titleCase(t.status)}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <Label className="text-xs">Role on team</Label>
                          <Select
                            value={(draft.role_on_team as string) ?? t.role_on_team}
                            onValueChange={(v) => setDraft({ ...draft, role_on_team: v })}
                          >
                            <SelectTrigger className="mt-1 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEAM_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {titleCase(r)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={(draft.status as string) ?? t.status}
                            onValueChange={(v) => setDraft({ ...draft, status: v })}
                          >
                            <SelectTrigger className="mt-1 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => commitTeam(t.id)}
                            disabled={savingId === t.id}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {savingId === t.id ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEditTeam(t)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveTeam(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
