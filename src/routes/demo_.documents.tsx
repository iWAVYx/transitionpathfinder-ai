import { CHAPTER_META } from "@/lib/demo-chapters";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileText, Files } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import {
  DEMO_DOCUMENT_INSIGHTS,
  DEMO_DOCUMENT_SOURCES,
  type DocumentType,
} from "@/lib/demo-extras";
import {
  PublicationPage,
  PublicationCallout,
  PublicationSource,
  PublicationSpread,
  PublicationSidebar,
} from "@/components/publication/PublicationPage";

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
  const meta = CHAPTER_META.documents;

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <DemoStepBar current="documents" student={s} />

        <PublicationPage
          kicker={meta.kicker}
          chapter="Documents & Evidence"
          dek="A planning companion, not the official record — organized for the whole team."
          part="Part One — Listen"
          folio={`p. ${meta.page}`}
        >
          <PublicationCallout kind="source" title="Sample Documents — Not A Real IEP">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <span>
                This sample shows how TransitionForward presents document-informed
                planning. It is fictional. TransitionForward does not generate, replace,
                or substitute for official IEPs, evaluations, or transition plans.
              </span>
            </span>
          </PublicationCallout>

          <PublicationSpread
            lead={
              <>
                {/* Sources */}
                <h2>Documents For {bundle.profile.first_name}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {sources.length} sample documents · {insights.length} planning insights
                  {flagged.length ? ` · ${flagged.length} need review` : ""}
                </p>

                <dl className="divide-y divide-[color:var(--pub-rule-soft)]">
                  {sources.map((src) => (
                    <div key={src.label} className="flex items-start gap-3 py-4">
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
                    </div>
                  ))}
                </dl>

                {/* Planning Insights */}
                <h2 className="mt-8">Planning Insights</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Every insight is tagged with the document type it came from. Teams should
                  verify every detail against official school records before relying on it.
                </p>

                <dl className="divide-y divide-[color:var(--pub-rule-soft)]">
                  {cleared.map((i) => (
                    <div key={i.area + i.summary} className="py-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <DocTypeChip type={i.docType} />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                          {i.area}
                        </p>
                      </div>
                      <p className="text-sm text-foreground/85">{i.summary}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Source: {i.source}</p>
                    </div>
                  ))}
                </dl>

                {flagged.length > 0 && (
                  <>
                    <h3 className="mt-6">Needs Review</h3>
                    <dl className="divide-y divide-[color:var(--pub-rule-soft)]">
                      {flagged.map((i) => (
                        <div
                          key={i.area + i.summary}
                          className="flex items-start gap-3 py-4"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <DocTypeChip type={i.docType} />
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
                                {i.area}
                              </p>
                            </div>
                            <p className="text-sm text-foreground/85">{i.summary}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Source: {i.source}
                            </p>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
              </>
            }
            side={
              <PublicationSidebar label="What This Chapter Covers">
                <ul className="space-y-2 text-sm">
                  {meta.covers.map((c) => (
                    <li key={c} className="text-foreground/80">{c}</li>
                  ))}
                </ul>
                <PublicationCallout kind="matters">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    Every insight links back to the document it came from.
                  </span>
                </PublicationCallout>
              </PublicationSidebar>
            }
          />

          <PublicationSource>
            All document content shown here is fictional sample data created for the
            TransitionForward public demo. Nothing here represents a real student record.
          </PublicationSource>

          <DemoStepFooter current="documents" student={s} />
        </PublicationPage>
      </div>
    </SiteShell>
  );
}
