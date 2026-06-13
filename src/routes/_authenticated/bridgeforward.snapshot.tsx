import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  listReadinessSnapshots,
  generateReadinessSnapshot,
} from "@/lib/bridgeforward.functions";

export const Route = createFileRoute(
  "/_authenticated/bridgeforward/snapshot",
)({
  head: () => ({ meta: [{ title: "BridgeForward Readiness Snapshot" }] }),
  component: () => (
    <RoleGuard path="/bridgeforward">
      <SnapshotPage />
    </RoleGuard>
  ),
});

type Snap = {
  id: string;
  version: number;
  created_at: string;
  student_snapshot: string | null;
  strengths_and_interests: string | null;
  learning_supports: string | null;
  confidence_and_self_advocacy: string | null;
  high_school_fit_considerations: string | null;
  family_priorities: string | null;
  questions_for_school_team: string | null;
  suggested_next_steps: string | null;
  before_high_school_checklist: unknown;
  thirty_day_plan: unknown;
};

function SnapshotPage() {
  const loadStudents = useServerFn(listStudents);
  const loadSnaps = useServerFn(listReadinessSnapshots);
  const genSnap = useServerFn(generateReadinessSnapshot);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadStudents().then(({ students }) => {
      setStudents(students);
      if (students[0]) setStudentId(students[0].id);
      else setLoading(false);
    });
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadSnaps({ data: { studentId } })
      .then(({ snapshots }) => setSnaps((snapshots ?? []) as Snap[]))
      .finally(() => setLoading(false));
  }, [studentId, loadSnaps]);

  async function handleGenerate() {
    if (!studentId) return;
    setGenerating(true);
    try {
      const { snapshot } = await genSnap({ data: { studentId } });
      setSnaps((p) => [snapshot as Snap, ...p]);
      toast.success("Snapshot generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  const latest = snaps[0];

  if (students.length === 0 && !loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs
            trail={[
              { label: "BridgeForward", to: "/bridgeforward" },
              { label: "Readiness Snapshot" },
            ]}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Add a student first.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs
          trail={[
            { label: "BridgeForward", to: "/bridgeforward" },
            { label: "Readiness Snapshot" },
          ]}
        />

        <div className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-4 w-4" /> Readiness Snapshot
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            BridgeForward Readiness Snapshot
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A versioned summary of where the student is today, drawn from their
            BridgeForward profile, voice, and the schools you're considering.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          {students.length > 1 && (
            <div className="min-w-[220px]">
              <Label htmlFor="student">Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="student" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              "Generate snapshot"
            )}
          </Button>
        </div>

        {loading ? (
          <div className="mt-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : latest ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                Version {latest.version} · {new Date(latest.created_at).toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {latest.student_snapshot && (
                <Section title="Who the student is today" body={latest.student_snapshot} />
              )}
              {latest.strengths_and_interests && (
                <Section title="Strengths & interests" body={latest.strengths_and_interests} />
              )}
              {latest.learning_supports && (
                <Section title="Learning supports" body={latest.learning_supports} />
              )}
              {latest.confidence_and_self_advocacy && (
                <Section
                  title="Confidence & self-advocacy"
                  body={latest.confidence_and_self_advocacy}
                />
              )}
              {latest.high_school_fit_considerations && (
                <Section
                  title="High school fit considerations"
                  body={latest.high_school_fit_considerations}
                />
              )}
              {latest.family_priorities && (
                <Section title="Family priorities" body={latest.family_priorities} />
              )}
              {latest.questions_for_school_team && (
                <Section
                  title="Questions for the school team"
                  body={latest.questions_for_school_team}
                />
              )}
              {Array.isArray(latest.before_high_school_checklist) && (
                <div>
                  <h3 className="font-semibold">Before high school checklist</h3>
                  <ul className="mt-1 list-disc pl-5">
                    {(latest.before_high_school_checklist as Array<{
                      item: string;
                      done: boolean;
                    }>).map((c, i) => (
                      <li key={i}>
                        {c.done ? "✅ " : "◻︎ "} {c.item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(latest.thirty_day_plan) && (
                <div>
                  <h3 className="font-semibold">30-day plan</h3>
                  <ul className="mt-1 list-disc pl-5">
                    {(latest.thirty_day_plan as Array<{
                      week: number;
                      focus: string;
                    }>).map((w, i) => (
                      <li key={i}>
                        Week {w.week}: {w.focus}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {snaps.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {snaps.length - 1} earlier version
                  {snaps.length > 2 ? "s" : ""} saved.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            No snapshot yet. Click <strong>Generate snapshot</strong> after the
            profile, voice, and fit-finder have been filled in.
          </p>
        )}
      </div>
    </SiteShell>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{body}</p>
    </div>
  );
}
