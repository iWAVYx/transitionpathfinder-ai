import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { FormRenderer } from "@/components/forms/FormRenderer";
import {
  getTemplate,
  saveResponse,
  listResponses,
  type FormTemplate,
  type FormResponse,
} from "@/lib/forms.functions";
import { listStudents, type Student } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/forms/$slug")({
  head: () => ({ meta: [{ title: "Transition Form — TransitionForward" }] }),
  component: FormDetailPage,
});

function FormDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getTemplate);
  const save = useServerFn(saveResponse);
  const fetchStudents = useServerFn(listStudents);
  const listMine = useServerFn(listResponses);

  const [tpl, setTpl] = useState<FormTemplate | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [existing, setExisting] = useState<FormResponse | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get({ data: { slug } }).then(setTpl).catch(() => toast.error("Form not found"));
    fetchStudents().then((r) => {
      setStudents(r.students);
      if (r.students[0]) setStudentId(r.students[0].id);
    });
  }, [slug, get, fetchStudents]);

  useEffect(() => {
    if (!studentId) return;
    listMine({ data: { student_id: studentId, template_slug: slug } }).then((r) =>
      setExisting(r.responses[0] ?? null),
    );
  }, [studentId, slug, listMine]);

  if (!tpl) {
    return (
      <SiteShell>
        <p className="mx-auto max-w-3xl p-10 text-sm text-muted-foreground">Loading…</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Forms", to: "/forms" },
            { label: tpl.title },
          ]}
        />
      </div>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {tpl.audience === "family"
            ? "For families"
            : tpl.audience === "student"
              ? "For students"
              : "For educators"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {tpl.title}
        </h1>
        {tpl.description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{tpl.description}</p>
        )}

        {students.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-muted/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Add a student first to complete forms.{" "}
              <Link to="/students" className="underline">
                Go to Students
              </Link>
            </p>
          </div>
        ) : (
          <>
            <label className="mt-6 block text-sm">
              <span className="mb-1 block font-medium">Completing this for *</span>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full max-w-xs rounded-lg border bg-background px-3 py-2"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name}
                  </option>
                ))}
              </select>
            </label>

            {existing?.status === "completed" && (
              <p className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                Last completed on{" "}
                {existing.completed_at
                  ? new Date(existing.completed_at).toLocaleDateString()
                  : ""}
                . Editing will create a new version.
              </p>
            )}

            <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
              <FormRenderer
                schema={tpl.schema}
                initial={existing?.answers}
                saving={saving}
                onSave={async (answers, status) => {
                  if (!studentId) return;
                  setSaving(true);
                  try {
                    await save({
                      data: {
                        id: existing?.id,
                        student_id: studentId,
                        template_slug: slug,
                        respondent_role: "family",
                        answers,
                        status,
                      },
                    });
                    toast.success(
                      status === "completed" ? "Form completed and added to feed." : "Draft saved.",
                    );
                    if (status === "completed") navigate({ to: "/forms" });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Couldn't save");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}
