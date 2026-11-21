import { describe, it, expect, vi } from "vitest";
import {
  createStudentWithReceipt,
  deleteStudentWithReceipt,
  ensureSelfProfile,
} from "../../src/lib/student-lifecycle.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1),
  record = id(2),
  stamp = "2026-11-21T10:00:00.123456Z";
const input = { first_name: "Sample", request_id: record, expected_viewer_id: actor };
const row = {
  id: record,
  owner_id: actor,
  student_user_id: null,
  first_name: "Sample",
  last_name: null,
  grade_band: null,
  school: null,
  date_of_birth: null,
  notes: null,
  photo_url: null,
  organization_id: null,
  created_at: stamp,
  updated_at: stamp,
};
function setup(role = "parent") {
  const inserts: any[] = [];
  const predicates: any[] = [];
  const results: any = {
    profiles: {
      data: { id: actor, primary_role: role, email: "sample@example.test", organization_id: null },
      error: null,
    },
    students: { data: { ...row }, error: null },
    student_guardians: {
      data: {
        id: id(3),
        student_id: record,
        guardian_user_id: actor,
        guardian_email: "sample@example.test",
        relationship: role,
        is_primary: true,
        verified: true,
      },
      error: null,
    },
    student_team_members: {
      data: {
        id: id(3),
        student_id: record,
        member_user_id: actor,
        member_email: "sample@example.test",
        role_on_team: role === "administrator" ? "school_admin" : role,
        organization_id: null,
        status: "active",
      },
      error: null,
    },
  };
  const client = {
    from: vi.fn((table: string) => {
      const q: any = {
        insert: vi.fn((fields: any) => {
          inserts.push({ table, fields });
          return q;
        }),
        delete: vi.fn(() => q),
        eq: vi.fn((k: string, v: any) => {
          predicates.push([k, v]);
          return q;
        }),
        select: vi.fn(() => q),
        single: vi.fn(async () => results[table]),
        maybeSingle: vi.fn(async () => results[table]),
      };
      return q;
    }),
    rpc: vi.fn(async (name: string) =>
      name === "ensure_student_self_profile"
        ? { data: { ...row, student_user_id: actor }, error: null }
        : { data: false, error: null },
    ),
  };
  return { client, results, inserts, predicates };
}
function atomic(role = "parent") {
  const s = setup(role),
    guardian = ["parent", "guardian"].includes(role),
    team = [
      "educator",
      "teacher",
      "case_manager",
      "administrator",
      "school_admin",
      "admin",
    ].includes(role);
  const receipt: any = {
    schema: "student-setup-v1",
    actor_id: actor,
    request_id: record,
    account_role: role,
    account_email: "sample@example.test",
    organization_id: null,
    self_profile: role === "student",
    row: { ...row, ...(role === "student" ? { student_user_id: actor } : {}) },
    relationship_kind: guardian ? "guardian" : team ? "team" : null,
    relationship: guardian
      ? s.results.student_guardians.data
      : team
        ? s.results.student_team_members.data
        : null,
    license_attached: guardian ? false : null,
  };
  s.client.rpc.mockResolvedValue({ data: receipt, error: null });
  return { ...s, receipt };
}
describe("atomic student setup receipts", () => {
  for (const role of [
    "parent",
    "guardian",
    "educator",
    "teacher",
    "case_manager",
    "administrator",
    "school_admin",
    "admin",
    "district_admin",
    "partner",
    "student",
  ])
    it(`validates ${role} transaction`, async () => {
      const s = atomic(role);
      await createStudentWithReceipt(s.client, actor, input);
      expect(s.client.rpc).toHaveBeenCalledExactlyOnceWith("create_student_with_setup", {
        _expected_viewer_id: actor,
        _request_id: record,
        _fields: { first_name: "Sample" },
      });
      expect(s.client.from).not.toHaveBeenCalled();
    });
  for (const field of ["actor_id", "request_id", "schema"])
    it(`rejects wrong ${field}`, async () => {
      const s = atomic();
      s.receipt[field] = id(8);
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
      expect(s.client.rpc).toHaveBeenCalledOnce();
    });
  for (const field of ["id", "owner_id", "first_name", "student_user_id", "organization_id"])
    it(`rejects contradictory saved ${field}`, async () => {
      const s = atomic();
      s.receipt.row[field] = id(8);
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
      expect(s.client.from).not.toHaveBeenCalled();
    });
  for (const field of [
    "id",
    "student_id",
    "guardian_user_id",
    "guardian_email",
    "relationship",
    "is_primary",
    "verified",
  ])
    it(`rejects contradictory relationship ${field}`, async () => {
      const s = atomic();
      s.receipt.relationship[field] = field === "id" ? "bad" : id(8);
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
    });
  for (const value of [null, "true", 1])
    it(`requires literal license state ${value}`, async () => {
      const s = atomic();
      s.receipt.license_attached = value;
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
    });
  it("preserves licensed organization in student and team", async () => {
    const s = atomic("educator");
    s.receipt.organization_id = id(7);
    s.receipt.row.organization_id = id(7);
    s.receipt.relationship.organization_id = id(7);
    expect((await createStudentWithReceipt(s.client, actor, input)).organization_id).toBe(id(7));
  });
  it("rejects missing relationship", async () => {
    const s = atomic();
    s.receipt.relationship = null;
    await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
  });
  it("rejects wrong self identity", async () => {
    const s = atomic("student");
    s.receipt.row.student_user_id = id(8);
    await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
  });
  for (const result of [
    { data: null, error: null },
    { data: {}, error: null },
    { data: null, error: { code: "42501" } },
  ])
    it("does not retry or use raw inserts after unconfirmed transaction", async () => {
      const s = atomic();
      s.client.rpc.mockResolvedValue(result as never);
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow(
        "Check your student list",
      );
      expect(s.client.rpc).toHaveBeenCalledOnce();
      expect(s.client.from).not.toHaveBeenCalled();
    });
});
describe("self profile identity", () => {
  for (const defect of ["error", "empty", "foreign", "malformed"])
    it(`rejects ${defect}`, async () => {
      const s = setup();
      s.client.rpc.mockResolvedValue(
        defect === "error"
          ? { data: row, error: {} }
          : ({
              data:
                defect === "empty"
                  ? null
                  : defect === "malformed"
                    ? {}
                    : { ...row, student_user_id: id(8) },
              error: null,
            } as never),
      );
      await expect(ensureSelfProfile(s.client, actor, input)).rejects.toThrow();
      expect(s.client.rpc).toHaveBeenCalledOnce();
    });
});
describe("student delete receipts", () => {
  const intent = { id: record, expected_updated_at: stamp, expected_viewer_id: actor };
  it("uses owner and exact loaded revision in same delete query", async () => {
    const s = setup();
    expect(await deleteStudentWithReceipt(s.client, actor, intent)).toEqual({
      ok: true,
      deleted_id: record,
    });
    expect(s.predicates).toEqual([
      ["id", record],
      ["owner_id", actor],
      ["updated_at", stamp],
    ]);
  });
  for (const defect of ["empty", "error", "id", "owner_id", "updated_at"])
    it(`rejects ${defect} without false success`, async () => {
      const s = setup();
      if (defect === "empty") s.results.students.data = null;
      else if (defect === "error") s.results.students.error = {};
      else s.results.students.data[defect] = id(8);
      await expect(deleteStudentWithReceipt(s.client, actor, intent)).rejects.toThrow("Refresh");
      expect(s.client.from).toHaveBeenCalledOnce();
    });
});
for (const fn of [createStudentWithReceipt, ensureSelfProfile, deleteStudentWithReceipt])
  it(`${fn.name} rejects stale account before IO`, async () => {
    const s = setup();
    await expect(
      (fn as any)(s.client, actor, {
        ...input,
        id: record,
        expected_updated_at: stamp,
        expected_viewer_id: id(9),
      }),
    ).rejects.toThrow("sign-in changed");
    expect(s.client.from).not.toHaveBeenCalled();
    expect(s.client.rpc).not.toHaveBeenCalled();
  });

it.each(['23503','23001'])('explains restrictive deletion reference %s without exposing database details',async(code)=>{const s=setup();s.results.students={data:null,error:{code,message:'private_constraint_internal_name'}};await expect(deleteStudentWithReceipt(s.client,actor,{id:record,expected_viewer_id:actor,expected_updated_at:stamp})).rejects.toThrow('linked records or document work');expect(s.client.from).toHaveBeenCalledOnce();});
