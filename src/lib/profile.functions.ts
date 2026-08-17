import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Profile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  pronouns: string | null;
  title: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  time_zone: string;
  communication_preference: "email" | "in_app" | "both";
  profile_visibility: "team_only" | "org" | "private";
  primary_role: string | null;
  organization_id: string | null;
  onboarding_completed: boolean;
  language: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onboarding_answers: Record<string, any>;
};

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, preferred_name, pronouns, title, bio, phone, avatar_url, time_zone, communication_preference, profile_visibility, primary_role, organization_id, onboarding_completed, language, onboarding_answers")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("getProfile failed", error);
      throw new Error("Could not load profile.");
    }
    const base: Profile = {
      id: userId,
      full_name: null,
      first_name: null,
      last_name: null,
      preferred_name: null,
      pronouns: null,
      title: null,
      bio: null,
      phone: null,
      avatar_url: null,
      time_zone: "America/New_York",
      communication_preference: "email",
      profile_visibility: "team_only",
      primary_role: null,
      organization_id: null,
      onboarding_completed: false,
      language: "en",
      onboarding_answers: {},
    };
    if (!data) return base;
    return {
      ...base,
      ...data,
      onboarding_answers:
        (data.onboarding_answers as Record<string, unknown> | null) ?? {},
    } as Profile;
  });

export const updateProfileLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
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
  "district_admin",
  "partner",
] as const;

const ROLES_FOR_PRIMARY: Record<string, string[]> = {
  parent: ["parent"],
  student: ["student"],
  educator: ["educator", "case_manager"],
  school_admin: ["school_admin"],
  district_admin: ["district_admin"],
  partner: ["partner"],
};

// Recursive JSON schema for free-form onboarding answers.
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(2000),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(50),
    z.record(z.string().max(80), jsonValueSchema),
  ]),
);

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        primary_role: z.enum(PRIMARY_ROLES),
        first_name: z.string().trim().min(1).max(80),
        last_name: z.string().trim().max(80).optional().or(z.literal("")),
        onboarding_answers: z
          .record(z.string().max(80), jsonValueSchema)
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: activatedLicenseRole, error: licenseRoleError } =
      await supabase.rpc("my_activated_license_role");
    if (licenseRoleError) {
      console.error("completeOnboarding license-role check failed", licenseRoleError);
      throw new Error("Could not verify your activated license. Please try again.");
    }
    if (
      activatedLicenseRole &&
      activatedLicenseRole !== data.primary_role
    ) {
      throw new Error(
        `This account activated a ${activatedLicenseRole.replaceAll("_", " ")} license. Finish setup with that account type.`,
      );
    }
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
          ...(data.onboarding_answers
            ? { onboarding_answers: data.onboarding_answers as never }
            : {}),
        } as never,
        { onConflict: "id" },
      );
    if (error) {
      console.error("completeOnboarding failed", error);
      throw new Error("Could not save your profile. Please try again.");
    }

    const mappedRoles = ROLES_FOR_PRIMARY[data.primary_role] ?? [];
    // Replace any prior onboarding-assigned roles so switching roles mid-onboarding
    // doesn't leave stale entries (e.g. the legacy default 'parent' role). Admin
    // and platform roles live in admin_roles, not here, so they aren't touched.
    const replaceable = [
      "parent",
      "guardian",
      "student",
      "educator",
      "teacher",
      "case_manager",
      "school_admin",
      "district_admin",
      "partner",
    ];
    const { error: clearError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", replaceable as never);
    if (clearError) console.error("completeOnboarding: clear roles failed", clearError);
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

// Lightweight progress save so onboarding is resumable on refresh.
export const saveOnboardingProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        primary_role: z.enum(PRIMARY_ROLES).optional(),
        first_name: z.string().trim().max(80).optional(),
        last_name: z.string().trim().max(80).optional(),
        onboarding_answers: z
          .record(z.string().max(80), jsonValueSchema)
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { id: userId };
    if (data.primary_role !== undefined) patch.primary_role = data.primary_role;
    if (data.first_name !== undefined) patch.first_name = data.first_name || null;
    if (data.last_name !== undefined) patch.last_name = data.last_name || null;
    if (data.onboarding_answers !== undefined)
      patch.onboarding_answers = data.onboarding_answers;
    const { error } = await supabase
      .from("profiles")
      .upsert(patch as never, { onConflict: "id" });
    if (error) {
      console.error("saveOnboardingProgress failed", error);
      throw new Error("Could not save progress.");
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
