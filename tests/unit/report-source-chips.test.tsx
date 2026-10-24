// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SourceChips } from "../../src/components/pathway/SourceChips";
afterEach(cleanup);
for (const collapsed of [false, true]) {
  it(`retains a recorded source count without labels in ${collapsed ? "summary" : "detailed"} mode`, () => {
    const { container } = render(<SourceChips sources={[]} sourceCount={3} collapsed={collapsed} />);
    expect(container.textContent).toBe("Information from 3 recorded sources.");
    expect(container.textContent).not.toContain("student's profile");
  });
}
it("keeps full source labels readable without exposing identifiers", () => {
  const label = "A complete recorded IEP observation that needs more than eighteen characters to explain its meaning.";
  const { container } = render(<SourceChips sources={[{ kind: "iep_extraction", label, id: "private-record" }]} />);
  expect(container.textContent).toContain(label);
  expect(container.textContent).toContain("IEP Document Summary");
  expect(container.querySelector('[class*="truncate"]')).toBeNull();
  expect(container.innerHTML).not.toContain("private-record");
});
it("does not turn missing or malformed counts into source claims", () => {
  const view = render(<SourceChips sources={[]} />);
  for (const sourceCount of [undefined, 0, -1, 1.5, Infinity, NaN]) {
    view.rerender(<SourceChips sources={[]} sourceCount={sourceCount} />);
    expect(view.container.textContent).toBe("");
  }
});
it("uses actual label count rather than an inconsistent supplied count", () => {
  const { container } = render(<SourceChips sources={[{ kind: "goal", label: "Recorded goal" }]} sourceCount={9} collapsed />);
  expect(container.textContent).toBe("Information from 1 recorded source.");
});
