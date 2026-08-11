import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260811181552_student_self_ownership_and_invitation_linking.sql",
  ),
  "utf8",
);
const studentDashboard = readFileSync(
  resolve(process.cwd(), "src/components/dashboard/StudentDashboard.tsx"),
  "utf8",
);

describe("student self-ownership contract", () => {
  it("grants the linked student direct read and edit access", () => {
    expect(migration).toContain(
      "s.owner_id = _user_id OR s.student_user_id = _user_id",
    );
    expect(migration.match(/s\.student_user_id = _user_id/g)?.length).toBe(2);
  });

  it("creates or repairs the self-profile transactionally", () => {
    expect(migration).toContain("FUNCTION public.ensure_student_self_profile()");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("student_user_id = v_uid");
  });

  it("links a student invitation to the student identity instead of a collaborator", () => {
    expect(migration).toContain("IF v_inv.invited_role = 'student' THEN");
    expect(migration).toContain("SET student_user_id = v_uid");
  });

  it("shares one pathway seat with no more than three family accounts", () => {
    expect(migration).toContain("A pathway includes at most three parent/guardian accounts");
    expect(migration).toMatch(/ORDER BY ranked_family[\s\S]*?LIMIT 3/);
  });

  it("does not tell students to request collaborator access to their own plan", () => {
    expect(studentDashboard).not.toContain("add you as a collaborator on your plan");
    expect(studentDashboard).toContain("need to be added as a collaborator.");
  });
});
