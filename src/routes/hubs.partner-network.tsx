import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hubs/partner-network")({
  beforeLoad: () => {
    throw redirect({ to: "/partnerforward", replace: true });
  },
  component: () => null,
});
