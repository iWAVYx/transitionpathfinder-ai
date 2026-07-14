import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/school/history")({
  head: () => ({
    meta: [
      { title: "School Records & Disclosure History — TransitionForward" },
      {
        name: "description",
        content:
          "Audit trail of document access, sharing changes, meetings, and plan edits across students in your school.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/school/history">
      <SchoolHistoryPage />
    </RoleGuard>
  ),
});

function SchoolHistoryPage() {
  return (
    <SiteShell>
      <main
        data-testid="school-history-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Records & Disclosure History" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Records & Disclosure History
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Per-student audit trail for document access, sharing changes,
            plan edits, and meeting activity. Use this for FERPA disclosure
            logging and compliance review.
          </p>
        </header>

        <StudentActivityHistory
          emptyCta={{ label: "Open school overview", to: "/school/overview" }}
        />

        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}
