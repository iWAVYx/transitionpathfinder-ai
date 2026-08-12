// Restore CT Seed v2 audit metadata on the isolated staging project only.
//
// The organizations below come from the canonical checked-in partner seed:
// supabase/migrations/20260607034341_e8e2f35c-ecfe-495c-844f-ef493489e9f7.sql
//
// This script never inserts organizations. It fails before writing unless every
// canonical organization resolves to exactly one staging row.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export const STAGING_PROJECT_REF = "qgrertkqbwanerqqemph";
export const AUDIT_NOTE_PREFIX = "CT Seed v2 staging recovery:";

export const REQUIRED_V2_TAGS = [
  "ct_seed_v2",
  "free_ct_training",
  "youth_employment",
  "adult_education",
  "workforce_boards",
  "manufacturing_trades",
  "disability_employment",
  "employer_pipeline",
];

export const CANONICAL_SEED_ROWS = [
  {
    organizationName: "Adult Education Programs (CT)",
    tags: ["free_ct_training", "adult_education"],
    baselineOutreachStatus: "approved",
    rationale: "state adult-education and career-pathway resource",
  },
  {
    organizationName: "Connecticut Workforce Development Boards",
    tags: ["workforce_boards"],
    baselineOutreachStatus: "approved",
    rationale: "statewide workforce-board network",
  },
  {
    organizationName: "Best Buddies Jobs Program (Connecticut)",
    tags: ["youth_employment", "disability_employment"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "supported employment for young adults with IDD",
  },
  {
    organizationName: "The Kennedy Collective",
    tags: ["disability_employment"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "Connecticut disability employment provider",
  },
  {
    organizationName: "Goodwill of Western and Northern Connecticut",
    tags: ["disability_employment"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "workforce training and supported-employment provider",
  },
  {
    organizationName: "Manufacturing Employers (CT)",
    tags: ["manufacturing_trades", "employer_pipeline"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "Connecticut manufacturing employer lead",
  },
  {
    organizationName: "Facilities & Maintenance Employers (CT)",
    tags: ["manufacturing_trades", "employer_pipeline"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "Connecticut skilled-trades employer lead",
  },
  {
    organizationName: "Travelers",
    tags: ["employer_pipeline"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "Connecticut inclusive-employer lead",
  },
  {
    organizationName: "Amazon Connecticut Facilities",
    tags: ["employer_pipeline"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "Connecticut operations employer lead",
  },
  {
    organizationName: "CVS Health",
    tags: ["employer_pipeline"],
    baselineOutreachStatus: "outreach_needed",
    rationale: "Connecticut healthcare and retail employer lead",
  },
];

export function assertStagingTarget(rawUrl) {
  if (!rawUrl) throw new Error("STAGING_SUPABASE_URL is required");

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("STAGING_SUPABASE_URL must be a valid URL");
  }

  const expectedHost = `${STAGING_PROJECT_REF}.supabase.co`;
  if (url.protocol !== "https:" || url.hostname !== expectedHost) {
    throw new Error(`Refusing CT Seed v2 repair: expected isolated staging host ${expectedHost}`);
  }

  return url.origin;
}

function unique(values) {
  return [...new Set(values)];
}

export function buildRepairPatch(row, definition) {
  const collectionTags = unique([
    ...(Array.isArray(row.collection_tags) ? row.collection_tags : []),
    "ct_seed_v2",
    ...definition.tags,
  ]);
  const recoveryNote = `${AUDIT_NOTE_PREFIX} ${definition.rationale}. Canonical source migration 20260607034341.`;
  const currentNote = row.admin_notes?.trim() ?? "";
  const adminNotes = currentNote.includes(AUDIT_NOTE_PREFIX)
    ? currentNote
    : [currentNote, recoveryNote].filter(Boolean).join("\n");

  return {
    collection_tags: collectionTags,
    admin_notes: adminNotes,
    outreach_status:
      row.outreach_status === "not_contacted" ? "outreach_needed" : row.outreach_status,
  };
}

export function indexCanonicalRows(rows) {
  const byName = new Map();
  for (const row of rows ?? []) {
    const matches = byName.get(row.organization_name) ?? [];
    matches.push(row);
    byName.set(row.organization_name, matches);
  }

  const indexed = new Map();
  for (const definition of CANONICAL_SEED_ROWS) {
    const matches = byName.get(definition.organizationName) ?? [];
    if (matches.length !== 1) {
      throw new Error(
        `Canonical staging row ${JSON.stringify(definition.organizationName)} resolved ${matches.length} times; expected exactly once`,
      );
    }
    indexed.set(definition.organizationName, matches[0]);
  }
  return indexed;
}

export function assertAuditRows(rows) {
  if (!rows?.length) throw new Error("No ct_seed_v2 partners found after repair");

  let outreachNeeded = 0;
  for (const row of rows) {
    const label = row.organization_name;
    if (!row.collection_tags?.includes("ct_seed_v2")) {
      throw new Error(`${label}: missing ct_seed_v2 collection tag`);
    }
    if (!row.admin_notes?.trim()) throw new Error(`${label}: admin_notes empty`);
    if (!row.verification_status) throw new Error(`${label}: verification_status empty`);
    if (!row.outreach_status || row.outreach_status === "not_contacted") {
      throw new Error(`${label}: outreach_status was not promoted`);
    }
    if (row.outreach_status === "outreach_needed") outreachNeeded += 1;
  }

  const requiredOutreachCount = Math.floor(rows.length * 0.7);
  if (outreachNeeded < requiredOutreachCount) {
    throw new Error(
      `Expected at least ${requiredOutreachCount} outreach_needed rows, got ${outreachNeeded}/${rows.length}`,
    );
  }
}

export async function repairCtSeedV2Staging({
  url = process.env.STAGING_SUPABASE_URL,
  serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  clientFactory = createClient,
} = {}) {
  const stagingOrigin = assertStagingTarget(url);
  if (!serviceKey) throw new Error("STAGING_SUPABASE_SERVICE_ROLE_KEY is required");

  const admin = clientFactory(stagingOrigin, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const names = CANONICAL_SEED_ROWS.map((row) => row.organizationName);
  const fields =
    "id, organization_name, collection_tags, admin_notes, outreach_status, verification_status, partnership_status";

  const { data: sourceRows, error: sourceError } = await admin
    .from("partner_organizations")
    .select(fields)
    .in("organization_name", names);
  if (sourceError) throw new Error(`Canonical seed lookup failed: ${sourceError.message}`);

  // Validate the complete source set before the first write.
  const indexedRows = indexCanonicalRows(sourceRows);

  for (const definition of CANONICAL_SEED_ROWS) {
    const row = indexedRows.get(definition.organizationName);
    const patch = buildRepairPatch(row, definition);
    const { error } = await admin.from("partner_organizations").update(patch).eq("id", row.id);
    if (error) throw new Error(`${definition.organizationName}: update failed: ${error.message}`);
  }

  const { data: auditRows, error: auditError } = await admin
    .from("partner_organizations")
    .select(fields)
    .contains("collection_tags", ["ct_seed_v2"]);
  if (auditError) throw new Error(`Post-repair audit query failed: ${auditError.message}`);

  assertAuditRows(auditRows);
  console.log(`CT Seed v2 staging repair verified for ${auditRows.length} partner rows.`);
  console.log(`Staging Supabase target verified: ${STAGING_PROJECT_REF}`);
  return auditRows;
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  repairCtSeedV2Staging().catch((error) => {
    console.error(error instanceof Error ? error.message : "Unknown CT Seed v2 repair error");
    process.exitCode = 1;
  });
}
