/**
 * Sponsored-access and license-capacity server functions.
 *
 * Capacity is never computed in JavaScript. Every reserve / activate /
 * revoke / transfer goes through a `SECURITY DEFINER` Postgres function that
 * locks the organization's license pools first, so two administrators
 * inviting at the same instant cannot over-allocate.
 */
import { createServerFn } from "@tanstack/react-start";
import { assertRequestedStripeEnv } from "@/lib/billing/stripe-env";
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
      if (data.role === "parent" || data.role === "guardian") {
        throw new Error(
          "Invite family members from the student's plan. They share the student's pathway license and do not use another seat.",
        );
      }
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

    if (org?.type === "partner" || org?.type === "partner_organization") {
      return { error: "Partner organizations do not allocate student or staff licenses." };
    }
    if (org?.type === "school" && data.role === "district_admin") {
      return { error: "District administrator seats must be issued by a district." };
    }

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
        if (org?.type === "partner" || org?.type === "partner_organization") {
          skipped.push({
            line: row.lineNumber,
            email: row.email,
            reason: "Partner organizations do not allocate student or staff licenses.",
          });
          continue;
        }
        if (org?.type === "school" && row.role === "district_admin") {
          skipped.push({
            line: row.lineNumber,
            email: row.email,
            reason: "District administrator seats must be issued by a district.",
          });
          continue;
        }
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

/**
 * Revokes a live license; capacity returns to the pool immediately.
 * A written reason is required and is kept in the immutable entitlement
 * audit trail alongside the before/after state.
 */
export const revokeAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { allocationId: string; reason: string }) => {
    if (!UUID_RE.test(data.allocationId)) throw new Error("Invalid allocation");
    const reason = (data.reason ?? "").trim();
    if (reason.length < 10) {
      throw new Error("Give a reason of at least 10 characters for this change.");
    }
    return { allocationId: data.allocationId, reason };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean } | { error: string }> => {
    const { supabase } = context;

    const { data: before } = await supabase
      .from("license_allocations")
      .select(
        "id, license_type, state, beneficiary_email, beneficiary_user_id, sponsor_organization_id, pool_id",
      )
      .eq("id", data.allocationId)
      .maybeSingle();

    const { data: ok, error } = await supabase.rpc("revoke_license_allocation", {
      _allocation_id: data.allocationId,
      _reason: data.reason,
    });
    if (error) return { error: error.message };

    if (before) {
      await supabase.rpc("record_entitlement_audit", {
        _event: "license_revoked",
        _reason: data.reason,
        _organization_id: before.sponsor_organization_id ?? undefined,
        _subject_user_id: before.beneficiary_user_id ?? undefined,
        _license_type: before.license_type,
        _allocation_id: before.id,
        _pool_id: before.pool_id ?? undefined,
        _before: before,
        _after: { state: "revoked" },
      });
    }

    return { ok: ok === true };
  });

