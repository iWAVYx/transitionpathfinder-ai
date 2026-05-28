import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, Check, Link2, Trash2, Share2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ReportView } from "@/components/pathway/ReportView";
import { Button } from "@/components/ui/button";
import {
  getReport,
  linkReportToStudent,
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

export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  head: () => ({ meta: [{ title: "Pathway Report — TransitionForward" }] }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const fetchReport = useServerFn(getReport);
  const listTokens = useServerFn(listShareTokens);
  const create = useServerFn(createShareToken);
  const revoke = useServerFn(revokeShareToken);
  const fetchStudents = useServerFn(listStudents);
  const linkStudent = useServerFn(linkReportToStudent);
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ok"; name: string; report: PathwayReport; studentId: string | null }
  >({ kind: "loading" });
  const [tokens, setTokens] = useState<ShareTokenRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchReport({ data: { id: reportId } })
      .then((r) =>
        setState({
          kind: "ok",
          name: r.student_first_name,
          report: r.report,
          studentId: r.student_id,
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
        <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Hm.</p>
          <h1 className="mt-2 font-display text-3xl">We couldn't open that report.</h1>
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
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Reports", to: "/reports" },
            { label: state.name },
          ]}
        />
      </div>
      <ReportView
        name={state.name}
        report={state.report}
        onReset={() => navigate({ to: "/reports" })}
        resetLabel="Back to my reports"
        saved={!!state.studentId}
        saveLabel={students.length > 0 ? "Save to student profile" : undefined}
        onSaveToProfile={
          students.length > 0 && !state.studentId
            ? () => handleLink(students[0].id)
            : undefined
        }
      />

      {/* Link to student */}
      <section className="no-print mx-auto max-w-4xl px-4 pb-6 sm:px-6 lg:px-8">
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

      {/* Share panel */}
      <section className="no-print mx-auto max-w-4xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Secure sharing
              </p>
              <h2 className="mt-2 font-display text-2xl">Share this report</h2>
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
    </SiteShell>
  );
}
