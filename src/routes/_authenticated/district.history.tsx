import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/district/history")({
  head: () => ({
    meta: [
      { title: "District Records & Disclosure History — TransitionForward" },
      {
        name: "description",
        content:
          "District-level audit trail of document access, sharing changes, and plan activity across accessible students.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/district/history">
      <DistrictHistoryPage />
    </RoleGuard>
  ),
});

function DistrictHistoryPage() {
  return (
    <SiteShell>
      <main
        data-testid="district-history-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Records & Disclosure History" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              District Records & Disclosure History
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Per-student audit trail for document access, sharing changes,
            plan edits, and meeting activity across the district. Use for
            compliance review and disclosure logging.
          </p>
        </header>

        <StudentActivityHistory
          emptyCta={{ label: "Open district overview", to: "/district/overview" }}
        />

        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}
