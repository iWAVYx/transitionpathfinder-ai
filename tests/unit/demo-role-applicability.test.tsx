// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoRoleLens } from "../../src/components/demo/DemoRoleLens";
import { useDemoRoleView, WORKSPACE_ROLE_IDS } from "../../src/lib/demo/use-demo-role-view";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function Tool() {
  const { role } = useDemoRoleView(WORKSPACE_ROLE_IDS);
  return (
    <>
      <DemoRoleLens />
      <output data-testid="perspective">{role}</output>
    </>
  );
}

describe("applicable demo planning perspectives", () => {
  it.each(["partner", "school-admin", "district-admin"])(
    "does not render an unsupported persisted %s perspective",
    (role) => {
      sessionStorage.setItem("demo-role-view", role);
      render(<Tool />);
      expect(screen.getAllByRole("button")).toHaveLength(3);
      expect(screen.getByTestId("perspective").textContent).toBe("student");
      expect(screen.queryByRole("button", { name: /partner|admin/i })).toBeNull();
      const family = screen.getByRole("button", { name: /parent|family/i });
      expect(family.tabIndex).toBe(0);
      fireEvent.click(family);
      expect(family.getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByTestId("perspective").textContent).toBe("family");
    },
  );
});
