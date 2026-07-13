import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Compass, Loader2, FileText, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PathwayConnectionsCard,
  PathwayNextStepsCard,
} from "@/components/pathway/PathwayConnectionsCard";
import { OpportunityPipelineSummary } from "@/components/opportunities/OpportunityPipelineSummary";
import { PathwayTimeline } from "@/components/pathway/PathwayTimeline";
import { MissingInputsPanel } from "@/components/pathway/MissingInputsPanel";
import { ReadinessScorecard } from "@/components/pathway/ReadinessScorecard";
import { RoleActionPlan } from "@/components/pathway/RoleActionPlan";
import { PlainLanguageCard } from "@/components/pathway/PlainLanguageCard";
import { CollaborationFlags } from "@/components/collaboration/CollaborationFlags";
import { listStudents, type Student } from "@/lib/students.functions";
import { listMyReports, type ReportListRow } from "@/lib/pathway.functions";


export const Route = createFileRoute("/_authenticated/pathway/student")({
  head: () => ({
    meta: [
      { title: "My Pathway — TransitionForward" },
      {
        name: "description",
        content:
          "Your plan in your words — readiness across employment, learning, independent living, and self-advocacy.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/pathway/student">
      <StudentPathwayPage />
    </RoleGuard>
  ),
});

function StudentPathwayPage() {
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
      <main data-testid="student-pathway-page" className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs trail={[{ label: "My Pathway" }]} />
        <div className="mt-4">
          <PathwayTimeline />
        </div>
        <header className="mt-6 mb-6">
          <div className="flex items-center gap-3">
            <Compass className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">My Pathway</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Your plan in your words. This is the student view — friendlier language, focused
            on what you want next.
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
              Once your account is linked to a student profile, your pathway shows here.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : latest ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
          <div className="space-y-6">
            <CollaborationFlags
              flags={[
                { key: "student_voice" },
                { key: "parent_input" },
                { key: "partner_match" },
              ]}
            />
            <MissingInputsPanel />
            <ReadinessScorecard />
            <PlainLanguageCard />
            <RoleActionPlan defaultRole="student" />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Latest Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generated {new Date(latest.created_at).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/reports/$reportId" params={{ reportId: latest.id }}>
                      Open My Report <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/pathway">Update My Pathway</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <PathwayNextStepsCard role="student" hasReport />
            <PathwayConnectionsCard role="student" />
            {students[0] && (
              <OpportunityPipelineSummary
                studentId={students[0].id}
                studentDisplayName={students[0].first_name || undefined}
              />)}
          </div>
        ) : (
          <div className="space-y-6">
            <MissingInputsPanel />
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
              <h2 className="text-lg font-medium">No Pathway Report Yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start your pathway to generate your first plan in your own words.
              </p>
              <Button asChild className="mt-4">
                <Link to="/pathway">Start my pathway</Link>
              </Button>
            </div>
            <PathwayNextStepsCard role="student" hasReport={false} />
            <PathwayConnectionsCard role="student" />
          </div>
        )}

      </main>
    </SiteShell>
  );
}
