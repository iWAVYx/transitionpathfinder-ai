import { historyRouteErrorComponent } from "@/components/history/HistoryRouteError";
import { validateHistorySearch } from "@/lib/history-navigation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { History, MessageSquare } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { RoutedStudentActivityHistory } from "@/components/history/StudentActivityHistory";

export const Route = createFileRoute("/_authenticated/family/history")({
  validateSearch: validateHistorySearch,
  errorComponent: historyRouteErrorComponent("family"),
  head: () => ({
    meta: [
      { title: "Access & Activity History — TransitionForward" },
      {
        name: "description",
        content:
          "Review recorded recent access, updates, and sharing activity for your student's plan and documents.",
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
      <section
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
            Review recorded recent views, downloads, edits, and sharing
            activity for your student's plan or documents. You can check
            entries and follow up on anything that looks unexpected.
          </p>
        </header>

        <RoutedStudentActivityHistory
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
      </section>
    </SiteShell>
  );
}
