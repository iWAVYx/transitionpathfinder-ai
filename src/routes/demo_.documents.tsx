import { createFileRoute } from "@tanstack/react-router";
import { LegacyDemoStagePage } from "@/components/demo/LegacyDemoStagePage";

// Legacy /demo/documents URL alias — renders the "evidence" Transition
// Workspace stage inline while keeping this URL. Do NOT redirect to
// /demo/workspace/* — external links, bookmarks, and tests depend on
// this URL staying stable.
export const Route = createFileRoute("/demo_/documents")({
  head: () => ({
    meta: [
      { title: "Demo — TransitionForward" },
      { name: "description", content: "Public sample workspace step. Sample data only." },
    ],
  }),
  component: () => <LegacyDemoStagePage stageId="evidence" legacyPath="/demo/documents" />,
});
