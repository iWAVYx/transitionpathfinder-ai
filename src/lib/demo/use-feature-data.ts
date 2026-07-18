/**
 * Hook wrappers for the central demo feature-data resolver.
 *
 * Components read profile-specific feature data through these hooks so
 * they automatically re-render whenever the selected demo profile
 * (Student Journey / School / District / Partner Plan) changes.
 */

import { useDemoStudent } from "@/lib/demo/use-demo-student";
import {
  useDemoSchool,
  useDemoDistrict,
  useDemoPartnerPlan,
} from "@/lib/demo/use-role-context";
import {
  getDemoFeatureData,
  type ActiveDemoContext,
} from "@/lib/demo/feature-data";
import type { DemoFeatureDetail, DemoRole } from "@/lib/demo/feature-routes";

/**
 * Returns the single active demo context for the current session, keyed
 * on the role passed in. The consumer decides which context matters for
 * its role — student journey vs. school vs. district vs. partner plan.
 */
export function useActiveDemoContext(role: DemoRole): ActiveDemoContext {
  const { profileId } = useDemoStudent();
  const { schoolId } = useDemoSchool();
  const { districtId } = useDemoDistrict();
  const { planId } = useDemoPartnerPlan();
  switch (role) {
    case "student":
    case "family":
    case "educator":
      return { role, contextType: "student", contextId: profileId };
    case "school-admin":
      return { role, contextType: "school", contextId: schoolId };
    case "district-admin":
      return { role, contextType: "district", contextId: districtId };
    case "partner":
      return { role, contextType: "plan", contextId: planId };
    case "owner":
      return { role, contextType: "none", contextId: null };
  }
}

/**
 * Resolve one (role, featureId) preview/full-page detail using the
 * currently-active demo context. Returns null if the feature isn't in
 * the registry.
 */
export function useDemoFeatureData(
  role: DemoRole,
  featureId: string,
): DemoFeatureDetail | null {
  const ctx = useActiveDemoContext(role);
  return getDemoFeatureData({
    role,
    featureId,
    contextType: ctx.contextType,
    contextId: ctx.contextId,
  });
}
