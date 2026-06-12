import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { listStudentAuditTrail, type AuditEntry } from "@/lib/audit.functions";

type Props = { studentId: string };

/**
 * Collapsed audit-trail panel for the student profile. Lists permission grants,
 * document views, rights status changes, and other sensitive actions. Editors
 * use this to review who touched what — exactly the kind of trail FERPA-style
 * record handling expects.
 */
export function AuditTrailPanel({ studentId }: Props) {
  const fetchTrail = useServerFn(listStudentAuditTrail);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!open || entries.length > 0) return;
    setLoading(true);
    void fetchTrail({ data: { student_id: studentId, limit: 50 } })
      .then((r) => setEntries(r.entries))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, studentId, fetchTrail, entries.length]);

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl">Audit trail</h2>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Permission grants, document views, and rights-status changes for this student.
      </p>

      {open && (
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sensitive activity recorded yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border text-sm">
              {entries.map((e) => (
                <li key={e.id} className="px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{e.action}</span>
                    <time className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.entity_type}
                    {e.actor_email ? ` · by ${e.actor_email}` : e.actor_id ? ` · actor ${e.actor_id.slice(0, 8)}…` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
