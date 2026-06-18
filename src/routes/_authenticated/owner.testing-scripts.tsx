import { createFileRoute, redirect } from "@tanstack/react-router";

// Slice 5 — Owner Hub reorganization: the readonly "Testing Scripts" listing
// was redundant with /owner/testing, which already renders the same scripts
// alongside per-step pass/fail tracking. Collapse into the single surface.
export const Route = createFileRoute("/_authenticated/owner/testing-scripts")({
  beforeLoad: () => {
    throw redirect({ to: "/owner/testing", replace: true });
  },
});
