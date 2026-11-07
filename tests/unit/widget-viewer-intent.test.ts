import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: any) => x;
    const b: any = {
      middleware: () => b,
      validator: (fn: any) => {
        validate = fn;
        return b;
      },
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import {
  getDashboardWidgetPrefs,
  updateDashboardWidgetPrefs,
} from "@/lib/dashboard/dashboard-widget-prefs.functions";
import { listCalendarEvents } from "@/lib/calendar.functions";
it.each([
  [getDashboardWidgetPrefs, { role: "family" }],
  [updateDashboardWidgetPrefs, { role: "family", widgets: [] }],
  [listCalendarEvents, {}],
] as const)("rejects mismatched caller intent before database access", async (fn, data) => {
  const from = vi.fn();
  await expect(
    fn({
      data: { ...data, expected_viewer_id: "other" },
      context: { userId: "caller", supabase: { from } },
    } as any),
  ).rejects.toThrow("Your sign-in changed");
  expect(from).not.toHaveBeenCalled();
});
it.each(["family", "student", "educator", "school_admin", "district_admin", "partner"] as const)(
  "%s preference storage still uses only the authenticated owner",
  async (role) => {
    const writes: any[] = [];
    const filters: any[] = [];
    const query: any = {
      select: () => query,
      eq: (key: string, value: any) => {
        filters.push([key, value]);
        return query;
      },
      maybeSingle: async () => ({
        data: { dashboard_layout: { family: ["actions"] } },
        error: null,
      }),
      upsert: async (value: any) => {
        writes.push(value);
        return { error: null };
      },
    };
    const context = { userId: "caller", supabase: { from: () => query } };
    await expect(
      updateDashboardWidgetPrefs({
        data: { role, widgets: [], expected_viewer_id: "caller" },
        context,
      } as any),
    ).resolves.toEqual({ widgets: [] });
    expect(filters).toContainEqual(["user_id", "caller"]);
    expect(writes[0].user_id).toBe("caller");
    expect(writes[0].dashboard_layout[role]).toEqual([]);
    if (role !== "family") expect(writes[0].dashboard_layout.family).toEqual(["actions"]);
  },
);
it("legacy preference callers may omit the hint without replacing authenticated ownership", async () => {
  const filters: any[] = [];
  const q: any = {
    select: () => q,
    eq: (k: string, v: any) => {
      filters.push([k, v]);
      return q;
    },
    maybeSingle: async () => ({ data: null, error: null }),
  };
  await expect(
    getDashboardWidgetPrefs({
      data: { role: "student" },
      context: { userId: "caller", supabase: { from: () => q } },
    } as any),
  ).resolves.toEqual({ widgets: ["actions", "calendar"] });
  expect(filters).toEqual([["user_id", "caller"]]);
});
