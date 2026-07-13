import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { CalendarDays } from "lucide-react";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/school/calendar")({
  head: () => ({
    meta: [
      { title: "School Calendar — TransitionForward" },
      {
        name: "description",
        content:
          "School-wide meetings, PPT blocks, transition planning deadlines, and staff PD dates in one calendar view.",
      },
    ],
  }),
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  errorComponent: dashboardErrorComponent("school_admin"),
  component: withRoleGuard(["school_admin", "admin"], SchoolCalendarPage),
});

function SchoolCalendarPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/calendar"
      title="School Calendar"
      subtitle="School-wide meetings, PPT blocks, transition deadlines, and staff PD in one view."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {() => (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span>Every school event on one calendar. Filters and export are available inside the calendar.</span>
          </div>
          <DashboardCalendar />
        </div>
      )}
    </SchoolPageShell>
  );
}
