import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";

/**
 * Educator Document Review — a filtered view over documents scoped to
 * this educator's caseload that need review: processing status, missing
 * doc flags, and related report section. Distinct from generic /documents.
 */
export const Route = createFileRoute("/_authenticated/educator/document-review")({
  head: () => ({
    meta: [
      { title: "Document Review — TransitionForward" },
      {
        name: "description",
        content:
          "IEPs, evaluations, and family uploads across your caseload — organized for review with status flags.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/educator/document-review">
      <DocumentReviewPage />
    </RoleGuard>
  ),
});

type Doc = {
  student: string;
  title: string;
  kind: string;
  status: "ready" | "processing" | "missing" | "reviewed";
  linkedSection?: string;
  when: string;
};

const DOCS: Doc[] = [
  { student: "Jordan M.", title: "Transition assessment 2026", kind: "Assessment", status: "ready", linkedSection: "Employment readiness", when: "Uploaded Sep 8" },
  { student: "Jordan M.", title: "Current IEP", kind: "IEP", status: "reviewed", linkedSection: "Present levels", when: "Reviewed Sep 5" },
  { student: "Marcus T.", title: "Family notes for the PPT", kind: "Family upload", status: "processing", when: "OCR in progress" },
  { student: "Marcus T.", title: "Latest evaluation", kind: "Evaluation", status: "missing", linkedSection: "Present levels", when: "Awaiting family upload" },
  { student: "Ana R.", title: "Vocational assessment", kind: "Assessment", status: "ready", linkedSection: "Employment readiness", when: "Uploaded Sep 3" },
  { student: "Ana R.", title: "Speech/Language reeval", kind: "Evaluation", status: "processing", when: "OCR in progress" },
];

const STATUS_META: Record<Doc["status"], { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ready: { label: "Ready to review", className: "bg-amber-500/10 text-amber-800 ring-amber-500/20 dark:text-amber-200", Icon: AlertCircle },
  processing: { label: "Processing", className: "bg-muted text-muted-foreground ring-border", Icon: Clock },
  missing: { label: "Missing", className: "bg-destructive/10 text-destructive ring-destructive/20", Icon: AlertCircle },
  reviewed: { label: "Reviewed", className: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300", Icon: CheckCircle2 },
};

function DocumentReviewPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Breadcrumbs trail={[{ label: "Caseload", to: "/hubs/caseload" }, { label: "Document Review" }]} />
        <header className="mt-4 mb-8">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-7 w-7 text-primary" aria-hidden />
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Document Review
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Documents across your caseload — filtered to what needs your attention.
            Each row links to the report section it feeds.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <ul className="divide-y divide-border">
            {DOCS.map((d, i) => {
              const meta = STATUS_META[d.status];
              const StatusIcon = meta.Icon;
              return (
                <li key={i} className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{d.student}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${meta.className}`}>
                        <StatusIcon className="h-3 w-3" aria-hidden /> {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{d.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {d.kind} · {d.when}
                      {d.linkedSection ? ` · feeds: ${d.linkedSection}` : ""}
                    </p>
                  </div>
                  <Button asChild size="sm" variant={d.status === "reviewed" ? "ghost" : "outline"}>
                    <Link to="/documents">
                      {d.status === "reviewed" ? "View" : d.status === "missing" ? "Request Upload" : "Review"}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <BackToDashboard />
          <Button asChild variant="outline" size="sm">
            <Link to="/documents">Open Full Documents</Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  );
}
