// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ school: vi.fn(), district: vi.fn(), error: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({ toast: { error: api.error } }));
vi.mock("@/lib/school-admin.functions", () => ({ getSchoolDashboard: api.school, createSchoolForAdmin: vi.fn() }));
vi.mock("@/lib/district-admin.functions", () => ({ getDistrictDashboard: api.district, createDistrict: vi.fn() }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/site/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/site/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/school/SchoolNav", () => ({ SchoolNav: () => null }));
vi.mock("@/components/district/DistrictNav", () => ({ DistrictNav: () => null }));
import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
afterEach(() => { cleanup(); Object.values(api).forEach(fn => fn.mockReset()); });
for (const role of ["school", "district"] as const) describe(`${role} dashboard load boundaries`, () => {
  const useDashboard = role === "school" ? useSchoolDashboard : useDistrictDashboard;
  const fetch = api[role];
  const key = role === "school" ? "org_id" : "district_id";
  const selected = `selected_${key}`;
  const dashboard = (id: string) => ({ [selected]: id, label: id });
  const getId = (value: any) => role === "school" ? value.orgId : value.districtId;

  it.each([false, true])("switching discards old data and rejects obsolete responses/errors (%s)", async failure => {
    const old = deferred(); const latest = deferred();
    fetch.mockResolvedValueOnce(dashboard("initial")).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(getId(result.current)).toBe("initial"));
    act(() => { void result.current.reload("older"); });
    expect(result.current.data).toBeNull(); expect(result.current.loading).toBe(true);
    act(() => { void result.current.reload("current"); });
    await act(async () => failure ? old.reject(new Error("Old private detail")) : old.resolve(dashboard("older")));
    expect(result.current.data).toBeNull(); expect(getId(result.current)).toBe("current");
    expect(result.current.loading).toBe(true); expect(api.error).not.toHaveBeenCalled();
    await act(async () => latest.resolve(dashboard("current")));
    expect(result.current.data).toEqual(dashboard("current")); expect(result.current.loading).toBe(false);
    expect(fetch.mock.calls[2][0]).toEqual({ data: { [key]: "current" } });
  });

  it("a refresh retains the resolved selection and a current failure never restores stale data", async () => {
    fetch.mockResolvedValueOnce(dashboard("selected")).mockRejectedValueOnce(new Error("Private backend detail")).mockResolvedValueOnce(dashboard("selected"));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(getId(result.current)).toBe("selected"));
    await act(async () => result.current.reload());
    expect(fetch.mock.calls[1][0]).toEqual({ data: { [key]: "selected" } });
    expect(result.current.data).toBeNull(); expect(result.current.loading).toBe(false);
    expect(api.error).toHaveBeenCalledExactlyOnceWith(`Could not load ${role} data.`);
    await act(async () => result.current.reload());
    expect(result.current.data).toEqual(dashboard("selected"));
  });

  it.each([false, true])("departure suppresses late completions and notifications (%s)", async failure => {
    const pending = deferred(); fetch.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useDashboard());
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce()); unmount();
    await act(async () => failure ? pending.reject(new Error("Departed")) : pending.resolve(dashboard("departed")));
    expect(api.error).not.toHaveBeenCalled();
  });

  it("Strict Mode replay only accepts the latest request", async () => {
    const old = deferred(); fetch.mockReturnValueOnce(old.promise).mockResolvedValueOnce(dashboard("latest"));
    const { result } = renderHook(() => useDashboard(), { wrapper: StrictMode });
    await waitFor(() => expect(getId(result.current)).toBe("latest"));
    await act(async () => old.resolve(dashboard("obsolete")));
    expect(result.current.data).toEqual(dashboard("latest")); expect(api.error).not.toHaveBeenCalled();
  });
});

for (const role of ["school", "district"] as const) {
  const shell = (data: any, loading: boolean, retry: (id?: string) => void) => role === "school"
    ? <SchoolPageShell path="/school/overview" title="Overview" subtitle="School" data={data} loading={loading} orgId="chosen" onSwitchOrg={retry}>{() => <p>Selected School Controls</p>}</SchoolPageShell>
    : <DistrictPageShell path="/district/overview" title="Overview" subtitle="District" data={data} loading={loading} districtId="chosen" onSwitchDistrict={retry}>{() => <p>Selected District Controls</p>}</DistrictPageShell>;
  it(`${role} load failure shows retry without setup or departed controls`, () => {
    const retry = vi.fn(); const view = render(shell(null, true, retry));
    expect(screen.getByText(/Loading .* Workspace/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    view.rerender(shell(null, false, retry));
    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
    expect(screen.queryByText(/Set Up Your/)).toBeNull();
    expect(screen.queryByText(/Selected .* Controls/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }));
    expect(retry).toHaveBeenCalledExactlyOnceWith("chosen");
  });
  it(`${role} a successfully loaded account without organizations still offers setup`, () => {
    const data = role === "school" ? { is_school_admin: false, orgs: [] } : { is_district_admin: false, districts: [] };
    render(shell(data, false, vi.fn()));
    expect(screen.getByText(`Set Up Your ${role === "school" ? "School" : "District"}`)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
}
