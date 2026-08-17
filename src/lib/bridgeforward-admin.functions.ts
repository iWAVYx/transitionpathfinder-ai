import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* Admin-only BridgeForward source manager & directory CRUD. */

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const SchoolInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  district: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  county: z.string().trim().max(60).optional().nullable(),
  school_type: z.enum([
    "comprehensive_public",
    "technical_ctecs",
    "magnet",
    "charter",
    "agricultural_aste",
    "open_choice",
    "specialized_program",
    "alternative_program",
    "private_or_out_of_district",
    "other",
  ]),
  grades_served: z.string().trim().max(40).optional().nullable(),
  website_url: z.string().trim().max(500).optional().nullable(),
  admissions_url: z.string().trim().max(500).optional().nullable(),
  application_window: z.string().trim().max(200).optional().nullable(),
  transportation_notes: z.string().trim().max(1000).optional().nullable(),
  source_url: z.string().trim().max(500).optional().nullable(),
  source_name: z.string().trim().max(200).optional().nullable(),
  verification_status: z.enum([
    "imported",
    "needs_review",
    "verified",
    "outdated",
    "archived",
  ]),
});

const ProgramInput = z.object({
  id: z.string().uuid().optional(),
  school_id: z.string().uuid(),
  program_name: z.string().trim().min(1).max(200),
  program_category: z.enum([
    "stem","arts","health_sciences","trades","manufacturing","culinary",
    "agriculture","aquaculture","aviation","digital_media","business",
    "public_service","college_credit","career_technical","special_program","other",
  ]),
  description: z.string().trim().max(2000).optional().nullable(),
  student_fit_tags: z.array(z.string()).default([]),
  support_considerations: z.string().trim().max(2000).optional().nullable(),
  application_requirements: z.string().trim().max(1000).optional().nullable(),
  source_url: z.string().trim().max(500).optional().nullable(),
  verification_status: z.enum([
    "imported","needs_review","verified","outdated","archived",
  ]),
});

export const adminListSchools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        status: z.string().optional(),
        q: z.string().max(120).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("ct_high_schools")
      .select("*, programs:ct_high_school_programs(id,program_name,verification_status)")
      .order("name");
    if (data.status) q = q.eq("verification_status", data.status as never);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return { schools: rows ?? [] };
  });

export const adminUpsertSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => SchoolInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload = {
      ...data,
      created_by: context.userId,
      last_verified_at:
        data.verification_status === "verified" ? new Date().toISOString() : null,
    };
    const { data: row, error } = await context.supabase
      .from("ct_high_schools")
      .upsert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminArchiveSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ct_high_schools")
      .update({ verification_status: "archived" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminUpsertProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => ProgramInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("ct_high_school_programs")
      .upsert({
        ...data,
        created_by: context.userId,
        last_verified_at:
          data.verification_status === "verified"
            ? new Date().toISOString()
            : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ------ Source records ------

export const adminListSourceRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("bridgeforward_source_records")
      .select("*")
      .order("imported_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { records: data ?? [] };
  });

export const adminImportSourceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        source_name: z.string().trim().min(1).max(200),
        source_url: z.string().trim().max(500).optional().nullable(),
        source_type: z.string().trim().max(60).optional().nullable(),
        dedupe_key: z.string().trim().max(200).optional().nullable(),
        raw: z.record(z.string(), z.unknown()).default({}),
        normalized: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("bridgeforward_source_records")
      .insert({
        ...data,
        raw: data.raw as never,
        normalized: data.normalized as never,
        imported_by: context.userId,
        import_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminReviewSourceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        source_record_id: z.string().uuid(),
        action: z.enum(["approve", "reject", "merge", "needs_changes"]),
        notes: z.string().trim().max(2000).optional().nullable(),
        target_school_id: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase, userId } = context;
    const status =
      data.action === "approve"
        ? "approved"
        : data.action === "reject"
        ? "rejected"
        : data.action === "merge"
        ? "merged"
        : "needs_changes";
    const { error: e1 } = await supabase
      .from("bridgeforward_source_records")
      .update({ import_status: status, suggested_school_id: data.target_school_id ?? null })
      .eq("id", data.source_record_id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase
      .from("bridgeforward_import_reviews")
      .insert({
        source_record_id: data.source_record_id,
        reviewer_id: userId,
        action: data.action,
        notes: data.notes ?? null,
        target_school_id: data.target_school_id ?? null,
      });
    if (e2) throw new Error(e2.message);
    return { ok: true as const };
  });
