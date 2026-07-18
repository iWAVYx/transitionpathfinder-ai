/**
 * Centralized demo role-switch routing.
 *
 * Two systems, kept separate on purpose:
 *
 *   1. Role switching answers: "Which role experience should open now?"
 *      Handled here via `resolveDemoRoleDestination`.
 *   2. Back navigation answers: "Where did I arrive from within this role
 *      workflow?" Handled by per-page `backTo` / `backTargetFromWorkspace`
 *      state — NOT by this resolver.
 *
 * Root cause of the previous bug: role-switch code read a shared
 * `lastWorkspaceStage` memory and used it as the default destination for
 * Student / Parent / Educator, so Partner → Student incorrectly opened
 * the Transition Workspace. This module is the single source of truth
 * and never restores a Transition Workspace stage during a role switch
 * unless the visitor is *currently inside* the Workspace.
 */

import {
  DEMO_ROLES,
  DEMO_ROLE_ORDER,
  type DemoRoleId,
} from "@/lib/demo/role-previews";
import {
  getDemoFeature,
  type DemoRole,
} from "@/lib/demo/feature-routes";

/** Roles that render inside the Transition Workspace shell. */
export const WORKSPACE_ROLE_IDS: readonly DemoRoleId[] = [
  "student",
  "family",
  "educator",
];

export function isWorkspaceRoleId(id: DemoRoleId): boolean {
  return (WORKSPACE_ROLE_IDS as readonly string[]).includes(id);
}

/** Route capability categories used by the resolver. */
export type DemoRouteKind =
  | "role-dashboard"
  | "transition-workspace"
  | "shared-role-feature"
  | "pathway-report"
  | "demo-overview"
  | "admin-hub"
  | "role-only-feature"
  | "unknown";

export type DemoRouteInfo = {
  kind: DemoRouteKind;
  /** Present for role-dashboard and shared-role-feature routes. */
  role?: DemoRoleId | DemoRole;
  /** Transition Workspace stage id (e.g. "roadmap"). */
  stage?: string;
  /** Feature slug for `/demo/feature/<role>/<slug>`. */
  slug?: string;
};

/**
 * Classify a demo pathname into a route capability category.
 *
 * NOTE: legacy `/demo/<step>` aliases (voice, plan, meeting, etc.) render
 * the Transition Workspace inline via LegacyDemoStagePage. They are
 * treated as `transition-workspace` for role-switch purposes so the
 * workspace exception applies.
 */
export function classifyDemoRoute(pathname: string): DemoRouteInfo {
  // Normalize — strip query/hash if the caller passed a full URL.
  const p = pathname.split(/[?#]/)[0];

  if (p === "/demo") return { kind: "demo-overview" };
  if (p === "/demo/report") return { kind: "pathway-report" };

  const ws = p.match(/^\/demo\/workspace\/([^/]+)/);
  if (ws) return { kind: "transition-workspace", stage: ws[1] };

  const feat = p.match(/^\/demo\/feature\/([^/]+)\/([^/]+)/);
  if (feat) {
    return {
      kind: "shared-role-feature",
      role: feat[1] as DemoRole,
      slug: feat[2],
    };
  }

  const single = p.match(/^\/demo\/([^/]+)$/);
  if (single) {
    const seg = single[1];
    if ((DEMO_ROLE_ORDER as readonly string[]).includes(seg)) {
      return { kind: "role-dashboard", role: seg as DemoRoleId };
    }
    // Any other single-segment /demo/<slug> is a legacy workspace step
    // (rendered via LegacyDemoStagePage). Treat as transition-workspace
    // so the workspace exception applies to Student/Parent/Educator.
    return { kind: "transition-workspace" };
  }

  return { kind: "unknown" };
}

/** Canonical dashboard URL for each demo role. Never returns a workspace URL. */
export function canonicalDemoDashboard(role: DemoRoleId): string {
  return DEMO_ROLES[role].path;
}

/**
 * Whether a shared feature page has content for the target role. Based on
 * the same REGISTRY that powers `/demo/feature/<role>/<slug>`.
 */
export function sharedFeatureSupportsRole(
  slug: string,
  role: DemoRoleId,
): boolean {
  return getDemoFeature(role as DemoRole, slug) !== null;
}

export type ResolvedRoleDestination = {
  to: string;
  search?: Record<string, string>;
};

/**
 * Single resolver used by every role switcher in the public demo.
 *
 *   1. currentRoute is a Transition Workspace URL and targetRole is a
 *      workspace role → stay on the same stage (perspective changes in
 *      place). Any other target → target's canonical dashboard.
 *   2. currentRoute is a shared-role-feature URL and target supports
 *      that feature → stay on the feature route with the target role.
 *      Otherwise → target's canonical dashboard.
 *   3. Otherwise → target's canonical dashboard.
 *
 * This resolver NEVER consults a "last visited workspace" memory. The
 * only way a role switch keeps you in the Workspace is if you are
 * currently inside the Workspace when you switch.
 */
export function resolveDemoRoleDestination(args: {
  currentPath: string;
  targetRole: DemoRoleId;
  studentId?: string;
}): ResolvedRoleDestination {
  const { currentPath, targetRole, studentId } = args;
  const info = classifyDemoRoute(currentPath);
  const studentQs = studentId ? { student: studentId } : undefined;

  // 1. Transition Workspace exception — only when currently inside it.
  if (info.kind === "transition-workspace") {
    if (isWorkspaceRoleId(targetRole) && info.stage) {
      return {
        to: `/demo/workspace/${info.stage}`,
        search: studentQs,
      };
    }
    // Non-workspace target → exit to canonical dashboard.
    return { to: canonicalDemoDashboard(targetRole), search: studentQs };
  }

  // 2. Shared feature page — preserve if target supports it.
  if (info.kind === "shared-role-feature" && info.slug) {
    if (sharedFeatureSupportsRole(info.slug, targetRole)) {
      return { to: `/demo/feature/${targetRole}/${info.slug}` };
    }
    return { to: canonicalDemoDashboard(targetRole), search: studentQs };
  }

  // 3. Pathway report is workspace-adjacent — workspace roles may stay.
  if (info.kind === "pathway-report") {
    if (isWorkspaceRoleId(targetRole)) {
      return { to: "/demo/report", search: studentQs };
    }
    return { to: canonicalDemoDashboard(targetRole), search: studentQs };
  }

  // Default: canonical dashboard.
  return { to: canonicalDemoDashboard(targetRole), search: studentQs };
}

/**
 * Convenience: build a plain href string from a resolved destination.
 * Used by role-switcher chips that render an `<a>` for accessibility.
 */
export function toHref(dest: ResolvedRoleDestination): string {
  const params = dest.search
    ? new URLSearchParams(
        Object.entries(dest.search).filter(([, v]) => v !== undefined && v !== ""),
      )
    : null;
  const qs = params && params.toString() ? `?${params.toString()}` : "";
  return `${dest.to}${qs}`;
}
