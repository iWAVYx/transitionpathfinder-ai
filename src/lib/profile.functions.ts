import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Profile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  primary_role: string | null;
  onboarding_completed: boolean;
  language: string;
  onboarding_answers: Record<string, unknown>;
};

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, primary_role, onboarding_completed, language")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("getProfile failed", error);
      throw new Error("Could not load profile.");
    }
    return (
      data ?? {
        id: userId,
        full_name: null,
        first_name: null,
        last_name: null,
        primary_role: null,
        onboarding_completed: false,
        language: "en",
      }
    ) as Profile;
  });

export const updateProfileLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ language: z.string().min(2).max(8) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ language: data.language })
      .eq("id", userId);
    if (error) throw new Error("Could not save language.");
    return { ok: true };
  });

// Onboarding role IDs surfaced to the user. These are the 5 first-class
// signed-in personas. `educator` writes BOTH `educator` and `case_manager`
// to user_roles so the UI can consistently say "Educator / Case Manager".
const PRIMARY_ROLES = [
  "parent",
  "student",
  "educator",
  "school_admin",
  "partner",
] as const;

// Map an onboarding role ID → the set of app_role enum values to write.
// Never writes `admin` (platform admin) from onboarding.
const ROLES_FOR_PRIMARY: Record<string, string[]> = {
  parent: ["parent"],
  student: ["student"],
  educator: ["educator", "case_manager"],
  school_admin: ["school_admin"],
  partner: ["partner"],
};

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        primary_role: z.enum(PRIMARY_ROLES),
        first_name: z.string().trim().min(1).max(80),
        last_name: z.string().trim().max(80).optional().or(z.literal("")),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const full_name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          first_name: data.first_name,
          last_name: data.last_name || null,
          full_name,
          primary_role: data.primary_role,
          onboarding_completed: true,
        },
        { onConflict: "id" },
      );
    if (error) {
      console.error("completeOnboarding failed", error);
      throw new Error("Could not save your profile. Please try again.");
    }

    const mappedRoles = ROLES_FOR_PRIMARY[data.primary_role] ?? [];
    for (const role of mappedRoles) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: userId, role: role as never },
          { onConflict: "user_id,role" },
        );
      if (roleError) console.error("completeOnboarding: user_roles upsert failed", role, roleError);
    }
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: rolesData }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("primary_role").eq("id", userId).maybeSingle(),
    ]);
    const roles = (rolesData ?? []).map((r) => r.role as string);
    if (profile?.primary_role) roles.push(profile.primary_role);
    return { roles: Array.from(new Set(roles)) };
  });
