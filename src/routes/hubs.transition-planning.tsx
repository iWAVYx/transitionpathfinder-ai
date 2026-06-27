import { createFileRoute, redirect } from "@tanstack/react-router";

// Public hub URLs were removed 2026-06-27 — product hubs are signed-in only.
// Redirect to the Demo Workspace so any external link still lands safely.
export const Route = createFileRoute("/hubs/transition-planning")({
  beforeLoad: () => {
    throw redirect({ to: "/demo", replace: true });
  },
  component: () => null,
});
