import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { listProgress, upsertProgress, type ProgressRow } from "@/lib/progress.functions";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/use-auth";
import { PHASES, FLAT, PATHWAY_ID } from "@/lib/transition-roadmap";

export function PathwayProgress({ studentId }: { studentId: string }) {
  const { user, loading } = useAuth(); if (loading || !user?.id) return null;
  return <RoadmapSession key={`${user.id}:${studentId}`} studentId={studentId} viewerId={user.id} />;
}
function RoadmapSession({ studentId, viewerId }: { studentId: string; viewerId: string }) {
  const fetchProgress = useServerFn(listProgress); const save = useServerFn(upsertProgress);
  const [rows, setRows] = useState<ProgressRow[] | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false);
  const [canEdit, setCanEdit] = useState(false); const [needsRefresh, setNeedsRefresh] = useState(false);
  const session = useRef({ alive: true, load: 0, saving: false });
  async function reload() {
    const current = session.current, serial = ++current.load; setLoading(true); setLoadError(false);
    try {
      const result = await fetchProgress({ data: { student_id: studentId, pathway_id: PATHWAY_ID, expected_viewer_id: viewerId } });
      if (!current.alive || serial !== current.load) return;
      setRows(result.progress); setCanEdit(result.can_edit); setNeedsRefresh(false);
      setDrafts(Object.fromEntries(result.progress.map(row => [row.step_index, row.note ?? ""])));
    } catch { if (current.alive && serial === current.load) { setLoadError(true); setCanEdit(false); setNeedsRefresh(true); } }
    finally { if (current.alive && serial === current.load) setLoading(false); }
  }
  useEffect(() => { const current = session.current; current.alive = true; void reload();
    return () => { current.alive = false; current.load++; };
    // The keyed session fixes viewer/student identity for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const byStep = new Map((rows ?? []).map(row => [row.step_index, row]));
  async function persist(step_index: number, completed: boolean, announce: boolean) {
    const current = session.current;
    if (current.saving || loading || loadError || needsRefresh || !canEdit || rows === null) return;
    current.saving = true; setSavingIdx(step_index); const existing = byStep.get(step_index);
    try {
      const result = await save({ data: { student_id: studentId, pathway_id: PATHWAY_ID, expected_viewer_id: viewerId,
        step_index, completed, note: drafts[step_index] ?? null, expected: existing ? { id: existing.id, updated_at: existing.updated_at } : null } });
      if (!current.alive) return;
      setRows(previous => [...(previous ?? []).filter(row => row.step_index !== step_index), result.row]);
      setDrafts(previous => ({ ...previous, [step_index]: result.row.note ?? "" }));
      if (announce) toast.success("Note saved.");
    } catch { if (current.alive) { setNeedsRefresh(true); toast.error("We couldn't confirm this update. Refresh saved progress before another change."); } }
    finally { if (current.alive) { current.saving = false; setSavingIdx(null); } }
  }
  const ready = rows !== null && !loading && !loadError;
  const disabled = savingIdx !== null || !canEdit || needsRefresh;

  const completed = FLAT.filter((m) => byStep.get(m.step_index)?.completed).length;
  const total = FLAT.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Transition Roadmap</h2>
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A shared checklist for the years leading up to graduation. Mark milestones as you go and
            leave notes for the team.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl">{ready ? `${pct}%` : "—"}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {ready ? `${completed} of ${total} complete` : "Saved progress unavailable"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ready ? pct : 0}%` }} />
      </div>

      {loading && (
        <p className="mt-6 text-sm text-muted-foreground">Loading roadmap…</p>
      )}

      {(loadError || needsRefresh) && <div className="mt-4 text-sm" role="status">
        Refresh saved progress to confirm your access and the latest changes.
        <Button size="sm" variant="outline" className="ml-2" disabled={loading || savingIdx !== null} onClick={() => void reload()}>Refresh Saved Progress</Button>
      </div>}
      {ready && !canEdit && <p className="mt-4 text-sm text-muted-foreground">You can view this roadmap. Editing requires student-team permission.</p>}
      {ready && (
        <div className="mt-6 space-y-6">
          {PHASES.map((phase, pi) => (
            <div key={phase.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {phase.label}
              </p>
              <ul className="mt-3 space-y-2">
                {phase.milestones.map((m, mi) => {
                  const step_index = pi * 100 + mi;
                  const row = byStep.get(step_index);
                  const checked = row?.completed ?? false;
                  return (
                    <li
                      key={step_index}
                      className="rounded-xl border bg-background p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={m.title}
                          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => void persist(step_index, e.target.checked, false)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : ""}`}>
                            {m.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                          <textarea
                            placeholder="Add a note (who, when, what worked)…"
                            rows={2}
                            maxLength={1000}
                            readOnly={!canEdit}
                            disabled={savingIdx !== null || needsRefresh}
                            aria-label={`Note: ${m.title}`}
                            className="mt-3 w-full resize-y rounded-md border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={drafts[step_index] ?? ""}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [step_index]: e.target.value }))
                            }
                          />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground">
                              {row?.updated_at
                                ? `Updated ${new Date(row.updated_at).toLocaleDateString()}`
                                : "Not started"}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={disabled || (drafts[step_index] ?? "") === (row?.note ?? "")}
                              onClick={() => void persist(step_index, row?.completed ?? false, true)}
                            >
                              {savingIdx === step_index ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                                </>
                              ) : (
                                "Save note"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
