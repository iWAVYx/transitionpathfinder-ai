import { describe, expect, it } from "vitest";
import { DEMO_FEATURE_MAP, DEMO_ELEMENT_IDS } from "@/lib/demo/feature-map";
import { PUBLIC_FEATURES } from "@/lib/public-feature-contract";

describe("demo feature map", () => {
  it("every entry has non-empty product, nextAction, and a valid status", () => {
    for (const id of DEMO_ELEMENT_IDS) {
      const entry = DEMO_FEATURE_MAP[id];
      expect(entry.element, `${id}.element`).toBeTruthy();
      expect(entry.product, `${id}.product`).toBeTruthy();
      expect(entry.nextAction, `${id}.nextAction`).toBeTruthy();
      expect(entry.livesAt, `${id}.livesAt`).toBeTruthy();
      expect(entry.roles.length, `${id}.roles`).toBeGreaterThan(0);
      expect(["live", "partial", "future-phase"]).toContain(entry.status);
    }
  });

  it("covers the core demo surfaces", () => {
    const required = [
      "intake.categories",
      "voice.prompts",
      "documents.insights",
      "report.snapshot",
      "report.pathways",
      "resources.cards",
      "opportunities.cards",
      "plan.timeline",
      "meeting.agenda",
      "calendar.month",
      "hub.platform",
      "cta.waitlist",
      "cta.getStarted",
    ] as const;
    for (const id of required) {
      expect(DEMO_FEATURE_MAP, `missing ${id}`).toHaveProperty(id);
    }
  });

  it("aligns both builder mappings with the actual planning perspectives without advertising student submission", () => {
    const planningRoles = PUBLIC_FEATURES["pathway-builder"].liveAudiences
      .filter(audience => audience === "Family" || audience === "Educator")
      .map(audience => audience === "Family" ? "parent" : "educator");
    for (const id of ["intake.categories", "intake.roleLens"] as const) {
      const feature = DEMO_FEATURE_MAP[id];
      expect(feature.livesAt).toBe(PUBLIC_FEATURES["pathway-builder"].liveRoute);
      expect(feature.roles).toEqual(planningRoles);
      expect(feature.roles).not.toContain("student");
      expect(feature.roles).not.toContain("platform");
    }
    expect(DEMO_FEATURE_MAP["intake.roleLens"].notes).toContain("separate Student Voice tool");
    expect(DEMO_FEATURE_MAP["voice.prompts"].roles).toContain("student");
  });
});
