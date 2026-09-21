import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  ADMIN_ROUTE_ACCESS_TIMEOUT_MS,
  hasPlatformAdminRouteAccess,
} from "../../src/lib/owner/admin-route-access";

afterEach(() => {
  vi.useRealTimers();
});

describe("platform-admin route access", () => {
  it("allows only an explicit platform-admin decision", async () => {
    await expect(
      hasPlatformAdminRouteAccess(async () => ({ isPlatformAdmin: true })),
    ).resolves.toBe(true);
    await expect(
      hasPlatformAdminRouteAccess(async () => ({ isPlatformAdmin: false })),
    ).resolves.toBe(false);
    await expect(hasPlatformAdminRouteAccess(async () => null)).resolves.toBe(false);
  });

  it("fails closed when the role lookup rejects", async () => {
    await expect(
      hasPlatformAdminRouteAccess(async () => {
        throw new Error("temporary role lookup failure");
      }),
    ).resolves.toBe(false);
  });

  it("fails closed when the role lookup exceeds the bounded wait", async () => {
    vi.useFakeTimers();
    const result = hasPlatformAdminRouteAccess(
      () => new Promise(() => undefined),
      ADMIN_ROUTE_ACCESS_TIMEOUT_MS,
    );

    await vi.advanceTimersByTimeAsync(ADMIN_ROUTE_ACCESS_TIMEOUT_MS);

    await expect(result).resolves.toBe(false);
  });

  it("rejects invalid timeout values instead of disabling the boundary", async () => {
    const lookup = vi.fn(async () => ({ isPlatformAdmin: true }));

    await expect(hasPlatformAdminRouteAccess(lookup, 0)).resolves.toBe(false);
    await expect(hasPlatformAdminRouteAccess(lookup, Number.NaN)).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("owner route wiring", () => {
  it.each(["src/routes/_authenticated/admin.tsx", "src/routes/_authenticated/owner.tsx"])(
    "gates %s before rendering and redirects fail-closed",
    (path) => {
      const source = readFileSync(path, "utf8");

      expect(source).toContain("beforeLoad: async");
      expect(source).toContain("hasPlatformAdminRouteAccess");
      expect(source).toContain('to: "/dashboard"');
      expect(source).toContain("replace: true");
    },
  );
});
