// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.fetch }));
vi.mock("@/lib/partner-matching.functions", () => ({ matchPartnersForStudent: {} }));
import { ReportPartnerSuggestions } from "../../src/components/pathway/ReportPartnerSuggestions";
afterEach(() => { cleanup(); mocks.fetch.mockReset(); });
it("retains all returned partner reasons and cautions without clipping descriptions", async () => {
  const reasons = Array.from({ length: 6 }, (_, i) => `Recorded fit reason ${i + 1}`);
  const conflicts = Array.from({ length: 5 }, (_, i) => `Recorded caution ${i + 1}`);
  const description = "Complete supplied description " + "with important support details. ".repeat(20);
  mocks.fetch.mockResolvedValue({ matches: [{
    partner_id: "fictional-partner", organization_name: "Fictional Organization", description,
    reasons: [], explanation: { confidence: "medium", reasons, conflicts },
    suggested_next_step: "Check the current supports with the provider.",
  }] });
  const { container } = render(<ReportPartnerSuggestions studentId="fictional-student" />);
  await screen.findByText("Fictional Organization");
  for (const text of [...reasons, ...conflicts]) expect(screen.getByText(text)).toBeTruthy();
  expect(container.textContent).toContain(description);
  expect(container.querySelector('[class*="line-clamp"]')).toBeNull();
  expect(screen.getByText("Check the current supports with the provider.")).toBeTruthy();
  expect(mocks.fetch).toHaveBeenCalledWith({ data: { student_id: "fictional-student", limit: 6 } });
});
