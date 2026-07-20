import { describe, expect, it } from "vitest";
import { resolveReportAudience } from "./report-role-precedence";

describe("resolveReportAudience (Workstream 1 precedence)", () => {
  it("returns the first valid candidate — URL wins over origin", () => {
    expect(resolveReportAudience(["family", "educator"])).toBe("family");
  });

  it("falls back to origin when URL slot is empty/invalid", () => {
    expect(resolveReportAudience([null, "educator"])).toBe("educator");
    expect(resolveReportAudience([undefined, "family"])).toBe("family");
    // @ts-expect-error runtime guard against garbage upstream values
    expect(resolveReportAudience(["parent", "educator"])).toBe("educator");
  });

  it("defaults to Student View when nothing is provided (rule 3)", () => {
    expect(resolveReportAudience([])).toBe("student");
    expect(resolveReportAudience([null, undefined])).toBe("student");
  });

  it("Invalid role safely falls back to Student View, never Family/Educator", () => {
    // @ts-expect-error simulate a corrupt server payload
    expect(resolveReportAudience(["admin", "partner", null])).toBe("student");
  });

  it("preserves explicit selection even when origin disagrees", () => {
    expect(resolveReportAudience(["student", "family"])).toBe("student");
    expect(resolveReportAudience(["educator", "student"])).toBe("educator");
  });
});
