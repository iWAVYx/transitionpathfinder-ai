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
describe("student creation receipts", () => {
  for (const role of [
    "parent",
    "guardian",
    "educator",
    "teacher",
    "case_manager",
    "administrator",
    "school_admin",
    "admin",
  ])
    it(`confirms ${role} creator relationship`, async () => {
      const s = setup(role);
      expect(await createStudentWithReceipt(s.client, actor, input)).toMatchObject(row);
      expect(s.inserts).toHaveLength(2);
      expect(s.inserts[0].fields.owner_id).toBe(actor);
    });
  it("accepts no reserved license as a successful optional attachment check", async () => {
    const s = setup();
    await createStudentWithReceipt(s.client, actor, input);
    expect(s.client.rpc).toHaveBeenCalledExactlyOnceWith("attach_my_pathway_license_to_student", {
      _student_id: record,
    });
  });
  for (const defect of ["error", "missing", "wrong-actor", "missing-email"])
    it(`stops ${defect} account before insert`, async () => {
      const s = setup();
      if (defect === "error") s.results.profiles.error = {};
      else if (defect === "missing") s.results.profiles.data = null;
      else if (defect === "wrong-actor") s.results.profiles.data.id = id(8);
      else s.results.profiles.data.email = null;
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
      expect(s.inserts).toHaveLength(0);
    });
  for (const field of ["id", "owner_id", "first_name", "student_user_id", "organization_id"])
    it(`rejects incorrect saved ${field} without follow-up writes`, async () => {
      const s = setup();
      s.results.students.data[field] = id(8);
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow(
        "some information may already be saved",
      );
      expect(s.inserts).toHaveLength(1);
      expect(s.client.rpc).not.toHaveBeenCalled();
    });
  for (const defect of ["error", "empty", "wrong-student", "wrong-member"])
    it(`does not hide ${defect} relationship result`, async () => {
      const s = setup();
      if (defect === "error") s.results.student_guardians.error = {};
      else if (defect === "empty") s.results.student_guardians.data = null;
      else
        s.results.student_guardians.data[
          defect === "wrong-student" ? "student_id" : "guardian_user_id"
        ] = id(8);
      await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow(
        "Check your student list",
      );
      expect(s.inserts).toHaveLength(2);
      expect(s.client.rpc).not.toHaveBeenCalled();
    });
  it("rejects failed license without automatic compensation/retry", async () => {
    const s = setup();
    s.client.rpc.mockResolvedValue({ data: null, error: {} } as never);
    await expect(createStudentWithReceipt(s.client, actor, input)).rejects.toThrow();
    expect(s.client.rpc).toHaveBeenCalledOnce();
    expect(s.inserts).toHaveLength(2);
  });
  it("student uses canonical self RPC and creates no secondary row", async () => {
    const s = setup("student");
    expect((await createStudentWithReceipt(s.client, actor, input)).student_user_id).toBe(actor);
    expect(s.inserts).toHaveLength(0);
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

it("preserves the validated licensed organization in both student and team receipt", async () => {
  const s = setup("educator");
  s.results.profiles.data.organization_id = id(7);
  s.results.students.data.organization_id = id(7);
  s.results.student_team_members.data.organization_id = id(7);
  await createStudentWithReceipt(s.client, actor, input);
  expect(s.inserts.map((v) => v.fields.organization_id)).toEqual([id(7), id(7)]);
});
