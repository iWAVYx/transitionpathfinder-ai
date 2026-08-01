/**
 * Sponsored-access and license-capacity server functions.
 *
 * Capacity is never computed in JavaScript. Every reserve / activate /
 * revoke / transfer goes through a `SECURITY DEFINER` Postgres function that
 * locks the organization's license pools first, so two administrators
 * inviting at the same instant cannot over-allocate.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseInviteCsv } from "@/lib/billing/billing.server";

export type LicenseType = "pathway" | "staff" | "admin";

export interface CapacityRow {
  license_type: LicenseType;
  purchased: number;
  reserved: number;
  active: number;
  available: number;
  utilization: number;
}

export interface AllocationRow {
  id: string;
  license_type: LicenseType;
  state: "reserved" | "active" | "revoked" | "expired" | "transferred";
  beneficiary_email: string | null;
  beneficiary_user_id: string | null;
  student_id: string | null;
  invitation_id: string | null;
  invitation_source: string | null;
  reserved_until: string | null;
  activated_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface PoolRow {
  id: string;
  license_type: LicenseType;
  source: string;
  plan_code: string | null;
  purchased: number;
  status: string;
  effective_from: string;
  effective_to: string | null;
}

export interface LicenseOverview {
  capacity: CapacityRow[];
  pools: PoolRow[];
  allocations: AllocationRow[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ROLE_TO_LICENSE: Record<string, LicenseType> = {
  student: "pathway",
  parent: "pathway",
  guardian: "pathway",
  educator: "staff",
  teacher: "staff",
  case_manager: "staff",
  counselor: "staff",
  school_admin: "admin",
  district_admin: "admin",
};

/** Purchased, reserved, active, and available capacity plus the ledger. */
export const getLicenseOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { organizationId: string }) => {
    if (!UUID_RE.test(data.organizationId)) throw new Error("Invalid organization");
    return data;
  })
  .handler(async ({ data, context }): Promise<LicenseOverview> => {
    const { supabase } = context;

    const [{ data: capacity }, { data: pools }, { data: allocations }] =
      await Promise.all([
        supabase.rpc("org_capacity_summary", { _org_id: data.organizationId }),
        supabase
          .from("license_pools")
          .select(
            "id, license_type, source, plan_code, purchased, status, effective_from, effective_to",
          )
          .eq("organization_id", data.organizationId)
          .order("effective_from", { ascending: false }),
        supabase
          .from("license_allocations")
          .select(
            "id, license_type, state, beneficiary_email, beneficiary_user_id, student_id, invitation_id, invitation_source, reserved_until, activated_at, revoked_at, created_at",
          )
          .eq("sponsor_organization_id", data.organizationId)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    return {
      capacity: (capacity ?? []) as unknown as CapacityRow[],
      pools: (pools ?? []) as unknown as PoolRow[],
      allocations: (allocations ?? []) as unknown as AllocationRow[],
    };
  });

type InviteResult =
  | { invitationId: string; allocationId: string }
  | { error: string };

/**
 * Invites one person against sponsored capacity. The reservation is taken
 * first — if capacity is exhausted the invitation is never created, so the
 * two can never drift apart.
 */
export const inviteSponsoredMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      organizationId: string;
      email: string;
      role: string;
      studentId?: string;
      message?: string;
    }) => {
      if (!UUID_RE.test(data.organizationId)) throw new Error("Invalid organization");
      if (!EMAIL_RE.test(data.email)) throw new Error("Enter a valid email address.");
      if (!ROLE_TO_LICENSE[data.role]) throw new Error("Unsupported role.");
      if (data.studentId && !UUID_RE.test(data.studentId)) {
        throw new Error("Invalid student");
      }
      if (data.message && data.message.length > 1000) {
        throw new Error("Message is too long.");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<InviteResult> => {
    const { supabase, userId } = context;
    const licenseType = ROLE_TO_LICENSE[data.role]!;

    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: userId,
      _org_id: data.organizationId,
    });
    if (!isAdmin) {
      return { error: "You do not manage licenses for this organization." };
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("type")
      .eq("id", data.organizationId)
      .maybeSingle();

    const invitationType =
      data.role === "student" || data.role === "parent" || data.role === "guardian"
        ? data.studentId
          ? "connect_to_student"
          : org?.type === "district"
            ? "join_district"
            : "join_school"
        : org?.type === "district"
          ? "join_district"
          : "join_school";

    // 1) Reserve capacity. Fails loudly when the pool is exhausted.
    const { data: allocationId, error: reserveError } = await supabase.rpc(
      "reserve_license_allocation",
      {
        _org_id: data.organizationId,
        _license_type: licenseType,
        _beneficiary_email: data.email.toLowerCase(),
        _beneficiary_user_id: undefined,
        _student_id: data.studentId ?? undefined,
        _invitation_id: undefined,
        _invitation_source: "admin_invite",
        _reserved_until: undefined,
      },
    );
    if (reserveError || !allocationId) {
      return {
        error:
          reserveError?.message ??
          "No capacity available for this license type.",
      };
    }

    // 2) Create the invitation and link it back to the reservation.
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .insert({
        email: data.email.toLowerCase(),
        invited_role: data.role,
        invited_by_user_id: userId,
        organization_id: data.organizationId,
        student_profile_id: data.studentId ?? null,
        invitation_type: invitationType,
        license_type: licenseType,
        message: data.message ?? null,
      })
      .select("id")
      .maybeSingle();

    if (inviteError || !invitation) {
      // Roll the reservation back so capacity is not stranded.
      await supabase.rpc("revoke_license_allocation", {
        _allocation_id: allocationId as string,
        _reason: "Invitation could not be created",
      });
      return { error: inviteError?.message ?? "Could not create the invitation." };
    }

    await supabase
      .from("license_allocations")
      .update({ invitation_id: invitation.id })
      .eq("id", allocationId as string);

    return { invitationId: invitation.id, allocationId: allocationId as string };
  });

