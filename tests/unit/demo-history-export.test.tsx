// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoHistoryExport } from "@/components/demo/DemoHistoryExport";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("demo export has an explicit sample preview without live authentication or record calls", async () => {
  render(<DemoHistoryExport displayName="Sam Alvarez" />);
  fireEvent.click(screen.getByRole("button", { name: "Preview Sample History" }));
  await screen.findByRole("dialog");
  expect(screen.getByText("Sam Alvarez")).toBeTruthy();
  expect(
    screen.getByText(/These dates, people and events are demonstration examples/),
  ).toBeTruthy();
  expect(screen.getAllByText("Fictional Family Member")).toHaveLength(2);
});
it("demo CSV is labelled fictional and is downloaded entirely from its local sample", () => {
  vi.useFakeTimers();
  const revoke = vi.fn();
  let blob: Blob | undefined;
  const create = vi.fn((value: Blob) => {
    blob = value;
    return "blob:fictional";
  });
  const OriginalURL = URL;
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = create;
      static revokeObjectURL = revoke;
    },
  );
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<DemoHistoryExport displayName="Riley Chen" />);
  fireEvent.click(screen.getByRole("button", { name: "Download Sample Activity (CSV)" }));
  expect(create).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  expect(blob?.type).toBe("text/csv;charset=utf-8");
  vi.runOnlyPendingTimers();
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:fictional");
});
