import { describe, expect, it } from "vitest";

import { sensitiveTextContextDependencies } from "@/lib/sensitive-file-review-context";
import type { SensitiveTextContext } from "@/lib/sensitive-text-redaction";

const completeContext: SensitiveTextContext = {
  studentFirstName: "Robin",
  studentLastName: "Staging",
  schoolName: "Synthetic School",
  dateOfBirth: "2008-01-02",
};

describe("sensitiveTextContextDependencies", () => {
  it("is stable when an inline context object is recreated with the same values", () => {
    const firstRender = sensitiveTextContextDependencies({ ...completeContext });
    const unrelatedParentRender = sensitiveTextContextDependencies({ ...completeContext });

    expect(unrelatedParentRender).toEqual(firstRender);
  });

  it.each([
    ["studentFirstName", "Taylor"],
    ["studentLastName", "Example"],
    ["schoolName", "Second Synthetic School"],
    ["dateOfBirth", "2008-03-04"],
  ] as const)("changes when %s changes", (field, value) => {
    const before = sensitiveTextContextDependencies(completeContext);
    const after = sensitiveTextContextDependencies({ ...completeContext, [field]: value });

    expect(after).not.toEqual(before);
  });

  it("keeps the complete dependency order explicit", () => {
    expect(sensitiveTextContextDependencies(completeContext)).toEqual([
      "Robin",
      "Staging",
      "Synthetic School",
      "2008-01-02",
    ]);
  });
});
