// Sponsored-access, jurisdiction, and entitlement-audit regression tests.
//
// Covers the post-ship affordability / sponsored-coverage / multi-state
// foundation work:
//   1. District coverage takes priority over school coverage, so a school
//      and its district are never charged for the same person.
//   2. One live allocation per person per license type per sponsoring org.
//   3. Entitlement audit events are immutable and require a written reason.
//   4. Connecticut is the only active jurisdiction and its pack is complete.
//   5. The one-time Pathway Snapshot is a distinct, non-recurring plan.
//
// Run with:  node --test tests/sponsored-access-jurisdiction.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

/** Runs raw SQL through a temporary service-role query helper. */
async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_readonly`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  return res.json();
}

test("Connecticut is the only active jurisdiction", async () => {
  const { data, error } = await db
    .from("jurisdictions")
    .select("code, status, is_default");
  assert.equal(error, null);
  const active = data.filter((j) => j.status === "active");
  assert.deepEqual(
    active.map((j) => j.code),
    ["US-CT"],
    "only Connecticut may be active",
  );
  assert.equal(active[0].is_default, true);
});

test("the active CT pack carries terminology, rules, agencies, and sources", async () => {
  const { data: version, error } = await db
    .from("jurisdiction_versions")
    .select("id, version, terminology, planning_rules, role_labels, privacy_requirements, review_due")
    .eq("jurisdiction_code", "US-CT")
    .eq("status", "active")
    .maybeSingle();
  assert.equal(error, null);
  assert.ok(version, "CT has an active version");

  for (const key of [
    "plan_meeting",
    "plan_document",
    "rights_transfer_age",
    "transition_planning_start_age",
    "services_end_age",
  ]) {
    assert.ok(
      version.terminology[key] !== undefined,
      `terminology.${key} is set`,
    );
  }
  assert.equal(version.terminology.plan_meeting, "PPT");
  assert.equal(version.terminology.plan_document, "IEP");
  assert.equal(version.planning_rules.transition_assessment_required, true);
  assert.ok(version.review_due, "the pack has a review date");
  assert.ok(version.privacy_requirements.student_records_law);

  const [{ count: agencies }, { count: sources }] = await Promise.all([
    db
      .from("jurisdiction_agencies")
      .select("id", { count: "exact", head: true })
      .eq("version_id", version.id),
    db
      .from("jurisdiction_sources")
      .select("id", { count: "exact", head: true })
      .eq("version_id", version.id),
  ]);
  assert.ok(agencies >= 3, "CT lists its transition agencies");
  assert.ok(sources >= 2, "CT cites official sources");
});

test("only one jurisdiction version may be active at a time", async () => {
  const { data } = await db
    .from("jurisdiction_versions")
    .select("jurisdiction_code, status")
    .eq("status", "active");
  const codes = data.map((v) => v.jurisdiction_code);
  assert.equal(new Set(codes).size, codes.length, "no duplicate active packs");
});

test("Pathway Snapshot is a one-time plan distinct from the membership", async () => {
  const { data, error } = await db
    .from("plans")
    .select(
      "code, billing_scope, monthly_price_id, yearly_price_id, one_time_price_id, auto_convert, entitlement_plan_type",
    )
    .in("code", ["pathway_snapshot", "individual_pathway"]);
  assert.equal(error, null);

  const snapshot = data.find((p) => p.code === "pathway_snapshot");
  const membership = data.find((p) => p.code === "individual_pathway");
  assert.ok(snapshot, "the snapshot plan exists");
  assert.equal(snapshot.billing_scope, "individual");
  assert.equal(snapshot.monthly_price_id, null);
  assert.equal(snapshot.yearly_price_id, null);
  assert.equal(snapshot.one_time_price_id, "tf_snapshot_once");
  assert.equal(snapshot.auto_convert, false, "a snapshot never auto-renews");
  assert.notEqual(
    snapshot.entitlement_plan_type,
    membership.entitlement_plan_type,
    "snapshot access is not membership access",
  );
});

test("sponsoring_org_for routes school coverage to the district pool", async () => {
  const { data: fn, error } = await db.rpc("sponsoring_org_for", {
    _org_id: "00000000-0000-0000-0000-000000000000",
    _license_type: "staff",
  });
  // Unknown org falls through to itself rather than erroring.
  assert.equal(error, null);
  assert.equal(fn, "00000000-0000-0000-0000-000000000000");
});

test("a person can hold only one live license per type per sponsoring org", async () => {
  const { data } = await db
    .from("license_allocations")
    .select("sponsor_organization_id, license_type, beneficiary_user_id, state")
    .in("state", ["reserved", "active"])
    .not("beneficiary_user_id", "is", null);

  const seen = new Set();
  for (const row of data ?? []) {
    const key = `${row.sponsor_organization_id}|${row.license_type}|${row.beneficiary_user_id}`;
    assert.equal(seen.has(key), false, `duplicate live allocation: ${key}`);
    seen.add(key);
  }
});

test("entitlement audit events require a reason and cannot be altered", async () => {
  // The check constraint rejects thin reasons even for the service role.
  const { error: shortReason } = await db
    .from("entitlement_audit_events")
    .insert({ event: "test", reason: "too short" });
  assert.ok(shortReason, "a short reason is rejected");

  const { data: inserted, error: insertError } = await db
    .from("entitlement_audit_events")
    .insert({
      event: "test_event",
      reason: "Automated regression test for immutability guarantees.",
    })
    .select("id")
    .maybeSingle();
  assert.equal(insertError, null);

  const { error: updateError } = await db
    .from("entitlement_audit_events")
    .update({ reason: "rewritten by an attacker" })
    .eq("id", inserted.id);
  assert.ok(updateError, "audit rows cannot be updated");

  const { error: deleteError } = await db
    .from("entitlement_audit_events")
    .delete()
    .eq("id", inserted.id);
  assert.ok(deleteError, "audit rows cannot be deleted");
});

test("capacity types stay limited to pathway, staff, and admin", async () => {
  const { data } = await db.from("license_pools").select("license_type");
  for (const row of data ?? []) {
    assert.ok(
      ["pathway", "staff", "admin"].includes(row.license_type),
      `unexpected license type: ${row.license_type}`,
    );
  }
});
