import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /admin-school route — School Administrator workspace now lives at
// /school/overview (with its own sub-pages for team, reports, implementation).
export const Route = createFileRoute("/_authenticated/admin-school")({
  beforeLoad: () => {
    throw redirect({ to: "/school/overview", replace: true });
  },
  component: () => null,
});
