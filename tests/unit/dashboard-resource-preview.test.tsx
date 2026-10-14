// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
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
afterEach(cleanup);
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
