import { describe, it, expect } from "vitest";
import {
  redactObsString,
  redactObsAttributes,
  redactObsError,
} from "@/lib/obs/redact.server";

describe("obs redaction (L-03)", () => {
  it("masks emails, phones, SSNs, DOBs, URLs and long IDs in strings", () => {
    const out = redactObsString(
      "user jane@example.com (555) 123-4567 SSN 123-45-6789 dob 01/02/2007 id 1234567 https://x.co/token=abc",
    );
    expect(out).not.toMatch(/jane@example\.com/);
    expect(out).not.toMatch(/555.*4567/);
    expect(out).not.toMatch(/123-45-6789/);
    expect(out).not.toMatch(/01\/02\/2007/);
    expect(out).not.toMatch(/1234567/);
    expect(out).not.toMatch(/https?:\/\//);
    expect(out).toContain("[email]");
    expect(out).toContain("[phone]");
    expect(out).toContain("[redacted]");
    expect(out).toContain("[date]");
    expect(out).toContain("[link]");
  });

  it("preserves primitives and redacts nested strings inside attributes", () => {
    const out = redactObsAttributes({
      student_id: "abc",
      count: 3,
      ok: true,
      nested: { email: "a@b.co", tokenUrl: "https://x.co/t" },
      note: "call 555-123-4567",
    });
    expect(out.count).toBe(3);
    expect(out.ok).toBe(true);
    expect(String(out.nested)).not.toMatch(/a@b\.co/);
    expect(String(out.nested)).toContain("[email]");
    expect(String(out.note)).toContain("[phone]");
  });

  it("clamps oversized strings", () => {
    const long = "x".repeat(2000);
    const out = redactObsString(long)!;
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith("…")).toBe(true);
  });

  it("redacts error message and stack while preserving name", () => {
    const out = redactObsError({
      name: "AuthError",
      message: "failed for jane@example.com",
      stack: "at handler https://x.co/f?token=abc:1:1",
    })!;
    expect(out.name).toBe("AuthError");
    expect(out.message).toContain("[email]");
    expect(out.stack).toContain("[link]");
  });

  it("passes null / undefined through error redactor", () => {
    expect(redactObsError(null)).toBeNull();
    expect(redactObsError(undefined)).toBeNull();
  });
});
