import { createFileRoute, redirect } from "@tanstack/react-router";

// One shared demo destination for every role. Older bookmarks must not render
// a second, outdated dashboard or imply permission to provision demo accounts.
export const Route = createFileRoute("/_authenticated/demo-mode")({
  beforeLoad: () => {
    throw redirect({ to: "/demo", replace: true });
  },
});
