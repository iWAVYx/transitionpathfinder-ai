import { createFileRoute, redirect } from "@tanstack/react-router";

import { ensureRoleAccess } from "@/lib/route-role-guard";

// The private /owner surface is both the Owner Hub and its dashboard.
// Preserve this legacy URL as a protected compatibility redirect instead of
// maintaining a second, demo-backed owner dashboard.
export const Route = createFileRoute("/_authenticated/hubs/admin")({
  beforeLoad: () => {
    ensureRoleAccess(["admin"]);
    throw redirect({ to: "/owner", replace: true });
  },
  head: () => ({
    meta: [{ title: "Admin Hub — TransitionForward" }, { name: "robots", content: "noindex" }],
  }),
});
