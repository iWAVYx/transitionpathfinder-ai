import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: any) => data;
  const chain: any = { middleware: () => chain, validator: (fn: any) => { validate = fn; return chain; }, handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data ?? {}) }) };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { listCalendarEvents, listMyCalendarOrganizations } from "@/lib/calendar.functions";
const school = "11111111-1111-4111-8111-111111111111";
const otherSchool = "22222222-2222-4222-8222-222222222222";
const student = "33333333-3333-4333-8333-333333333333";
const otherStudent = "44444444-4444-4444-8444-444444444444";
function database(options: { membership?: boolean; errorTable?: string } = {}) {
  const queries: Array<{ table: string; filters: Array<[string, string, any]>; range?: [number, number] }> = [];
  const row = (id: string, organization: string | null, studentId: string | null) => ({ id, owner_user_id: "caller", student_id: studentId, title: id, detail: "", event_date: "2030-12-31", related_organization_id: organization, all_day: true, visibility: "private" });
  const tables: Record<string, any[]> = {
    organization_memberships: options.membership === false ? [] : [{ user_id: "caller", organization_id: school, status: "active" }],
    students: [{ id: student, first_name: "One", last_name: null, organization_id: school }, { id: otherStudent, first_name: "Two", last_name: null, organization_id: otherSchool }],
    action_items: [{ id: "school-action", student_id: student, title: "School Action", due_date: "2030-12-31" }, { id: "other-action", student_id: otherStudent, title: "Other School Action", due_date: "2030-12-31" }],
    calendar_events: [row("school-event", school, student), row("other-event", otherSchool, otherStudent), row("personal-event", null, null)],
    saved_resources: [{ id: "resource", user_id: "caller", follow_up_date: "2030-12-31", resource: { title: "Personal Resource" } }],
  };
  const supabase = { from(table: string) {
    const entry: typeof queries[number] = { table, filters: [] }; queries.push(entry);
    const result = () => {
      let data = tables[table] ?? [];
      for (const [op, field, value] of entry.filters) data = data.filter(row => op === "eq" ? row[field] === value : op === "in" ? value.includes(row[field]) : true);
      const count = data.length;
      if (entry.range) data = data.slice(entry.range[0], entry.range[1] + 1);
      return { data, count, error: table === options.errorTable ? { message: "private database detail" } : null };
    };
    const q: any = { select: () => q, range: (from: number, to: number) => { entry.range = [from, to]; return q; }, order: () => q, limit: () => q, not: () => q, gte: () => q, lte: () => q, eq: (key: string, value: any) => { entry.filters.push(["eq", key, value]); return q; }, in: (key: string, value: any) => { entry.filters.push(["in", key, value]); return q; }, maybeSingle: async () => { const r = result(); return { ...r, data: r.data[0] ?? null }; }, then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no) };
    return q;
  } };
  return { supabase, queries, tables };
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
  await expect(invoke(db, { organization_id: school })).rejects.toThrow("Could not load all calendar records. Please try again.");
});
it("invalid organization identifiers fail validation before any caller-client query", async () => {
  const db = database();
  await expect(invoke(db, { organization_id: "not-an-id" })).rejects.toThrow();
  expect(db.queries).toEqual([]);
});

it("large schools load every authorized student and event using counted pages and bounded ID batches", async () => {
  const db = database();
  db.tables.students = Array.from({ length: 1201 }, (_, i) => ({ id: `student-${i}`, organization_id: school, first_name: `Student ${i}`, last_name: null }));
  db.tables.action_items = db.tables.students.map((row, i) => ({ id: `action-${i}`, student_id: row.id, title: `Action ${i}`, due_date: "2030-12-31" }));
  db.tables.calendar_events = Array.from({ length: 1205 }, (_, i) => ({ id: `calendar-${i}`, related_organization_id: school, owner_user_id: "caller", title: `Calendar ${i}`, event_date: "2030-12-31" }));
  db.tables.students[1200].iep_annual_review_date = "2030-12-31";
  const result = await invoke(db, { organization_id: school });
  expect(result.events).toHaveLength(2407);
  expect(new Set(result.events.map((event: any) => event.id)).size).toBe(2407);
  expect(result.events.some((event: any) => event.title === "Action 1200")).toBe(true);
  expect(result.events.some((event: any) => event.title === "Calendar 1204")).toBe(true);
  expect(db.queries.filter(q => q.table === "students" && q.filters.some(f => f[1] === "organization_id")).map(q => q.range)).toEqual([[0,499],[500,999],[1000,1499]]);
  expect(db.queries.filter(q => q.table === "calendar_events").map(q => q.range)).toEqual([[0,499],[500,999],[1000,1499]]);
  for (const query of db.queries) for (const [op, , values] of query.filters) if (op === "in") expect(values.length).toBeLessThanOrEqual(100);
});

it("personal follow-ups and teammate names are complete beyond a single response page", async () => {
  const db = database();
  db.tables.saved_resources = Array.from({ length: 1203 }, (_, i) => ({ id: `resource-${i}`, user_id: "caller", follow_up_date: "2030-12-31", resource: { title: `Resource ${i}` } }));
  db.tables.profiles = Array.from({ length: 1203 }, (_, i) => ({ id: `owner-${i}`, full_name: `Owner ${i}`, email: null }));
  db.tables.calendar_events = db.tables.profiles.map((profile, i) => ({ id: `event-${i}`, owner_user_id: profile.id, title: `Event ${i}`, event_date: "2030-12-31" }));
  const result = await invoke(db);
  expect(result.events.filter((event: any) => event.id.startsWith("resource-followup-"))).toHaveLength(1203);
  expect(result.events.find((event: any) => event.title === "Event 1202").owner_name).toBe("Owner 1202");
  expect(db.queries.filter(query => query.table === "saved_resources")).toHaveLength(3);
  expect(db.queries.filter(query => query.table === "profiles")).toHaveLength(13);
});

it("large meeting and next-meeting reads retain the final page", async () => {
  const db = database();
  db.tables.meetings = Array.from({ length: 1203 }, (_, i) => ({ id: `meeting-${i}`, student_id: student, title: `Meeting ${i}`, kind: "ppt", scheduled_at: "2030-12-20T14:00:00Z", next_meeting_date: "2030-12-31", status: "upcoming", location: null }));
  const result = await invoke(db);
  expect(result.events.filter((event: any) => event.id.startsWith("meeting-"))).toHaveLength(1203);
  expect(result.events.filter((event: any) => event.id.startsWith("nextmeeting-"))).toHaveLength(1203);
  expect(result.events.some((event: any) => event.id === "meeting-meeting-1202")).toBe(true);
  expect(db.queries.filter(query => query.table === "meetings")).toHaveLength(6);
});
it("organization choices retain every active caller membership beyond one page", async () => {
  const db = database();
  db.tables.organization_memberships = Array.from({ length: 1201 }, (_, i) => ({ id: `membership-${i}`, user_id: "caller", organization_id: `org-${i}`, status: "active", organizations: { id: `org-${i}`, name: `Organization ${i}` } }));
  const result = await (listMyCalendarOrganizations as any)({ context: { supabase: db.supabase, userId: "caller" } });
  expect(result.organizations).toHaveLength(1201);
  expect(result.organizations.at(-1)).toEqual({ id: "org-1200", name: "Organization 1200" });
  expect(db.queries.map(query => query.range)).toEqual([[0,499],[500,999],[1000,1499]]);
});
