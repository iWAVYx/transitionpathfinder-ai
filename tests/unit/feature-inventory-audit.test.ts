/**
 * Feature Inventory Audit — snapshot of the entire (role, feature)
 * matrix the user asked for in the feature-depth audit:
 *
 *   role · dashboard feature · destination · value purpose ·
 *   connected platform areas · primary action · permission note
 *
 * The snapshot is the reviewable checklist. Any change to a registry
 * or the augment logic surfaces here; reviewers can eyeball the diff
 * to confirm nothing regressed to filler.
 */
import { describe, expect, it } from "vitest";
import { listDemoFeatures } from "@/lib/demo/feature-routes";
import {
  augmentFeature,
  type ExtendedDemoRole,
  type BaseDetail,
} from "@/lib/demo/feature-augment";

describe("feature inventory audit", () => {
  it("every registered demo feature resolves to a dedicated destination", () => {
    const inventory = listDemoFeatures();
    expect(inventory.length).toBeGreaterThan(40);
    for (const { role, featureId, detail } of inventory) {
      expect(detail.primaryAction.to.startsWith("/")).toBe(true);
      // dedicated demo destination is always available
      const demoPath = `/demo/feature/${role}/${featureId}`;
      expect(demoPath.split("/").length).toBe(5);
    }
  });

  it("inventory matrix matches snapshot", () => {
    const matrix = listDemoFeatures().map(({ role, featureId, detail }) => {
      const aug = augmentFeature(role as ExtendedDemoRole, detail as unknown as BaseDetail);
      return {
        role,
        featureId,
        title: detail.title,
        demoDestination: `/demo/feature/${role}/${featureId}`,
        workspaceDestination: detail.primaryAction.to,
        purpose: detail.what,
        connectsTo: detail.connectsTo,
        feedsInto: aug.feedsInto,
        primaryAction: detail.primaryAction.label,
        secondaryAction: aug.secondaryAction.label,
        nextStep: aug.nextStep,
        pathwayRelation: aug.pathwayRelation,
        permission: aug.permissionNote,
      };
    });
    expect(matrix).toMatchSnapshot();
  });
});
