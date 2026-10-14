// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/golden-path.functions", () => ({ getDashboardSnapshot: vi.fn() }));
vi.mock("@/lib/dashboard/student-hub-context.functions", () => ({ getStudentHubContext: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/components/dashboard/DashboardWidgetBoard", () => ({
  DashboardWidgetBoard: () => null,
}));
vi.mock("@/components/dashboard/LiveToolPreviewDrawer", () => ({
  LiveToolPreviewDrawer: () => null,
}));
vi.mock("@/components/dashboard/ToolPreviewCard", () => ({
  ToolPreviewCard: ({ title, status, summary, bullets }: any) => (
    <section aria-label={title}>
      <p>{status}</p>
      <p>{summary}</p>
      {bullets.map((b: any) => (
        <p key={b.label}>
          {b.label}: {b.value}
        </p>
      ))}
    </section>
  ),
  ToolPreviewGrid: ({ children }: any) => <div>{children}</div>,
  ToolPreviewSection: ({ children }: any) => <div>{children}</div>,
}));
import { LiveFamilyWorkspaceOverview } from "@/components/dashboard/LiveFamilyWorkspaceOverview";
import { LiveStudentWorkspaceOverview } from "@/components/dashboard/LiveStudentWorkspaceOverview";
beforeEach(() => vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-14T12:00:00Z")));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
for (const role of ["family", "student"] as const)
  it(`${role} describes resource and saved totals as a preview rather than verified matches`, () => {
    const snapshot: any = {
      student: { id: "student", first_name: "Sample", grade_band: null, school: null },
      latestReport: null,
      goals: [],
      documents: [],
      actionItems: [],
      upcomingMeeting: null,
      meetingPrep: [],
      consents: [],
      recommendedResources: Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, saved: i === 0 })),
    };
    render(
      role === "family" ? (
        <LiveFamilyWorkspaceOverview firstName="Sample" snapshot={snapshot} />
      ) : (
        <LiveStudentWorkspaceOverview snapshot={snapshot} />
      ),
    );
    const card = within(
      screen.getByRole("region", {
        name: role === "family" ? "Recommended Resources" : "Resources For Me",
      }),
    );
    expect(card.getByText("6 shown")).toBeTruthy();
    expect(card.getByText("Shown: 6")).toBeTruthy();
    expect(card.getByText("Saved In This Preview: 1")).toBeTruthy();
    expect(card.getByText(/up to six resources/i)).toBeTruthy();
    expect(card.getByText(/Topic keywords/)).toBeTruthy();
    expect(card.queryByText("6 matched")).toBeNull();
  });

it("keeps the Family demo's keyword preview wording distinct from verified personalized matches", async () => {
  const { getDemoRole } = await import("@/lib/demo/role-previews");
  const { PARENT_FEATURE_DETAILS } = await import("@/lib/demo/parent/feature-details");
  const card = getDemoRole("family").toolPreviews.find(
    (card) => card.title === "Recommended Resources",
  )!;
  expect(card.status).toBe("Resource Preview");
  expect(card.summary).toContain("topic keywords");
  const detail = PARENT_FEATURE_DETAILS["recommended-resources"];
  expect(detail.eyebrow).toBe("Resource Preview");
  expect(detail.stats).toContainEqual({ label: "Preview Limit", value: "6" });
  expect(detail.stats).toContainEqual({ label: "Saved In This Preview", value: "2" });
  expect(detail.dataSource).toContain("Fictional");
  expect(detail.emptyBody).not.toContain("matched resources will show up");
});

it("uses current consent record dates in the actual Family card", () => {
  const c = {
    consent_status: "granted",
    granted_at: "2026-10-13T12:00:00Z",
    revoked_at: null,
    expires_at: null,
  };
  const snapshot: any = {
    student: { id: "student", first_name: "Sample" },
    latestReport: null,
    goals: [],
    documents: [],
    actionItems: [],
    upcomingMeeting: null,
    meetingPrep: [],
    recommendedResources: [],
    consents: [
      c,
      { ...c, expires_at: "2026-10-14T12:00:00Z" },
      { ...c, granted_at: "2026-10-15T12:00:00Z" },
      { ...c, revoked_at: "2026-10-13T13:00:00Z" },
      { ...c, expires_at: "invalid" },
    ],
  };
  render(<LiveFamilyWorkspaceOverview firstName="Sample" snapshot={snapshot} />);
  const card = within(screen.getByRole("region", { name: "Sharing & Consent" }));
  expect(card.getByText("1 active")).toBeTruthy();
  expect(card.getByText("Active consents: 1")).toBeTruthy();
});
for (const role of ["family", "student"] as const)
  it(`${role} does not present a cached past meeting and its prep as upcoming`, () => {
    const snapshot: any = {
      student: { id: "student", first_name: "Sample" },
      latestReport: null,
      goals: [],
      documents: [],
      actionItems: [],
      upcomingMeeting: {
        id: "past",
        title: "Past Meeting",
        location: "Past Location",
        scheduled_at: "2026-10-13T12:00:00Z",
      },
      meetingPrep: [{ completed: false }],
      recommendedResources: [],
      consents: [],
    };
    render(
      role === "family" ? (
        <LiveFamilyWorkspaceOverview firstName="Sample" snapshot={snapshot} />
      ) : (
        <LiveStudentWorkspaceOverview snapshot={snapshot} />
      ),
    );
    const prep = within(
      screen.getByRole("region", { name: role === "family" ? "Meeting Prep" : "Meetings & Prep" }),
    );
    expect(prep.getByText("Not scheduled")).toBeTruthy();
    expect(prep.getByText("Prep open: 0")).toBeTruthy();
    if (role === "family") {
      const calendar = within(screen.getByRole("region", { name: "Calendar" }));
      expect(calendar.getByText("No Upcoming Meeting")).toBeTruthy();
      expect(calendar.queryByText("Clear")).toBeNull();
      expect(calendar.queryByText(/Past Location/)).toBeNull();
    }
  });
it("does not promise personal resource suitability in the shared tool preview", async () => {
  const { studentToolPreviewDetails } = await import("@/lib/dashboard/tool-preview-details");
  const snapshot: any = {
    student: null,
    recommendedResources: [],
    upcomingMeeting: { title: "Past Meeting", scheduled_at: "2026-10-13T12:00:00Z" },
    meetingPrep: [{ completed: false }],
  };
  const meeting = studentToolPreviewDetails("/calendar", snapshot);
  expect(meeting.details).toContainEqual({
    label: "Next meeting",
    value: "No meeting is scheduled yet.",
  });
  expect(meeting.details.find((row) => row.label === "Preparation")?.value).toBe(
    "No upcoming meeting is selected for preparation.",
  );
  expect(studentToolPreviewDetails("/resources", snapshot).nextStep).toContain(
    "decide whether it is useful",
  );
});
