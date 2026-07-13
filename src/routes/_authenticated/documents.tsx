import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  FolderOpen,
  Search,
  Sparkles,
  CheckCircle2,
  UploadCloud,
  Eye,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { IllustratedEmptyState } from "@/components/empty/IllustratedEmptyState";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MissingDocumentsChecklist } from "@/components/documents/MissingDocumentsChecklist";
import {
  listAllDocuments,
  type CrossDocumentRow,
  type DocumentReviewStatus,
} from "@/lib/cross-docs.functions";


export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — TransitionForward" }] }),
  component: () => (
    <RoleGuard path="/documents">
      <DocumentsHubPage />
    </RoleGuard>
  ),
});

type FilterKey = "all" | DocumentReviewStatus;

const STATUS_META: Record<
  DocumentReviewStatus,
  { label: string; tone: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  uploaded: {
    label: "Uploaded",
    tone: "bg-muted text-muted-foreground",
    icon: UploadCloud,
    description: "File saved. No AI draft yet — open the student to run extraction.",
  },
  ai_extracted: {
    label: "AI Drafted",
    tone: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
    icon: Sparkles,
    description: "AI produced a draft. A human still needs to triage each section.",
  },
  in_review: {
    label: "In Review",
    tone: "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300",
    icon: Eye,
    description: "Reviewer has started accepting / editing sections.",
  },
  linked: {
    label: "Linked",
    tone: "bg-primary/10 text-primary",
    icon: CheckCircle2,
    description: "Accepted fields have been saved to the student profile.",
  },
};

function DocumentsHubPage() {
  const fetchAll = useServerFn(listAllDocuments);
  const [rows, setRows] = useState<CrossDocumentRow[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchAll()
      .then((r) => setRows(r.documents))
      .catch(() => setRows([]));
  }, [fetchAll]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((d) => {
      if (filter !== "all" && d.review_status !== filter) return false;
      if (q && !`${d.title} ${d.student_first_name}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, filter, q]);

  const counts = useMemo(() => {
    const base: Record<DocumentReviewStatus, number> = {
      uploaded: 0,
      ai_extracted: 0,
      in_review: 0,
      linked: 0,
    };
    (rows ?? []).forEach((d) => {
      base[d.review_status] += 1;
    });
    return base;
  }, [rows]);

  return (
    <SiteShell>
      <div className="demo-shell">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Documents" }]} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="tf-cover px-6 py-10 sm:px-10 sm:py-12">
          <p className="tf-eyebrow">Your Documents</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-medium leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
            Every IEP, Evaluation, and Plan — in One Calm Place.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Each document moves through four steps: <strong>Uploaded</strong> →{" "}
            <strong>AI Drafted</strong> → <strong>In Review</strong> →{" "}
            <strong>Linked</strong>. You see exactly where every file stands and
            who still needs to look at it.
          </p>
        </header>


        {/* Status pipeline */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatChip
            label="All documents"
            value={rows?.length ?? 0}
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={<FolderOpen className="h-4 w-4" />}
          />
          {(Object.keys(STATUS_META) as DocumentReviewStatus[]).map((key) => {
            const meta = STATUS_META[key];
            const Icon = meta.icon;
            return (
              <StatChip
                key={key}
                label={meta.label}
                value={counts[key]}
                active={filter === key}
                onClick={() => setFilter(key)}
                icon={<Icon className="h-4 w-4" />}
              />
            );
          })}
        </div>

        {filter !== "all" && (
          <p className="mt-3 text-xs text-muted-foreground">
            {STATUS_META[filter].description}
          </p>
        )}

        <MissingDocumentsChecklist rows={rows} className="mt-6" />



        <div className="mt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or student…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-card shadow-soft">
          {rows === null ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading documents…</p>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y">
              {filtered.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.student_first_name} ·{" "}
                        <span className="capitalize">{d.doc_type}</span> ·{" "}
                        {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.review_status} />
                    {d.review_status === "uploaded" || d.review_status === "linked" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: d.student_id }}
                        >
                          Open student
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link
                          to="/documents/$documentId/review"
                          params={{ documentId: d.id }}
                        >
                          Continue review
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </SiteShell>
  );
}


function StatChip({
  label,
  value,
  active,
  onClick,
  icon,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-soft transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
      }`}
    >
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl">{value}</p>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: DocumentReviewStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${meta.tone}`}
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="p-6">
      <IllustratedEmptyState
        kind="documents"
        title="No Documents Yet"
        description="Start by opening a student and uploading their current IEP or transition assessment. We'll keep everything private and only visible to the people you invite."
        action={
          <Button asChild>
            <Link to="/students">Go to my students</Link>
          </Button>
        }
      />
    </div>
  );
}


