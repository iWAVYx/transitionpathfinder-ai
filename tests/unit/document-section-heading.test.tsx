// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PublicationPage } from "../../src/components/publication/PublicationPage";
import { DocumentSectionTitle } from "../../src/components/documents/DocumentSectionTitle";

afterEach(cleanup);
it('reuses the enclosing document heading and preserves all panel content', () => {
  const {container} = render(<section><h2>Student Snapshot</h2><DocumentSectionTitle title="Student Snapshot">
    <PublicationPage chapter="Student Snapshot" kicker="Section 01" dek="A profile grounded in the student's information.">
      <p>The student prefers a quiet workspace.</p><ul><li>Confirm transportation with the family.</li></ul>
    </PublicationPage>
  </DocumentSectionTitle></section>);
  expect([...container.querySelectorAll('h1,h2,h3')].map(node => node.textContent)).toEqual(['Student Snapshot']);
  expect(container.textContent).toContain('A profile grounded in the student');
  expect(container.textContent).toContain('quiet workspace');
  expect(container.textContent).toContain('Confirm transportation');
  expect(container.textContent).toContain('Section 01');
});
it('keeps distinct subheadings at the appropriate level', () => {
  const {container} = render(<DocumentSectionTitle title="Student Snapshot"><PublicationPage chapter="Communication Preferences"><p>Offer a written agenda.</p></PublicationPage></DocumentSectionTitle>);
  expect(container.querySelector('h3')?.textContent).toBe('Communication Preferences');
  expect(container.querySelector('h1')).toBeNull();
});
it('standalone publication pages retain their existing main heading', () => {
  const {container} = render(<PublicationPage chapter="Student Snapshot"><p>Standalone sample.</p></PublicationPage>);
  expect(container.querySelector('h1')?.textContent).toBe('Student Snapshot');
});
it('recognizes case and whitespace differences without suppressing a different title', () => {
  const {container} = render(<DocumentSectionTitle title=" Student   Snapshot "><PublicationPage chapter="student snapshot"><p>One title is enough.</p></PublicationPage><PublicationPage chapter="Student Snapshot and Goals"><p>Additional information.</p></PublicationPage></DocumentSectionTitle>);
  expect([...container.querySelectorAll('h1,h2,h3')].map(node => node.textContent)).toEqual(['Student Snapshot and Goals']);
});
it('nested sections use their own heading rather than another section title', () => {
  const {container} = render(<DocumentSectionTitle title="Student Snapshot"><DocumentSectionTitle title="Next Steps"><PublicationPage chapter="Student Snapshot"><p>Different section context.</p></PublicationPage></DocumentSectionTitle></DocumentSectionTitle>);
  expect(container.querySelector('h3')?.textContent).toBe('Student Snapshot');
});
