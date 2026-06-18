import { createFileRoute, redirect } from "@tanstack/react-router";

// Slice 2 — Public IA cohesion: collapse the parallel partner-acquisition
// funnel. /partner-interest used to host its own application form; all
// partner intent now flows through the single waitlist with the partner
// door pre-selected so admins see one triage queue.
export const Route = createFileRoute("/partner-interest")({
  beforeLoad: () => {
    throw redirect({
      to: "/waitlist",
      search: { audience: "partner" },
      replace: true,
    });
  },
});
