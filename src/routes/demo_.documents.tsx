import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, AlertTriangle, ShieldCheck, FileText, Files } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import {
  DEMO_DOCUMENT_INSIGHTS,
  DEMO_DOCUMENT_SOURCES,
  type DocumentType,
} from "@/lib/demo-extras";

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

const DOC_TYPE_TONE: Record<DocumentType, string> = {
  "IEP": "border-primary/40 bg-primary/10 text-primary",
  "Transition Assessment": "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Psychoeducational Evaluation": "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "Vocational Profile": "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  "504 Plan": "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

function DocTypeChip({ type }: { type: DocumentType }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${DOC_TYPE_TONE[type]}`}
    >
      {type}
    </span>
  );
}

function DemoDocumentsPage() {
  const { s = "maya" } = Route.useSearch() as { s?: DemoStudentId };
  const bundle = getDemoStudent(s);
  const insights = DEMO_DOCUMENT_INSIGHTS[s];
  const sources = DEMO_DOCUMENT_SOURCES[s];
  const flagged = insights.filter((i) => i.needsReview);
  const cleared = insights.filter((i) => !i.needsReview);

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <DemoStepBar current="documents" student={s} />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileSearch className="h-3 w-3" /> Document Insights
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Sample Documents — Not A Real IEP
            </Badge>
          </div>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            A Planning Companion, Not The Official Record.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            TransitionForward reads IEPs, evaluations, transition assessments, and
            vocational profiles to organize the planning-relevant pieces for the team —
            and always flags items that need human review. Every insight links back to
            the document it came from.
          </p>

          <div className="mt-8 rounded-3xl border border-amber-500/30 bg-amber-50/60 p-5 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                This sample shows how TransitionForward presents document-informed
                planning. It is fictional. TransitionForward does not generate, replace,
                or substitute for official IEPs, evaluations, or transition plans.
              </p>
            </div>
          </div>

          {/* Sources detected */}
          <h2 className="mt-10 font-display text-xl">
            Documents For {bundle.profile.first_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {sources.length} sample documents · {insights.length} planning insights
            {flagged.length ? ` · ${flagged.length} need review` : ""}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {sources.map((src) => (
              <li
                key={src.label}
                className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <Files className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DocTypeChip type={src.docType} />
                    <span className="text-xs text-muted-foreground">{src.pages} pp.</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-foreground">
                    {src.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded by {src.uploadedBy}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-xl">Planning Insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every insight is tagged with the document type it came from. Teams should
            verify every detail against official school records before relying on it.
          </p>

          <div className="mt-6 space-y-4">
            {cleared.map((i) => (
              <article
                key={i.area + i.summary}
                className="rounded-3xl border bg-card p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <DocTypeChip type={i.docType} />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        {i.area}
                      </p>
                    </div>
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
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <DocTypeChip type={i.docType} />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
                            {i.area}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-foreground/85">{i.summary}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Source: {i.source}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <DemoStepFooter current="documents" student={s} />
        </section>
      </div>
    </SiteShell>
  );
}

