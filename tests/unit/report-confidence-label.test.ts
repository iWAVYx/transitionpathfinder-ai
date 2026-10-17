import { expect, it } from "vitest";
import { reportConfidenceLabel } from "../../src/lib/report-confidence-label";
it.each([ ["low", "Low Confidence"], ["medium", "Medium Confidence"], ["high", "High Confidence"] ])("uses newer %s confidence despite conflicting retained confidence", (overall, label) => {
  expect(reportConfidenceLabel({ confidence: { overall }, confidence_level: overall === "high" ? "low" : "high" }, true)).toBe(label);
});
it.each([undefined, null, {}, { overall: "moderate" }, { overall: "constructor" }, { overall: 1 }])("omits absent or invalid newer confidence without legacy substitution: %j", confidence => {
  expect(reportConfidenceLabel({ confidence, confidence_level: "high" }, true)).toBeNull();
});
it.each([["high", "High Confidence"], ["moderate", "Moderate Confidence"], ["low", "Lower Confidence"]])("preserves recorded legacy %s meaning regardless of newer fields", (confidence_level, label) => {
  expect(reportConfidenceLabel({ confidence_level, confidence: { overall: "medium" } }, false)).toBe(label);
});
it("does not classify invalid legacy values as lower confidence", () => {
  expect(reportConfidenceLabel({ confidence_level: "invalid" }, false)).toBeNull();
  expect(reportConfidenceLabel(null, true)).toBeNull();
});
