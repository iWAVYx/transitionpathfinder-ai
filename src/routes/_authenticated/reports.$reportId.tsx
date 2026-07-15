import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Link2,
  Trash2,
  Share2,
  UserCircle2,
  Sparkles,
  Printer,
  BookmarkPlus,
  ListChecks,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ReportView } from "@/components/pathway/ReportView";
import { ReportChapterPager } from "@/components/pathway/ReportChapterPager";
import { ReportVersionsPanel } from "@/components/pathway/ReportVersionsPanel";
import { Button } from "@/components/ui/button";
import {
  getReport,
  linkReportToStudent,
  regeneratePathwayReport,
  type PathwayReport,
} from "@/lib/pathway.functions";
import {
  createShareToken,
  listShareTokens,
  listStudents,
  revokeShareToken,
  type ShareTokenRow,
  type Student,
} from "@/lib/students.functions";
import { ReportV2Sections, RegenerateBanner, type V2Audience } from "@/components/pathway/ReportV2Sections";
import { ReportV2InputsUsed } from "@/components/pathway/ReportV2Extras";
import { EvidenceUsedPanel } from "@/components/pathway/EvidenceUsedPanel";
import { PathwayReportLayout } from "@/components/pathway/report/PathwayReportLayout";
import { isV2 } from "@/lib/pathway-v2";
import type { EvidenceUsedSummary } from "@/lib/pathway-evidence";

const SearchSchema = z.object({
  welcome: z.coerce.number().optional(),
  print: z.coerce.number().optional(),
  audience: z.enum(["student", "family", "educator"]).optional(),
});


