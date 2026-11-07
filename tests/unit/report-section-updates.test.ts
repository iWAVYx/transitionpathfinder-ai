import { expect, it } from "vitest";
import { readSectionUpdates, recordGeneratedSections, recordSavedSections, withVisibleSectionUpdates, previousReportWriteId } from "../../src/lib/report-section-updates";
const earlier = "2026-10-01T12:00:00.000Z", now = "2026-10-12T18:00:00.000Z";
const event = (operation: "generated" | "saved", recorded_at = now) => ({ operation, recorded_at });
it("records only sections supplied by generation; retained fields without history remain unknown", () => {
  const previous = { summary: "Original", postsecondary_goals: ["Old goal"], spin: { strengths: ["Old"] } };
  const before = structuredClone(previous);
  const next = recordGeneratedSections(previous, { schema_version: 2, spin: { strengths: ["New"] }, confidence: { overall: "low" } }, now);
  expect(next.summary).toBe(previous.summary); expect(next.postsecondary_goals).toEqual(previous.postsecondary_goals);
  expect(readSectionUpdates(next)).toEqual({ version: 1, fields: { spin: event("generated"), confidence: event("generated") } });
  expect(previous).toEqual(before);
});
it("preserves recorded status for retained fields and records supplied unchanged generation results", () => {
  const previous = recordGeneratedSections(undefined, { summary: "Same", spin: { strengths: ["Same"] } }, earlier);
  const next = recordGeneratedSections(previous, { spin: { strengths: ["Same"] } }, now);
  expect(readSectionUpdates(next)?.fields).toEqual({ summary: event("generated", earlier), spin: event("generated") });
});
it("records a manual content change without marking unchanged or unknown fields as reviewed", () => {
  const previous = recordGeneratedSections(undefined, { summary: "Original", confidence: { overall: "low" } }, earlier);
  previous.postsecondary_goals = ["Unknown history"];
  const next = recordSavedSections(previous, { ...previous, summary: "Edited", section_updates: { version: 1, fields: { confidence: event("generated") } } }, now);
  expect(readSectionUpdates(next)?.fields).toEqual({ summary: event("saved"), confidence: event("generated", earlier) });
});
it("restoring older content is recorded as saved; restored caller metadata cannot forge generation dates", () => {
  const old = recordGeneratedSections(undefined, { summary: "Earlier", spin: { strengths: ["Old"] } }, earlier);
  const current = recordGeneratedSections(old, { summary: "Later", spin: { strengths: ["New"] } }, now);
  const restored = recordSavedSections(current, old, "2026-10-12T19:00:00.000Z");
  expect(restored.summary).toBe("Earlier");
  expect(readSectionUpdates(restored)?.fields.summary).toEqual(event("saved", "2026-10-12T19:00:00.000Z"));
});
it("ignores forged dates for unchanged restored content and property-order-only changes", () => {
  const previous = recordGeneratedSections(undefined, { confidence: { overall: "low", rationale: "Same" } }, earlier);
  const next = recordSavedSections(previous, { confidence: { rationale: "Same", overall: "low" }, section_updates: { version: 1, fields: { confidence: event("generated") } } }, now);
  expect(readSectionUpdates(next)?.fields.confidence).toEqual(event("generated", earlier));
});
it("deletion and explicit undefined remove both the section and its status", () => {
  const previous = recordGeneratedSections(undefined, { summary: "Summary", confidence: { overall: "low" } }, earlier);
  expect(readSectionUpdates(recordSavedSections(previous, { summary: "Summary" }, now))?.fields.confidence).toBeUndefined();
  const next = recordGeneratedSections(previous, { confidence: undefined }, now);
  expect(Object.hasOwn(next, "confidence")).toBe(false);
  expect(readSectionUpdates(next)?.fields.confidence).toBeUndefined();
});
it("does not accept generation metadata supplied in the generated object", () => {
  const next = recordGeneratedSections(undefined, { summary: "Current", section_updates: { version: 1, fields: { postsecondary_goals: event("generated", earlier) } } }, now);
  expect(readSectionUpdates(next)?.fields).toEqual({ summary: event("generated") });
});
it.each([undefined, { version: 2, fields: {} }, { version: 1, fields: [] }])("missing/unsupported tracking has unknown status: %j", section_updates => {
  expect(readSectionUpdates({ summary: "Old", section_updates })).toBeUndefined();
});
it("filters invalid entries and unrecognized private field names without exposing them", () => {
  const source = { section_updates: { version: 1, fields: { summary: event("generated"), confidence: { ...event("generated"), recorded_at: "not a date" }, spin: { ...event("saved"), reviewed: true }, secret_student_identifier: event("generated") } } };
  expect(readSectionUpdates(source)).toEqual({ version: 1, fields: { summary: event("generated") } });
});
it("projects only status for fields the audience actually receives", () => {
  const original = recordGeneratedSections(undefined, { summary: "Visible", inputs_used: { iep_doc_ids: ["private-id"] }, educator_action_plan_v2: { intro: "Restricted" }, confidence: { overall: "low" } }, now);
  const visible = withVisibleSectionUpdates(original, { summary: "Visible", confidence: undefined });
  expect(readSectionUpdates(visible)?.fields).toEqual({ summary: event("generated") });
  expect(JSON.stringify(visible)).not.toMatch(/inputs_used|private-id|educator_action/);
});
it("rejects non-object saved content before producing metadata", () => {
  expect(() => recordSavedSections({}, ["invalid"], now)).toThrow("could not be saved");
});

it("issues a fresh server marker even when no section text changed, and strips it from shared metadata", () => {
  const before = recordGeneratedSections(undefined, { summary: "Same" }, earlier);
  const after = recordSavedSections(before, before, now);
  expect(previousReportWriteId(after)).not.toBe(previousReportWriteId(before));
  expect(readSectionUpdates(after)?.fields.summary.recorded_at).toBe(earlier);
  const shared = withVisibleSectionUpdates(after, { summary: "Same" });
  expect(previousReportWriteId(shared)).toBeUndefined();
  expect(JSON.stringify(shared)).not.toContain(previousReportWriteId(after)!);
});
