// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { formatGradeBand } from "../../src/lib/grade-band-label";
import { GradeBandBreakdown } from "../../src/components/dashboard/GradeBandBreakdown";
afterEach(cleanup);
it.each([
  ["high_school", "High School"], ["middle_school", "Middle School"],
  ["post_secondary", "Post Secondary"], ["  high__school  ", "High School"],
  ["11-12", "11-12"], ["IEP/PPT support", "IEP/PPT Support"], [null, "Grade not set"],
  ["   ", "Grade not set"],
])("presents stored grade %s as %s", (value, label) => expect(formatGradeBand(value)).toBe(label));
it("combines equivalent coded and readable bands in school/district summaries", () => {
  render(<GradeBandBreakdown students={[{ id: "sample-a", grade_band: "high_school" }, { id: "sample-b", grade_band: "High School" }]} />);
  expect(screen.getByText("High School")).toBeTruthy();
  expect(screen.getByText("2 · 100%")).toBeTruthy();
  expect(screen.queryByText("high_school")).toBeNull();
});
