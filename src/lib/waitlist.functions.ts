import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Public waitlist endpoint.
 *
 * Waitlist is an **access-routing layer**, not a sign-up form. Anyone who
 * already has a valid access path (invitation, active org membership,
 * approved pilot, approved partner) signs up through /login instead.
 *
 * Server-side responsibilities here:
 *  - Validate every field with Zod (no client-supplied routing category —
 *    the routing category is derived from role + flags).
 *  - Reject any attempt to self-identify as a platform admin role. Platform
 *    admins are created internally via invitations only.
 *  - Require consent_to_contact = true.
 *  - Insert via the anon publishable client so the row is gated by the
 *    waitlist RLS INSERT policy (defense in depth).
 */

const INTEREST_TYPES = [
  "family_early_access",
  "educator_access",
  "school_pilot",
  "district_pilot",
  "partner_interest",
  "demo_request",
] as const;

export const WAITLIST_ROUTING_CATEGORIES = [
  "family_early_access",
  "educator_demo",
  "school_pilot",
  "district_pilot",
  "partner_review",
  "future_updates",
  "needs_review",
] as const;
export type WaitlistRoutingCategory = (typeof WAITLIST_ROUTING_CATEGORIES)[number];

const PUBLIC_ROLES = [
  "family",
  "parent",
  "student",
  "educator",
  "case_manager",
  "administrator",
  "school_admin",
  "district",
  "district_admin",
  "partner",
  "other",
] as const;

// Anything that maps to an internal platform admin role is rejected outright.
const FORBIDDEN_ROLE_PATTERNS = [
  "admin",
  "platform_admin",
  "platform_owner",
  "owner",
];

const WaitlistSchema = z.object({
  email: z.string().trim().email().max(255).transform((s) => s.toLowerCase()),
  full_name: z.string().trim().min(1).max(200),
  role: z.enum(PUBLIC_ROLES),

  // Shared context
  state: z.string().trim().max(100).optional().or(z.literal("")),
  student_grade_band: z
    .enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable"])
    .optional()
    .or(z.literal("")),
  reason: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.string().trim().max(100).optional().or(z.literal("")),

  // Organization context
  interest_type: z.enum(INTEREST_TYPES).optional(),
  organization_name: z.string().trim().max(200).optional().or(z.literal("")),
  organization_type: z.string().trim().max(100).optional().or(z.literal("")),
  district_name: z.string().trim().max(200).optional().or(z.literal("")),
  school_name: z.string().trim().max(200).optional().or(z.literal("")),
  intended_use: z.string().trim().max(2000).optional().or(z.literal("")),

  // New routing fields
  urgency: z.enum(["exploring", "this_quarter", "this_year", "asap"]).optional(),
  timeline: z.string().trim().max(200).optional().or(z.literal("")),
  wants_demo: z.boolean().optional().default(false),
  connected_to_student: z.boolean().optional(),
  referral_source: z.string().trim().max(200).optional().or(z.literal("")),

  // Role-specific quantitative fields
  caseload_size: z.number().int().min(0).max(100000).optional(),
  estimated_student_count: z.number().int().min(0).max(10000000).optional(),
  estimated_school_count: z.number().int().min(0).max(100000).optional(),

  // Partner-specific
  service_area: z.string().trim().max(500).optional().or(z.literal("")),
  populations_supported: z.string().trim().max(1000).optional().or(z.literal("")),
  services_offered: z.string().trim().max(2000).optional().or(z.literal("")),

  // Consent — REQUIRED to submit (matches RLS INSERT policy).
  consent_to_contact: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to join the waitlist." }),
  }),
});

export type WaitlistInput = z.infer<typeof WaitlistSchema>;

/**
 * Derive the routing category from role + signals. Never trust a
 * client-supplied value — admins triage by this enum.
 */
export function deriveWaitlistRouting(
  input: Pick<
    WaitlistInput,
    | "role"
    | "wants_demo"
    | "connected_to_student"
    | "district_name"
    | "school_name"
    | "organization_name"
  >,
): { routing_category: WaitlistRoutingCategory; status: string } {
  switch (input.role) {
    case "student":
    case "family":
    case "parent":
      return { routing_category: "family_early_access", status: "routed_family_early_access" };
    case "educator":
    case "case_manager":
      return { routing_category: "educator_demo", status: "routed_educator_demo" };
    case "administrator":
    case "school_admin":
      return { routing_category: "school_pilot", status: "routed_school_pilot" };
    case "district":
    case "district_admin":
      return { routing_category: "district_pilot", status: "routed_district_pilot" };
    case "partner":
      return { routing_category: "partner_review", status: "routed_partner_review" };
    case "other":
    default:
      return { routing_category: "needs_review", status: "needs_review" };
  }
}

export const submitWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => WaitlistSchema.parse(input))
  .handler(async ({ data }) => {
    // Belt-and-suspenders: reject any role string that maps to a platform
    // admin audience, even if it slips past the enum.
    const roleLower = String(data.role || "").toLowerCase();
    if (FORBIDDEN_ROLE_PATTERNS.includes(roleLower)) {
      throw new Error("Platform admin accounts are created internally only.");
    }

    const { routing_category, status } = deriveWaitlistRouting(data);

    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await anonClient.from("waitlist").insert({
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      state: data.state || null,
      student_grade_band: data.student_grade_band || null,
      reason: data.reason || null,
      source: data.source || "marketing-site",
      interest_type: data.interest_type || null,
      organization_name: data.organization_name || null,
      organization_type: data.organization_type || null,
      district_name: data.district_name || null,
      school_name: data.school_name || null,
      intended_use: data.intended_use || null,
      urgency: data.urgency || null,
      timeline: data.timeline || null,
      wants_demo: data.wants_demo ?? false,
      connected_to_student: data.connected_to_student ?? null,
      referral_source: data.referral_source || null,
      caseload_size: data.caseload_size ?? null,
      estimated_student_count: data.estimated_student_count ?? null,
      estimated_school_count: data.estimated_school_count ?? null,
      service_area: data.service_area || null,
      populations_supported: data.populations_supported || null,
      services_offered: data.services_offered || null,
      consent_to_contact: true,
      routing_category,
      status,
    });

    if (error) {
      // Duplicate active submission — waitlist_active_email_uidx. Treat as
      // idempotent success so the user sees the same confirmation state and
      // we don't leak whether the address was previously submitted.
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        return { ok: true, routing_category, status, deduped: true };
      }
      console.error("waitlist insert failed", error);
      throw new Error("Could not save your submission. Please try again.");
    }

    return { ok: true, routing_category, status, deduped: false };
  });

