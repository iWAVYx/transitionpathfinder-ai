import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/educator/history")({
  head: () => ({
    meta: [
      { title: "Student Activity History — TransitionForward" },
      {
        name: "description",
        content:
          "Access, upload, edit, and sharing history across your caseload — for progress notes, PPT prep, and disclosure records.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/educator/history">
      <EducatorHistoryPage />
    </RoleGuard>
  ),
});

function EducatorHistoryPage() {
  return (
    <SiteShell>
      <main
        data-testid="educator-history-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Student Activity History" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Student Activity History
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            An evidence trail for each student on your caseload — every
            document view, upload, edit, meeting note, and sharing change.
            Useful for PPT prep, progress reporting, and disclosure records.
          </p>
        </header>

        <StudentActivityHistory
          emptyCta={{ label: "Open caseload", to: "/caseload" }}
        />

        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}
