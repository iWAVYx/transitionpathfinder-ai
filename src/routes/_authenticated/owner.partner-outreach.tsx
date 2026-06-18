import { createFileRoute, redirect } from "@tanstack/react-router";

// Slice 5 — Owner Hub reorganization: collapse the two parallel outreach
// surfaces into a single /owner/outreach pipeline so admins triage every
// pilot/partner conversation in one place. The partner-specific log is
// reachable from there.
export const Route = createFileRoute("/_authenticated/owner/partner-outreach")({
  beforeLoad: () => {
    throw redirect({ to: "/owner/outreach", replace: true });
  },
});
