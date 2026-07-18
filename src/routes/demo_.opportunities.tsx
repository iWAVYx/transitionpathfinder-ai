import { createFileRoute } from "@tanstack/react-router";
import { LegacyDemoStagePage } from "@/components/demo/LegacyDemoStagePage";
import { OpportunityMatches } from "@/components/demo/OpportunityMatches";

// Legacy /demo/opportunities URL alias — renders the "connect" Transition
// Workspace stage inline plus the explainable partner-match preview
// scoped to the active demo profile.
export const Route = createFileRoute("/demo_/opportunities")({
  head: () => ({
    meta: [
      { title: "Demo — Opportunity Matches" },
      { name: "description", content: "Explainable partner-opportunity matching for the active demo profile. Sample data only." },
    ],
  }),
  component: () => (
    <LegacyDemoStagePage
      stageId="connect"
      legacyPath="/demo/opportunities"
      afterStage={<OpportunityMatches />}
    />
  ),
});
