import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PLANNING_SOURCE_GROUNDING } from "../../src/lib/planning-source-grounding";
import { bindBuilderSourceRefs } from "../../src/lib/pathway-builder-source-refs";
import { SourceRef, PathwayReportV2 } from "../../src/lib/pathway-v2";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { richerSharedFixture } from "../fixtures/shared-report";
const id = "55555555-5555-4555-8555-555555555555";
const sections = ["postsecondary_education_recs", "employment_pathway_recs", "independent_living_recs", "community_participation_recs", "resource_matches", "partner_matches"] as const;
const rec = (source = { kind: "profile", label: "Intake proposed goal", id: "invented-id" }) => ({
  title: "Explore a visit", summary: "An option to discuss", why: "A reported interest", next_action: "Ask about availability", owner_role: "case_manager", discuss_at_next_meeting: true, sources: [source],
});
it.each(sections)("binds explicit builder origin to the actual attached record in %s", field => {
  const raw = PathwayReportV2.parse({ schema_version: 2, [field]: [rec()] });
  const next = bindBuilderSourceRefs(raw, id);
  const row = (next[field] as any)[0];
  expect(row.sources).toEqual([{ kind: "intake", label: "Intake proposed goal", id }]);
  expect((raw[field] as any)[0].sources[0].id).toBe("invented-id");
  expect(PathwayReportV2.safeParse(next).success).toBe(true);
});
it.each([null, "not-a-record", ""]) ("refuses an unbound builder source rather than inventing a record: %s", missing => {
  const raw = PathwayReportV2.parse({ schema_version: 2, employment_pathway_recs: [rec({ kind: "intake", label: "Student goal", id: "invented" })] });
  expect(() => bindBuilderSourceRefs(raw, missing)).toThrow("couldn't confirm a Pathway Builder source");
});
it("preserves other source origins and does not infer intake from a keyword in a longer profile label", () => {
  const raw = PathwayReportV2.parse({ schema_version: 2, employment_pathway_recs: [rec({ kind: "profile", label: "Profile interests reviewed during intake", id: "profile-id" })] });
  expect(bindBuilderSourceRefs(raw, null)).toEqual(raw);
  expect(SourceRef.parse({ kind: "intake", label: "Pathway Builder" }).kind).toBe("intake");
});
it.each(["family", "educator"] as const)("shared %s projection keeps the permitted origin while stripping record IDs", audience => {
  const raw = { ...richerSharedFixture(), employment_pathway_recs: [rec({ kind: "intake", label: "Pathway Builder: proposed goal", id })] };
  const shared = projectSharedReport(raw, audience) as any;
  expect(JSON.stringify(shared)).not.toContain(id);
  if (audience === "educator") expect(shared.employment_pathway_recs[0].sources).toEqual([{ kind: "intake", label: "Pathway Builder: proposed goal" }]);
  else expect(shared.employment_pathway_recs[0]).toMatchObject({ sources: [], source_count: 1 });
});
it("keeps factual distinctions in the shared system rule for both Pathway calls and PPT", () => {
  for (const phrase of ["not independent verification", "verified", "proposals to confirm", "does not establish age", "does not prove successful use", "Do not infer assessed readiness", "omit that block", "never fabricate a direct quote", "Not supplied here does not mean nonexistent", "actual input origin"]) expect(PLANNING_SOURCE_GROUNDING).toContain(phrase);
  const initial = readFileSync("src/lib/pathway-generation.server.ts", "utf8");
  const regen = readFileSync("src/lib/pathway.functions.ts", "utf8");
  const ppt = readFileSync("src/lib/ppt.functions.ts", "utf8");
  expect(initial).toContain('${PLANNING_SOURCE_GROUNDING}');
  expect(regen.match(/buildStructuredOutputSystem\(PathwayReportV2, PLANNING_SOURCE_GROUNDING\)/g)).toHaveLength(2);
  expect(ppt).toContain('${PPT_SOURCE_GROUNDING_RULES}\\n${PLANNING_SOURCE_GROUNDING}');
});
