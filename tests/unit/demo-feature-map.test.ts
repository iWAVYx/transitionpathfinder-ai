import { describe, expect, it } from "vitest";
import { DEMO_FEATURE_MAP, DEMO_ELEMENT_IDS } from "@/lib/demo/feature-map";

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
});
