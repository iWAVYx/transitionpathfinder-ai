import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Loader2, FileText, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PathwayConnectionsCard,
  PathwayNextStepsCard,
} from "@/components/pathway/PathwayConnectionsCard";
import { listStudents, type Student } from "@/lib/students.functions";
import { listMyReports, type ReportListRow } from "@/lib/pathway.functions";


export const Route = createFileRoute("/_authenticated/pathway/family")({
  head: () => ({
    meta: [
      { title: "Pathway Report — Family View — TransitionForward" },
      {
        name: "description",
        content:
          "The family-friendly view of your student's Pathway Report — priorities, matched pathways, and next steps.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/pathway/family">
      <FamilyPathwayPage />
    </RoleGuard>
  ),
});

function FamilyPathwayPage() {
  const loadStudents = useServerFn(listStudents);
  const loadReports = useServerFn(listMyReports);

  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<ReportListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ students }, { reports }] = await Promise.all([
          loadStudents(),
          loadReports(),
        ]);
        setStudents(students);
        setReports(reports);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStudents, loadReports]);

  const latest = reports[0];

  return (
    <SiteShell>
      <main
        data-testid="family-pathway-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Pathway — Family View" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Pathway Report — Family View
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            The plan in plain language — designed to walk the family through
            what's next, together.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <h2 className="text-lg font-medium">No student connected yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Once your student is linked to your account, the family view of
              their Pathway Report shows here.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : latest ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Latest report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generated {new Date(latest.created_at).toLocaleDateString()}
                </p>
                {latest.summary && (
                  <p className="text-sm">{latest.summary}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: latest.id }}
                    >
                      Open family report{" "}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/family/priorities">Update priorities</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What the family view covers</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Your priorities",
                    "What matters most for life after high school.",
                  ],
                  [
                    "Recommended pathways",
                    "The 2–3 directions that best fit your student.",
                  ],
                  [
                    "Next steps",
                    "Small, specific actions for family, educator, and student.",
                  ],
                  [
                    "Questions for the PPT",
                    "Ready-to-bring questions for the next meeting.",
                  ],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-md border p-4">
                    <div className="font-medium">{title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {body}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <PathwayNextStepsCard role="family" hasReport />
            <PathwayConnectionsCard role="family" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
              <h2 className="text-lg font-medium">No pathway report yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your family priorities and current intake, then generate your
                first Pathway Report.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Button asChild>
                  <Link to="/family/priorities">Set priorities</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/pathway">Start pathway</Link>
                </Button>
              </div>
            </div>
            <PathwayNextStepsCard role="family" hasReport={false} />
            <PathwayConnectionsCard role="family" />
          </div>
        )}

      </main>
    </SiteShell>
  );
}
