import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy Transition Studio route — folded into the Workspace Tour so
// there is a single public demo experience. Redirects to the matching
// Workspace Tour stage with its full-sample panel already expanded.
export const Route = createFileRoute("/demo_/calendar")({
  beforeLoad: () => {
    throw redirect({
      to: "/demo/workspace/$stage",
      params: { stage: "connect" },
      search: { expand: true },
      replace: true,
    });
  },
});
