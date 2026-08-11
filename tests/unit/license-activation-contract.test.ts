import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migration = source(
  "supabase/migrations/20260811181552_student_self_ownership_and_invitation_linking.sql",
);
const settings = source("src/routes/_authenticated/settings.tsx");
const activationPanel = source(
  "src/components/settings/LicenseActivationPanel.tsx",
);
const operatorFunctions = source("src/lib/operator-console.functions.ts");
const operatorConsole = source("src/routes/_authenticated/admin.orgs.tsx");
const onboarding = source("src/routes/_authenticated/onboarding.tsx");
const profileFunctions = source("src/lib/profile.functions.ts");
const studentFunctions = source("src/lib/students.functions.ts");

describe("school and district license activation contract", () => {
  it("reserves real capacity when an administrator issues a code", () => {
    expect(migration).toContain(
      "FUNCTION public.issue_license_access_code(",
    );
    expect(migration).toContain("FROM generate_series(1, _capacity)");
    expect(migration).toContain("access_code_id = v_row.id");
    expect(migration).toContain("Concurrent code creation therefore serializes here");
  });

  it("supports district-managed school targets without widening org access", () => {
    expect(migration).toContain(
      "v_issuer_type = 'district' AND v_target_parent = _org_id",
    );
    expect(migration).toContain(
      "COALESCE(v_row.target_organization_id, v_row.org_id)",
    );
    expect(migration).toContain("The selected school is not managed by this district");
  });

  it("rejects account-role mismatches before consuming a code", () => {
    const mismatch = migration.indexOf("'reason', 'role_mismatch'");
    const redemption = migration.indexOf(
      "INSERT INTO public.access_code_redemptions (code_id, user_id)",
      mismatch,
    );
    expect(mismatch).toBeGreaterThan(0);
    expect(redemption).toBeGreaterThan(mismatch);
    expect(activationPanel).toContain("different account type");
    expect(migration).toContain("FUNCTION public.my_activated_license_role()");
    expect(onboarding).toContain("assigned account type cannot be changed here");
    expect(profileFunctions).toContain(
      "activatedLicenseRole !== data.primary_role",
    );
  });

  it("releases only unclaimed seats when a code is revoked", () => {
    expect(migration).toContain(
      "FUNCTION public.revoke_license_access_code(",
    );
    expect(migration).toContain("AND state = 'reserved'");
    expect(migration).toContain("AND beneficiary_user_id IS NULL");
    expect(operatorConsole).toContain(
      "Accounts that already activated it will keep their current access.",
    );
    expect(operatorConsole).toContain("Revoke License Code?");
    expect(operatorConsole).toContain("Seats Returned");
    expect(operatorConsole).not.toContain("!confirm(");
  });

  it("adds irreversible-action safeguards for administrator codes", () => {
    expect(migration).toContain(
      "Administrator activation codes must be single-use and reserve exactly one seat",
    );
    expect(migration).toContain(
      "Administrator activation codes must expire within 7 days",
    );
    expect(operatorConsole).toContain("Confirm Seat Reservation");
    expect(operatorConsole).toContain("Seats Reserved Now");
    expect(operatorConsole).toContain("isAdminCodeRole");
    expect(operatorConsole).toContain("Required: One Administrator Only");
  });

  it("prevents browser clients from creating unreserved codes directly", () => {
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.access_codes FROM authenticated",
    );
    expect(operatorFunctions).toContain('"issue_license_access_code"');
    expect(operatorFunctions).toContain('"revoke_license_access_code"');
  });

  it("places activation in settings and exposes live seat management", () => {
    expect(settings).toContain("<LicenseActivationPanel");
    expect(activationPanel).toContain("Activate License");
    expect(operatorConsole).toContain("Seats To Reserve");
    expect(operatorConsole).toContain("Account Organization");
    expect(operatorConsole).toContain("Create And Reserve");
  });

  it("carries the licensed organization into newly created student records", () => {
    expect(migration).toContain("v_profile.organization_id");
    expect(studentFunctions).toContain(
      "organization_id: profile?.organization_id ?? null",
    );
  });
});
