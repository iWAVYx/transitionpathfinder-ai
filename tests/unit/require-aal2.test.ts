import { describe, it, expect } from "vitest";
import { isAal2, requireAal2 } from "@/lib/auth/require-aal2";

describe("requireAal2 (Slice 3 A-05)", () => {
  it("passes when claims.aal is aal2", () => {
    expect(isAal2({ aal: "aal2" })).toBe(true);
    expect(() => requireAal2({ aal: "aal2" })).not.toThrow();
  });

  it("passes when amr lists totp/webauthn", () => {
    expect(isAal2({ amr: [{ method: "totp" }] })).toBe(true);
    expect(isAal2({ amr: ["webauthn"] })).toBe(true);
  });

  it("throws with mfa_required code when aal is aal1", () => {
    try {
      requireAal2({ aal: "aal1" });
      throw new Error("should have thrown");
    } catch (e) {
      const err = e as Error & { code?: string };
      expect(err.code).toBe("mfa_required");
      expect(err.message).toMatch(/MFA required/);
    }
  });

  it("throws when claims are missing/null", () => {
    expect(() => requireAal2(null)).toThrow(/MFA required/);
    expect(() => requireAal2(undefined)).toThrow(/MFA required/);
    expect(() => requireAal2({})).toThrow(/MFA required/);
  });

  it("does not leak token internals in the error message", () => {
    try { requireAal2({ aal: "aal1", sub: "user-123" }); } catch (e) {
      expect((e as Error).message).not.toMatch(/user-123|aal|jwt/i);
    }
  });
});
