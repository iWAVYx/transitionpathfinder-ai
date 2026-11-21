import { useStudentCreationRecovery } from "@/hooks/use-student-creation-recovery";
import { StudentCreationRecovery } from "@/components/StudentCreationRecovery";
import { usePlanningLifetime } from "@/hooks/use-planning-lifetime";
import { formatGradeBand } from "@/lib/grade-band-label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { IllustratedEmptyState } from "@/components/empty/IllustratedEmptyState";
import { listStudents, createStudent, deleteStudent, type Student } from "@/lib/students.functions";

import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/_authenticated/students/")({
  head: () => ({ meta: [{ title: "Students — TransitionForward" }] }),
  component: () => (
    <RoleGuard path="/students">
      <StudentsPage />
    </RoleGuard>
  ),
});

function StudentsPage() {
  const lifetime = usePlanningLifetime("student-list");
  const recovery = useStudentCreationRecovery(
    lifetime.viewerId,
    lifetime.current,
    lifetime.available,
  );
  const list = useServerFn(listStudents);
  const create = useServerFn(createStudent);
  const remove = useServerFn(deleteStudent);

  const [students, setStudents] = useState<Student[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const sequence = lifetime.nextRead();
    try {
      const r = await list({ data: { expected_viewer_id: lifetime.viewerId } });
      if (!lifetime.currentRead(sequence)) return;
      if (r.loadFailed) throw Error("We couldn't load your students. Please refresh.");
      setStudents(r.students);
    } catch {
      if (lifetime.currentRead(sequence)) {
        setStudents(null);
        setError("We couldn't load your students. Please refresh.");
      }
    }
  };
  useEffect(() => {
    setStudents(null);
    setSubmitting(false);
    setShowForm(false);
    setError(null);
    if (lifetime.available) void reload();
  }, [lifetime.viewerId, lifetime.available]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lifetime.begin()) return;
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const firstName = String(fd.get("first_name") || "").trim();
    try {
      await recovery.locked(async () => {
        if (recovery.pending())
          throw Error("Check the earlier student setup before adding another.");
        const intent = {
          version: 1 as const,
          requestId: crypto.randomUUID(),
          origin: "students" as const,
          kind: "linked" as const,
          role: "linked",
        };
        recovery.reserve(intent);
        await create({
          data: {
            expected_viewer_id: lifetime.viewerId,
            request_id: intent.requestId,
            first_name: firstName,
            last_name: String(fd.get("last_name") || "").trim() || undefined,
            grade_band: (String(fd.get("grade_band") || "") || undefined) as never,
            school: String(fd.get("school") || "").trim() || undefined,
          },
        });
        if (!lifetime.current()) return;
        recovery.clear(intent);
      });
      if (!lifetime.current()) return;
      form.reset();
      setShowForm(false);
      await reload();
      if (!lifetime.current()) return;
      toast.success(`${firstName} added to your dashboard.`);
    } catch (err) {
      if (!lifetime.current()) return;
      lifetime.markUncertain();
      const msg =
        err instanceof Error
          ? err.message
          : "Student could not be added. Please check the required fields or try again.";
      console.error("createStudent failed", err);
      setError(msg);
      toast.error(msg);
    } finally {
      lifetime.finish();
      if (lifetime.current()) setSubmitting(false);
    }
  }

  async function handleDelete(student: Student) {
    if (
      !confirm(
        "Remove this student profile? This does not delete every saved report or uploaded file. This cannot be undone.",
      )
    )
      return;
    if (!lifetime.begin()) return;
    setSubmitting(true);
    try {
      await remove({
        data: {
          id: student.id,
          expected_updated_at: student.updated_at,
          expected_viewer_id: lifetime.viewerId,
        },
      });
      if (lifetime.current()) await reload();
    } catch (err) {
      if (lifetime.current()) {
        lifetime.markUncertain();
        setError(
          err instanceof Error
            ? err.message
            : "Removal could not be confirmed. Refresh your student list.",
        );
      }
    } finally {
      lifetime.finish();
      if (lifetime.current()) setSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Students" }]} />
      </div>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Your hub
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Students
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every report, goal, and uploaded document is organized by student. Add a student to
              keep their plan in one place — and to share securely with educators when ready.
            </p>
          </div>
          <Button
            disabled={
              submitting ||
              lifetime.uncertain ||
              !lifetime.available ||
              !recovery.ready ||
              !!recovery.intent ||
              !!recovery.error
            }
            onClick={() => setShowForm((s) => !s)}
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Close" : "Add student"}
          </Button>
        </div>

        <StudentCreationRecovery
          recovery={recovery}
          onContinue={
            recovery.intent?.origin === "students"
              ? () =>
                  void (async () => {
                    try {
                      await recovery.locked(async () => {
                        const intent = recovery.pending();
                        if (!intent || intent.origin !== "students") return;
                        const result = await recovery.inspect(intent);
                        if (result.status !== "present") return;
                        recovery.clear(intent);
                        lifetime.confirmRead();
                        setError(null);
                        setShowForm(false);
                        await reload();
                      });
                    } catch {
                      if (lifetime.current())
                        setError("We couldn't check the saved profile. Please check again.");
                    }
                  })()
              : undefined
          }
        />
        {recovery.intent?.origin === "onboarding" && (
          <Link to="/onboarding" className="text-sm underline">
            Return to Account Setup
          </Link>
        )}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2"
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium">First name *</span>
              <input
                required
                name="first_name"
                className="w-full rounded-lg border bg-background px-3 py-2"
                maxLength={80}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Last name</span>
              <input
                name="last_name"
                className="w-full rounded-lg border bg-background px-3 py-2"
                maxLength={80}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Grade band</span>
              <select
                name="grade_band"
                className="w-full rounded-lg border bg-background px-3 py-2"
              >
                <option value="">—</option>
                <option value="9-10">9–10</option>
                <option value="11-12">11–12</option>
                <option value="post-secondary">Post-secondary</option>
                <option value="not-applicable">Not applicable</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">School</span>
              <input
                name="school"
                className="w-full rounded-lg border bg-background px-3 py-2"
                maxLength={160}
              />
            </label>
            {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={
                  submitting ||
                  lifetime.uncertain ||
                  !lifetime.available ||
                  !recovery.ready ||
                  !!recovery.intent ||
                  !!recovery.error
                }
              >
                {submitting ? "Saving…" : "Save student"}
              </Button>
            </div>
          </form>
        )}

        {error && !showForm && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students === null ? (
            <p className="text-sm text-muted-foreground">
              {error ? "Student information is unavailable." : "Loading…"}
            </p>
          ) : students.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <IllustratedEmptyState
                kind="students"
                title="No Students Yet"
                description="Add your first student to start organizing reports, goals, and meetings."
              />
            </div>
          ) : (
            students.map((s) => (
              <article
                key={s.id}
                className="group flex flex-col rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: s.id }}
                    className="min-w-0 flex-1"
                  >
                    <h2 className="font-display text-xl hover:underline">
                      {toTitleCase(s.first_name)} {s.last_name ?? ""}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {formatGradeBand(s.grade_band)} {s.school ? `· ${s.school}` : ""}
                    </p>
                  </Link>
                  <button
                    disabled={
                      submitting ||
                      lifetime.uncertain ||
                      !recovery.ready ||
                      !!recovery.intent ||
                      !!recovery.error ||
                      s.owner_id !== lifetime.viewerId
                    }
                    onClick={() => handleDelete(s)}
                    aria-label={`Delete ${s.first_name}`}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: s.id }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    <GraduationCap className="h-3.5 w-3.5" /> Open
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </SiteShell>
  );
}
