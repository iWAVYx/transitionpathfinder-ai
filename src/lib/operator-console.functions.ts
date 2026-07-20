/**
 * Operator Console — Educator / District / Partner org admin surface.
 *
 * Server functions for the single-console at `/admin/orgs`:
 *   - list admin orgs the caller manages
 *   - mint / revoke access codes (hash matches redeem_access_code RPC)
 *   - list / bulk-create / revoke org invitations
 *   - list org members + seat usage
 *   - platform-admin: license-request inbox
 *
 * RLS-first: every write is scoped to the caller through the same
 * `is_org_admin` / `is_platform_admin` policies used elsewhere. Server
 * functions do not bypass RLS — they act as the authenticated user.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -------------------------------------------------------------------------
// Shared types

export type AdminOrg = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  state: string | null;
  role_within_org: string;
};

export type OrgAccessCodeRow = {
  id: string;
  role: string;
  scope: string;
  capacity: number | null;
  uses: number;
  single_use: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type OrgInvitationRow = {
  id: string;
  email: string;
  invited_role: string;
  invitation_type: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export type OrgMemberRow = {
  id: string;
  user_id: string;
  role_within_org: string;
  status: string;
  membership_status: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

export type LicenseRequestRow = {
  id: string;
  org_type: string;
  org_name: string;
  contact_email: string;
  contact_name: string | null;
  contact_phone: string | null;
  seat_count: number | null;
  notes: string | null;
  status: "pending" | "in_review" | "approved" | "denied" | "withdrawn";
  reviewed_at: string | null;
  review_notes: string | null;
  approved_org_id: string | null;
  requester_user_id: string;
  created_at: string;
};

const ROLE_ENUM = z.enum([
  "parent",
  "student",
  "educator",
  "case_manager",
  "school_admin",
  "district_admin",
  "partner",
]);

// -------------------------------------------------------------------------
// Access-code hashing (must match public.redeem_access_code)
// Uses Web Crypto so this module stays safe to import from client bundles.

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Unambiguous alphabet — no 0/O/1/I/L.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateAccessCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `TF-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

// -------------------------------------------------------------------------
// Orgs the caller can administer

export const listAdminOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ orgs: AdminOrg[]; is_platform_admin: boolean }> => {
    const { supabase, userId } = context;

    const { data: platformFlag } = await supabase.rpc("is_platform_admin", {
      _user_id: userId,
    });
    const isPlatform = Boolean(platformFlag);

    if (isPlatform) {
      // Platform admin: return every org so they can pick any tenant.
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, type, city, state")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw new Error(error.message);
      return {
        is_platform_admin: true,
        orgs: (data ?? []).map((o) => ({
          ...(o as Omit<AdminOrg, "role_within_org">),
          role_within_org: "platform_admin",
        })),
      };
    }

    // Regular caller: only orgs where they are an org admin.
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(
        "role_within_org, organization:organizations(id, name, type, city, state)",
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", [
        "admin",
        "owner",
        "school_admin",
        "district_admin",
      ]);
    if (error) throw new Error(error.message);

    const orgs: AdminOrg[] = [];
    for (const row of data ?? []) {
      const o = (row as { organization: { id: string; name: string; type: string; city: string | null; state: string | null } | null }).organization;
      const roleWithin = (row as { role_within_org: string }).role_within_org;
      if (o) orgs.push({ ...o, role_within_org: roleWithin });
    }
    return { is_platform_admin: false, orgs };
  });

// -------------------------------------------------------------------------
// Access codes

export const listOrgAccessCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ org_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ codes: OrgAccessCodeRow[] }> => {
    const { data: rows, error } = await context.supabase
      .from("access_codes")
      .select("id, role, scope, capacity, uses, single_use, expires_at, revoked_at, created_at")
      .eq("org_id", data.org_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { codes: (rows ?? []) as OrgAccessCodeRow[] };
  });

export const mintOrgAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        org_id: z.string().uuid(),
        role: ROLE_ENUM,
        capacity: z.number().int().min(1).max(10000).optional(),
        single_use: z.boolean().default(false),
        expires_in_days: z.number().int().min(1).max(365).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const code = generateAccessCode();
    const code_hash = await sha256Hex(code);
    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: row, error } = await supabase
      .from("access_codes")
      .insert({
        org_id: data.org_id,
        role: data.role,
        scope: "org_member",
        capacity: data.capacity ?? null,
        single_use: data.single_use,
        expires_at,
        code_hash,
        created_by: userId,
      } as never)
      .select("id, role, scope, capacity, uses, single_use, expires_at, revoked_at, created_at")
      .single();
    if (error) {
      console.error("mintOrgAccessCode failed", error);
      throw new Error(error.message || "Could not mint access code.");
    }
    // Plaintext returned ONCE — the DB only stores the hash.
    return { code, row: row as OrgAccessCodeRow };
  });

export const revokeOrgAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("access_codes")
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------------------------------------------------------
// Org invitations

const INVITATION_COLS =
  "id,email,invited_role,invitation_type,status,created_at,expires_at,accepted_at,revoked_at";

export const listOrgInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ org_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ invitations: OrgInvitationRow[] }> => {
    const { data: rows, error } = await context.supabase
      .from("invitations")
      .select(INVITATION_COLS)
      .eq("organization_id", data.org_id)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return { invitations: (rows ?? []) as OrgInvitationRow[] };
  });

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const bulkCreateOrgInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        org_id: z.string().uuid(),
        invited_role: ROLE_ENUM,
        invitation_type: z.enum(["join_school", "join_district", "join_partner_org"]),
        emails: z.array(z.string().trim().email().max(255)).min(1).max(200),
        message: z.string().trim().max(2000).optional(),
        expires_in_days: z.number().int().min(1).max(60).default(14),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const expires_at = new Date(
      Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Dedupe (case-insensitive) so a single paste doesn't create duplicates.
    const seen = new Set<string>();
    const emails = data.emails
      .map((e) => e.toLowerCase())
      .filter((e) => (seen.has(e) ? false : (seen.add(e), true)));

    const rows = emails.map((email) => ({
      email,
      invited_role: data.invited_role,
      invitation_type: data.invitation_type,
      organization_id: data.org_id,
      invited_by_user_id: userId,
      status: "pending",
      token: randomToken(),
      expires_at,
      message: data.message ?? null,
    }));

    const { data: inserted, error } = await supabase
      .from("invitations")
      .insert(rows as never)
      .select(INVITATION_COLS);

    if (error) {
      console.error("bulkCreateOrgInvitations failed", error);
      throw new Error(error.message || "Could not create invitations.");
    }
    return {
      created: (inserted ?? []).length,
      skipped: data.emails.length - emails.length,
      invitations: (inserted ?? []) as OrgInvitationRow[],
    };
  });

export const revokeOrgInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------------------------------------------------------
// Members / seats

export const listOrgMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ org_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ members: OrgMemberRow[] }> => {
    const { data: rows, error } = await context.supabase
      .from("organization_memberships")
      .select(
        "id, user_id, role_within_org, status, membership_status, created_at, profile:profiles(full_name, email)",
      )
      .eq("organization_id", data.org_id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const members: OrgMemberRow[] = (rows ?? []).map((row) => {
      const r = row as {
        id: string;
        user_id: string;
        role_within_org: string;
        status: string;
        membership_status: string;
        created_at: string;
        profile: { full_name: string | null; email: string | null } | null;
      };
      return {
        id: r.id,
        user_id: r.user_id,
        role_within_org: r.role_within_org,
        status: r.status,
        membership_status: r.membership_status,
        created_at: r.created_at,
        full_name: r.profile?.full_name ?? null,
        email: r.profile?.email ?? null,
      };
    });
    return { members };
  });

// -------------------------------------------------------------------------
// License requests (platform admin inbox)

export const listLicenseRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ requests: LicenseRequestRow[] }> => {
    const { data, error } = await context.supabase
      .from("org_license_requests")
      .select(
        "id, org_type, org_name, contact_email, contact_name, contact_phone, seat_count, notes, status, reviewed_at, review_notes, approved_org_id, requester_user_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return { requests: (data ?? []) as LicenseRequestRow[] };
  });

export const updateLicenseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "in_review", "approved", "denied"]),
        review_notes: z.string().trim().max(2000).optional(),
        approved_org_id: z.string().uuid().optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("org_license_requests")
      .update({
        status: data.status,
        review_notes: data.review_notes ?? null,
        approved_org_id: data.approved_org_id ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
