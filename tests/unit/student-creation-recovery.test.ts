// @vitest-environment jsdom
import { beforeEach, it, expect, vi } from "vitest";
import {
  readCreationIntent,
  saveCreationIntent,
  clearCreationIntent,
  withCreationLock,
} from "../../src/lib/student-creation-recovery";
const actor = "00000000-0000-4000-8000-000000000001",
  request = "00000000-0000-4000-8000-000000000002";
const intent = {
  version: 1 as const,
  requestId: request,
  origin: "onboarding" as const,
  kind: "linked" as const,
  role: "parent",
};
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: vi.fn(async (_key, _options, work) => work({})) },
  });
});
it("persists only strict minimal intent and separates accounts", () => {
  saveCreationIntent(localStorage, actor, intent);
  expect(readCreationIntent(localStorage, actor)).toEqual(intent);
  expect(readCreationIntent(localStorage, "other")).toBeNull();
  expect(() =>
    saveCreationIntent(localStorage, actor, { ...intent, first_name: "private" } as any),
  ).toThrow();
});
it("never overwrites an earlier unresolved request", () => {
  saveCreationIntent(localStorage, actor, intent);
  expect(() =>
    saveCreationIntent(localStorage, actor, { ...intent, requestId: crypto.randomUUID() }),
  ).toThrow();
  expect(readCreationIntent(localStorage, actor)).toEqual(intent);
});
it("requires exact request before clearing", () => {
  saveCreationIntent(localStorage, actor, intent);
  expect(() => clearCreationIntent(localStorage, actor, crypto.randomUUID())).toThrow();
  clearCreationIntent(localStorage, actor, request);
  expect(readCreationIntent(localStorage, actor)).toBeNull();
});
it("blocked storage does not authorize any work", () => {
  const bad = {
    getItem() {
      throw Error("denied");
    },
  } as unknown as Storage;
  expect(() => saveCreationIntent(bad, actor, intent)).toThrow();
});
it("rejects a write that did not persist", () => {
  const bad = { getItem: () => null, setItem: () => {} } as unknown as Storage;
  expect(() => saveCreationIntent(bad, actor, intent)).toThrow();
});
it("unavailable cross-tab lock does not invoke work", async () => {
  const work = vi.fn();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: async (_k: any, _o: any, run: any) => run(null) },
  });
  await expect(withCreationLock(actor, () => true, work)).rejects.toThrow("another tab");
  expect(work).not.toHaveBeenCalled();
});
it("unsupported browser fails closed", async () => {
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  await expect(withCreationLock(actor, () => true, vi.fn())).rejects.toThrow("updated browser");
});
it("departed viewer cannot start a delayed lock callback", async () => {
  const work = vi.fn();
  await expect(withCreationLock(actor, () => false, work)).rejects.toThrow("account changed");
  expect(work).not.toHaveBeenCalled();
});
it("both entry points use one nonqueued viewer lock", async () => {
  await withCreationLock(
    actor,
    () => true,
    async () => {},
  );
  expect(navigator.locks.request).toHaveBeenCalledWith(
    `tf:student-creation:v1:${actor}`,
    { ifAvailable: true },
    expect.any(Function),
  );
});
