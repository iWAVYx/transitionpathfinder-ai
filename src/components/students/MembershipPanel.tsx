import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, GraduationCap, ShieldCheck, Mail } from "lucide-react";
import {
  listStudentMembership,
  type Guardian,
  type TeamMember,
} from "@/lib/student-membership.functions";

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MembershipPanel({ studentId }: { studentId: string }) {
  const fetchMembership = useServerFn(listStudentMembership);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMembership({ data: { student_id: studentId } })
      .then((res) => {
        if (cancelled) return;
        setGuardians(res.guardians);
        setTeam(res.team);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchMembership]);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Student membership</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Guardians and team members assigned to this student. Rows are added
            automatically when someone creates or joins the plan.
          </p>
        </div>
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
              {guardians.map((g) => (
                <li
                  key={g.id}
                  className="rounded-xl border bg-background p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {g.full_name || g.guardian_email}
                    </span>
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
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {g.guardian_email}
                    </span>
                    {g.relationship && <span>{titleCase(g.relationship)}</span>}
                  </div>
                </li>
              ))}
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
              {team.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border bg-background p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {t.full_name || t.member_email}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {titleCase(t.role_on_team)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {t.member_email}
                    </span>
                    {t.status && t.status !== "active" && (
                      <span>{titleCase(t.status)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
