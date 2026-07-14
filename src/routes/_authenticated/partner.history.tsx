import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/partner/history")({
  head: () => ({
    meta: [
      { title: "Student Connection History — TransitionForward" },
      {
        name: "description",
        content:
          "Record of student connections, resource shares, and opportunity referrals tied to your partner organization.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/partner/history">
      <PartnerHistoryPage />
    </RoleGuard>
  ),
});

function PartnerHistoryPage() {
  return (
    <SiteShell>
      <main
        data-testid="partner-history-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Connection History" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Student Connection History
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Record of the students who have connected with your organization,
            the resources you've shared, and follow-up activity. Only students
            who granted your organization access appear here.
          </p>
        </header>

        <StudentActivityHistory
          emptyCta={{ label: "Open opportunities", to: "/opportunities" }}
        />

        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}
