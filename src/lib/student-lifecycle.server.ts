import { z } from "zod";
import { progressTimestampKey } from "./progress-contract";
import { assertExpectedViewer } from "./viewer-intent";
import type { Student } from "./students.functions";
const student = z
  .object({
    id: z.string().uuid(),
    owner_id: z.string().uuid(),
    student_user_id: z.string().uuid().nullable(),
    first_name: z.string().min(1),
    last_name: z.string().nullable(),
    grade_band: z.string().nullable(),
    school: z.string().nullable(),
    date_of_birth: z.string().nullable(),
    photo_url: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
type Client = {
  from(table: string): any;
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
type Intent = { expected_viewer_id?: string };
export const STUDENT_SAVE_UNCONFIRMED =
  "We couldn't confirm that student setup finished. Check your student list before trying again; some information may already be saved.";
export const STUDENT_DELETE_UNCONFIRMED =
  "We couldn't confirm this student was removed. Refresh the student list to check the current record before trying again.";
/** The existing self-profile RPC is transactional; require its actual identity receipt. */
export async function ensureSelfProfile(
  client: Client,
  actor: string,
  intent: Intent,
): Promise<Student> {
  assertExpectedViewer(intent, actor);
  try {
    const result = await client.rpc("ensure_student_self_profile");
    if (result.error !== null) throw Error();
    const row = student.parse(result.data);
    if (row.student_user_id !== actor) throw Error();
    return row;
  } catch {
    throw Error(STUDENT_SAVE_UNCONFIRMED);
  }
}
type Input = Intent & {
  request_id?: string;
  first_name: string;
  last_name?: string;
  grade_band?: string;
  school?: string;
  date_of_birth?: string;
  notes?: string;
};
/** Caller-RLS operations, NOT a transaction across student, relationship and license.
 * Never retry or compensate automatically after an uncertain/partial write. */
export async function createStudentWithReceipt(
  client: Client,
  actor: string,
  input: Input,
): Promise<Student> {
  assertExpectedViewer(input, actor);
  const profileResult = await client
    .from("profiles")
    .select("id, primary_role, email, organization_id")
    .eq("id", actor)
    .maybeSingle();
  const parsed = z
    .object({
      id: z.literal(actor),
      primary_role: z.string().min(1),
      email: z.string().email(),
      organization_id: z.string().uuid().nullable(),
    })
    .safeParse(profileResult.data);
  if (profileResult.error !== null || !parsed.success)
    throw Error("We couldn't check your account details. Refresh before adding a student.");
  const profile = parsed.data;
  if (profile.primary_role === "student") return ensureSelfProfile(client, actor, input);
  const guardians = new Set(["parent", "guardian"]),
    team = new Set([
      "educator",
      "teacher",
      "case_manager",
      "administrator",
      "school_admin",
      "admin",
    ]);
  const fields = {
    id: input.request_id ?? crypto.randomUUID(),
    owner_id: actor,
    first_name: input.first_name,
    last_name: input.last_name ?? null,
    grade_band: input.grade_band ?? null,
    school: input.school ?? null,
    date_of_birth: input.date_of_birth ?? null,
    notes: input.notes ?? null,
    organization_id: profile.organization_id,
  };
  try {
    const result = await client.from("students").insert(fields).select("*").single();
    if (result.error !== null) throw Error();
    const row = student.parse(result.data);
    if (row.student_user_id !== null || Object.entries(fields).some(([k, v]) => row[k] !== v))
      throw Error();
    const relation = guardians.has(profile.primary_role)
      ? {
          table: "student_guardians",
          fields: {
            student_id: row.id,
            guardian_user_id: actor,
            guardian_email: profile.email,
            relationship: profile.primary_role,
            is_primary: true,
            verified: true,
          },
        }
      : team.has(profile.primary_role)
        ? {
            table: "student_team_members",
            fields: {
              student_id: row.id,
              member_user_id: actor,
              member_email: profile.email,
              role_on_team:
                profile.primary_role === "administrator" ? "school_admin" : profile.primary_role,
              organization_id: profile.organization_id,
              status: "active",
            },
          }
        : null;
    if (relation) {
      const saved = await client.from(relation.table).insert(relation.fields).select("*").single();
      if (
        saved.error !== null ||
        !saved.data ||
        Object.entries(relation.fields).some(([k, v]) => saved.data[k] !== v) ||
        !z.string().uuid().safeParse(saved.data.id).success
      )
        throw Error();
    }
    if (guardians.has(profile.primary_role)) {
      const license = await client.rpc("attach_my_pathway_license_to_student", {
        _student_id: row.id,
      });
      if (license.error !== null || typeof license.data !== "boolean")
        throw Error(); /* false means no reserved seat, not a failed attachment. */
    }
    return row;
  } catch {
    throw Error(STUDENT_SAVE_UNCONFIRMED);
  }
}
/** Exact owner/version predicate and returned row; existing RLS/cascades remain authoritative.
 * This proves only the deleted student receipt, not external-storage cleanup. */
export async function deleteStudentWithReceipt(
  client: Client,
  actor: string,
  input: Intent & { id: string; expected_updated_at: string },
) {
  assertExpectedViewer(input, actor);
  try {
    const result = await client
      .from("students")
      .delete()
      .eq("id", input.id)
      .eq("owner_id", actor)
      .eq("updated_at", input.expected_updated_at)
      .select("id, owner_id, updated_at")
      .single();
    if (
      result.error !== null ||
      !result.data ||
      result.data.id !== input.id ||
      result.data.owner_id !== actor ||
      progressTimestampKey(result.data.updated_at) !==
        progressTimestampKey(input.expected_updated_at)
    )
      throw Error();
    return { ok: true as const, deleted_id: input.id };
  } catch {
    throw Error(STUDENT_DELETE_UNCONFIRMED);
  }
}
