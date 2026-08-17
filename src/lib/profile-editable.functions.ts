import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Editable common profile fields.
// Protected fields NEVER included here: primary_role, organization_id,
// account_status, is_demo, selected_plan, email, id.
const EditableProfileInput = z.object({
  first_name: z.string().trim().min(1).max(80).optional(),
  last_name: z.string().trim().max(80).nullable().optional(),
  preferred_name: z.string().trim().max(80).nullable().optional(),
  pronouns: z.string().trim().max(40).nullable().optional(),
  time_zone: z.string().min(2).max(64).optional(),
  communication_preference: z.enum(["email", "in_app", "both"]).optional(),
  profile_visibility: z.enum(["team_only", "org", "private"]).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  title: z.string().trim().max(120).nullable().optional(),
  avatar_url: z.string().url().max(2000).nullable().optional(),
  phone: z
    .string()
    .trim()
    .max(32)
    .regex(/^\+?[0-9 ().-]{7,32}$/)
    .nullable()
    .optional(),
});

export type EditableProfilePatch = z.infer<typeof EditableProfileInput>;

// Explicit deny-list so a rogue caller passing extra keys via `as any` is caught.
const PROTECTED_FIELDS = new Set([
  "id",
  "primary_role",
  "organization_id",
  "account_status",
  "is_demo",
  "selected_plan",
  "email",
  "onboarding_completed",
  "onboarding_answers",
]);

export const updateEditableProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => EditableProfileInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Server-side allow-list — reject any key that slipped past the schema.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (PROTECTED_FIELDS.has(key)) continue;
      patch[key] = value;
    }
    if ("first_name" in patch || "last_name" in patch) {
      // Keep full_name in sync when the name pieces change.
      const { data: existing } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      const first = (patch.first_name ?? existing?.first_name ?? "") as string;
      const last = (patch.last_name ?? existing?.last_name ?? "") as string;
      const full = [first, last].filter(Boolean).join(" ").trim();
      if (full) patch.full_name = full;
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", userId);
    if (error) {
      console.error("updateEditableProfile failed", error);
      throw new Error("Could not save profile.");
    }

    const { recordSecurityEvent } = await import("@/lib/security/audit.server");
    await recordSecurityEvent(userId, "profile_field_change", {
      fields: Object.keys(patch),
    });
    if ("avatar_url" in patch) {
      await recordSecurityEvent(userId, "avatar_change", {});
    }
    return { ok: true };
  });

// Email change kicks off Supabase's reverification flow.
export const requestEmailChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ new_email: z.string().trim().email().max(254) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.auth.updateUser({ email: data.new_email });
    if (error) {
      console.error("requestEmailChange failed", error);
      throw new Error(error.message || "Could not request email change.");
    }
    const { recordSecurityEvent } = await import("@/lib/security/audit.server");
    await recordSecurityEvent(userId, "email_change_requested", {
      to: data.new_email,
    });
    return { ok: true };
  });
