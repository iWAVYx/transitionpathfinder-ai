import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hubs/family-resource")({
  beforeLoad: () => {
    throw redirect({ to: "/families", replace: true });
  },
  component: () => null,
});
