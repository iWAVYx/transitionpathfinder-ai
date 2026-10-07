import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PathwayReport } from "../../src/components/demo/PathwayReport";
import { getDemoProfile } from "../../src/lib/demo/demo-profiles";
import * as engine from "../../src/lib/demo/pathway-engine";
import { generatePathwayReport } from "../../src/lib/demo/pathway-engine";
import { toTitleCase } from "../../src/lib/title-case";

const escaped = (text: string) => renderToStaticMarkup(<span>{text}</span>).slice(6,-7);
for (const id of ["sam","riley","jordan"] as const) {
  for (const audience of ["student","family","educator"] as const) {
    it(`${id}/${audience} shares document structure without losing source content or timing`, () => {
      const profile = getDemoProfile(id);
      const report = generatePathwayReport(profile);
      // An explicit profile also keeps matching independent of router/storage defaults.
      const html = renderToStaticMarkup(<PathwayReport profile={profile} audience={audience} />);
      expect(html).toContain('data-generated-document="true"');
      expect(html).toContain('data-document-sample-notice');
      expect(html).toContain('data-document-watermark');
      expect(html).toContain('data-report-stage="roadmap"');
      expect(html).toContain('data-report-stage="action"');
      expect(html).toContain('data-report-stage="voice"');
      expect(html).toContain('href="#section-student_voice"');
      expect(html).toContain('href="#section-strengths_preferences_interests_needs"');
      for (const value of [...profile.learning.strengths, ...profile.learning.learningPreferences, ...profile.learning.interests,
        ...profile.learning.supportNeeds, ...(profile.learning.sensoryNotes ?? []), profile.learning.communicationStyle]) {
        expect(html).toContain(escaped(value));
      }
      expect(html).toContain('href="#section-readiness_scorecard"');
      expect(html).toContain(escaped(profile.readiness.notes ?? ""));
      expect(html).toContain('This sample does not include scored assessments or evidence for each band.');
      expect(html).toContain('href="#section-postsecondary_goals"');
      for (const goal of profile.goals) expect(html).toContain(escaped(goal.title));
      for (const value of [profile.environment.idealSchoolFeel, profile.environment.classSizePreference,
        ...profile.environment.environmentsToSeek, ...profile.environment.environmentsToAvoid,
        ...profile.family.keyConsiderations, profile.family.transportationNote, profile.family.workingParentSchedule].filter(Boolean)) {
        expect(html).toContain(escaped(value!));
      }
      expect(html).toContain('href="#section-family_action_plan"');
      for (const response of profile.voice) {
        expect(html).toContain(escaped(response.prompt));
        expect(html).toContain(escaped(response.answer));
      }
      for (const block of report.blocks) {
        expect(html).toContain(escaped(block.body));
        // Actions are rendered once in owner groups, not repeated as summary bullets.
        if (!["what_to_do_next", "what_we_know", "why_it_fits"].includes(block.section)) for (const bullet of block.bullets ?? []) expect(html).toContain(escaped(bullet));
        if (block.section === "why_it_fits") expect(html).toContain(escaped(block.bullets![0]));
        if (block.missing) {
          expect(html).toContain(escaped(block.missing.reason));
          for (const needed of block.missing.needed) expect(html).toContain(escaped(needed));
        }
      }
      for (const option of report.pathwayOptions) {
        expect(html).toContain(escaped(toTitleCase(option.title)));
        for (const text of [option.fitSummary,option.ahead,option.beside,option.behind]) expect(html).toContain(escaped(text));
      }
      for (const step of report.nextSteps) {
        expect(html).toContain(escaped(step.detail));
        expect(html).toContain(`Review in ${step.reviewByMonths} mo`);
      }
      for (const alternative of report.alternativePathways) expect(html).toContain(escaped(alternative.whenToConsider));
      for (const conflict of report.conflicts) expect(html).toContain(escaped(conflict.summary));
      expect(html).not.toContain('30 / 90 / 180 / 365 Day Plan');
      expect(html).not.toContain('Save to Profile');
      for (const other of ['Sam','Riley','Jordan'].filter(name => name !== profile.shortName)) expect(new RegExp(`\\b${other}\\b`).test(html)).toBe(false);
    });
  }
}
it("keeps a structured missing-evidence marker visible instead of filling it", () => {
  const profile = getDemoProfile('sam');
  const report = generatePathwayReport(profile);
  report.blocks[1].missing = {reason: 'A current observation is not available.', needed: ['Ask the school team for a dated observation.']};
  const spy = vi.spyOn(engine, 'generatePathwayReport').mockReturnValue(report);
  try {
    const html = renderToStaticMarkup(<PathwayReport profile={profile} audience="family" />);
    expect(html.includes('data-demo-report-missing="evidence"')).toBe(true);
    expect(html.includes(escaped(report.blocks[1].missing.reason))).toBe(true);
    expect(html.includes(escaped(report.blocks[1].missing.needed[0]))).toBe(true);
  } finally {spy.mockRestore();}
});


