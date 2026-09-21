import { describe, expect, it } from "vitest";

import { classifySafeClientError } from "@/lib/safe-client-error";

describe("classifySafeClientError", () => {
  it.each([
    [new Error("Failed to fetch dynamically imported module"), "route-module-load"],
    [new Error("Rendered fewer hooks than expected"), "react-hook-order"],
    [new TypeError("value is not a function"), "runtime-type"],
    [new TypeError("Failed to fetch"), "network"],
    [new Error("private student-shaped details that must not be emitted"), "unknown"],
    ["not-an-error", "unknown"],
  ] as const)("returns only a fixed category for %#", (error, expected) => {
    expect(classifySafeClientError(error)).toBe(expected);
  });
});
