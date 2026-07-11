/**
 * Shared demo navigation model.
 *
 * Single source of truth for building links between:
 *   - /demo (overview)
 *   - /demo/<role> (role previews)
 *   - /demo/workspace/$stage (Workspace Tour, with optional ?role= and ?expand=)
 *
 * Every demo → workspace, workspace → report, and legacy redirect goes
 * through these helpers so back/forward always lands on the correct
 * role/stage/expanded-sample context.
 */

import type { StageId } from "@/lib/workspace/stages";
import {
  DEMO_ROLES,
  DEMO_ROLE_ORDER,
  type DemoRoleId,
} from "@/lib/demo/role-previews";

export type DemoWorkspaceSearch = {
  role?: DemoRoleId;
  expand?: boolean;
};

/** Coerce any incoming `role` search value into a valid DemoRoleId or undefined. */
export function coerceRole(raw: unknown): DemoRoleId | undefined {
  return typeof raw === "string" && (DEMO_ROLE_ORDER as string[]).includes(raw)
    ? (raw as DemoRoleId)
    : undefined;
}

/** Coerce any incoming `expand` search value (boolean | "true" | "1") into a boolean. */
export function coerceExpand(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "1";
}

/**
 * Build TanStack Router `<Link>` / `redirect()` args for a workspace stage,
 * preserving role and expand state when supplied.
 */
export function workspaceStageHref(
  stage: StageId,
  search: DemoWorkspaceSearch = {},
) {
  const cleanSearch: Record<string, string | boolean> = {};
  if (search.role) cleanSearch.role = search.role;
  if (search.expand) cleanSearch.expand = true;
  return {
    to: "/demo/workspace/$stage" as const,
    params: { stage },
    search: cleanSearch,
  };
}

/**
 * Compute the correct "Back" target when leaving the Workspace Tour.
 * If the visitor arrived from a role preview (encoded as ?role=X),
 * back returns to that role preview. Otherwise, back returns to the
 * Demo Overview.
 */
export function backTargetFromWorkspace(
  search: DemoWorkspaceSearch,
): { to: string; label: string } {
  const role = coerceRole(search.role);
  if (role) {
    const preview = DEMO_ROLES[role];
    return {
      to: preview.path,
      label: `Back To ${preview.label} Preview`,
    };
  }
  return { to: "/demo", label: "Back To Demo Overview" };
}
