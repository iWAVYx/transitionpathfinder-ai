import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------- FAMILY PRIORITIES (stored on students.family_priorities) ---------- */

export type FamilyPriorities = {
  student_id: string;
  family_priorities: string;
};

export const getFamilyPriorities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("students")
      .select("id, family_priorities")
      .eq("id", data.student_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      student_id: data.student_id,
      family_priorities:
        (row as { family_priorities: string | null } | null)?.family_priorities ?? "",
    } satisfies FamilyPriorities;
  });

export const updateFamilyPriorities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        family_priorities: z.string().trim().max(4000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("students")
      .update({ family_priorities: data.family_priorities || null })
      .eq("id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- SHARING & CONSENT (sharing_permissions) ---------- */

export type SharingPermission = {
  id: string;
  student_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string | null;
  shared_with_organization_id: string | null;
  access_level: string;
  shared_items: unknown;
  expiration_date: string | null;
  created_at: string;
};

export const listSharingPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("sharing_permissions")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listSharingPermissions", error);
      return { permissions: [] as SharingPermission[] };
    }
    return { permissions: (rows ?? []) as SharingPermission[] };
  });

export const revokeSharingPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("sharing_permissions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
