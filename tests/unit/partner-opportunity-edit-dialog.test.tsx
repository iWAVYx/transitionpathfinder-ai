// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.save }));
vi.mock("@/lib/partner-workspace.functions", () => ({ editOpportunityDetails: vi.fn() }));
import { OpportunityEditDialog } from "../../src/components/partners/OpportunityEditDialog";
const opportunity = {
  id: "11111111-1111-4111-8111-111111111111",
  organization_id: "org",
  title: "Kitchen practice",
  description: "Original description",
  opportunity_type: "internship",
  status: "draft",
  location: null,
  age_range: null,
  eligibility: null,
  application_url: "https://example.org",
  contact_email: null,
  created_at: "2026-10-01T12:00:00Z",
  updated_at: "2026-10-02T12:00:00Z",
};
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
it("prefills fields and saves edits including a cleared application link", async () => {
  mocks.save.mockResolvedValue({ ok: true });
  const onSaved = vi.fn();
  render(<OpportunityEditDialog opportunity={opportunity} onClose={vi.fn()} onSaved={onSaved} />);
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Kitchen practice");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated program" } });
  fireEvent.change(screen.getByLabelText("Application link"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(mocks.save).toHaveBeenCalledWith({
    data: expect.objectContaining({
      id: opportunity.id,
      title: "Updated program",
      application_url: "",
      expected_updated_at: opportunity.updated_at,
    }),
  });
});
it("retains edits and shows the error when saving fails", async () => {
  mocks.save.mockRejectedValue(new Error("Listing changed. Refresh before saving."));
  const onSaved = vi.fn();
  render(<OpportunityEditDialog opportunity={opportunity} onClose={vi.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Keep these edits" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Listing changed");
  expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe(
    "Keep these edits",
  );
  expect(onSaved).not.toHaveBeenCalled();
});
it("cancels without saving", () => {
  const onClose = vi.fn();
  render(<OpportunityEditDialog opportunity={opportunity} onClose={onClose} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(mocks.save).not.toHaveBeenCalled();
});
it("focuses a field with invalid input without sending a save", () => {
  render(<OpportunityEditDialog opportunity={opportunity} onClose={vi.fn()} onSaved={vi.fn()} />);
  const link = screen.getByLabelText("Application link");
  fireEvent.change(link, { target: { value: "javascript:alert(1)" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(document.activeElement).toBe(link);
  expect(link.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("alert").textContent).toContain("http:// or https://");
  expect(mocks.save).not.toHaveBeenCalled();
});
it("prevents duplicate saves and closing while a save is pending", async () => {
  let finish!: (value: unknown) => void;
  mocks.save.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<OpportunityEditDialog opportunity={opportunity} onClose={onClose} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  const saving = screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement;
  expect(saving.disabled).toBe(true);
  fireEvent.click(saving);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  expect(mocks.save).toHaveBeenCalledOnce();
  await act(async () => finish({ ok: true }));
  expect(onSaved).toHaveBeenCalledOnce();
});