/** Reassigns a live license to a different person or student. */
export const transferAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      allocationId: string;
      toEmail?: string;
      toStudentId?: string;
      reason: string;
    }) => {
      if (!UUID_RE.test(data.allocationId)) throw new Error("Invalid allocation");
      if ((data.reason ?? "").trim().length < 10) {
        throw new Error("Give a reason of at least 10 characters for this change.");
      }
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
      const { supabase } = context;
      const { data: before } = await supabase
        .from("license_allocations")
        .select(
          "id, license_type, state, beneficiary_email, beneficiary_user_id, student_id, sponsor_organization_id, pool_id",
        )
        .eq("id", data.allocationId)
        .maybeSingle();

      const { data: newId, error } = await supabase.rpc(
        "transfer_license_allocation",
        {
          _allocation_id: data.allocationId,
          _to_email: data.toEmail?.toLowerCase() ?? undefined,
          _to_user_id: undefined,
          _to_student_id: data.toStudentId ?? undefined,
        },
      );
      if (error) return { error: error.message };

      if (before) {
        await supabase.rpc("record_entitlement_audit", {
          _event: "license_transferred",
          _reason: data.reason.trim(),
          _organization_id: before.sponsor_organization_id ?? undefined,
          _subject_user_id: before.beneficiary_user_id ?? undefined,
          _license_type: before.license_type,
          _allocation_id: before.id,
          _pool_id: before.pool_id ?? undefined,
          _before: before,
          _after: {
            allocation_id: newId,
            to_email: data.toEmail?.toLowerCase() ?? null,
            to_student_id: data.toStudentId ?? null,
          },
        });
      }

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
  .inputValidator((data: { environment?: "sandbox" | "live" }) => ({
    ...data,
    environment: assertRequestedStripeEnv(data.environment),
  }))
  .handler(async ({ data, context }): Promise<SponsorshipInfo> => {
    const { supabase, userId } = context;

    const { data: sponsorshipRows, error: sponsorshipError } = await supabase.rpc(
      "my_sponsored_access" as never,
    );
    if (sponsorshipError) {
      console.error("getMySponsorship failed", sponsorshipError);
    }
    const alloc = (
      Array.isArray(sponsorshipRows) ? sponsorshipRows[0] : sponsorshipRows
    ) as
      | {
          license_type: LicenseType;
          activated_at: string | null;
          sponsor_organization_id: string;
        }
      | null
      | undefined;

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

/* ---------- student coverage continuity ---------- */

export type CoverageState = "active" | "graduated" | "transferred" | "archived";

export interface CoverageStateResult {
  coverageState: CoverageState;
  exportWindowEndsAt: string | null;
  releasedAllocations: number;
}

/**
 * Moves a student between coverage states. Graduation and archival release
 * the sponsored pathway license back to the school or district and open a
 * time-boxed export window; a transfer re-points the student at the
 * receiving school without disturbing their records. Every change requires
 * a written reason and lands in the immutable entitlement audit trail.
 */
export const setStudentCoverageState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      studentId: string;
      state: CoverageState;
      reason: string;
      exportWindowDays?: number;
      toOrganizationId?: string;
    }) => {
      if (!UUID_RE.test(data.studentId)) throw new Error("Invalid student");
      const states: CoverageState[] = [
        "active",
        "graduated",
        "transferred",
        "archived",
      ];
      if (!states.includes(data.state)) throw new Error("Invalid coverage state");
      const reason = (data.reason ?? "").trim();
      if (reason.length < 10) {
        throw new Error("Give a reason of at least 10 characters for this change.");
      }
      if (data.toOrganizationId && !UUID_RE.test(data.toOrganizationId)) {
        throw new Error("Invalid receiving organization");
      }
      if (data.state === "transferred" && !data.toOrganizationId) {
        throw new Error("Choose the school the student is transferring to.");
      }
      const days = data.exportWindowDays ?? 180;
      if (!Number.isFinite(days) || days < 30 || days > 730) {
        throw new Error("Export window must be between 30 and 730 days.");
      }
      return { ...data, reason, exportWindowDays: Math.round(days) };
    },
  )
  .handler(
    async ({ data, context }): Promise<CoverageStateResult | { error: string }> => {
      const { supabase } = context;
      const { data: rows, error } = await supabase.rpc(
        "set_student_coverage_state",
        {
          _student_id: data.studentId,
          _state: data.state,
          _reason: data.reason,
          _export_window_days: data.exportWindowDays,
          _to_organization_id: data.toOrganizationId ?? undefined,
        },
      );
      if (error) return { error: error.message };

      const row = Array.isArray(rows) ? rows[0] : rows;
      return {
        coverageState: (row?.coverage_state ?? data.state) as CoverageState,
        exportWindowEndsAt: (row?.export_window_ends_at as string | null) ?? null,
        releasedAllocations: (row?.released_allocations as number | null) ?? 0,
      };
    },
  );
