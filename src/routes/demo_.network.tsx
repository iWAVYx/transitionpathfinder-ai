import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy alias: the standalone Partner Network demo page was removed.
// Matches now live inline on /demo/opportunities via the shared matcher.
export const Route = createFileRoute("/demo_/network")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/opportunities" });
  },
});
