import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { listTemplates, type FormTemplate } from "@/lib/forms.functions";

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({
    meta: [
      { title: "Transition Forms Library — TransitionForward" },
      {
        name: "description",
        content:
          "Ready-to-use transition forms: Student Interest Survey, Family Input, Life Skills Checklist, and more — completions feed your Pathway Report.",
      },
    ],
  }),
  component: FormsPage,
});

const AUDIENCE_LABEL: Record<string, string> = {
  family: "For families",
  student: "For students",
  educator: "For educators",
};

function FormsPage() {
  const fetchTemplates = useServerFn(listTemplates);
  const [templates, setTemplates] = useState<FormTemplate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    fetchTemplates()
      .then((r) => setTemplates(r.templates))
      .catch((err) => {
        setTemplates([]);
        setLoadError(err instanceof Error ? err.message : "Couldn't load forms.");
      });
  }, [fetchTemplates]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Forms" }]} />
      </div>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Transition Forms</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          The Right Form, At The Right Moment.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          A library of transition-specific forms designed for families, students, and educators.
          Every completed form quietly feeds your next Pathway Report.
        </p>

        <InfoBox label="How completed forms help" className="mt-6 max-w-2xl">
          When you mark a form complete, it lands in the student's Feed and becomes context for the
          next Pathway Report — so each new report builds on the last instead of starting blank.
        </InfoBox>

        {loadError ? (
          <div className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {loadError}
          </div>
        ) : templates === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            No forms available yet. Check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link
                key={t.slug}
                to="/forms/$slug"
                params={{ slug: t.slug }}
                className="group rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {AUDIENCE_LABEL[t.audience] ?? t.audience}
                </p>
                <h3 className="mt-1 font-display text-lg">{t.title}</h3>
                {t.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open form
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
