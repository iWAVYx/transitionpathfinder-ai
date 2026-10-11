import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useLinkedPathway } from "@/components/pathway/useLinkedPathway";


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
  const { students, student, studentId, setStudentId, latest, loading, error, retry } = useLinkedPathway();

  return (
    <SiteShell>
      <main data-testid="student-pathway-page" className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs trail={[{ label: "My Pathway" }]} />
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

        {!loading && !error && students.length > 1 && (
          <div className="mb-6">
            <label htmlFor="pathway-student" className="block text-sm font-medium">Student</label>
            <select id="pathway-student" value={studentId} onChange={event => setStudentId(event.target.value)}
              className="mt-2 w-full min-w-0 rounded-md border bg-background p-2">
              {students.map(student => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
            </select>
          </div>
        )}
        {error ? (
          <div role="alert" className="rounded-lg border p-6">
            <p>Your pathway could not be loaded. Please try again.</p>
            <Button className="mt-3" onClick={retry}>Try Again</Button>
          </div>
        ) : loading ? (
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
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Latest Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generated {new Date(latest.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm">{latest.summary || "Open your report to review its recorded goals and next steps. A summary is not available here yet."}</p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/reports/$reportId" params={{ reportId: latest.id }}>
                      Open My Report <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/student-voice">Update My Student Voice</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <PathwayNextStepsCard role="student" hasReport />
            <PathwayConnectionsCard role="student" />
            {student && (
              <OpportunityPipelineSummary
                key={student.id}
                studentId={student.id}
                studentDisplayName={student.first_name || undefined}
              />)}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
              <h2 className="text-lg font-medium">No Pathway Report Yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Share your interests and priorities, then ask your team about creating your first report.
              </p>
              <Button asChild className="mt-4">
                <Link to="/student-voice">Share My Student Voice</Link>
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
