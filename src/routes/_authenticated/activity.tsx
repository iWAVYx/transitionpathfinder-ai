import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ActivityHistoryList } from "@/components/next-actions/ActivityHistoryList";
import { DEMO_ACTIVITY_HISTORY } from "@/lib/next-actions/demo-fixtures";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity History — TransitionForward" },
      {
        name: "description",
        content:
          "Full record of uploads, completed actions, report updates, meetings, and access changes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  // Uses demo fixtures until the signed-in fetcher is wired per role.
  // Rows still respect RLS on the server side once real data lands.
  const events = [
    ...DEMO_ACTIVITY_HISTORY.family,
    ...DEMO_ACTIVITY_HISTORY.educator,
    ...DEMO_ACTIVITY_HISTORY.student,
  ];
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <DashboardSection
          eyebrow="Recordkeeping"
          title="Activity History"
          description="Everything that has been uploaded, completed, updated, shared, or approved — in one place."
        >
          <ActivityHistoryList events={events} />
        </DashboardSection>
      </main>
    </SiteShell>
  );
}
