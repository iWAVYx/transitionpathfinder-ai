import { describe, it, expect } from "vitest";
import { resolveReportAudience } from "@/lib/report-role-precedence";

describe("resolveReportAudience precedence", () => {
  it("returns explicit selection when present", () => {
    expect(resolveReportAudience(["family", "educator", "student"])).toBe("family");
    expect(resolveReportAudience(["educator", null])).toBe("educator");
  });

  it("falls through nullish explicit slots to authorized origin", () => {
    expect(resolveReportAudience([null, "educator", "student"])).toBe("educator");
    expect(resolveReportAudience([undefined, "family"])).toBe("family");
  });

  it("defaults to student when no valid role context exists", () => {
    expect(resolveReportAudience([null, undefined])).toBe("student");
    expect(resolveReportAudience([])).toBe("student");
  });

  it("never silently promotes an invalid value to family or educator", () => {
    // @ts-expect-error — verifying runtime guard rejects unknown values
    expect(resolveReportAudience(["owner", null])).toBe("student");
    // @ts-expect-error
    expect(resolveReportAudience(["", 0, false, "family"])).toBe("family");
  });

  it("preserves an intentional Family selection over an educator origin", () => {
    // explicit=family, origin=educator → family wins
    expect(resolveReportAudience(["family", "educator"])).toBe("family");
  });

  it("preserves an intentional Educator selection over a family origin", () => {
    expect(resolveReportAudience(["educator", "family"])).toBe("educator");
  });
});
