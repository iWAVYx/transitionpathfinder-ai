import { describe, it, expect } from "vitest";
import { redactChannelPreviewForEmail } from "../../src/lib/channel-preview-redact";

describe("redactChannelPreviewForEmail (T-04)", () => {
  it("returns undefined for empty/nullish input", () => {
    expect(redactChannelPreviewForEmail(null)).toBeUndefined();
    expect(redactChannelPreviewForEmail(undefined)).toBeUndefined();
    expect(redactChannelPreviewForEmail("   ")).toBeUndefined();
  });

  it("strips emails, phone numbers, SSNs, DOBs, and URLs", () => {
    const raw =
      "Reach me at jordan.rivera@example.org or (555) 123-4567. SSN 123-45-6789, DOB 04/12/2007, chart 8675309012. See https://storage.example.com/signed?token=abc";
    const out = redactChannelPreviewForEmail(raw)!;
    expect(out).not.toMatch(/jordan\.rivera/);
    expect(out).not.toMatch(/@example\.org/);
    expect(out).not.toMatch(/555/);
    expect(out).not.toMatch(/123-45-6789/);
    expect(out).not.toMatch(/04\/12\/2007/);
    expect(out).not.toMatch(/8675309012/);
    expect(out).not.toMatch(/storage\.example\.com/);
    expect(out).toContain("[email]");
    expect(out).toContain("[phone]");
    expect(out).toContain("[redacted]");
    expect(out).toContain("[date]");
    expect(out).toContain("[link]");
  });

  it("clamps to 120 characters with an ellipsis", () => {
    const raw = "x".repeat(500);
    const out = redactChannelPreviewForEmail(raw)!;
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("…")).toBe(true);
  });

  it("collapses whitespace and preserves benign text", () => {
    expect(redactChannelPreviewForEmail("Meeting  moved\n\nto  Thursday")).toBe(
      "Meeting moved to Thursday",
    );
  });
});
