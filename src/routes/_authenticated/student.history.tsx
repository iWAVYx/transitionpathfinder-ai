import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/student/history")({
  head: () => ({
    meta: [
      { title: "My Access History — TransitionForward" },
      {
        name: "description",
        content:
          "See who has viewed, downloaded, or updated your transition plan and documents.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/student/history">
      <StudentHistoryPage />
    </RoleGuard>
  ),
});

function StudentHistoryPage() {
  return (
    <SiteShell>
      <main
        data-testid="student-history-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "My Access History" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              My Access History
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            This is your record. It shows who has looked at your plan,
            downloaded a document, or updated a goal — with the date and
            the person's name or email.
          </p>
        </header>

        <StudentActivityHistory
          emptyCta={{ label: "Open my plan", to: "/pathway" }}
        />

        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}
