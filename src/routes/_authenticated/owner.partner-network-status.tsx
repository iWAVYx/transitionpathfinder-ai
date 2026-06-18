import { createFileRoute, redirect } from "@tanstack/react-router";

// Slice 5 — Owner Hub reorganization: /owner/partner-network-status was a
// separate operational dashboard of the same partner-network surfaces shown
// on /owner/partner-network. Fold into the single Partner Network page so
// admins manage and monitor the network in one place.
export const Route = createFileRoute("/_authenticated/owner/partner-network-status")({
  beforeLoad: () => {
    throw redirect({ to: "/owner/partner-network", replace: true });
  },
});
