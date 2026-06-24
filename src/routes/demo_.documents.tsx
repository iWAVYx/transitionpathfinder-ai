import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, AlertTriangle, ShieldCheck, FileText } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { getDemoStudent } from "@/lib/demo-data";
import { DEMO_DOCUMENT_INSIGHTS } from "@/lib/demo-extras";

export const Route = createFileRoute("/demo_/documents")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Document Insights — TransitionForward demo" },
      {
        name: "description",
        content:
          "Sample IEP and document insights — what TransitionForward extracts, summarizes, and flags for human review.",
      },
      { property: "og:title", content: "Document Insights — TransitionForward demo" },
      {
        property: "og:description",
        content:
          "Sample document insights show how teams organize transition goals, accommodations, and services — with clear needs-review flags.",
      },
      { property: "og:url", content: "/demo/documents" },
    ],
    links: [{ rel: "canonical", href: "/demo/documents" }],
  }),
  component: DemoDocumentsPage,
});

function DemoDocumentsPage() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const insights = DEMO_DOCUMENT_INSIGHTS[s];
  const flagged = insights.filter((i) => i.needsReview);
  const cleared = insights.filter((i) => !i.needsReview);

  return (
    <SiteShell>
      <DemoStepBar current="documents" student={s} />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <FileSearch className="h-3 w-3" /> Document Insights
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Sample document — not a real IEP
          </Badge>
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
          A planning companion, not the official record.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          TransitionForward organizes the planning-relevant parts of an IEP or evaluation
          so families and teams can prepare for meetings — and it always flags items for
          human review. Teams should verify every detail against official school records.
        </p>

        <div className="mt-8 rounded-3xl border border-amber-500/30 bg-amber-50/60 p-5 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This sample shows how TransitionForward presents document-informed
              planning. It is fictional. We do not generate, replace, or substitute for
              official IEPs, evaluations, or transition plans.
            </p>
          </div>
        </div>

        <h2 className="mt-10 font-display text-xl">
          {bundle.profile.first_name}'s sample IEP — quick summary
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Detected: 1 sample IEP · {insights.length} planning insights
          {flagged.length ? ` · ${flagged.length} need review` : ""}
        </p>

        <div className="mt-6 space-y-4">
          {cleared.map((i) => (
            <article key={i.area + i.summary} className="rounded-3xl border bg-card p-6 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {i.area}
                  </p>
                  <p className="mt-2 text-sm text-foreground/85">{i.summary}</p>
                </div>
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Source: {i.source}</p>
            </article>
          ))}

          {flagged.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="font-display text-lg">Needs Review</h3>
              {flagged.map((i) => (
                <article
                  key={i.area + i.summary}
                  className="rounded-3xl border border-amber-500/30 bg-amber-50/60 p-6 shadow-soft dark:border-amber-400/30 dark:bg-amber-950/30"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
                        {i.area}
                      </p>
                      <p className="mt-2 text-sm text-foreground/85">{i.summary}</p>
                      <p className="mt-3 text-xs text-muted-foreground">Source: {i.source}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <DemoStepFooter current="documents" student={s} />
      </section>
    </SiteShell>
  );
}
