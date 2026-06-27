import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hubs/bridgeforward")({
  beforeLoad: () => {
    throw redirect({ to: "/bridgeforward", replace: true });
  },
  component: () => null,
});
