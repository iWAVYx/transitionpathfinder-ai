import { describe, expect, it } from "vitest";
import { DOC_TYPES } from "../../src/lib/documents.functions";

describe("document classification", () => {
  it("exposes the expected doc types including 'other'", () => {
    expect(DOC_TYPES).toContain("other");
    expect(DOC_TYPES).toContain("iep");
    expect(DOC_TYPES).toContain("transition-plan");
  });

  it("has no duplicate doc types", () => {
    expect(new Set(DOC_TYPES).size).toBe(DOC_TYPES.length);
  });

  it("all doc types are non-empty lowercase slugs", () => {
    for (const t of DOC_TYPES) {
      expect(t).toMatch(/^[a-z][a-z-]*[a-z]$/);
    }
  });
});
