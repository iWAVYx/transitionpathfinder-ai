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
