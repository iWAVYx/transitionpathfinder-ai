import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gauge, Loader2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
  listCaseloadReadiness,
  type CaseloadReadinessRow,
} from "@/lib/educator.functions";

export const Route = createFileRoute("/_authenticated/educator/readiness-gaps")({
  head: () => ({
    meta: [
      { title: "Readiness Gaps — TransitionForward" },
      {
        name: "description",
        content:
          "Which students on your caseload have the biggest readiness gaps — and where to focus first.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/educator/readiness-gaps">
      <EducatorReadinessGapsPage />
    </RoleGuard>
  ),
});

const PILLAR_LABEL: Record<string, string> = {
  employment: "Employment",
  education: "Education",
  independent_living: "Independent Living",
  self_advocacy: "Self-Advocacy",
};

function EducatorReadinessGapsPage() {
  const load = useServerFn(listCaseloadReadiness);
  const [rows, setRows] = useState<CaseloadReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load()
      .then(({ rows }) => setRows(rows))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <SiteShell>
      <main
        data-testid="educator-readiness-gaps-page"
        className="mx-auto max-w-6xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Readiness Gaps" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Gauge className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Readiness Gaps
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Caseload-wide view of the four transition pillars. Lowest overall
            scores appear first — that's where to focus.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading readiness…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No caseload yet"
            body="Once students are assigned to you or added by families, their readiness scores appear here."
            cta={{ label: "Open caseload", to: "/caseload" }}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Overall</th>
                  <th className="p-3">Employment</th>
                  <th className="p-3">Education</th>
                  <th className="p-3">Ind. Living</th>
                  <th className="p-3">Self-Advocacy</th>
                  <th className="p-3">Biggest Gap</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student_id} className="border-t">
                    <td className="p-3 font-medium">
                      <Link
                        to="/students/$id"
                        params={{ id: r.student_id }}
                        className="hover:underline"
                      >
                        {r.student_name}
                      </Link>
                    </td>
                    <td className="p-3">
                      <ScoreCell value={r.overall} />
                    </td>
                    <td className="p-3">
                      <ScoreCell value={r.employment} />
                    </td>
                    <td className="p-3">
                      <ScoreCell value={r.education} />
                    </td>
                    <td className="p-3">
                      <ScoreCell value={r.independent_living} />
                    </td>
                    <td className="p-3">
                      <ScoreCell value={r.self_advocacy} />
                    </td>
                    <td className="p-3">
                      {r.gap_pillar ? (
                        <Badge variant="secondary">
                          {PILLAR_LABEL[r.gap_pillar] ?? r.gap_pillar}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const tone =
    value >= 75
      ? "text-emerald-600"
      : value >= 50
        ? "text-amber-600"
        : "text-rose-600";
  return <span className={`font-medium ${tone}`}>{value}</span>;
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; to: string };
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-4">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}