/** Extends a pending invitation and its reservation by another 14 days. */
export const resendSponsoredInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invitationId: string }) => {
    if (!UUID_RE.test(data.invitationId)) throw new Error("Invalid invitation");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase } = context;
    const expires = new Date(Date.now() + 14 * 86_400_000).toISOString();

    const { error } = await supabase
      .from("invitations")
      .update({ expires_at: expires, status: "pending" })
      .eq("id", data.invitationId)
      .eq("status", "pending");
    if (error) return { error: error.message };

    await supabase
      .from("license_allocations")
      .update({ reserved_until: expires })
      .eq("invitation_id", data.invitationId)
      .eq("state", "reserved");

    return { ok: true };
  });

/** Cancels a pending invitation and immediately returns its capacity. */
export const cancelSponsoredInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invitationId: string }) => {
    if (!UUID_RE.test(data.invitationId)) throw new Error("Invalid invitation");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase } = context;

    const { data: alloc } = await supabase
      .from("license_allocations")
      .select("id")
      .eq("invitation_id", data.invitationId)
      .eq("state", "reserved")
      .maybeSingle();

    const { error } = await supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.invitationId);
    if (error) return { error: error.message };

    if (alloc?.id) {
      await supabase.rpc("revoke_license_allocation", {
        _allocation_id: alloc.id,
        _reason: "Invitation cancelled",
      });
    }
    return { ok: true };
  });

export interface BulkInviteResult {
  invited: number;
  skipped: { line: number; email: string; reason: string }[];
}

/**
 * Bulk invite from a validated CSV (`email,role,student_name`). Rows are
 * processed one at a time so a capacity ceiling stops the run cleanly
 * instead of half-allocating.
 */
export const bulkInviteSponsored = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { organizationId: string; csv: string }) => {
    if (!UUID_RE.test(data.organizationId)) throw new Error("Invalid organization");
    if (data.csv.length > 200_000) throw new Error("That file is too large.");
    return data;
  })
  .handler(
    async ({ data, context }): Promise<BulkInviteResult | { error: string }> => {
      const { supabase, userId } = context;

      const { data: isAdmin } = await supabase.rpc("is_org_admin", {
        _user_id: userId,
        _org_id: data.organizationId,
      });
      if (!isAdmin) {
        return { error: "You do not manage licenses for this organization." };
      }

      const parsed = parseInviteCsv(data.csv);
      const skipped: BulkInviteResult["skipped"] = parsed.errors.map((e) => ({
        line: e.lineNumber,
        email: "",
        reason: e.message,
      }));
      let invited = 0;

      const { data: org } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", data.organizationId)
        .maybeSingle();
      const invitationType =
        org?.type === "district" ? "join_district" : "join_school";

      for (const row of parsed.rows) {
        const { data: allocationId, error: reserveError } = await supabase.rpc(
          "reserve_license_allocation",
          {
            _org_id: data.organizationId,
            _license_type: row.licenseType,
            _beneficiary_email: row.email,
            _beneficiary_user_id: undefined,
            _student_id: undefined,
            _invitation_id: undefined,
            _invitation_source: "csv_bulk_invite",
            _reserved_until: undefined,
          },
        );
        if (reserveError || !allocationId) {
          skipped.push({
            line: row.lineNumber,
            email: row.email,
            reason: reserveError?.message ?? "No capacity available.",
          });
          continue;
        }

        const { data: invitation, error: inviteError } = await supabase
          .from("invitations")
          .insert({
            email: row.email,
            invited_role: row.role,
            invited_by_user_id: userId,
            organization_id: data.organizationId,
            invitation_type: invitationType,
            license_type: row.licenseType,
          })
          .select("id")
          .maybeSingle();

        if (inviteError || !invitation) {
          await supabase.rpc("revoke_license_allocation", {
            _allocation_id: allocationId as string,
            _reason: "Bulk invitation failed",
          });
          skipped.push({
            line: row.lineNumber,
            email: row.email,
            reason: inviteError?.message ?? "Invitation could not be created.",
          });
          continue;
        }

        await supabase
          .from("license_allocations")
          .update({ invitation_id: invitation.id })
          .eq("id", allocationId as string);
        invited += 1;
      }

      return { invited, skipped };
    },
  );

