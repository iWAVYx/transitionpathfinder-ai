import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const builder = {
    middleware: () => builder,
    validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: unknown) => unknown) => async (input: { data: unknown; context: unknown }) => fn({ ...input, data: validate(input.data) }),
  };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { RIGHTS_STATUS_VALUES, setRightsStatus } from "../../src/lib/rights.functions";
const student = "00000000-0000-4000-8000-000000000020";
function fixture(failure?: "history" | "mirror") {
  const writes: { table: string; payload: any }[] = [];
  const from = vi.fn((table: string) => {
    // Unexpected reads/writes fail the action, including hidden document,
    // permission, relationship, membership or privileged-client operations.
    if (!["rights_transfer_status", "students", "consent_records", "audit_log"].includes(table)) throw new Error("Unexpected access mutation: " + table);
    const query: any = {};
    query.insert = (payload: any) => { writes.push({ table, payload }); return query; };
    query.update = (payload: any) => { writes.push({ table, payload }); return query; };
    query.select = () => query;
    query.single = async () => ({ data: failure === "history" ? null : { id: "history" }, error: failure === "history" ? { message: "History unavailable" } : null });
    query.eq = async () => ({ error: failure === "mirror" ? { message: "Status unavailable" } : null });
    query.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve);
    return query;
  });
  return { writes, from, context: { userId: "editor", supabase: { from } } };
}
for (const status of RIGHTS_STATUS_VALUES) it("recording " + status + " never creates/replaces/revives document grants", async () => {
  const f = fixture();
  const result = await (setRightsStatus as any)({ data: { student_id: student, current_status: status }, context: f.context });
  expect(result.row.id).toBe("history");
  expect(f.writes.find(w => w.table === "rights_transfer_status")?.payload.current_status).toBe(status);
  expect(f.writes.find(w => w.table === "students")?.payload.rights_status).toBe(status);
  expect(f.writes.find(w => w.table === "audit_log")?.payload.action).toBe("rights_status.updated");
  expect(f.from.mock.calls.some(([table]) => ["documents", "document_permissions", "student_relationships", "student_collaborators"].includes(table))).toBe(false);
});
it("continued-parent authorization records the note without changing sharing", async () => {
  const f = fixture();
  await (setRightsStatus as any)({ data: { student_id: student, current_status: "parent_guardian_authorized_by_student", student_authorized_parent_access: true }, context: f.context });
  expect(f.writes.find(w => w.table === "rights_transfer_status")?.payload.student_authorized_parent_access).toBe(true);
  expect(f.from.mock.calls.map(([table]) => table)).not.toContain("document_permissions");
});
for (const stage of ["history", "mirror"] as const) it("a " + stage + " failure stops without hidden sharing changes", async () => {
  const f = fixture(stage);
  await expect((setRightsStatus as any)({ data: { student_id: student, current_status: "rights_transferred_to_student" }, context: f.context })).rejects.toThrow("unavailable");
  expect(f.from.mock.calls.map(([table]) => table)).not.toContain("document_permissions");
  expect(f.writes.some(w => w.table === "audit_log")).toBe(false);
});
