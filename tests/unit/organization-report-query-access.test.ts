import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ adminFrom: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const builder = {
    middleware: () => builder,
    validator: (fn: typeof validate) => {validate = fn; return builder;},
    handler: (fn: (input: unknown) => unknown) => async (input: {data: unknown; context: unknown}) => fn({...input, data: validate(input.data)}),
  };
  return builder;
}}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {from: state.adminFrom} }));
vi.mock("../../src/lib/authz", () => ({ assertAuthorized: vi.fn() }));
import { getSchoolReportMetrics } from "../../src/lib/school-admin.functions";
import { getDistrictReportMetrics } from "../../src/lib/district-admin.functions";

const org = "00000000-0000-4000-8000-000000000001";
const membership = (data: unknown, error: unknown = null) => {
  const query: any = {};
  for (const method of ['select','eq','in']) query[method] = () => query;
  query.maybeSingle = async () => ({data, error});
  return {supabase: {from: () => query}, userId: 'user'};
};
beforeEach(() => state.adminFrom.mockReset());
it.each([getSchoolReportMetrics, getDistrictReportMetrics])("denied membership never reads organization data", async (handler) => {
  await expect((handler as any)({data: {organization_id: org, district_id: org}, context: membership(null)})).rejects.toThrow("Not authorized");
  expect(state.adminFrom).not.toHaveBeenCalled();
});
it("a failed school access check is an error, not an empty report", async () => {
  await expect((getSchoolReportMetrics as any)({data: {organization_id: org}, context: membership(null, {})})).rejects.toThrow("access could not be checked");
  expect(state.adminFrom).not.toHaveBeenCalled();
});
it.each([getSchoolReportMetrics, getDistrictReportMetrics])("an authorized empty organization still has genuine zero metrics", async (handler) => {
  const query: any = {};
  for (const method of ['select','eq','order']) query[method] = () => query;
  query.range = async () => ({data: [], count: 0, error: null});
  state.adminFrom.mockReturnValue(query);
  const result = await (handler as any)({data: {organization_id: org, district_id: org}, context: membership({id:'membership'})});
  expect(result.metrics.students_count).toBe(0);
  expect(result.metrics.reports_count).toBe(0);
});
it.each([getSchoolReportMetrics, getDistrictReportMetrics])("rejects reversed date bounds before a database read", async (handler) => {
  await expect((handler as any)({data: {organization_id: org, district_id: org, from:'2026-10-05T00:00:00Z', to:'2026-10-01T00:00:00Z'}, context: membership({id:'membership'})})).rejects.toThrow("end date");
  expect(state.adminFrom).not.toHaveBeenCalled();
});

it.each([getSchoolReportMetrics, getDistrictReportMetrics])("a failed organization query cannot become a zero report", async (handler) => {
  const query: any = {};
  for (const method of ['select','eq','order']) query[method] = () => query;
  query.range = async () => ({data: null, count: null, error: {message: 'database unavailable'}});
  state.adminFrom.mockReturnValue(query);
  await expect((handler as any)({data: {organization_id: org, district_id: org}, context: membership({id:'membership'})})).rejects.toThrow("could not load all records");
});
