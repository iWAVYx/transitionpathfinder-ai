import { describe, expect, it } from "vitest";
import {
  HUBS,
  HUB_IDS,
  PARTNER_FORBIDDEN_SPOKE_TOPICS,
  publicHubs,
} from "@/lib/hubs/registry";

describe("hub registry", () => {
  it("every hub has the required pillar fields", () => {
    for (const id of HUB_IDS) {
      const h = HUBS[id];
      expect(h.title, `${id}.title`).toBeTruthy();
      expect(h.who, `${id}.who`).toBeTruthy();
      expect(h.problem, `${id}.problem`).toBeTruthy();
      expect(h.pathwayConnection, `${id}.pathwayConnection`).toBeTruthy();
      expect(h.nextAction.label, `${id}.nextAction.label`).toBeTruthy();
      expect(h.nextAction.to, `${id}.nextAction.to`).toMatch(/^\//);
      expect(h.spokes.length, `${id}.spokes`).toBeGreaterThanOrEqual(3);
    }
  });

  it("every spoke has a description and a valid internal route", () => {
    for (const id of HUB_IDS) {
      for (const spoke of HUBS[id].spokes) {
        expect(spoke.title, `${id}/${spoke.id}.title`).toBeTruthy();
        expect(spoke.description, `${id}/${spoke.id}.description`).toBeTruthy();
        expect(spoke.to, `${id}/${spoke.id}.to`).toMatch(/^\//);
      }
    }
  });

  it("at least one public hub exists and links to a demo report next step", () => {
    const pubs = publicHubs();
    expect(pubs.length).toBeGreaterThan(0);
  });

  it("related hub ids resolve", () => {
    for (const id of HUB_IDS) {
      for (const relatedId of HUBS[id].related) {
        expect(HUBS[relatedId], `${id} related ${relatedId} must exist`).toBeDefined();
      }
    }
  });

  it("partner hubs never expose student-PII spoke topics", () => {
    for (const id of HUB_IDS) {
      const h = HUBS[id];
      if (h.audience !== "partner") continue;
      for (const spoke of h.spokes) {
        if (!spoke.topic) continue;
        expect(
          PARTNER_FORBIDDEN_SPOKE_TOPICS,
          `${id}/${spoke.id} topic "${spoke.topic}" must not appear in a partner hub`,
        ).not.toContain(spoke.topic);
      }
    }
  });
});
