import { describe, it, expect } from "vitest";
import { deriveWaitlistRouting } from "../../src/lib/waitlist.functions";

describe("deriveWaitlistRouting", () => {
  it("routes families and students to family early access", () => {
    expect(deriveWaitlistRouting({ role: "family" } as any).routing_category).toBe(
      "family_early_access",
    );
    expect(deriveWaitlistRouting({ role: "parent" } as any).routing_category).toBe(
      "family_early_access",
    );
    expect(deriveWaitlistRouting({ role: "student" } as any).routing_category).toBe(
      "family_early_access",
    );
  });

  it("routes educators and case managers to educator demo", () => {
    expect(deriveWaitlistRouting({ role: "educator" } as any).routing_category).toBe(
      "educator_demo",
    );
    expect(deriveWaitlistRouting({ role: "case_manager" } as any).routing_category).toBe(
      "educator_demo",
    );
  });

  it("routes school and district admins to their respective pilots", () => {
    expect(deriveWaitlistRouting({ role: "school_admin" } as any).routing_category).toBe(
      "school_pilot",
    );
    expect(deriveWaitlistRouting({ role: "administrator" } as any).routing_category).toBe(
      "school_pilot",
    );
    expect(deriveWaitlistRouting({ role: "district_admin" } as any).routing_category).toBe(
      "district_pilot",
    );
    expect(deriveWaitlistRouting({ role: "district" } as any).routing_category).toBe(
      "district_pilot",
    );
  });

  it("routes partners to partner review", () => {
    expect(deriveWaitlistRouting({ role: "partner" } as any).routing_category).toBe(
      "partner_review",
    );
  });

  it("routes unknown / other roles to needs_review", () => {
    expect(deriveWaitlistRouting({ role: "other" } as any).routing_category).toBe(
      "needs_review",
    );
  });

  it("returns a matching status for each routing category", () => {
    expect(deriveWaitlistRouting({ role: "partner" } as any).status).toBe(
      "routed_partner_review",
    );
    expect(deriveWaitlistRouting({ role: "family" } as any).status).toBe(
      "routed_family_early_access",
    );
  });
});
