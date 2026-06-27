import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hubs/school-district")({
  beforeLoad: () => {
    throw redirect({ to: "/educators", replace: true });
  },
  component: () => null,
});
