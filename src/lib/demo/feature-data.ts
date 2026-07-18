/**
 * Central demo feature-data resolver.
 *
 * ONE typed resolver returns the correct profile-specific dataset for a
 * given (role, feature, activeDemoContext) triple. Every demo dashboard
 * tile preview, dashboard drawer, dedicated feature page, and detail
 * page reads from this same function so switching the selected profile
 * updates all sample data end-to-end.
 *
 *   activeDemoContext = { role, contextType, contextId }
 *
 *   Student / Family / Educator → contextType "student" → Student Journey.
 *   School Administrator        → contextType "school"  → School Profile.
 *   District Administrator      → contextType "district" → District Profile.
 *   Partner                     → contextType "plan"     → Free or Premium.
 *
 * The Owner role has no context selector today; it uses the static
 * registry from `feature-routes.ts`.
 */

import {
  getDemoFeature,
  type DemoFeatureDetail,
  type DemoRole,
} from "@/lib/demo/feature-routes";
import { getStudentFeatureDetails } from "@/lib/demo/student/feature-details";
import { getParentFeatureDetails } from "@/lib/demo/parent/feature-details";
import { getEducatorFeatureDetails } from "@/lib/demo/educator/feature-details";
import { getSchoolAdminFeatureDetails } from "@/lib/demo/school-admin/feature-details";
import { getDistrictAdminFeatureDetails } from "@/lib/demo/district-admin/feature-details";
import { getPartnerFeatureDetails } from "@/lib/demo/partner/feature-details";
import type { DemoProfileId } from "@/lib/demo/demo-profiles";
import type {
  SchoolProfileId,
  DistrictProfileId,
  PartnerPlanId,
} from "@/lib/demo/role-contexts";

export type StudentContext = { contextType: "student"; contextId: DemoProfileId };
export type SchoolContext = { contextType: "school"; contextId: SchoolProfileId };
export type DistrictContext = { contextType: "district"; contextId: DistrictProfileId };
export type PartnerContext = { contextType: "plan"; contextId: PartnerPlanId };
export type NoContext = { contextType: "none"; contextId: null };

export type DemoContext =
  | StudentContext
  | SchoolContext
  | DistrictContext
  | PartnerContext
  | NoContext;

export type ActiveDemoContext = { role: DemoRole } & DemoContext;

export function getDemoFeatureData(args: {
  role: DemoRole;
  featureId: string;
  contextType: DemoContext["contextType"];
  contextId: DemoContext["contextId"];
}): DemoFeatureDetail | null {
  const { role, featureId, contextType, contextId } = args;

  if (role === "student" && contextType === "student" && contextId) {
    return (
      getStudentFeatureDetails(contextId as DemoProfileId)[
        featureId as keyof ReturnType<typeof getStudentFeatureDetails>
      ] ?? null
    );
  }
  if (role === "family" && contextType === "student" && contextId) {
    return (
      getParentFeatureDetails(contextId as DemoProfileId)[
        featureId as keyof ReturnType<typeof getParentFeatureDetails>
      ] ?? null
    );
  }
  if (role === "educator" && contextType === "student" && contextId) {
    return (
      getEducatorFeatureDetails(contextId as DemoProfileId)[
        featureId as keyof ReturnType<typeof getEducatorFeatureDetails>
      ] ?? null
    );
  }
  if (role === "school-admin" && contextType === "school" && contextId) {
    return (
      getSchoolAdminFeatureDetails(contextId as SchoolProfileId)[
        featureId as keyof ReturnType<typeof getSchoolAdminFeatureDetails>
      ] ?? null
    );
  }
  if (role === "district-admin" && contextType === "district" && contextId) {
    return (
      getDistrictAdminFeatureDetails(contextId as DistrictProfileId)[
        featureId as keyof ReturnType<typeof getDistrictAdminFeatureDetails>
      ] ?? null
    );
  }
  if (role === "partner" && contextType === "plan" && contextId) {
    return (
      getPartnerFeatureDetails(contextId as PartnerPlanId)[
        featureId as keyof ReturnType<typeof getPartnerFeatureDetails>
      ] ?? null
    );
  }

  // Owner or missing context → static registry fallback.
  return getDemoFeature(role, featureId);
}
