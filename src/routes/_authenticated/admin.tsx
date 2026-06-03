import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /admin route — consolidated into the Admin Hub at /owner.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/owner", replace: true });
  },
  component: () => null,
});
