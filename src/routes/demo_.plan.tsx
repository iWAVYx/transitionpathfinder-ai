import { createFileRoute } from "@tanstack/react-router";
import { LegacyDemoStagePage } from "@/components/demo/LegacyDemoStagePage";

// Legacy /demo/plan URL alias — renders the "school" Transition
// Workspace stage inline while keeping this URL. Do NOT redirect to
// /demo/workspace/* — external links, bookmarks, and tests depend on
// this URL staying stable.
export const Route = createFileRoute("/demo_/plan")({
  head: () => ({
    meta: [
      { title: "Demo — TransitionForward" },
      { name: "description", content: "Public sample workspace step. Sample data only." },
    ],
  }),
  component: () => <LegacyDemoStagePage stageId="school" legacyPath="/demo/plan" />,
});
