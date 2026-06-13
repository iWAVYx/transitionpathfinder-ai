import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/framework")({
  beforeLoad: () => {
    throw redirect({ to: "/programs/transitionforward", replace: true });
  },
});
