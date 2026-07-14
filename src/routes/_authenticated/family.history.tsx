import { createFileRoute, Link } from "@tanstack/react-router";
import { History, MessageSquare } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/family/history")({
  head: () => ({
    meta: [
      { title: "Access & Activity History — TransitionForward" },
      {
        name: "description",
        content:
          "See every time someone viewed, downloaded, edited, or shared your student's plan and documents.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/family/history">
      <FamilyHistoryPage />
    </RoleGuard>
  ),
});

function FamilyHistoryPage() {
  return (
    <SiteShell>
      <main
        data-testid="family-history-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Access & Activity History" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Access & Activity History
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Every time someone views, downloads, edits, or shares your
            student's plan or documents, it's recorded here. You can review
            the full record and act on anything that looks off.
          </p>
        </header>

        <StudentActivityHistory
          emptyCta={{ label: "Review sharing & consent", to: "/family/consent" }}
          footer={
            <aside className="mt-8 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">See something unexpected?</div>
                  <p className="mt-1 text-muted-foreground">
                    You can revoke a person's access at any time in{" "}
                    <Link
                      to="/family/consent"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Sharing & Consent
                    </Link>
                    , or reach the team from{" "}
                    <Link
                      to="/messages"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Messages
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </aside>
          }
        />

        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}
