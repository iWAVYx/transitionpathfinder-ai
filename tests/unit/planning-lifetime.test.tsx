// @vitest-environment jsdom
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  user: { id: "actor-a" } as { id: string } | null,
  loading: false,
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));
import { usePlanningLifetime } from "../../src/hooks/use-planning-lifetime";
beforeEach(() => {
  auth.user = { id: "actor-a" };
  auth.loading = false;
});
afterEach(cleanup);
it("serializes writes synchronously and releases the fence on completion", () => {
  const { result } = renderHook(() => usePlanningLifetime("student-a"));
  const scope = result.current;
  expect(scope.begin()).toBe(true);
  expect(scope.begin()).toBe(false);
  scope.finish();
  expect(scope.begin()).toBe(true);
});
it("blocks uncertain writes until a confirmed saved-record read", () => {
  const { result } = renderHook(() => usePlanningLifetime("student-a"));
  act(() => result.current.markUncertain());
  expect(result.current.uncertain).toBe(true);
  expect(result.current.begin()).toBe(false);
  act(() => result.current.confirmRead());
  expect(result.current.uncertain).toBe(false);
  expect(result.current.begin()).toBe(true);
});
it("only accepts the newest read in the same active context", () => {
  const { result } = renderHook(() => usePlanningLifetime("student-a"));
  const a = result.current.nextRead(),
    b = result.current.nextRead();
  expect(result.current.currentRead(a)).toBe(false);
  expect(result.current.currentRead(b)).toBe(true);
});
for (const change of ["student", "account", "roundtrip", "signout", "loading"])
  it("invalidates old requests after " + change, () => {
    const { result, rerender } = renderHook(({ student }) => usePlanningLifetime(student), {
      initialProps: { student: "student-a" },
    });
    const old = result.current,
      read = old.nextRead();
    if (change === "account") auth.user = { id: "actor-b" };
    if (change === "signout") auth.user = null;
    if (change === "loading") auth.loading = true;
    rerender({
      student: change === "student" || change === "roundtrip" ? "student-b" : "student-a",
    });
    if (change === "roundtrip") rerender({ student: "student-a" });
    expect(old.current()).toBe(false);
    expect(old.currentRead(read)).toBe(false);
    expect(old.begin()).toBe(false);
  });
it("invalidates every outstanding context on unmount", () => {
  const { result, unmount } = renderHook(() => usePlanningLifetime("student-a"));
  const old = result.current;
  unmount();
  expect(old.current()).toBe(false);
  expect(old.begin()).toBe(false);
});
