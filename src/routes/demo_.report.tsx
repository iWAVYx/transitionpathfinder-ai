import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { PathwayReport } from "@/components/demo/PathwayReport";
import { useDemoStudent } from "@/lib/demo/use-demo-student";

// Legacy /demo/report URL — now renders the age-aware Pathway Report
// generated from the actively selected fictional demo profile. The URL
// stays stable (external links / tests depend on it); switching the
// student in the header re-renders the report instantly.
export const Route = createFileRoute("/demo_/report")({
  head: () => ({
    meta: [
      { title: "Demo — TransitionForward" },
      {
        name: "description",
        content:
          "Public sample Pathway Report generated live from a fictional student profile. Sample data only.",
      },
    ],
  }),
  component: DemoReportPage,
});

function DemoReportPage() {
  const { profile } = useDemoStudent();
  return (
    <SiteShell>
      <DemoRoleLens />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Public Demo · Pathway Report
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Age-Aware Pathway Generation
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Choose a fictional student to see how the pathway engine
              tailors the report to their grade, product, evidence, and
              voice — while filtering out themes that don't belong yet.
            </p>
          </div>
          <StudentSwitcher />
        </div>
        <PathwayReport profile={profile} />
      </div>
    </SiteShell>
  );
}
