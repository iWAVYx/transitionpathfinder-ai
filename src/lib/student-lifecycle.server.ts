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
const setupReceipt = z
  .object({
    schema: z.literal("student-setup-v1"),
    actor_id: z.string().uuid(),
    request_id: z.string().uuid(),
    account_role: z.string().min(1),
    account_email: z.string().email(),
    organization_id: z.string().uuid().nullable(),
    self_profile: z.boolean(),
    row: student,
    relationship_kind: z.enum(["guardian", "team"]).nullable(),
    relationship: z.record(z.string(), z.unknown()).nullable(),
    license_attached: z.boolean().nullable(),
  })
  .strict();
/** One caller-RLS transaction for student, relationship and optional license.
 * Never fall back to raw inserts or retry after an uncertain response. */
export async function createStudentWithReceipt(
  client: Client,
  actor: string,
  input: Input,
): Promise<Student> {
  assertExpectedViewer(input, actor);
  const { request_id, expected_viewer_id, ...fields } = input,
    request = request_id ?? crypto.randomUUID();
  try {
    const result = await client.rpc("create_student_with_setup", {
      _expected_viewer_id: actor,
      _request_id: request,
      _fields: fields,
    });
    if (result.error !== null) throw Error();
    const receipt = setupReceipt.parse(result.data),
      row = receipt.row;
    if (
      receipt.actor_id !== actor ||
      receipt.request_id !== request ||
      receipt.self_profile !== (receipt.account_role === "student")
    )
      throw Error();
    if (receipt.self_profile) {
      if (
        row.student_user_id !== actor ||
        receipt.relationship !== null ||
        receipt.relationship_kind !== null ||
        receipt.license_attached !== null
      )
        throw Error();
      return row;
    }
    const expected = {
      id: request,
      owner_id: actor,
      student_user_id: null,
      first_name: input.first_name.trim(),
      last_name: input.last_name ?? null,
      grade_band: input.grade_band ?? null,
      school: input.school ?? null,
      date_of_birth: input.date_of_birth ?? null,
      notes: input.notes ?? null,
      organization_id: receipt.organization_id,
    };
    if (Object.entries(expected).some(([k, v]) => row[k] !== v)) throw Error();
    const guardian = ["parent", "guardian"].includes(receipt.account_role),
      team = [
        "educator",
        "teacher",
        "case_manager",
        "administrator",
        "school_admin",
        "admin",
      ].includes(receipt.account_role);
    if (receipt.relationship_kind !== (guardian ? "guardian" : team ? "team" : null)) throw Error();
    if (guardian || team) {
      const relation = receipt.relationship;
      if (!relation || !z.string().uuid().safeParse(relation.id).success) throw Error();
      const expectedRelation = guardian
        ? {
            student_id: request,
            guardian_user_id: actor,
            guardian_email: receipt.account_email,
            relationship: receipt.account_role,
            is_primary: true,
            verified: true,
          }
        : {
            student_id: request,
            member_user_id: actor,
            member_email: receipt.account_email,
            role_on_team:
              receipt.account_role === "administrator" ? "school_admin" : receipt.account_role,
            organization_id: receipt.organization_id,
            status: "active",
          };
      if (Object.entries(expectedRelation).some(([k, v]) => relation[k] !== v)) throw Error();
    } else if (receipt.relationship !== null) throw Error();
    if (
      guardian ? typeof receipt.license_attached !== "boolean" : receipt.license_attached !== null
    )
      throw Error();
    return row;
  } catch {
    throw Error(STUDENT_SAVE_UNCONFIRMED);
  }
}

export const STUDENT_REMOVAL_BLOCKED =
  "This student still has linked records or document work that must be resolved before the profile can be removed.";
class StudentRemovalBlocked extends Error {}
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
      result.error &&
      typeof result.error === "object" &&
      "code" in result.error &&
      (result.error.code === "23503" || result.error.code === "23001")
    )
      throw new StudentRemovalBlocked(STUDENT_REMOVAL_BLOCKED);
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
  } catch (error) {
    if (error instanceof StudentRemovalBlocked) throw error;
    throw Error(STUDENT_DELETE_UNCONFIRMED);
  }
}

/** Read-only reconciliation. Unknown/deleted outcomes never authorize a replay. */
export async function readCreationOutcome(
  client: Client,
  actor: string,
  input: Intent & { request_id: string; kind: "linked" | "self" },
) {
  assertExpectedViewer(input, actor);
  const failure =
    "We couldn't confirm the earlier student setup. Please check again before adding another student.";
  try {
    if (input.kind === "self") {
      const result = await client
        .from("students")
        .select("*")
        .eq("student_user_id", actor)
        .maybeSingle();
      if (result.error !== null) throw Error();
      if (result.data === null) return { status: "unconfirmed" as const };
      const row = student.parse(result.data);
      if (row.student_user_id !== actor) throw Error();
      return { status: "present" as const, student_id: row.id };
    }
    const result = await client.rpc("read_student_creation_outcome", {
      _expected_viewer_id: actor,
      _request_id: input.request_id,
    });
    if (result.error !== null) throw Error();
    const receipt = z
      .object({
        schema: z.literal("student-creation-outcome-v1"),
        actor_id: z.literal(actor),
        request_id: z.literal(input.request_id),
        status: z.enum(["present", "removed", "unconfirmed"]),
      })
      .strict()
      .parse(result.data);
    if (receipt.status !== "present") return { status: receipt.status };
    const saved = await client
      .from("students")
      .select("*")
      .eq("id", input.request_id)
      .eq("owner_id", actor)
      .single();
    if (saved.error !== null) throw Error();
    const row = student.parse(saved.data);
    if (row.id !== input.request_id || row.owner_id !== actor) throw Error();
    return { status: "present" as const, student_id: row.id };
  } catch {
    throw Error(failure);
  }
}
