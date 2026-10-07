// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReportV2InputsUsed } from "../../src/components/pathway/ReportV2Extras";
afterEach(cleanup);
it("lets readers expand and close the source list without exposing record identifiers", () => {
  const { container } = render(<ReportV2InputsUsed content={{ schema_version: 2, inputs_used: {
    profile: true, student_voice_keys: ["private-voice-record"], iep_doc_ids: ["private-document-record"],
  } }} />);
  const button = screen.getByRole("button", { name: /Show all sources/ });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(button);
  expect(screen.getByRole("button", { name: /Hide sources/ }).getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText("1 response")).toBeTruthy();
  expect(screen.getByText("1 document")).toBeTruthy();
  expect(container.textContent).not.toContain("private-voice-record");
  expect(container.textContent).not.toContain("private-document-record");
  fireEvent.click(screen.getByRole("button", { name: /Hide sources/ }));
  expect(screen.getByRole("button", { name: /Show all sources/ }).getAttribute("aria-expanded")).toBe("false");
});
it("does not invent a source list for legacy reports or newer reports without sources", () => {
  const view = render(<ReportV2InputsUsed content={{ schema_version: 1 }} />);
  expect(view.container.textContent).toBe("");
  view.rerender(<ReportV2InputsUsed content={{ schema_version: 2 }} />);
  expect(view.container.textContent).toBe("");
});

it("describes projected sources as report records rather than claiming unavailable account data", () => {
  const { container } = render(<ReportV2InputsUsed content={{ schema_version: 2, inputs_used_summary: {
    intake: true, iep_extraction_count: 1, generated_at: "not-a-date",
  } }} />);
  expect(container.textContent).toContain("2 of 12 source categories are recorded for this report");
  expect(container.textContent).toContain("Pathway Builder Responses");
  expect(container.textContent).toContain("IEP Document Summaries");
  expect(container.textContent).toContain("1 summary");
  expect(container.textContent).toContain("Not recorded for this report");
  expect(container.textContent).not.toContain("Not provided");
  expect(container.textContent).not.toContain("Invalid Date");
});

it("does not turn malformed source metadata into recorded categories", () => {
  const { container, rerender } = render(<ReportV2InputsUsed content={{ schema_version: 2, inputs_used_summary: {
    profile: "true", student_voice_count: -1, iep_document_count: Infinity,
    goal_count: 1.5, readiness_category_count: -2, family_priorities_count: "3",
  } }} />);
  expect(container.textContent).toContain("0 of 12 source categories are recorded");
  rerender(<ReportV2InputsUsed content={{ schema_version: 2, inputs_used: {
    student_voice_keys: "not-an-array", iep_doc_ids: [null, "", "private-valid-record"],
  } }} />);
  expect(container.textContent).toContain("1 of 12 source categories are recorded");
  expect(container.textContent).toContain("1 document");
  expect(container.textContent).not.toContain("private-valid-record");
});
