// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReportSectionUpdates } from "../../src/components/documents/ReportSectionUpdates";
afterEach(cleanup);
const rows = [{ field: "confidence", label: "confidence and review", operation: "generated" as const, recordedAt: "2026-10-12T18:00:00.000Z" },
  { field: "postsecondary_goals", label: "postsecondary goals", operation: "saved" as const, recordedAt: "2026-10-01T01:00:00.000Z" },
  { field: "recommended_pathways", label: "recommended pathways" }];
it("shows a compact disclosure with complete recorded dates, saved wording and unknown rows", () => {
  const { container } = render(<ReportSectionUpdates rows={rows} />);
  const button = screen.getByRole("button", { name: "Show Update Details" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(container.querySelector('[data-report-update-body]')!.className).toContain("hidden print:block");
  fireEvent.click(button);
  expect(screen.getByRole("button", { name: "Hide Update Details" }).getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("rowheader", { name: "Confidence and Review" })).toBeTruthy();
  expect(container.querySelector('[data-report-update-field="confidence"]')!.textContent).toContain("Generated · Oct 12, 2026");
  expect(container.querySelector('[data-report-update-field="postsecondary_goals"]')!.textContent).toContain("Saved · Oct 1, 2026");
  expect(container.querySelector('[data-report-update-field="recommended_pathways"]')!.textContent).toContain("Update Date Unavailable");
  expect(container.querySelector('time')!.getAttribute('dateTime')).toBe(rows[0].recordedAt);
  expect(container.textContent).toContain("Saved sections may include restored text");
  expect(container.textContent).not.toMatch(/Approved|Reviewed on/);
});
it("unknown reports have an honest notice without a long empty table or invented date", () => {
  const { container } = render(<ReportSectionUpdates rows={[rows[2]]} />);
  expect(screen.getByText(/Section update dates aren’t available/)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull(); expect(container.querySelector('time')).toBeNull(); expect(container.querySelector('table')).toBeNull();
});
it("samples do not turn supplied fictional timestamps into saved history", () => {
  const { container } = render(<ReportSectionUpdates rows={rows} sample />);
  expect(screen.getByText("This sample has no saved section update history.")).toBeTruthy();
  expect(container.querySelector('time')).toBeNull(); expect(container.querySelector('table')).toBeNull();
});
it("changing the report replaces all history rows even when the disclosure is open", () => {
  const view = render(<ReportSectionUpdates rows={rows} />);
  fireEvent.click(screen.getByRole("button", { name: "Show Update Details" }));
  view.rerender(<ReportSectionUpdates rows={[{ field: "summary", label: "Current Summary", operation: "saved", recordedAt: "2026-10-11T12:00:00.000Z" }]} />);
  expect(screen.queryByText("Confidence and Review")).toBeNull(); expect(screen.getByText("Current Summary")).toBeTruthy();
  expect(view.container.textContent).not.toContain("Oct 1, 2026");
});

it("distinguishes retained earlier sections from current updates in screen and print table markup", () => {
  const { container } = render(<ReportSectionUpdates rows={[{ ...rows[1], earlier: true }, rows[0]]} />);
  fireEvent.click(screen.getByRole("button", { name: "Show Update Details" }));
  const earlier = container.querySelector('[data-report-update-field="postsecondary_goals"]')!;
  expect(earlier.textContent).toContain("Kept from an Earlier Version");
  expect(earlier.textContent).toContain("Saved · Oct 1, 2026");
  expect(container.querySelector('[data-report-update-field="confidence"]')!.textContent).not.toContain("Kept from");
  expect(container.querySelector('#report-section-update-history')).not.toBeNull();
  expect(container.querySelector('[data-report-update-body]')!.className).not.toContain("hidden");
});
