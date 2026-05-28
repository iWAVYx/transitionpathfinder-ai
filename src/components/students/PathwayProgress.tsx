import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { listProgress, upsertProgress, type ProgressRow } from "@/lib/progress.functions";
import { Button } from "@/components/ui/button";

const PATHWAY_ID = "transition-roadmap-v1";

type Milestone = { title: string; description: string };
type Phase = { id: string; label: string; milestones: Milestone[] };

const PHASES: Phase[] = [
  {
    id: "discover",
    label: "Discover (9th–10th grade)",
    milestones: [
      { title: "Complete a strengths & interests inventory", description: "Use a tool like the O*NET Interest Profiler with the student." },
      { title: "Identify 2–3 possible career pathways", description: "Talk about what they love, then connect it to real roles." },
      { title: "Build a circle of support", description: "List trusted adults at home, at school, and in the community." },
    ],
  },
  {
    id: "explore",
    label: "Explore (10th–11th grade)",
    milestones: [
      { title: "Job shadow or informational interview", description: "Even an hour with someone in a related role builds confidence." },
      { title: "Try a community-based experience", description: "Volunteering, club, or part-time job aligned to their interests." },
      { title: "Practice self-advocacy in a PPT meeting", description: "Help the student lead one section of their own meeting." },
    ],
  },
  {
    id: "prepare",
    label: "Prepare (11th–12th grade)",
    milestones: [
      { title: "Connect with Bureau of Rehabilitation Services (BRS)", description: "Open a case ahead of graduation to unlock adult supports." },
      { title: "Tour post-secondary options", description: "Community college, CT technical school, supported employment, or a transition program." },
      { title: "Draft a one-page transition portfolio", description: "Strengths, supports that work, goals, and contact info on a single page." },
    ],
  },
  {
    id: "launch",
    label: "Launch (12th grade & beyond)",
    milestones: [
      { title: "Confirm transportation plan", description: "Bus pass, paratransit, ride share, or family driver — written down." },
      { title: "Set up adult healthcare & benefits", description: "Insurance transition, doctors, and any benefits like SSI if eligible." },
      { title: "First 90 days plan after graduation", description: "Daily schedule, who checks in, and what success looks like." },
    ],
  },
];

const FLAT = PHASES.flatMap((p, pi) =>
  p.milestones.map((m, mi) => ({ phaseId: p.id, phaseLabel: p.label, ...m, step_index: pi * 100 + mi })),
);

export function PathwayProgress({ studentId }: { studentId: string }) {
  const fetchProgress = useServerFn(listProgress);
  const save = useServerFn(upsertProgress);

  const [rows, setRows] = useState<ProgressRow[] | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  async function reload() {
    const { progress } = await fetchProgress({
      data: { student_id: studentId, pathway_id: PATHWAY_ID },
    });
    setRows(progress);
    const d: Record<number, string> = {};
    for (const r of progress) if (r.note) d[r.step_index] = r.note;
    setDrafts(d);
  }

  useEffect(() => {
    reload().catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const byStep = new Map((rows ?? []).map((r) => [r.step_index, r]));

  async function toggle(step_index: number, completed: boolean) {
    setSavingIdx(step_index);
    try {
      await save({
        data: {
          student_id: studentId,
          pathway_id: PATHWAY_ID,
          step_index,
          completed,
          note: drafts[step_index] ?? null,
        },
      });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSavingIdx(null);
    }
  }

  async function saveNote(step_index: number) {
    const existing = byStep.get(step_index);
    setSavingIdx(step_index);
    try {
      await save({
        data: {
          student_id: studentId,
          pathway_id: PATHWAY_ID,
          step_index,
          completed: existing?.completed ?? false,
          note: drafts[step_index] ?? null,
        },
      });
      toast.success("Note saved.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save note.");
    } finally {
      setSavingIdx(null);
    }
  }

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
          <p className="font-display text-3xl">{pct}%</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {completed} of {total} complete
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {rows === null && (
        <p className="mt-6 text-sm text-muted-foreground">Loading roadmap…</p>
      )}

      {rows !== null && (
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
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          checked={checked}
                          disabled={savingIdx === step_index}
                          onChange={(e) => toggle(step_index, e.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : ""}`}>
                            {m.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                          <textarea
                            placeholder="Add a note (who, when, what worked)…"
                            rows={2}
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
                              disabled={savingIdx === step_index || (drafts[step_index] ?? "") === (row?.note ?? "")}
                              onClick={() => saveNote(step_index)}
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
                      </label>
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
