import { createFileRoute } from "@tanstack/react-router";
import { DemoPathwayBuilder } from "@/components/demo/DemoPathwayBuilder";

// Preserve the bookmarked URL while showing the shared Pathway Builder demo.
export const Route = createFileRoute("/demo_/intake")({
  head: () => ({
    meta: [
      { title: "Demo — TransitionForward" },
      { name: "description", content: "Public sample workspace step. Sample data only." },
    ],
  }),
  component: DemoPathwayBuilder,
});
