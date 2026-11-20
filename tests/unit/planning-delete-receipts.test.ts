import { expect, it, vi } from "vitest";
import { deletePlanningRecordAtomically } from "../../src/lib/planning-record-delete.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  actor = id(1),
  student = id(2),
  record = id(3),
  version = "2026-11-20T10:00:00.000001Z";
const intent = {
  id: record,
  student_id: student,
  expected_updated_at: version,
  expected_viewer_id: actor,
};
const receipt = (kind: "goals" | "action_items" = "goals") => ({
  schema: "planning-record-delete-v1",
  kind,
  actor_id: actor,
  student_id: student,
  record_id: record,
  expected_updated_at: version,
  deleted: true,
  deleted_row: {
    id: record,
    student_id: student,
    title: "Fictional saved record",
    category: "general",
    status: "not-started",
    updated_at: version,
  },
});
const client = (data: any = receipt(), error: any = null) => ({
  rpc: vi.fn(async () => ({ data, error })),
  from: vi.fn(),
});
for (const kind of ["goals", "action_items"] as const) {
  it(kind + " validates an exact confirmed deletion without raw IO", async () => {
    const c = client(receipt(kind));
    await expect(deletePlanningRecordAtomically(c, actor, kind, intent)).resolves.toEqual({
      ok: true,
    });
    expect(c.rpc).toHaveBeenCalledWith("delete_student_planning_record", {
      _kind: kind,
      _student_id: student,
      _expected_viewer_id: actor,
      _record_id: record,
      _expected_updated_at: version,
    });
    expect(c.from).not.toHaveBeenCalled();
  });
  for (const path of [
    "schema",
    "kind",
    "actor_id",
    "student_id",
    "record_id",
    "expected_updated_at",
    "deleted",
    "deleted_row.id",
    "deleted_row.student_id",
    "deleted_row.updated_at",
  ])
    it(kind + " refuses a missing or mismatched " + path + " receipt", async () => {
      const r: any = receipt(kind),
        keys = path.split(".");
      if (keys.length === 2)
        r[keys[0]][keys[1]] = path.endsWith("updated_at") ? "2026-11-20T10:00:00.000002Z" : id(9);
      else r[path] = path === "expected_updated_at" ? "2026-11-20T10:00:00.000002Z" : null;
      const c = client(r);
      await expect(deletePlanningRecordAtomically(c, actor, kind, intent)).rejects.toThrow(
        "couldn't confirm",
      );
      expect(c.rpc).toHaveBeenCalledOnce();
      expect(c.from).not.toHaveBeenCalled();
    });
}
it("departed account fails before all IO", async () => {
  const c = client();
  await expect(deletePlanningRecordAtomically(c, id(9), "goals", intent)).rejects.toThrow(
    "sign-in changed",
  );
  expect(c.rpc).not.toHaveBeenCalled();
});
it("preserves microseconds while accepting equivalent timestamp offsets", async () => {
  const r = receipt();
  r.expected_updated_at = "2026-11-20T11:00:00.000001+01:00";
  r.deleted_row.updated_at = r.expected_updated_at;
  await expect(deletePlanningRecordAtomically(client(r), actor, "goals", intent)).resolves.toEqual({
    ok: true,
  });
});
it.each([null, {}, undefined])("does not confirm absent receipts %#", async (data) => {
  await expect(
    deletePlanningRecordAtomically(
      client(data === undefined ? null : data),
      actor,
      "goals",
      intent,
    ),
  ).rejects.toThrow();
});
it("sanitizes database errors without a retry or fallback", async () => {
  const c = client(null, { message: "PRIVATE SQL" });
  await expect(deletePlanningRecordAtomically(c, actor, "goals", intent)).rejects.toThrow(
    "couldn't confirm",
  );
  expect(c.rpc).toHaveBeenCalledOnce();
  expect(c.from).not.toHaveBeenCalled();
});