/** Revokes a live license; capacity returns to the pool immediately. */
export const revokeAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { allocationId: string; reason?: string }) => {
    if (!UUID_RE.test(data.allocationId)) throw new Error("Invalid allocation");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean } | { error: string }> => {
    const { data: ok, error } = await context.supabase.rpc(
      "revoke_license_allocation",
      { _allocation_id: data.allocationId, _reason: data.reason ?? undefined },
    );
    if (error) return { error: error.message };
    return { ok: ok === true };
  });

/** Reassigns a live license to a different person or student. */
export const transferAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { allocationId: string; toEmail?: string; toStudentId?: string }) => {
      if (!UUID_RE.test(data.allocationId)) throw new Error("Invalid allocation");
      if (data.toEmail && !EMAIL_RE.test(data.toEmail)) {
        throw new Error("Enter a valid email address.");
      }
      if (data.toStudentId && !UUID_RE.test(data.toStudentId)) {
        throw new Error("Invalid student");
      }
      if (!data.toEmail && !data.toStudentId) {
        throw new Error("Choose who the license moves to.");
      }
      return data;
    },
  )
  .handler(
    async ({ data, context }): Promise<{ allocationId: string } | { error: string }> => {
      const { data: newId, error } = await context.supabase.rpc(
        "transfer_license_allocation",
        {
          _allocation_id: data.allocationId,
          _to_email: data.toEmail?.toLowerCase() ?? undefined,
          _to_user_id: undefined,
          _to_student_id: data.toStudentId ?? undefined,
        },
      );
      if (error) return { error: error.message };
      return { allocationId: newId as string };
    },
  );

export interface SponsorshipInfo {
  sponsored: boolean;
  organizationName: string | null;
  licenseType: LicenseType | null;
  activatedAt: string | null;
  /** True when the user also pays personally for coverage they now get free. */
  duplicatePersonalSubscription: boolean;
  personalSubscriptionId: string | null;
}

/**
 * Tells a signed-in user whether their access is sponsored by an
 * organization, and flags a personal subscription that now duplicates it.
 */
export const getMySponsorship = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: "sandbox" | "live" }) => data)
  .handler(async ({ data, context }): Promise<SponsorshipInfo> => {
    const { supabase, userId } = context;

    const { data: alloc } = await supabase
      .from("license_allocations")
      .select("license_type, activated_at, sponsor_organization_id")
      .eq("beneficiary_user_id", userId)
      .eq("state", "active")
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!alloc) {
      return {
        sponsored: false,
        organizationName: null,
        licenseType: null,
        activatedAt: null,
        duplicatePersonalSubscription: false,
        personalSubscriptionId: null,
      };
    }

    const [{ data: org }, { data: personal }] = await Promise.all([
      supabase
        .from("organizations")
        .select("name")
        .eq("id", alloc.sponsor_organization_id!)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("id, status, cancel_at_period_end")
        .eq("user_id", userId)
        .is("organization_id", null)
        .eq("environment", data.environment)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      sponsored: true,
      organizationName: org?.name ?? null,
      licenseType: alloc.license_type as LicenseType,
      activatedAt: alloc.activated_at,
      duplicatePersonalSubscription: Boolean(
        personal && !personal.cancel_at_period_end,
      ),
      personalSubscriptionId: personal?.id ?? null,
    };
  });