it("does not invent student responses or an empty voice destination", () => {
  const profile = { ...getDemoProfile("sam"), voice: [] };
  const html = renderToStaticMarkup(<PathwayReport profile={profile} audience="educator" />);
  expect(html).not.toContain('href="#section-student_voice"');
  expect(html).not.toContain('data-report-voice-response=');
  expect(html).not.toContain('id="section-student_voice"');
});

it("does not invent learning details or a contents target for an empty profile", () => {
  const profile = { ...getDemoProfile("sam"), learning: { diagnosis: [], strengths: [], interests: [], supportNeeds: [], learningPreferences: [], communicationStyle: "" },
    environment: {idealSchoolFeel: "", classSizePreference: "", environmentsToSeek: [], environmentsToAvoid: []},
    family: {...getDemoProfile("sam").family, keyConsiderations: [], transportation: [], transportationNote: undefined, workingParentSchedule: undefined} };
  const html = renderToStaticMarkup(<PathwayReport profile={profile} />);
  expect(html).not.toContain('href="#section-strengths_preferences_interests_needs"');
  expect(html).not.toContain('data-report-profile-details=');
});

it("omits a goals destination when the sample has no recorded goals", () => {
  const html = renderToStaticMarkup(<PathwayReport profile={{...getDemoProfile("sam"), goals: []}} />);
  expect(html).not.toContain('href="#section-postsecondary_goals"');
  expect(html).not.toContain('data-report-recorded-goal=');
});

it("does not manufacture family constraints or an empty family destination", () => {
  const base = getDemoProfile("sam");
  const profile = {...base, family: {...base.family, keyConsiderations: [], transportation: [], transportationNote: undefined, workingParentSchedule: undefined}};
  const html = renderToStaticMarkup(<PathwayReport profile={profile} audience="family" />);
  expect(html).not.toContain('href="#section-family_action_plan"');
  expect(html).not.toContain('data-report-stage="family"');
});

it("preserves a summary note that is not an exact duplicate of a detailed action", () => {
  const profile = getDemoProfile("sam");
  const report = generatePathwayReport(profile);
  const block = report.blocks.find(block => block.section === "what_to_do_next")!;
  block.bullets = [...(block.bullets ?? []), "Discuss travel before choosing the schedule."];
  const spy = vi.spyOn(engine, "generatePathwayReport").mockReturnValue(report);
  try {
    const html = renderToStaticMarkup(<PathwayReport profile={profile} audience="family" />);
    expect(html).toContain("Discuss travel before choosing the schedule.");
    expect(html).not.toContain(escaped(block.bullets[0]));
    for (const step of report.nextSteps) expect(html).toContain(escaped(step.detail));
  } finally { spy.mockRestore(); }
});

it("preserves unmatched snapshot and pathway-fit notes while omitting exact repeated facts", () => {
  const profile = getDemoProfile("sam");
  const report = generatePathwayReport(profile);
  for (const section of ["what_we_know", "why_it_fits"] as const) {
    const block = report.blocks.find(block => block.section === section)!;
    block.bullets = [...(block.bullets ?? []), `Keep this distinct ${section} observation.`];
  }
  const spy = vi.spyOn(engine, "generatePathwayReport").mockReturnValue(report);
  try {
    const html = renderToStaticMarkup(<PathwayReport profile={profile} audience="family" />);
    expect(html).toContain("Keep this distinct what_we_know observation.");
    expect(html).toContain("Keep this distinct why_it_fits observation.");
    const snapshot = report.blocks.find(block => block.section === "what_we_know")!;
    expect(html).not.toContain(escaped(snapshot.bullets![0]));
    for (const value of [...profile.learning.strengths, ...profile.learning.interests, ...profile.learning.supportNeeds]) expect(html).toContain(escaped(value));
  } finally { spy.mockRestore(); }
});

for (const audience of ["student", "family", "educator"] as const) {
  it(`${audience} distinguishes sample information and keeps absent evidence visible`, () => {
    const profile = { ...getDemoProfile("sam"), evidence: [], voice: [] };
    const html = renderToStaticMarkup(<PathwayReport profile={profile} audience={audience} />);
    expect(html).toContain("Sample Information Used");
    expect(html).toContain("0 sample evidence items and 0 sample student responses");
    expect(html).toContain("not verified findings");
    expect(html).toContain('data-demo-report-missing="evidence"');
    expect(html).toContain("No sample evidence items are recorded for this profile.");
    expect(html).toContain("Gather current observations or documents before confirming recommendations.");
    expect(html).not.toContain("Nothing here is speculation");
    expect(html).not.toContain("The team will close these");
    expect(html).not.toContain('href="#section-student_voice"');
  });
}
