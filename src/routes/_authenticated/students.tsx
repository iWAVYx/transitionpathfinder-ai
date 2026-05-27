import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Plus, GraduationCap, Trash2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  listStudents,
  createStudent,
  deleteStudent,
  type Student,
} from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — TransitionForward" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const list = useServerFn(listStudents);
  const create = useServerFn(createStudent);
  const remove = useServerFn(deleteStudent);

  const [students, setStudents] = useState<Student[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    list()
      .then((r) => setStudents(r.students))
      .catch(() => setStudents([]));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await create({
        data: {
          first_name: String(fd.get("first_name") || "").trim(),
          last_name: String(fd.get("last_name") || "").trim() || undefined,
          grade_band: (String(fd.get("grade_band") || "") || undefined) as never,
          school: String(fd.get("school") || "").trim() || undefined,
        },
      });
      (e.currentTarget as HTMLFormElement).reset();
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this student and all linked goals/progress? This cannot be undone.")) return;
    await remove({ data: { id } });
    await reload();
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Students" }]} />
      </div>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your hub</p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Students</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every report, goal, and uploaded document is organized by student. Add a student to
              keep their plan in one place — and to share securely with educators when ready.
            </p>
          </div>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Close" : "Add student"}
          </Button>
        </div>

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
              <select name="grade_band" className="w-full rounded-lg border bg-background px-3 py-2">
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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save student"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : students.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed bg-muted/40 p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No students yet. Add one to start organizing reports and goals.
              </p>
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
                      {s.first_name} {s.last_name ?? ""}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {s.grade_band ?? "Grade not set"} {s.school ? `· ${s.school}` : ""}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id)}
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
