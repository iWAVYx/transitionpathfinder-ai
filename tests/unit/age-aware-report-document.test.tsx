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
      for (const block of report.blocks) {
        expect(html).toContain(escaped(block.body));
        for (const bullet of block.bullets ?? []) expect(html).toContain(escaped(bullet));
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
