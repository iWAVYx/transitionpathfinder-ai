import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyWorkspaceRedirect } from "@/lib/demo/nav";

// Legacy Transition Studio route — folded into the Workspace Tour so
// there is a single public demo experience. Redirects to the matching
// Workspace Tour stage with its full-sample panel already expanded and
// preserves any incoming ?role= param so back-navigation returns to the
// correct role preview.
export const Route = createFileRoute("/demo_/resources")({
  validateSearch: (raw: Record<string, unknown>) => raw,
  beforeLoad: ({ search }) => {
    throw redirect(legacyWorkspaceRedirect("connect", search));
  },
});
