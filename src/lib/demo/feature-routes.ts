/**
 * Single source of truth for demo-mode feature previews.
 *
 * Every role dashboard (Student / Family / Educator / School Admin /
 * District Admin / Partner / Owner) has tiles with a "Preview" button.
 * In demo mode every (role, featureId) pair resolves to a dedicated
 * demo feature page at `/demo/feature/<role>/<slug>` that renders the
 * same visual contract as the drawer body, wrapped in a full-page
 * shell with sample data + back-to-role-dashboard navigation.
 *
 * The dynamic route `src/routes/demo_.feature.$role.$slug.tsx` looks up
 * the entry here and renders <DemoFeatureShell>.
 */

import {
  STUDENT_FEATURE_DETAILS,
  type StudentFeatureId,
  type StudentFeatureDetail,
} from "@/lib/demo/student/feature-details";
import {
  PARENT_FEATURE_DETAILS,
  type ParentFeatureId,
  type ParentFeatureDetail,
} from "@/lib/demo/parent/feature-details";
import {
  EDUCATOR_FEATURE_DETAILS,
  type EducatorFeatureId,
  type EducatorFeatureDetail,
} from "@/lib/demo/educator/feature-details";
import {
  SCHOOL_ADMIN_FEATURE_DETAILS,
  type SchoolAdminFeatureId,
  type SchoolAdminFeatureDetail,
} from "@/lib/demo/school-admin/feature-details";
import {
  DISTRICT_ADMIN_FEATURE_DETAILS,
  type DistrictAdminFeatureId,
  type DistrictAdminFeatureDetail,
} from "@/lib/demo/district-admin/feature-details";
import {
  PARTNER_FEATURE_DETAILS,
  type PartnerFeatureId,
  type PartnerFeatureDetail,
} from "@/lib/demo/partner/feature-details";
import {
  OWNER_FEATURE_DETAILS,
  type OwnerFeatureId,
  type OwnerFeatureDetail,
} from "@/lib/demo/owner/feature-details";

export type DemoRole =
  | "student"
  | "family"
  | "educator"
  | "school-admin"
  | "district-admin"
  | "partner"
  | "owner";

/** Uniform shape shared by every role's feature-details map. */
export type DemoFeatureDetail =
  | StudentFeatureDetail
  | ParentFeatureDetail
  | EducatorFeatureDetail
  | SchoolAdminFeatureDetail
  | DistrictAdminFeatureDetail
  | PartnerFeatureDetail
  | OwnerFeatureDetail;

const REGISTRY: Record<DemoRole, Record<string, DemoFeatureDetail>> = {
  student: STUDENT_FEATURE_DETAILS as Record<StudentFeatureId, StudentFeatureDetail>,
  family: PARENT_FEATURE_DETAILS as Record<ParentFeatureId, ParentFeatureDetail>,
  educator: EDUCATOR_FEATURE_DETAILS as Record<EducatorFeatureId, EducatorFeatureDetail>,
  "school-admin": SCHOOL_ADMIN_FEATURE_DETAILS as Record<
    SchoolAdminFeatureId,
    SchoolAdminFeatureDetail
  >,
  "district-admin": DISTRICT_ADMIN_FEATURE_DETAILS as Record<
    DistrictAdminFeatureId,
    DistrictAdminFeatureDetail
  >,
  partner: PARTNER_FEATURE_DETAILS as Record<PartnerFeatureId, PartnerFeatureDetail>,
  owner: OWNER_FEATURE_DETAILS as Record<OwnerFeatureId, OwnerFeatureDetail>,
};

const ROLE_DASHBOARD: Record<DemoRole, string> = {
  student: "/demo/student",
  family: "/demo/family",
  educator: "/demo/educator",
  "school-admin": "/demo/school-admin",
  "district-admin": "/demo/district-admin",
  partner: "/demo/partner",
  owner: "/demo/owner",
};

const ROLE_LABEL: Record<DemoRole, string> = {
  student: "Student Dashboard",
  family: "Family Dashboard",
  educator: "Educator Dashboard",
  "school-admin": "School Admin Dashboard",
  "district-admin": "District Admin Dashboard",
  partner: "Partner Dashboard",
  owner: "Owner Hub",
};

export function isDemoRole(v: unknown): v is DemoRole {
  return typeof v === "string" && v in REGISTRY;
}

export function getDemoFeature(
  role: DemoRole,
  slug: string,
): DemoFeatureDetail | null {
  return REGISTRY[role]?.[slug] ?? null;
}

export function demoRoleDashboardPath(role: DemoRole): string {
  return ROLE_DASHBOARD[role];
}

export function demoRoleDashboardLabel(role: DemoRole): string {
  return ROLE_LABEL[role];
}

/** Every (role, featureId) pair for the audit + inventory snapshot. */
export function listDemoFeatures(): Array<{
  role: DemoRole;
  featureId: string;
  detail: DemoFeatureDetail;
}> {
  const out: Array<{ role: DemoRole; featureId: string; detail: DemoFeatureDetail }> = [];
  for (const role of Object.keys(REGISTRY) as DemoRole[]) {
    for (const [featureId, detail] of Object.entries(REGISTRY[role])) {
      out.push({ role, featureId, detail });
    }
  }
  return out;
}

/**
 * Resolve the demo-mode CTA target for a tile. Prefers the dedicated
 * demo feature page. Falls back to the role dashboard so we never
 * dead-end a preview.
 */
export function resolveDemoFeatureRoute(role: DemoRole, featureId: string): string {
  if (REGISTRY[role]?.[featureId]) {
    return `/demo/feature/${role}/${featureId}`;
  }
  return ROLE_DASHBOARD[role];
}
