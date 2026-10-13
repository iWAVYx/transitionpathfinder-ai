import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: any) => data;
  const chain: any = { middleware: () => chain, validator: (fn: any) => { validate = fn; return chain; }, handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data ?? {}) }) };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { listCalendarEvents } from "@/lib/calendar.functions";
const school = "11111111-1111-4111-8111-111111111111";
const otherSchool = "22222222-2222-4222-8222-222222222222";
const student = "33333333-3333-4333-8333-333333333333";
const otherStudent = "44444444-4444-4444-8444-444444444444";
function database(options: { membership?: boolean; errorTable?: string } = {}) {
  const queries: Array<{ table: string; filters: Array<[string, string, any]> }> = [];
  const row = (id: string, organization: string | null, studentId: string | null) => ({ id, owner_user_id: "caller", student_id: studentId, title: id, detail: "", event_date: "2030-12-31", related_organization_id: organization, all_day: true, visibility: "private" });
  const tables: Record<string, any[]> = {
    organization_memberships: options.membership === false ? [] : [{ user_id: "caller", organization_id: school, status: "active" }],
    students: [{ id: student, first_name: "One", last_name: null, organization_id: school }, { id: otherStudent, first_name: "Two", last_name: null, organization_id: otherSchool }],
    action_items: [{ id: "school-action", student_id: student, title: "School Action", due_date: "2030-12-31" }, { id: "other-action", student_id: otherStudent, title: "Other School Action", due_date: "2030-12-31" }],
    calendar_events: [row("school-event", school, student), row("other-event", otherSchool, otherStudent), row("personal-event", null, null)],
    saved_resources: [{ id: "resource", user_id: "caller", follow_up_date: "2030-12-31", resource: { title: "Personal Resource" } }],
  };
  const supabase = { from(table: string) {
    const entry = { table, filters: [] as Array<[string, string, any]> }; queries.push(entry);
    const result = () => {
      let data = tables[table] ?? [];
      for (const [op, field, value] of entry.filters) data = data.filter(row => op === "eq" ? row[field] === value : op === "in" ? value.includes(row[field]) : true);
      return { data, error: table === options.errorTable ? { message: "private database detail" } : null };
    };
    const q: any = { select: () => q, order: () => q, limit: () => q, not: () => q, gte: () => q, lte: () => q, eq: (key: string, value: any) => { entry.filters.push(["eq", key, value]); return q; }, in: (key: string, value: any) => { entry.filters.push(["in", key, value]); return q; }, maybeSingle: async () => { const r = result(); return { ...r, data: r.data[0] ?? null }; }, then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no) };
    return q;
  } };
  return { supabase, queries };
}
const invoke = (db: ReturnType<typeof database>, extra: Record<string, string> = {}) => (listCalendarEvents as any)({ data: { from: "2030-12-01", to: "2030-12-31", ...extra }, context: { supabase: db.supabase, userId: "caller" } });
it("organization scope checks active membership and narrows both derived students and custom events", async () => {
  const db = database(); const result = await invoke(db, { organization_id: school });
  expect(result.events.map((event: any) => event.title)).toEqual(["School Action", "school-event"]);
  expect(db.queries[0]).toMatchObject({ table: "organization_memberships", filters: [["eq", "user_id", "caller"], ["eq", "organization_id", school], ["eq", "status", "active"]] });
  expect(db.queries.find(q => q.table === "students")?.filters).toContainEqual(["eq", "organization_id", school]);
  expect(db.queries.find(q => q.table === "calendar_events")?.filters).toContainEqual(["eq", "related_organization_id", school]);
  expect(db.queries.some(q => q.table === "saved_resources")).toBe(false);
});
it.each(["absent", "error"])("organization membership %s fails closed before calendar data is queried", async kind => {
  const db = database(kind === "absent" ? { membership: false } : { errorTable: "organization_memberships" });
  await expect(invoke(db, { organization_id: school })).rejects.toThrow("This organization calendar is unavailable.");
  expect(db.queries.map(q => q.table)).toEqual(["organization_memberships"]);
});
it("organization and student filters intersect instead of broadening the selected school", async () => {
  const db = database(); const result = await invoke(db, { organization_id: school, student_id: otherStudent });
  expect(result.events).toEqual([]);
  expect(db.queries.find(q => q.table === "calendar_events")?.filters).toEqual([["eq", "related_organization_id", school], ["eq", "student_id", otherStudent]]);
});
it("unscoped calendars retain permitted aggregate and personal resource behavior", async () => {
  const db = database(); const result = await invoke(db);
  expect(result.events.map((event: any) => event.title)).toEqual(expect.arrayContaining(["School Action", "Other School Action", "school-event", "other-event", "personal-event", "Follow up: Personal Resource"]));
  expect(db.queries.some(q => q.table === "organization_memberships")).toBe(false);
});
it("student scope also narrows custom calendar records", async () => {
  const db = database(); const result = await invoke(db, { student_id: student });
  expect(result.events.map((event: any) => event.title)).not.toContain("other-event");
  expect(db.queries.find(q => q.table === "calendar_events")?.filters).toEqual([["eq", "student_id", student]]);
});
it("calendar query errors are reported rather than presented as an empty successful calendar", async () => {
  const db = database({ errorTable: "calendar_events" });
  await expect(invoke(db, { organization_id: school })).rejects.toThrow("Could not load calendar events.");
});
it("invalid organization identifiers fail validation before any caller-client query", async () => {
  const db = database();
  await expect(invoke(db, { organization_id: "not-an-id" })).rejects.toThrow();
  expect(db.queries).toEqual([]);
});
