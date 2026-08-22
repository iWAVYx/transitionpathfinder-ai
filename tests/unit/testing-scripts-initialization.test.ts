import { describe, expect, it } from "vitest";
import { TEST_SCRIPTS } from "@/lib/owner/testing-scripts.functions";

describe("owner testing script registry", () => {
  it("initializes every core and role QA script", () => {
    expect(TEST_SCRIPTS).toHaveLength(13);
    expect(new Set(TEST_SCRIPTS.map(({ key }) => key)).size).toBe(TEST_SCRIPTS.length);
  });
});
