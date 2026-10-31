import { useEffect, useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { listStudentAuditTrail, type AuditEntry } from "@/lib/audit.functions";

import { actorLabel, humanizeAction } from "@/lib/history-display";

type Props = { studentId: string };

/** Recent caller-visible activity on the existing student profile. */
export function AuditTrailPanel({ studentId }: Props) {
  return <AuditTrailReader key={studentId} studentId={studentId} />;
}

function AuditTrailReader({ studentId }: Props) {
  const fetchTrail = useServerFn(listStudentAuditTrail);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const contentId = useId();

  useEffect(() => {
    if (!open || !studentId) return;
    let cancelled = false;
    setEntries([]);
    setFailed(false);
    setLoading(true);
    void (async () => {
      try {
        const result = await fetchTrail({ data: { student_id: studentId, limit: 50 } });
        if (!cancelled) setEntries(result.entries);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, studentId, fetchTrail, attempt]);

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6 shadow-soft">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => {
          setEntries([]);
          setFailed(false);
          setLoading(true);
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl">Audit Trail</h2>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Recent recorded activity available to you for this student. Up to 50 records; this is not a
        complete activity archive.
      </p>

      <div id={contentId} hidden={!open} className="mt-4">
        {open && (
          <>
            {!studentId ? (
              <p className="text-sm text-muted-foreground">Choose a student to review activity.</p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : failed ? (
              <div role="alert" className="text-sm">
                <p>Activity could not be loaded. Please try again.</p>
                <button
                  type="button"
                  className="mt-2 underline"
                  onClick={() => {
                    setFailed(false);
                    setLoading(true);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Retry
                </button>
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity is available in this view.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border text-sm">
                {entries.map((e) => (
                  <li key={e.id} className="px-3 py-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{humanizeAction(e)}</span>
                      <time className="text-xs text-muted-foreground">
                        {Number.isNaN(Date.parse(e.created_at))
                          ? "Recorded time unavailable"
                          : new Date(e.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-xs text-muted-foreground">Recorded by {actorLabel(e)}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