export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  head: () => ({ meta: [{ title: "Pathway Report — TransitionForward" }] }),
  validateSearch: (s) => SearchSchema.parse(s),
  component: withRoleGuard(["family", "educator", "student", "admin"], ReportDetailPage),
});

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const search = Route.useSearch();
  const [showWelcome, setShowWelcome] = useState(!!search.welcome);
  const fetchReport = useServerFn(getReport);
  const listTokens = useServerFn(listShareTokens);
  const create = useServerFn(createShareToken);
  const revoke = useServerFn(revokeShareToken);
  const fetchStudents = useServerFn(listStudents);
  const linkStudent = useServerFn(linkReportToStudent);
  const regenerate = useServerFn(regeneratePathwayReport);
  const navigate = useNavigate();
  const audience: V2Audience = search.audience ?? "family";
  const [regenBusy, setRegenBusy] = useState(false);

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | {
        kind: "ok";
        name: string;
        report: PathwayReport;
        studentId: string | null;
        reviewDate: string | null;
        lastUpdated: string | null;
      }
  >({ kind: "loading" });
  const [tokens, setTokens] = useState<ShareTokenRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [versionsKey, setVersionsKey] = useState(0);
  const [density, setDensity] = useState<"compact" | "comfortable">(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem("tf.reportDensity") : null;
      return v === "comfortable" ? "comfortable" : "compact";
    } catch { return "compact"; }
  });
  useEffect(() => {
    function onSet(e: Event) {
      const detail = (e as CustomEvent<{ density: "compact" | "comfortable" }>).detail;
      if (detail?.density === "compact" || detail?.density === "comfortable") setDensity(detail.density);
    }
    window.addEventListener("report-density-set", onSet as EventListener);
    return () => window.removeEventListener("report-density-set", onSet as EventListener);
  }, []);
  const wrapWidth = density === "compact" ? "max-w-[92rem]" : "max-w-4xl";

  useEffect(() => {
    fetchReport({ data: { id: reportId } })
      .then((r) =>
        setState({
          kind: "ok",
          name: r.student_first_name,
          report: r.report,
          studentId: r.student_id,
          reviewDate: (r as { review_date?: string | null }).review_date ?? null,
          lastUpdated: r.created_at,
        }),
      )
      .catch((e) =>
        setState({ kind: "error", message: e instanceof Error ? e.message : "Not found" }),
      );
    listTokens({ data: { report_id: reportId } })
      .then((r) => setTokens(r.tokens))
      .catch(() => {});
    fetchStudents()
      .then((r) => setStudents(r.students))
      .catch(() => setStudents([]));
  }, [fetchReport, listTokens, fetchStudents, reportId]);

  useEffect(() => {
    if (state.kind === "ok" && search.print) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [state.kind, search.print]);

  async function handleLink(studentId: string | null) {
    setLinking(true);
    try {
      await linkStudent({ data: { report_id: reportId, student_id: studentId } });
      setState((s) => (s.kind === "ok" ? { ...s, studentId } : s));
      toast.success(studentId ? "Linked to student." : "Link removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link.");
    } finally {
      setLinking(false);
    }
  }

  async function handleRegenerate() {
    setRegenBusy(true);
    try {
      const res = await regenerate({ data: { report_id: reportId } });
      const fresh = await fetchReport({ data: { id: reportId } });
      setState({
        kind: "ok",
        name: fresh.student_first_name,
        report: fresh.report,
        studentId: fresh.student_id,
        reviewDate: (fresh as { review_date?: string | null }).review_date ?? null,
        lastUpdated: fresh.created_at,
      });
      toast.success(`Regenerated (v${res.version_number}). ${res.change_summary}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate.");
    } finally {
      setRegenBusy(false);
    }
  }

  function setAudience(a: V2Audience) {
    navigate({ to: "/reports/$reportId", params: { reportId }, search: { ...search, audience: a } });
  }


  async function generate(audience: "family" | "educator") {
    setBusy(true);
    try {
      await create({ data: { report_id: reportId, audience, expires_in_days: 30 } });
      const r = await listTokens({ data: { report_id: reportId } });
      setTokens(r.tokens);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    await revoke({ data: { id } });
    const r = await listTokens({ data: { report_id: reportId } });
    setTokens(r.tokens);
  }

  async function copyShareUrl(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 1800);
  }

  if (state.kind === "loading") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">Loading the report…</p>
        </section>
      </SiteShell>
    );
  }

  if (state.kind === "error") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Hm.</p>
          <h1 className="mt-2 font-display text-3xl">We Couldn't Open That Report.</h1>
          <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
          <Button asChild className="mt-6">
            <Link to="/reports">Back to my reports</Link>
          </Button>
        </section>
      </SiteShell>
    );
  }

  const activeTokens = tokens.filter((t) => !t.revoked);

  return (
    <SiteShell>
      <div className="report-shell eh-issue">
      <div className={`mx-auto ${wrapWidth} px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10`}>

        <Breadcrumbs
          trail={[
            { label: "Reports", to: "/reports" },
            { label: state.name },
          ]}
        />
      </div>

      {showWelcome && (
        <div className={`no-print mx-auto mt-6 ${wrapWidth} px-4 sm:px-6 lg:px-8`}>
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-hero p-6 shadow-soft sm:p-8">
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Your report is ready
              </p>
            </div>
            <h2 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">
              {state.name}'s Pathway Report
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Take a few minutes to read through it. When you're ready, here's what most
              families do next.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <NextStep
                icon={<BookmarkPlus className="h-4 w-4" />}
                title="Save to a student"
                body="Keep this report on a student profile so it stays organized."
              />
              <NextStep
                icon={<Printer className="h-4 w-4" />}
                title="Download as PDF"
                body="Print or save a clean PDF to bring to the next PPT meeting."
              />
              <NextStep
                icon={<Share2 className="h-4 w-4" />}
                title="Share securely"
                body="Send a private link to family or your educator team."
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Download PDF
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="#share-panel"><Share2 className="h-4 w-4" /> Share</a>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/reports"><ListChecks className="h-4 w-4" /> All reports</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <PathwayReportLayout>
      <ReportChapterPager />
      <ReportView
        name={state.name}
        report={state.report}
        onReset={() => navigate({ to: "/reports" })}
        resetLabel="Back to my reports"
        saved={!!state.studentId}
        saveLabel={students.length > 0 ? "Save to student profile" : undefined}
        studentId={state.studentId ?? undefined}
        initialAudience={audience}
        onAudienceChange={(a) => setAudience(a as V2Audience)}
        hasV2={isV2(state.report)}
        onRefresh={state.studentId ? handleRegenerate : undefined}
        refreshing={regenBusy}
        meta={{
          reportId: `TF-${reportId.slice(0, 8).toUpperCase()}`,
          preparedFor: state.name,
          nextReviewDate: state.reviewDate,
          lastUpdated: state.lastUpdated
            ? new Date(state.lastUpdated).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : null,
        }}
        onSaveToProfile={
          students.length > 0 && !state.studentId
            ? () => handleLink(students[0].id)
            : undefined
        }
      />

      {/* v2 additive sections — only render once the report has been regenerated into v2 */}
      {isV2(state.report) && (
        <>
          <ReportV2Sections
            content={state.report}
            audience={audience}
            studentName={state.name}
          />
          <section className={`mx-auto ${wrapWidth} px-4 pb-6 sm:px-6 lg:px-8`}>
            <ReportV2InputsUsed content={state.report} />
          </section>
        </>
      )}
      </PathwayReportLayout>

      {/* Regenerate CTA + evidence-used side panel */}
      <div className={`no-print mx-auto ${wrapWidth} px-4 pb-6 sm:px-6 lg:px-8`}>
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <RegenerateBanner
            onRegenerate={handleRegenerate}
            busy={regenBusy}
            canRegenerate={!!state.studentId}
          />
          <EvidenceUsedPanel
            summary={
              ((state.report as Record<string, unknown> | null)?.evidence_used as
                | EvidenceUsedSummary
                | undefined) ?? null
            }
            weakSummaryFlag={
              !!(state.report as Record<string, unknown> | null)?.weak_summary_flag
            }
          />
        </div>
      </div>



      {/* Link to student */}
      <section className={`no-print mx-auto ${wrapWidth} px-4 pb-6 sm:px-6 lg:px-8`}>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft">
          <UserCircle2 className="h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Linked student</p>
            <p className="text-xs text-muted-foreground">
              Connect this report to a student in your roster to share goals and progress.
            </p>
          </div>
          <select
            value={state.studentId ?? ""}
            disabled={linking || students.length === 0}
            onChange={(e) => handleLink(e.target.value || null)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Not linked —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name}
                {s.last_name ? ` ${s.last_name}` : ""}
              </option>
            ))}
          </select>
          {state.studentId && (
            <Button asChild variant="outline" size="sm">
              <Link to="/students/$studentId" params={{ studentId: state.studentId }}>
                Open student
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Version history */}
      <section className={`mx-auto ${wrapWidth} px-4 pb-6 sm:px-6 lg:px-8`}>
        <ReportVersionsPanel
          key={versionsKey}
          reportId={reportId}
          currentContent={state.report}
          onRestored={async () => {
            try {
              const fresh = await fetchReport({ data: { id: reportId } });
              setState({
                kind: "ok",
                name: fresh.student_first_name,
                report: fresh.report,
                studentId: fresh.student_id,
                reviewDate: (fresh as { review_date?: string | null }).review_date ?? null,
                lastUpdated: fresh.created_at,
              });
            } catch {
              /* toast already shown by panel */
            }
            setVersionsKey((k) => k + 1);
          }}
        />
      </section>

      {/* Share panel */}
      <section id="share-panel" className={`no-print mx-auto ${wrapWidth} px-4 pb-14 sm:px-6 lg:px-8 scroll-mt-24`}>

        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Secure sharing
              </p>
              <h2 className="mt-2 font-display text-2xl">Share This Report</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Create a private link your family or your student's teacher can open without
                signing in. Links expire after 30 days. You can revoke any link at any time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => generate("family")} disabled={busy}>
                <Share2 className="h-4 w-4" /> Family link
              </Button>
              <Button size="sm" onClick={() => generate("educator")} disabled={busy}>
                <Share2 className="h-4 w-4" /> Educator link
              </Button>
            </div>
          </div>

          {activeTokens.length > 0 && (
            <ul className="mt-6 divide-y divide-border/60 rounded-2xl border bg-background">
              {activeTokens.map((t) => {
                const url = typeof window !== "undefined"
                  ? `${window.location.origin}/share/${t.token}`
                  : `/share/${t.token}`;
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">{url}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-primary">
                        {t.audience} · {t.view_count} view{t.view_count === 1 ? "" : "s"}
                        {t.expires_at ? ` · expires ${new Date(t.expires_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyShareUrl(t.token)}>
                      {copiedId === t.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedId === t.token ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(t.id)}>
                      <Trash2 className="h-4 w-4" /> Revoke
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      </div>
    </SiteShell>
  );
}


function NextStep({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
