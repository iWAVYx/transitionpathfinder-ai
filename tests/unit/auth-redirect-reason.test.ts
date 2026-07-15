import { describe, expect, it } from "vitest";
import { messageForReason, reasonForPath } from "@/lib/auth-redirect-reason";

describe("auth redirect reason", () => {
  it("maps calendar paths to the calendar message", () => {
    const r = reasonForPath("/hubs/calendar");
    expect(messageForReason(r)).toMatch(/Calendar/i);
  });

  it("maps document paths to the documents message", () => {
    const r = reasonForPath("/hubs/documents");
    expect(messageForReason(r)).toMatch(/documents/i);
  });

  it("maps pathway/report paths to the report message", () => {
    const r = reasonForPath("/pathways/123");
    expect(messageForReason(r)).toMatch(/Pathway Report/);
  });

  it("maps opportunity/partner-manage paths to the opportunities message", () => {
    const r = reasonForPath("/opportunities");
    expect(messageForReason(r)).toMatch(/opportunities/i);
  });

  it("falls back to a generic message for unknown protected paths", () => {
    const r = reasonForPath("/some-random-protected-page");
    expect(messageForReason(r)).toMatch(/sign in/i);
  });

  it("returns empty string when no reason is provided (public/demo pages)", () => {
    expect(messageForReason(undefined)).toBe("");
    expect(messageForReason(null)).toBe("");
    expect(messageForReason("")).toBe("");
  });
});
