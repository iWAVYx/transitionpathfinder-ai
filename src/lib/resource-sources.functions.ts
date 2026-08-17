import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SOURCE_TYPES = [
  "library",
  "government",
  "nonprofit",
  "professional_association",
  "research_center",
  "curriculum",
  "tools",
  "media",
  "local_resource",
  "curated",
  "partner",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const LOCATION_SCOPES = ["national", "connecticut", "local", "online"] as const;
export const UPDATE_FREQUENCIES = ["ongoing", "monthly", "quarterly", "yearly", "unknown"] as const;
export const REVIEW_STATUSES = ["needs_review", "approved", "featured", "archived"] as const;

export const SOURCE_AUDIENCES = [
  "student",
  "parent_guardian",
  "educator_case_manager",
  "school_admin",
  "district_admin",
  "partner",
  "all",
] as const;

export const SOURCE_TOPICS = [
  "transition-planning",
  "iep-ppt",
  "self-advocacy",
  "career",
  "employment",
  "postsecondary",
  "independent-living",
  "family-support",
  "educator-tools",
  "research-policy",
  "ct-resources",
  "social-skills",
  "communication",
  "behavior-support",
  "life-skills",
  "disability-support",
] as const;

export type ResourceSource = {
  id: string;
  source_name: string;
  source_url: string | null;
  organization_name: string | null;
  description: string | null;
  source_type: SourceType;
  audience_focus: string[];
  topic_focus: string[];
  location_scope: string;
  update_frequency: string;
  review_status: string;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  resource_count?: number;
};

async function requireAdminHub(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: Admin Hub access required.");
}

export const adminListSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sources, error } = await supabaseAdmin
      .from("resource_sources")
      .select("*")
      .order("review_status", { ascending: true })
      .order("source_name", { ascending: true });
    if (error) return { sources: [] as ResourceSource[] };

    const ids = (sources ?? []).map((s: { id: string }) => s.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: rows } = await supabaseAdmin
        .from("resources")
        .select("source_id")
        .in("source_id", ids);
      for (const r of (rows ?? []) as Array<{ source_id: string | null }>) {
        if (r.source_id) counts.set(r.source_id, (counts.get(r.source_id) ?? 0) + 1);
      }
    }
    return {
      sources: (sources ?? []).map((s: any) => ({
        ...s,
        resource_count: counts.get(s.id) ?? 0,
      })) as ResourceSource[],
    };
  });

const sourceInput = z.object({
  id: z.string().uuid().optional(),
  source_name: z.string().trim().min(1).max(300),
  source_url: z.string().trim().url().max(2000).nullable().optional().or(z.literal("")),
  organization_name: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  source_type: z.enum(SOURCE_TYPES),
  audience_focus: z.array(z.string()).default([]),
  topic_focus: z.array(z.string()).default([]),
  location_scope: z.enum(LOCATION_SCOPES).default("national"),
  update_frequency: z.enum(UPDATE_FREQUENCIES).default("unknown"),
  review_status: z.enum(REVIEW_STATUSES).default("approved"),
  next_review_due_at: z.string().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export const adminUpsertSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => sourceInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const row: Record<string, any> = { ...rest };
    if (row.source_url === "") row.source_url = null;
    if (id) {
      const { error } = await supabaseAdmin.from("resource_sources").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    row.created_by_user_id = userId;
    const { data: ins, error } = await supabaseAdmin
      .from("resource_sources")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (ins as { id: string }).id };
  });

export const adminMarkSourceReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        next_review_due_at: z.string().nullable().optional(),
        notes: z.string().trim().max(4000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = { last_reviewed_at: new Date().toISOString() };
    if (data.next_review_due_at !== undefined) patch.next_review_due_at = data.next_review_due_at;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await supabaseAdmin.from("resource_sources").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetSourceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ id: z.string().uuid(), review_status: z.enum(REVIEW_STATUSES) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("resource_sources")
      .update({ review_status: data.review_status } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("resource_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListResourcesNeedingReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: needsReview }, { data: brokenLinks }, { data: sourcesNeedingReview }] = await Promise.all([
      supabaseAdmin
        .from("resources")
        .select("id", { count: "exact", head: true })
        .in("published_status", ["draft", "needs_review"]),
      supabaseAdmin
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("link_status", "broken"),
      supabaseAdmin
        .from("resource_sources")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "needs_review"),
    ]);
    return {
      resourcesNeedingReview: (needsReview as any)?.count ?? 0,
      brokenLinks: (brokenLinks as any)?.count ?? 0,
      sourcesNeedingReview: (sourcesNeedingReview as any)?.count ?? 0,
    };
  });
