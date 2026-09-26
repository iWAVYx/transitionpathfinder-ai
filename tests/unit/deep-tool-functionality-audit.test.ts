import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const audit = readFileSync("docs/deep-tool-functionality-audit.md", "utf8");

describe("deep tool functionality audit", () => {
  it("locks the complete card to preview to save-and-refresh contract", () => {
    expect(audit).toContain("At-a-glance card");
    expect(audit).toContain("Preview");
    expect(audit).toContain("Open Full Tool");
    expect(audit).toContain("Save a meaningful change");
    expect(audit).toContain("Refresh the Preview");
  });

  it("keeps the founder's major product workstreams visible", () => {
    for (const required of [
      "Pathway intake and report depth",
      "protected documents and all-role evidence workflow",
      "grounded IEP/PPT and progress monitoring",
      "PartnerForward, BridgeForward, resources, and outreach",
      "after-school, enrichment, extracurricular",
      "assistive technology",
      "licensing, communication, pricing",
    ]) {
      expect(audit).toContain(required);
    }
  });

  it("records the sensitive-upload and production gates honestly", () => {
    expect(audit).toContain("new uploads remain intentionally paused");
    expect(audit).toContain("redaction → user review → generic derived artifact");
    expect(audit).toContain("Production remains **NO-GO**");
    expect(audit).toContain("partners never receive student records");
  });
});
