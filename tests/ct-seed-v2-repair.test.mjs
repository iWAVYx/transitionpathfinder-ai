import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUDIT_NOTE_PREFIX,
  CANONICAL_SEED_ROWS,
  REQUIRED_V2_TAGS,
  STAGING_PROJECT_REF,
  assertAuditRows,
  assertStagingTarget,
  buildRepairPatch,
  indexCanonicalRows,
  repairCtSeedV2Staging,
} from "../scripts/repair-ct-seed-v2-staging.mjs";

test("repair target accepts only the exact isolated staging host", () => {
  assert.equal(
    assertStagingTarget(`https://${STAGING_PROJECT_REF}.supabase.co`),
    `https://${STAGING_PROJECT_REF}.supabase.co`,
  );
  assert.throws(() => assertStagingTarget("https://example.supabase.co"), /Refusing/);
  assert.throws(() => assertStagingTarget(`http://${STAGING_PROJECT_REF}.supabase.co`), /Refusing/);
  assert.throws(
    () => assertStagingTarget(`https://${STAGING_PROJECT_REF}.supabase.co.evil.example`),
    /Refusing/,
  );
});

test("canonical repair set covers every CT Seed v2 tag", () => {
  const tags = new Set([
    "ct_seed_v2",
    ...CANONICAL_SEED_ROWS.flatMap((definition) => definition.tags),
  ]);
  for (const tag of REQUIRED_V2_TAGS) assert.ok(tags.has(tag), `missing tag ${tag}`);

  const outreachCount = CANONICAL_SEED_ROWS.filter(
    (row) => row.baselineOutreachStatus === "outreach_needed",
  ).length;
  assert.ok(outreachCount >= Math.floor(CANONICAL_SEED_ROWS.length * 0.7));
});

test("every repair row is present in the canonical checked-in seed migration", () => {
  const migration = readFileSync(
    "supabase/migrations/20260607034341_e8e2f35c-ecfe-495c-844f-ef493489e9f7.sql",
    "utf8",
  );
  for (const definition of CANONICAL_SEED_ROWS) {
    assert.ok(
      migration.includes(`('${definition.organizationName.replaceAll("'", "''")}'`),
      `canonical migration missing ${definition.organizationName}`,
    );
  }
});

test("repair patch is idempotent and preserves outreach progress", () => {
  const definition = CANONICAL_SEED_ROWS[2];
  const existing = {
    collection_tags: ["existing_tag", "ct_seed_v2"],
    admin_notes: "Existing operator note",
    outreach_status: "contacted",
  };
  const first = buildRepairPatch(existing, definition);
  const second = buildRepairPatch(first, definition);

  assert.deepEqual(second, first);
  assert.equal(first.outreach_status, "contacted");
  assert.ok(first.admin_notes.startsWith("Existing operator note"));
  assert.ok(first.admin_notes.includes(AUDIT_NOTE_PREFIX));
  assert.equal(first.collection_tags.filter((tag) => tag === "ct_seed_v2").length, 1);
});

test("repair patch promotes only the default outreach state", () => {
  const patch = buildRepairPatch(
    { collection_tags: [], admin_notes: null, outreach_status: "not_contacted" },
    CANONICAL_SEED_ROWS[0],
  );
  assert.equal(patch.outreach_status, "outreach_needed");
  assert.ok(patch.admin_notes.startsWith(AUDIT_NOTE_PREFIX));
});

test("source validation fails closed on missing or duplicate canonical rows", () => {
  const rows = CANONICAL_SEED_ROWS.map((definition, index) => ({
    id: String(index),
    organization_name: definition.organizationName,
  }));
  assert.equal(indexCanonicalRows(rows).size, CANONICAL_SEED_ROWS.length);
  assert.throws(() => indexCanonicalRows(rows.slice(1)), /resolved 0 times/);
  assert.throws(() => indexCanonicalRows([...rows, rows[0]]), /resolved 2 times/);
});

test("post-repair audit rejects incomplete rows", () => {
  const validRows = CANONICAL_SEED_ROWS.map((definition, index) => ({
    organization_name: definition.organizationName,
    collection_tags: ["ct_seed_v2", ...definition.tags],
    admin_notes: "Recovered canonical seed row",
    verification_status: "potential",
    outreach_status: index < 8 ? "outreach_needed" : "approved",
  }));
  assert.doesNotThrow(() => assertAuditRows(validRows));
  assert.throws(() => assertAuditRows([{ ...validRows[0], admin_notes: "" }]), /admin_notes/);
  assert.throws(
    () => assertAuditRows(validRows.map((row) => ({ ...row, outreach_status: "contacted" }))),
    /Expected at least/,
  );
});

test("repair performs a complete idempotent update through a mock client", async () => {
  const rows = CANONICAL_SEED_ROWS.map((definition, index) => ({
    id: String(index),
    organization_name: definition.organizationName,
    collection_tags: [],
    admin_notes: null,
    verification_status: "potential",
    partnership_status: "potential",
    outreach_status: definition.baselineOutreachStatus,
  }));
  const updates = [];

  const clientFactory = (url, key, options) => {
    assert.equal(url, `https://${STAGING_PROJECT_REF}.supabase.co`);
    assert.equal(key, "mock-secret");
    assert.equal(options.auth.persistSession, false);
    return {
      from(table) {
        assert.equal(table, "partner_organizations");
        return {
          select() {
            return {
              async in(column, names) {
                assert.equal(column, "organization_name");
                return {
                  data: rows.filter((row) => names.includes(row.organization_name)),
                  error: null,
                };
              },
              async contains(column, tags) {
                assert.equal(column, "collection_tags");
                return {
                  data: rows.filter((row) =>
                    tags.every((tag) => row.collection_tags.includes(tag)),
                  ),
                  error: null,
                };
              },
            };
          },
          update(patch) {
            return {
              async eq(column, id) {
                assert.equal(column, "id");
                const row = rows.find((candidate) => candidate.id === id);
                Object.assign(row, patch);
                updates.push(id);
                return { error: null };
              },
            };
          },
        };
      },
    };
  };

  const repaired = await repairCtSeedV2Staging({
    url: `https://${STAGING_PROJECT_REF}.supabase.co`,
    serviceKey: "mock-secret",
    clientFactory,
  });
  assert.equal(repaired.length, CANONICAL_SEED_ROWS.length);
  assert.equal(updates.length, CANONICAL_SEED_ROWS.length);
  assert.doesNotThrow(() => assertAuditRows(repaired));
});
