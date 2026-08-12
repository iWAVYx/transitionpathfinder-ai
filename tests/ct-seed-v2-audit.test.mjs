// CT Seed v2 Import Audit regression tests.
//
// Verifies two things end-to-end:
//   1. The CT_SEED_TAGS whitelist in src/lib/import-audit.functions.ts
//      includes every v2 tag used by the workforce/training/employer
//      expansion. Without this, v2 records do not surface in the audit UI.
//   2. Every partner_organizations row carrying `ct_seed_v2` has the
//      fields the Changes dialog renders populated correctly, so the
//      dialog produces a meaningful change list for each record.
//
// Run with: node --test tests/ct-seed-v2-audit.test.mjs
//
// The source-code whitelist test is safe to run without credentials.
// The live database audit requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// and is fail-closed only when REQUIRE_LIVE_CT_SEED_AUDIT=true.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REQUIRE_LIVE_AUDIT = process.env.REQUIRE_LIVE_CT_SEED_AUDIT === "true";

const REQUIRED_V2_TAGS = [
  "ct_seed_v2",
  "free_ct_training",
  "youth_employment",
  "adult_education",
  "workforce_boards",
  "manufacturing_trades",
  "disability_employment",
  "employer_pipeline",
];

// Mirror of src/routes/_authenticated/owner.import-audit.tsx::partnerChangedFields.
// Kept in sync intentionally; if the dialog logic changes, update this too.
function partnerChangedFields(p) {
  const out = [];
  if (p.operation === "created") {
    out.push({ field: "*", kind: "text_set", value: p.organization_name });
  }
  if (p.seed_tags_applied?.length) {
    out.push({ field: "collection_tags", kind: "tags_added", value: p.seed_tags_applied });
  }
  if (p.admin_notes) {
    out.push({ field: "admin_notes", kind: "text_set", value: p.admin_notes });
  }
  if (p.outreach_status && p.outreach_status !== "not_contacted") {
    out.push({ field: "outreach_status", kind: "status_set", value: p.outreach_status });
  }
  if (p.verification_status) {
    out.push({ field: "verification_status", kind: "status_set", value: p.verification_status });
  }
  if (p.partnership_status) {
    out.push({ field: "partnership_status", kind: "status_set", value: p.partnership_status });
  }
  return out;
}

test("CT_SEED_TAGS whitelist includes every v2 tag", () => {
  const src = readFileSync("src/lib/import-audit.functions.ts", "utf8");
  const match = src.match(/const CT_SEED_TAGS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  assert.ok(match, "CT_SEED_TAGS array not found in import-audit.functions.ts");
  const tags = Array.from(match[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  for (const t of REQUIRED_V2_TAGS) {
    assert.ok(tags.includes(t), `CT_SEED_TAGS missing required v2 tag: ${t}`);
  }
});

test("every v2 partner renders a complete Changes dialog", async (t) => {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    if (REQUIRE_LIVE_AUDIT) {
      assert.fail(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured when REQUIRE_LIVE_CT_SEED_AUDIT=true",
      );
    }
    t.skip("live CT seed audit credentials not configured");
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("partner_organizations")
    .select(
      "id, organization_name, collection_tags, admin_notes, outreach_status, verification_status, partnership_status, created_at, updated_at",
    )
    .contains("collection_tags", ["ct_seed_v2"]);

  assert.ok(!error, `query failed: ${error?.message}`);
  assert.ok(data && data.length > 0, "no ct_seed_v2 partners found");

  let outreachNeeded = 0;
  for (const p of data) {
    const label = p.organization_name;

    // Tag membership — required for the audit UI to surface the record.
    assert.ok(
      Array.isArray(p.collection_tags) && p.collection_tags.includes("ct_seed_v2"),
      `${label}: missing ct_seed_v2 in collection_tags`,
    );

    // Dialog-rendered fields.
    assert.ok(p.admin_notes && p.admin_notes.length > 0, `${label}: admin_notes empty`);
    assert.ok(p.verification_status, `${label}: verification_status null`);
    assert.ok(p.outreach_status, `${label}: outreach_status null`);

    // Outreach must be either the new-record default or a preserved prior
    // status from an update (anything other than not_contacted/null).
    assert.notEqual(
      p.outreach_status,
      "not_contacted",
      `${label}: outreach_status should have been promoted by the seed import`,
    );
    if (p.outreach_status === "outreach_needed") outreachNeeded += 1;

    // Reconstruct dialog rows; must include collection_tags, admin_notes,
    // outreach_status, and verification_status.
    const seedTagsApplied = p.collection_tags.filter((tag) => REQUIRED_V2_TAGS.includes(tag));
    const changes = partnerChangedFields({
      ...p,
      operation: "updated",
      seed_tags_applied: seedTagsApplied,
    });
    const fields = new Set(changes.map((c) => c.field));
    for (const required of [
      "collection_tags",
      "admin_notes",
      "outreach_status",
      "verification_status",
    ]) {
      assert.ok(fields.has(required), `${label}: Changes dialog missing row for ${required}`);
    }
  }

  // Sanity: the bulk of v2 records are net-new and should be outreach_needed.
  assert.ok(
    outreachNeeded >= Math.floor(data.length * 0.7),
    `expected >=70% outreach_needed, got ${outreachNeeded}/${data.length}`,
  );
});
