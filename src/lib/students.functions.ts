import {closeCreationRequest,readCreationOutcome,ensureSelfProfile,createStudentWithReceipt,deleteStudentWithReceipt} from "./student-lifecycle.server";
import {readStudentProfile,studentCapability,CASELOAD_UNAVAILABLE} from "./caseload-records.server";
import{deletePlanningRecordAtomically}from"./planning-record-delete.server";
import {readPlanningRecords} from "./planning-records.server";
import {createPlanningRecordAtomically,updateGoalStatusAtomically} from "./planning-record-write.server";
import {viewerIntentSchema} from "./viewer-intent";
import { revokeOwnedShareToken } from "./revoke-share-token.server";
import { readOrganizationPages } from "@/lib/organization-query-pages";
import { optionalViewerIntent, assertExpectedViewer } from "@/lib/viewer-intent";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireFeatureEntitlement } from "./entitlement-guard";

/* ---------- STUDENTS ---------- */

const StudentInput = z.object({
  ...viewerIntentSchema.shape,
  request_id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).optional(),
  grade_band: z.enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  school: z.string().trim().max(160).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type Student = {
  id: string;
  owner_id: string;
  student_user_id: string | null;
  first_name: string;
  last_name: string | null;
  grade_band: string | null;
  school: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Creates or repairs the student profile represented by the signed-in
 * student account. The database function is transactional and idempotent, so
 * onboarding retries and dashboard recovery cannot create duplicate plans.
 */
export const ensureOwnStudentProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    return ensureSelfProfile(context.supabase, context.userId, data);
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;
    try {
      const students = await readOrganizationPages<Student>((from, to) =>
        supabase.from("students").select("*", { count: "exact" })
          .order("created_at", { ascending: false }).order("id").range(from, to),
      );
      return { students, loadFailed: false };
    } catch {
      return { students: [] as Student[], loadFailed: true };
    }
  });

export const getStudent=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((i:unknown)=>z.object({id:z.string().uuid(),...viewerIntentSchema.shape}).parse(i))
 .handler(async({data,context})=>readStudentProfile(context.supabase,context.userId,data) as unknown as Promise<Student>);

/** Current explicit access only; the Owner/admin role is not student editing proof. */
export const canEditStudent=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((i:unknown)=>z.object({student_id:z.string().uuid(),...viewerIntentSchema.shape}).parse(i))
 .handler(async({data,context})=>{assertExpectedViewer(data,context.userId);try{return{canEdit:await studentCapability(context.supabase,context.userId,data.student_id)};}catch{throw Error(CASELOAD_UNAVAILABLE);}});

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => StudentInput.parse(i))
  .handler(async ({data,context}) => createStudentWithReceipt(context.supabase,context.userId,data));

export const readStudentCreationOutcome=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((i:unknown)=>z.object({expected_viewer_id:z.string().uuid(),request_id:z.string().uuid(),kind:z.enum(['linked','self'])}).parse(i))
 .handler(async({data,context})=>readCreationOutcome(context.supabase,context.userId,data));

export const closeStudentCreationRequest=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((i:unknown)=>z.object({expected_viewer_id:z.string().uuid(),request_id:z.string().uuid(),kind:z.literal('linked')}).parse(i))
 .handler(async({data,context})=>closeCreationRequest(context.supabase,context.userId,data));

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({id:z.string().uuid(),expected_updated_at:z.string().datetime({offset:true}),...viewerIntentSchema.shape}).parse(i))
  .handler(async ({data,context}) => deleteStudentWithReceipt(context.supabase,context.userId,data));

/* ---------- GOALS ---------- */

const GoalInput = z.object({
  ...viewerIntentSchema.shape,
  request_id: z.string().uuid().optional(),
  student_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z
    .enum(["academic", "life-skills", "career", "college", "transportation", "communication", "general"])
    .default("general"),
  status: z.enum(["not-started", "in-progress", "met", "paused"]).default("not-started"),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  measurable_criteria: z.string().trim().max(1000).optional(),
});

export type Goal = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  target_date: string | null;
  measurable_criteria: string | null;
  created_at: string;
  updated_at: string;
};

export const listGoals=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((input:unknown)=>z.object({student_id:z.string().uuid(),...viewerIntentSchema.shape}).parse(input))
 .handler(async({data,context})=>{const result=await readPlanningRecords(context.supabase,context.userId,'goals',data);return{goals:result.records as unknown as Goal[],canEdit:result.canEdit};});
export const createGoal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator((input:unknown)=>GoalInput.parse(input))
 .handler(async({data,context})=>createPlanningRecordAtomically(context.supabase,context.userId,'goals',{...data,description:data.description??null,target_date:data.target_date??null,measurable_criteria:data.measurable_criteria??null}) as unknown as Promise<Goal>);
const GoalMutation=z.object({id:z.string().uuid(),student_id:z.string().uuid(),expected_updated_at:z.string().datetime({offset:true}),...viewerIntentSchema.shape});
export const updateGoalStatus=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .validator((input:unknown)=>GoalMutation.extend({status:z.enum(["not-started","in-progress","met","paused"])}).parse(input))
 .handler(async({data,context})=>{const goal=await updateGoalStatusAtomically(context.supabase,context.userId,data);return{ok:true as const,goal:goal as unknown as Goal};});
export const deleteGoal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator((input:unknown)=>GoalMutation.extend({student_id:z.string().uuid(),expected_updated_at:z.string().datetime({offset:true})}).parse(input))
 .handler(async({data,context})=>{return deletePlanningRecordAtomically(context.supabase,context.userId,'goals',data);});

/* ---------- SHARE TOKENS ---------- */

function randomToken(bytes = 24) {
  // URL-safe base64
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ShareTokenRow = {
  id: string;
  token: string;
  report_id: string;
  audience: string;
  expires_at: string | null;
  revoked: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

export const createShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({
      report_id: z.string().uuid(),
      audience: z.enum(["family", "educator"]).default("family"),
      expires_in_days: z.number().int().min(1).max(365).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireFeatureEntitlement(supabase, userId, "family");

    // Verify the caller owns or can access the referenced report before minting
    // a share token. RLS also enforces this, but we surface a clear error.
    const { data: report, error: reportErr } = await supabase
      .from("pathway_reports")
      .select("id, user_id, student_id")
      .eq("id", data.report_id)
      .maybeSingle();
    if (reportErr || !report) throw new Error("Report not found.");
    if (report.user_id !== userId) {
      let allowed = false;
      if (report.student_id) {
        const { data: canAccess } = await supabase.rpc("can_access_student", {
          _user_id: userId,
          _student_id: report.student_id,
        });
        allowed = !!canAccess;
      }
      if (!allowed) throw new Error("You do not have access to this report.");
    }

    const token = randomToken();
    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86_400_000).toISOString()
      : null;
    const { data: row, error } = await supabase
      .from("share_tokens")
      .insert({
        token,
        report_id: data.report_id,
        created_by: userId,
        audience: data.audience,
        expires_at,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("createShareToken failed", error);
      throw new Error("Could not create share link.");
    }
    return row as ShareTokenRow;
  });

export const listShareTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ report_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("share_tokens")
      .select("*")
      .eq("report_id", data.report_id)
      .order("created_at", { ascending: false });
    if (error) return { tokens: [] as ShareTokenRow[] };
    return { tokens: (rows ?? []) as ShareTokenRow[] };
  });

export const revokeShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await revokeOwnedShareToken(context.supabase, context.userId, data.id);
    return { ok: true };
  });
