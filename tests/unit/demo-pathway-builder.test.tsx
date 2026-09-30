// @vitest-environment jsdom
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DemoPathwayBuilder } from "../../src/components/demo/DemoPathwayBuilder";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: ComponentPropsWithoutRef<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/pathway/IepUpload", () => ({
  IepUpload: () => {
    throw new Error("Public demo must not mount live uploads");
  },
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("shared Pathway Builder demo", () => {
  it("offers only eligible builder perspectives, preserves edited inputs through back/forward, and reviews without generating", async () => {
    render(<DemoPathwayBuilder />);
    expect(screen.getByTestId("pathway-role-family")).not.toBeNull();
    expect(screen.getByTestId("pathway-role-educator")).not.toBeNull();
    expect(screen.queryByTestId("pathway-role-student")).toBeNull();
    expect(screen.queryByRole("button", { name: /partner|district|school admin/i })).toBeNull();
    fireEvent.click(screen.getByTestId("pathway-continue"));
    await screen.findByText("Fictional sample student");
    expect(screen.getByRole("combobox", { name: "Grade band" })).not.toBeNull();
    expect(screen.queryByLabelText(/upload/i)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("First name only"), {
      target: { value: "Test Student" },
    });
    fireEvent.click(screen.getByTestId("pathway-continue"));
    await waitFor(() =>
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25"),
    );
    fireEvent.click(screen.getByTestId("pathway-back"));
    expect((screen.getByPlaceholderText("First name only") as HTMLInputElement).value).toBe(
      "Test Student",
    );
    for (let current = 1; current < 7; current++) {
      fireEvent.click(screen.getByTestId("pathway-continue"));
      await waitFor(() =>
        expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
          String(Math.round(((current + 1) / 8) * 100)),
        ),
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Review sample inputs" }));
    await screen.findByRole("region", { name: "How your inputs inform the report" });
    expect(
      screen.getByRole("link", { name: "Read the sample Pathway Report" }).getAttribute("href"),
    ).toBe("/demo/report");
    expect(screen.getByText(/separate prepared example/)).not.toBeNull();
  });

  it("restores the last step and fictional answers after leaving and returning", async () => {
    const first = render(<DemoPathwayBuilder />);
    fireEvent.click(screen.getByTestId("pathway-continue"));
    fireEvent.change(await screen.findByPlaceholderText("First name only"), {
      target: { value: "Return Sample" },
    });
    fireEvent.click(screen.getByTestId("pathway-continue"));
    await waitFor(() =>
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25"),
    );
    first.unmount();
    render(<DemoPathwayBuilder />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
    fireEvent.click(screen.getByTestId("pathway-back"));
    expect((screen.getByPlaceholderText("First name only") as HTMLInputElement).value).toBe(
      "Return Sample",
    );
  });

  it("ignores unsupported persisted roles and broken drafts", () => {
    sessionStorage.setItem(
      "tf:demo:pathway-builder:v1",
      JSON.stringify({
        step: 7,
        values: { submitter_role: "student", student_first_name: "Invalid role" },
      }),
    );
    const first = render(<DemoPathwayBuilder />);
    expect(screen.getByTestId("pathway-role-family")).not.toBeNull();
    expect(screen.queryByTestId("pathway-role-student")).toBeNull();
    first.unmount();
    sessionStorage.setItem("tf:demo:pathway-builder:v1", "broken json");
    render(<DemoPathwayBuilder />);
    expect(screen.getByTestId("pathway-role-family")).not.toBeNull();
  });
});
