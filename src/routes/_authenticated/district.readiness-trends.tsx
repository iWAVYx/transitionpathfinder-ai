import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  getDistrictReadinessTrends,
  type ReadinessTrendData,
} from "@/lib/school-insights.functions";
import { TrendsView } from "./school.readiness-trends";

export const Route = createFileRoute("/_authenticated/district/readiness-trends")({
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "District Readiness Trends — TransitionForward" },
      {
        name: "description",
        content:
          "District-wide movement across the readiness domains — aggregated across every connected school.",
      },
    ],
  }),
  component: DistrictReadinessTrendsPage,
});

function DistrictReadinessTrendsPage() {
  const { data: dash, loading: dashLoading, districtId, reload } = useDistrictDashboard();
  const fetchTrends = useServerFn(getDistrictReadinessTrends);
  const [trend, setTrend] = useState<ReadinessTrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setTrendLoading(true);
      try {
        const d = await fetchTrends({ data: districtId ? { district_id: districtId } : {} });
        if (alive) setTrend(d);
      } finally {
        if (alive) setTrendLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchTrends, districtId]);

  return (
    <DistrictPageShell
      path="/district/readiness-trends"
      title="Readiness Trends"
      subtitle="Average readiness score per pillar, rolled up across every school in your district."
      data={dash}
      loading={dashLoading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {() => <TrendsView data={trend} loading={trendLoading} scopeLabel="district" />}
    </DistrictPageShell>
  );
}
