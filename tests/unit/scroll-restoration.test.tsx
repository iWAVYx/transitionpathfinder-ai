// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ScrollToTop } from "../../src/components/site/ScrollToTop";
const state = vi.hoisted(() => ({
  position: undefined as undefined | { scrollY: number },
  hash: "target",
}));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ href: "/example#target", hash: state.hash }),
  useElementScrollRestoration: () => state.position,
}));
let frame: FrameRequestCallback;
let resized: () => void;
beforeEach(() => {
  state.position = undefined;
  state.hash = "target";
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: () => void) {
        resized = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frame = cb;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(1200);
  vi.spyOn(window, "scrollY", "get").mockReturnValue(0);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("reaches an existing bottom anchor even when its offset exceeds maximum scroll", () => {
  const { getByTestId } = render(
    <>
      <div id="target" data-testid="anchor" />
      <ScrollToTop />
    </>,
  );
  vi.spyOn(getByTestId("anchor"), "getBoundingClientRect").mockReturnValue({
    top: 1100,
  } as DOMRect);
  frame(0);
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 400, left: 0, behavior: "instant" });
});
it("waits for async content before restoring a saved position", () => {
  state.position = { scrollY: 900 };
  render(<ScrollToTop />);
  frame(0);
  expect(window.scrollTo).not.toHaveBeenCalled();
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
  resized();
  frame(1);
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 900, left: 0, behavior: "instant" });
});
it("does not override user scrolling while waiting for content", () => {
  state.position = { scrollY: 900 };
  render(<ScrollToTop />);
  window.dispatchEvent(new Event("wheel"));
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
  frame(0);
  expect(window.scrollTo).not.toHaveBeenCalled();
});
