// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrainingScheduleCard } from "@/components/implementation/TrainingScheduleCard";
import { ReportingDeadlinesCard } from "@/components/implementation/ReportingDeadlinesCard";
import {
  StaffProgressTable,
  membershipAccessStatus,
} from "@/components/implementation/StaffProgressTable";
import { RolloutMilestonesCard } from "@/components/implementation/RolloutMilestonesCard";
const key = (scope: string) => `tf.training-schedule.v1:${scope}`;
const session = (title = "Saved Training") => ({
  id: "custom-session",
  title,
  date: "2026-10-15",
  audience: "Educators",
  location: "Virtual",
  retained: { note: "Keep this extra field" },
});
const fill = () => {
  fireEvent.change(screen.getByLabelText("Session"), { target: { value: "User Planned Session" } });
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-15" } });
};
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
it("new StrictMode schedules remain empty and do not auto-write example sessions", async () => {
  const save = vi.spyOn(Storage.prototype, "setItem");
  render(
    <StrictMode>
      <TrainingScheduleCard scopeId="school:a" />
    </StrictMode>,
  );
  await screen.findByText("No training sessions scheduled yet.");
  expect(save).not.toHaveBeenCalled();
  expect(localStorage.getItem(key("school:a"))).toBeNull();
});
it("retains valid saved schedules byte-for-byte on reading and preserves extra fields on explicit add", async () => {
  const raw = JSON.stringify([session()]);
  localStorage.setItem(key("school:a"), raw);
  const save = vi.spyOn(Storage.prototype, "setItem");
  render(<TrainingScheduleCard scopeId="school:a" />);
  await screen.findByText("Saved Training");
  expect(save).not.toHaveBeenCalled();
  expect(localStorage.getItem(key("school:a"))).toBe(raw);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Add Training Session" }));
  await screen.findByText("User Planned Session");
  const stored = JSON.parse(localStorage.getItem(key("school:a"))!);
  expect(stored).toHaveLength(2);
  expect(stored[0]).toEqual(session());
  expect((screen.getByLabelText("Session") as HTMLInputElement).value).toBe("");
});
it.each(["school", "district"])(
  "%s switching clears old data/form without copying schedules into the new scope",
  async (role) => {
    const a = `${role}:a`;
    const b = `${role}:b`;
    const old = JSON.stringify([session("School A Schedule")]);
    const current = JSON.stringify([session("School B Schedule")]);
    localStorage.setItem(key(a), old);
    localStorage.setItem(key(b), current);
    const save = vi.spyOn(Storage.prototype, "setItem");
    const view = render(<TrainingScheduleCard scopeId={a} />);
    await screen.findByText("School A Schedule");
    fill();
    view.rerender(<TrainingScheduleCard scopeId={b} />);
    expect(screen.queryByText("School A Schedule")).toBeNull();
    expect((screen.getByLabelText("Session") as HTMLInputElement).value).toBe("");
    await screen.findByText("School B Schedule");
    expect(save).not.toHaveBeenCalled();
    expect(localStorage.getItem(key(a))).toBe(old);
    expect(localStorage.getItem(key(b))).toBe(current);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Add Training Session" }));
    expect(localStorage.getItem(key(a))).toBe(old);
    expect(JSON.parse(localStorage.getItem(key(b))!).map((row: any) => row.title)).toEqual([
      "School B Schedule",
      "User Planned Session",
    ]);
  },
);
it.each([
  "broken JSON",
  JSON.stringify({ wrong: [] }),
  JSON.stringify([{ ...session(), date: "2026-02-30" }]),
  JSON.stringify([{ ...session(), title: null }]),
  JSON.stringify([session(), session()]),
])("protects unreadable saved data from automatic overwrite: %s", async (raw) => {
  localStorage.setItem(key("school:a"), raw);
  const save = vi.spyOn(Storage.prototype, "setItem");
  render(<TrainingScheduleCard scopeId="school:a" />);
  await screen.findByRole("alert");
  expect(save).not.toHaveBeenCalled();
  expect(localStorage.getItem(key("school:a"))).toBe(raw);
  expect(
    (screen.getByRole("button", { name: "Add Training Session" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(screen.queryByText("No training sessions scheduled yet.")).toBeNull();
});
it("failed storage reads offer reload without writing an empty schedule", async () => {
  const raw = JSON.stringify([session()]);
  localStorage.setItem(key("school:a"), raw);
  vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
    throw new Error("Private browser error");
  });
  const save = vi.spyOn(Storage.prototype, "setItem");
  render(<TrainingScheduleCard scopeId="school:a" />);
  await screen.findByRole("alert");
  expect(document.body.textContent).not.toContain("Private browser error");
  fireEvent.click(screen.getByRole("button", { name: "Reload Schedule" }));
  await screen.findByText("Saved Training");
  expect(save).not.toHaveBeenCalled();
});
it("failed writes retain saved rows and draft input and permit the same explicit change to be retried", async () => {
  const raw = JSON.stringify([session()]);
  localStorage.setItem(key("school:a"), raw);
  render(<TrainingScheduleCard scopeId="school:a" />);
  await screen.findByText("Saved Training");
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("Quota failure");
  });
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Add Training Session" }));
  await screen.findByRole("alert");
  expect(localStorage.getItem(key("school:a"))).toBe(raw);
  expect((screen.getByLabelText("Session") as HTMLInputElement).value).toBe("User Planned Session");
  fireEvent.click(screen.getByRole("button", { name: "Add Training Session" }));
  await screen.findByText("User Planned Session");
  expect(JSON.parse(localStorage.getItem(key("school:a"))!)).toHaveLength(2);
  expect(screen.queryByRole("alert")).toBeNull();
});
it("a changed browser record is preserved until explicit reload before editing", async () => {
  localStorage.setItem(key("school:a"), JSON.stringify([session()]));
  render(<TrainingScheduleCard scopeId="school:a" />);
  await screen.findByText("Saved Training");
  const newer = JSON.stringify([session("Other Tab Schedule")]);
  localStorage.setItem(key("school:a"), newer);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Add Training Session" }));
  await screen.findByText("This schedule changed in another tab. Reload it before editing.");
  expect(localStorage.getItem(key("school:a"))).toBe(newer);
  fireEvent.click(screen.getByRole("button", { name: "Reload Schedule" }));
  await screen.findByText("Other Tab Schedule");
  fireEvent.click(screen.getByRole("button", { name: "Add Training Session" }));
  expect(JSON.parse(localStorage.getItem(key("school:a"))!).map((row: any) => row.title)).toEqual([
    "Other Tab Schedule",
    "User Planned Session",
  ]);
});
it("legacy example entries are retained and labelled; past dates do not claim delivery", async () => {
  const legacy = {
    id: "s1",
    title: "Kickoff & Platform Overview",
    date: "2020-01-01",
    audience: "All staff",
    location: "Virtual",
  };
  const raw = JSON.stringify([legacy]);
  localStorage.setItem(key("school:a"), raw);
  render(<TrainingScheduleCard scopeId="school:a" />);
  await screen.findByText("Earlier Example — Confirm Details");
  expect(screen.getByText("Past Date")).toBeTruthy();
  expect(screen.queryByText("Delivered")).toBeNull();
  expect(localStorage.getItem(key("school:a"))).toBe(raw);
});
it("removes only the explicitly selected session and saves no other scope", async () => {
  const rows = [session(), { ...session("Other Session"), id: "other" }];
  localStorage.setItem(key("district:a"), JSON.stringify(rows));
  render(<TrainingScheduleCard scopeId="district:a" />);
  await screen.findByText("Saved Training");
  fireEvent.click(screen.getByRole("button", { name: "Remove Saved Training" }));
  expect(JSON.parse(localStorage.getItem(key("district:a"))!)).toEqual([rows[1]]);
  expect(localStorage.getItem(key("school:a"))).toBeNull();
});
it("concurrent card inputs have distinct accessible IDs", async () => {
  render(
    <>
      <TrainingScheduleCard scopeId="school:a" />
      <TrainingScheduleCard scopeId="district:a" />
    </>,
  );
  await waitFor(() => expect(screen.getAllByLabelText("Session")).toHaveLength(2));
  expect(new Set(screen.getAllByLabelText("Session").map((input) => input.id)).size).toBe(2);
});
it.each(["school", "district"] as const)(
  "%s reporting links to official guidance without asserting dates or overdue status",
  (scope) => {
    render(<ReportingDeadlinesCard scope={scope} />);
    expect(
      screen.getByText(new RegExp(`No confirmed reporting dates are connected to this ${scope}`)),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Connecticut Reporting Calendar" }).getAttribute("href"),
    ).toBe("https://portal.ct.gov/sde/performance/data-collections-guide");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("target")).toBe("_blank");
    }
    expect(document.body.textContent).not.toContain("Past due");
    expect(document.body.textContent).not.toContain("Quarterly");
  },
);
it.each(["active", "invited", "pending", "suspended", "removed", "inactive", "unexpected"])(
  "preserves recorded membership status without inventing training progress: %s",
  (status) => {
    render(
      <StaffProgressTable
        rows={[
          {
            key: "row",
            name: "Synthetic Staff",
            role: "educator",
            status: membershipAccessStatus(status),
          },
        ]}
      />,
    );
    expect(
      screen.getByText(
        status === "unexpected"
          ? "Status Unavailable"
          : status.charAt(0).toUpperCase() + status.slice(1),
      ),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain("100%");
    expect(document.body.textContent).not.toContain("25%");
    expect(screen.getAllByText("Not recorded")).toHaveLength(2);
  },
);
it("provided zero training progress and zero milestones draw true zero widths", () => {
  const view = render(
    <StaffProgressTable
      rows={[{ key: "row", name: "Synthetic", role: "educator", status: "active", progress: 0 }]}
    />,
  );
  expect(screen.getByText("0%")).toBeTruthy();
  expect((view.container.querySelector(".bg-primary") as HTMLElement).style.width).toBe("0%");
  view.unmount();
  const milestones = render(
    <RolloutMilestonesCard
      scope="school"
      milestones={[
        { key: "step", label: "Recorded Step", detail: "Not yet recorded", done: false },
      ]}
    />,
  );
  expect(screen.getByText("0 of 1 met")).toBeTruthy();
  expect((milestones.container.querySelector(".bg-primary") as HTMLElement).style.width).toBe("0%");
});
it.each([NaN, -1, 101])(
  "invalid recorded training progress is unavailable, not silently clamped (%s)",
  (progress) => {
    render(
      <StaffProgressTable
        rows={[{ key: "row", name: "Synthetic", role: "educator", status: "active", progress }]}
      />,
    );
    expect(screen.getAllByText("Not recorded")).toHaveLength(2);
    expect(document.body.textContent).not.toContain("NaN%");
  },
);
