// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { useDemoPlanningRole } from "../../src/lib/demo/use-demo-planning-role";
import { useDemoStudent } from "../../src/lib/demo/use-demo-student";

function PlanningPage() {
  const { profile, setProfile } = useDemoStudent();
  const { role, setRole } = useDemoPlanningRole(profile.id);
  return (
    <>
      <output data-testid="context">
        {role}:{profile.id}
      </output>
      <button onClick={() => setRole("educator")}>Educator</button>
      <button onClick={() => setProfile("riley")}>Riley</button>
    </>
  );
}

function open(entry: string) {
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "/demo/report",
    component: PlanningPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [entry] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("demo planning history", () => {
  it("restores role and student in both history directions while preserving the other query and hash", async () => {
    const router = open("/demo/report?role=family&student=sam&expand=true#report");
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("family:sam"));
    fireEvent.click(screen.getByRole("button", { name: "Educator" }));
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("educator:sam"));
    fireEvent.click(screen.getByRole("button", { name: "Riley" }));
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("educator:riley"));
    expect(router.state.location.hash).toBe("report");
    router.history.back();
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("educator:sam"));
    router.history.back();
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("family:sam"));
    router.history.forward();
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("educator:sam"));
    expect(router.state.location.search).toMatchObject({
      expand: true,
      student: "sam",
      role: "educator",
    });
    expect(router.state.location.hash).toBe("report");
  });

  it("pins old bookmarks to a supported perspective and sample so later choices cannot change their history", async () => {
    sessionStorage.setItem("demo-role-view", "partner");
    const router = open("/demo/report");
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ role: "student", student: "jordan" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Riley" }));
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("student:riley"));
    router.history.back();
    await waitFor(() => expect(screen.getByTestId("context").textContent).toBe("student:jordan"));
  });

  it("uses the saved sample only until the old bookmark has an explicit URL context", async () => {
    localStorage.setItem("tf.demo.selectedStudent", "sam");
    sessionStorage.setItem("demo-role-view", "family");
    const router = open("/demo/report");
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ role: "family", student: "sam" }),
    );
    expect(screen.getByTestId("context").textContent).toBe("family:sam");
  });
});
