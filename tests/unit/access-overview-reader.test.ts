import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (value: any) => value;
  const chain: any = { middleware: () => chain, validator: (fn: any) => { validate = fn; return chain; },
    handler: (fn: any) => (args: any) => fn({ ...args, data: validate(args.data) }) };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getStudentAccessOverview } from "@/lib/sharing.functions";
const student = "10000000-0000-4000-8000-000000000001";
type Query = { table: string; filters: Array<[string, any]>; from: number; to: number; count: boolean; order?: string };
function database(fail?: string, missingCount?: string, changed?: boolean) {
  const queries: Query[] = [];
  const tables: Record<string, any[]> = {
    student_collaborators: [{ id: "c", student_id: student, status: "accepted", user_id: "person", invited_email: "sample@example.test", role: "viewer", created_at: "2026-10-01" }],
    student_relationships: [{ id: "r", student_id: student, consent_status: "approved", related_user_id: "person", permission_level: "view", relationship_type: "guardian", created_at: "2026-10-01" }],
    pathway_reports: [{ id: "report", student_id: student }],
    profiles: [{ id: "person", full_name: "Fictional Person", email: "sample@example.test" }],
    share_tokens: [{ id: "token", report_id: "report", revoked: false, audience: "family", expires_at: null }],
  };
  const supabase = { from(table: string) {
    const query: Query = { table, filters: [], from: 0, to: 499, count: false }; queries.push(query);
    const q: any = {
      select: (_: string, options: any) => { query.count = options?.count === "exact"; return q; },
      eq: (key: string, value: any) => { query.filters.push([key, value]); return q; },
      in: (key: string, value: any) => { expect(value.length).toBeLessThanOrEqual(100); query.filters.push([key, value]); return q; },
      order: (key: string) => { query.order = key; return q; },
      range: (from: number, to: number) => { query.from = from; query.to = to; return q; },
      then: (yes: any, no: any) => {
        const rows = tables[table].filter(row => query.filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
        return Promise.resolve({ data: table === fail ? null : rows.slice(query.from, Math.min(query.to + 1, query.from + 37)), error: table === fail ? { message: "Private detail" } : null,
          count: table === missingCount ? null : rows.length + (changed && query.from > 0 ? 1 : 0) }).then(yes, no);
      },
    }; return q;
  } };
  return { tables, queries, supabase };
}
const invoke = (db: ReturnType<typeof database>, viewer = "caller") => getStudentAccessOverview({ data: { student_id: student, expected_viewer_id: viewer }, context: { supabase: db.supabase, userId: "caller" } } as any);
it.each(["student_collaborators", "student_relationships", "pathway_reports", "profiles", "share_tokens"])("failed %s never becomes an empty access summary", async table => {
  await expect(invoke(database(table))).rejects.toThrow("could not load all records");
});
it.each(["student_collaborators", "student_relationships", "pathway_reports", "profiles", "share_tokens"])("missing %s count fails instead of certifying completeness", async table => {
  await expect(invoke(database(undefined, table))).rejects.toThrow();
});
it("returns complete counted short pages, batches profiles and excludes foreign/expired/revoked records", async () => {
  const db = database();
  db.tables.student_collaborators = Array.from({ length: 1103 }, (_, n) => ({ ...db.tables.student_collaborators[0], id: `c-${n}`, user_id: `person-${n}` }));
  db.tables.profiles = db.tables.student_collaborators.map(row => ({ id: row.user_id, full_name: row.user_id }));
  db.tables.student_collaborators.push({ id: "foreign", student_id: "other", status: "accepted" });
  db.tables.share_tokens.push({ id: "revoked", report_id: "report", revoked: true }, { id: "expired", report_id: "report", revoked: false, expires_at: "2000-01-01" }, { id: "bad-date", report_id: "report", revoked: false, expires_at: "bad" });
  const result = await invoke(db);
  expect(result.collaborators).toHaveLength(1103);
  expect(result.collaborators.at(-1)?.name).toBe("person-1102");
  expect(result.share_links.map(row => row.id)).toEqual(["token"]);
  expect(db.queries.every(q => q.count && q.order === "id")).toBe(true);
});
it("rejects count drift before returning partial data", async () => {
  const db = database(undefined, undefined, true);
  db.tables.student_collaborators = Array.from({ length: 40 }, (_, n) => ({ ...db.tables.student_collaborators[0], id: `c-${n}` }));
  await expect(invoke(db)).rejects.toThrow("Records changed");
});
it("rejects departed viewer intent before any reads", async () => {
  const db = database(); await expect(invoke(db, "departed")).rejects.toThrow("sign-in changed"); expect(db.queries).toEqual([]);
});
it("retains a genuine empty caller-visible summary", async () => {
  const db = database(); Object.keys(db.tables).forEach(key => { db.tables[key] = []; });
  expect(await invoke(db)).toEqual({ collaborators: [], relationships: [], share_links: [] });
});
