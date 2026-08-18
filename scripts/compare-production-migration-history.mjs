#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^\d{14}$/;
const HASH_PATTERN = /^[a-f0-9]{32}$/;
const MIGRATION_FILE_PATTERN = /^(\d{14})_([A-Za-z0-9_-]+)\.sql$/;
const DEFAULT_POLICY_PATH = "docs/production-readiness/production-migration-policy.json";

function md5(value) {
  return createHash("md5").update(value, "utf8").digest("hex");
}

function normalizeExecutableSql(value) {
  return value.replace(/--[^\n\r]*/g, "").replace(/\s+/g, "");
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields.map((value) => value.trim());
}

function jsonRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["rows", "data", "result"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function normalizeHistoryRow(row) {
  if (typeof row === "string" || typeof row === "number") {
    return { version: String(row), name: "", statementCount: null, statementsMd5: "", codeMd5: "" };
  }
  return {
    version: String(row.version ?? "").trim(),
    name: String(row.name ?? "").trim(),
    statementCount: Number(row.statement_count ?? row.statementCount ?? Number.NaN),
    statementsMd5: String(row.statements_md5 ?? row.statementsMd5 ?? "")
      .trim()
      .toLowerCase(),
    codeMd5: String(row.code_md5 ?? row.codeMd5 ?? "")
      .trim()
      .toLowerCase(),
  };
}

export function parseMigrationHistory(source) {
  const trimmed = source.trim().replace(/^\uFEFF/, "");
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return jsonRows(JSON.parse(trimmed)).map(normalizeHistoryRow);
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (!headers.includes("version")) return lines.map(normalizeHistoryRow);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return normalizeHistoryRow(
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    );
  });
}

export function readCanonicalMigrations(migrationsDirectory) {
  const migrations = readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((file) => {
      const match = file.match(MIGRATION_FILE_PATTERN);
      if (!match) throw new Error(`Invalid canonical migration filename: ${file}`);
      const sql = readFileSync(resolve(migrationsDirectory, file), "utf8").replace(/\r\n/g, "\n");
      return {
        version: match[1],
        name: match[2],
        file,
        statementsMd5: md5(sql),
        codeMd5: md5(normalizeExecutableSql(sql)),
      };
    });

  const versions = migrations.map(({ version }) => version);
  if (new Set(versions).size !== versions.length) {
    throw new Error("Canonical migration versions must be unique");
  }
  return migrations;
}

function indexMany(rows, key) {
  const index = new Map();
  for (const row of rows) {
    const value = row[key];
    const existing = index.get(value) ?? [];
    existing.push(row);
    index.set(value, existing);
  }
  return index;
}

function addPolicyError(errors, condition, message) {
  if (!condition) errors.push(message);
}

export function compareMigrationHistory(appliedRows, canonicalMigrations, policy) {
  const canonicalByFile = new Map(canonicalMigrations.map((row) => [row.file, row]));
  const canonicalByVersion = new Map(canonicalMigrations.map((row) => [row.version, row]));
  const canonicalByStatementsMd5 = indexMany(canonicalMigrations, "statementsMd5");
  const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row]));
  const policyErrors = [];

  addPolicyError(policyErrors, policy?.schemaVersion === 1, "policy.schemaVersion must equal 1");
  addPolicyError(
    policyErrors,
    policy?.target === "lovable-production",
    "policy.target must equal lovable-production",
  );

  for (const key of [
    "versionAliases",
    "historicalVariants",
    "supersededCanonicalFiles",
    "excludedCanonicalFiles",
  ]) {
    addPolicyError(policyErrors, Array.isArray(policy?.[key]), `policy.${key} must be an array`);
  }

  const aliases = Array.isArray(policy?.versionAliases) ? policy.versionAliases : [];
  const historicalVariants = Array.isArray(policy?.historicalVariants)
    ? policy.historicalVariants
    : [];
  const supersededRules = Array.isArray(policy?.supersededCanonicalFiles)
    ? policy.supersededCanonicalFiles
    : [];
  const exclusionRules = Array.isArray(policy?.excludedCanonicalFiles)
    ? policy.excludedCanonicalFiles
    : [];
  const aliasByVersion = new Map(aliases.map((rule) => [rule.productionVersion, rule]));
  const historicalByVersion = new Map(
    historicalVariants.map((rule) => [rule.productionVersion, rule]),
  );

  addPolicyError(
    policyErrors,
    aliasByVersion.size === aliases.length,
    "policy version aliases must use unique production versions",
  );
  addPolicyError(
    policyErrors,
    historicalByVersion.size === historicalVariants.length,
    "policy historical variants must use unique production versions",
  );
  addPolicyError(
    policyErrors,
    aliases.every(({ productionVersion }) => !historicalByVersion.has(productionVersion)),
    "policy aliases and historical variants must use disjoint production versions",
  );
  for (const alias of aliases) {
    addPolicyError(
      policyErrors,
      VERSION_PATTERN.test(alias.productionVersion ?? "") &&
        canonicalByFile.has(alias.canonicalFile) &&
        HASH_PATTERN.test(alias.expectedProductionStatementsMd5 ?? "") &&
        Boolean(alias.expectedCanonicalStatementsMd5) !== Boolean(alias.expectedCanonicalCodeMd5) &&
        (!alias.expectedCanonicalStatementsMd5 ||
          HASH_PATTERN.test(alias.expectedCanonicalStatementsMd5)) &&
        (!alias.expectedCanonicalCodeMd5 || HASH_PATTERN.test(alias.expectedCanonicalCodeMd5)) &&
        typeof alias.reason === "string" &&
        alias.reason.length > 0,
      `invalid version alias for ${alias.productionVersion ?? "unknown version"}`,
    );
  }
  for (const historical of historicalVariants) {
    addPolicyError(
      policyErrors,
      VERSION_PATTERN.test(historical.productionVersion ?? "") &&
        canonicalByFile.has(historical.canonicalFile) &&
        HASH_PATTERN.test(historical.expectedStatementsMd5 ?? "") &&
        /^[a-f0-9]{7,40}$/.test(historical.sourceCommit ?? "") &&
        typeof historical.reason === "string" &&
        historical.reason.length > 0,
      `invalid historical variant for ${historical.productionVersion ?? "unknown version"}`,
    );
  }

  const malformed = appliedRows.filter(
    (row) =>
      !VERSION_PATTERN.test(row.version) ||
      row.statementCount !== 1 ||
      !HASH_PATTERN.test(row.statementsMd5) ||
      !HASH_PATTERN.test(row.codeMd5),
  );
  const duplicateVersions = [
    ...new Set(
      appliedRows
        .map(({ version }) => version)
        .filter((version, index, versions) => versions.indexOf(version) !== index),
    ),
  ];
  const outOfOrder = appliedRows.some(
    ({ version }, index) => index > 0 && appliedRows[index - 1].version.localeCompare(version) >= 0,
  );
  const mappings = [];
  const unresolvedProduction = [];

  function mapRow(row, canonical, method) {
    mappings.push({
      productionVersion: row.version,
      canonicalFile: canonical.file,
      method,
    });
  }

  for (const row of appliedRows) {
    const historical = historicalByVersion.get(row.version);
    if (historical) {
      const canonical = canonicalByFile.get(historical.canonicalFile);
      const valid =
        canonical &&
        row.statementsMd5 === historical.expectedStatementsMd5 &&
        (!historical.expectedName || row.name === historical.expectedName);
      if (valid) mapRow(row, canonical, "reviewed-historical-variant");
      else
        unresolvedProduction.push({ version: row.version, reason: "historical-variant-mismatch" });
      continue;
    }

    const exactVersion = canonicalByVersion.get(row.version);
    if (exactVersion && exactVersion.statementsMd5 === row.statementsMd5) {
      mapRow(row, exactVersion, "exact-version-and-content");
      continue;
    }

    const alias = aliasByVersion.get(row.version);
    if (alias) {
      const canonical = canonicalByFile.get(alias.canonicalFile);
      const exactProductionEvidence =
        HASH_PATTERN.test(alias.expectedProductionStatementsMd5 ?? "") &&
        row.statementsMd5 === alias.expectedProductionStatementsMd5;
      const canonicalProof = alias.expectedCanonicalStatementsMd5
        ? canonical?.statementsMd5 === alias.expectedCanonicalStatementsMd5 &&
          row.statementsMd5 === alias.expectedCanonicalStatementsMd5
        : canonical?.codeMd5 === alias.expectedCanonicalCodeMd5 &&
          row.codeMd5 === alias.expectedCanonicalCodeMd5;
      const nameMatches = !alias.expectedName || row.name === alias.expectedName;
      if (canonical && exactProductionEvidence && canonicalProof && nameMatches) {
        mapRow(row, canonical, "reviewed-version-alias");
      } else {
        unresolvedProduction.push({ version: row.version, reason: "version-alias-mismatch" });
      }
      continue;
    }

    const exactContent = canonicalByStatementsMd5.get(row.statementsMd5) ?? [];
    if (exactContent.length === 1) {
      mapRow(row, exactContent[0], "exact-content");
      continue;
    }

    unresolvedProduction.push({
      version: row.version,
      reason: exactContent.length ? "ambiguous-content" : "unknown-content",
      candidates: exactContent.map(({ file }) => file),
    });
  }

  for (const alias of aliases) {
    if (
      !mappings.some(
        (mapping) =>
          mapping.productionVersion === alias.productionVersion &&
          mapping.method === "reviewed-version-alias",
      )
    ) {
      policyErrors.push(`unused or mismatched version alias for ${alias.productionVersion}`);
    }
  }
  for (const historical of historicalVariants) {
    if (
      !mappings.some(
        (mapping) =>
          mapping.productionVersion === historical.productionVersion &&
          mapping.method === "reviewed-historical-variant",
      )
    ) {
      policyErrors.push(
        `unused or mismatched historical variant for ${historical.productionVersion}`,
      );
    }
  }

  const mappedCounts = new Map();
  for (const { canonicalFile } of mappings) {
    mappedCounts.set(canonicalFile, (mappedCounts.get(canonicalFile) ?? 0) + 1);
  }
  const duplicateMappings = [...mappedCounts]
    .filter(([, count]) => count > 1)
    .map(([file]) => file);
  const directlyCovered = new Set(mappings.map(({ canonicalFile }) => canonicalFile));
  const superseded = [];

  for (const rule of supersededRules) {
    const canonical = canonicalByFile.get(rule.file);
    const coveringRow = appliedByVersion.get(rule.coveredByProductionVersion);
    if (
      canonical &&
      coveringRow &&
      coveringRow.statementsMd5 === rule.expectedProductionStatementsMd5 &&
      coveringRow.codeMd5 === rule.expectedProductionCodeMd5 &&
      canonical.codeMd5 === rule.expectedProductionCodeMd5 &&
      typeof rule.reason === "string" &&
      rule.reason.length > 0
    ) {
      superseded.push({
        file: rule.file,
        coveredByProductionVersion: rule.coveredByProductionVersion,
      });
    } else {
      policyErrors.push(`invalid supersession rule for ${rule.file ?? "unknown file"}`);
    }
  }

  const excluded = [];
  for (const rule of exclusionRules) {
    if (
      canonicalByFile.has(rule.file) &&
      rule.productionForbidden === true &&
      typeof rule.reason === "string" &&
      rule.reason.length > 0
    ) {
      excluded.push(rule.file);
    } else {
      policyErrors.push(`invalid production exclusion for ${rule.file ?? "unknown file"}`);
    }
  }

  const accountedFor = new Set([
    ...directlyCovered,
    ...superseded.map(({ file }) => file),
    ...excluded,
  ]);
  const reviewedPolicyFiles = [...superseded.map(({ file }) => file), ...excluded];
  const duplicatePolicyFiles = reviewedPolicyFiles.filter(
    (file, index) => reviewedPolicyFiles.indexOf(file) !== index,
  );
  const overlappingCoverage = reviewedPolicyFiles.filter((file) => directlyCovered.has(file));
  if (duplicatePolicyFiles.length) policyErrors.push("reviewed policy files must be unique");
  if (overlappingCoverage.length)
    policyErrors.push("reviewed policy files overlap direct coverage");
  const pending = canonicalMigrations
    .filter(({ file }) => !accountedFor.has(file))
    .map(({ file }) => file);
  const blockers = [];
  if (appliedRows.length === 0) blockers.push("empty-production-history");
  if (malformed.length) blockers.push("malformed-or-incomplete-evidence");
  if (duplicateVersions.length) blockers.push("duplicate-version");
  if (outOfOrder) blockers.push("history-not-strictly-ordered");
  if (unresolvedProduction.length) blockers.push("unresolved-production-history");
  if (duplicateMappings.length) blockers.push("duplicate-canonical-mapping");
  if (policyErrors.length) blockers.push("invalid-alignment-policy");
  if (pending.length) blockers.push("pending-production-migration");

  return {
    status: blockers.length ? "blocked" : "aligned",
    blockers,
    canonicalCount: canonicalMigrations.length,
    appliedCount: appliedRows.length,
    latestAppliedVersion: appliedRows.at(-1)?.version ?? null,
    directCoverageCount: directlyCovered.size,
    supersededCount: superseded.length,
    excludedCount: excluded.length,
    pendingCount: pending.length,
    mappingMethods: Object.fromEntries(
      [...new Set(mappings.map(({ method }) => method))].map((method) => [
        method,
        mappings.filter((mapping) => mapping.method === method).length,
      ]),
    ),
    malformedVersions: malformed.map(({ version }) => version),
    duplicateVersions,
    duplicateMappings,
    unresolvedProduction,
    policyErrors,
    superseded,
    excluded,
    pending,
  };
}

function printHumanReport(report) {
  console.log(`Production migration history: ${report.status.toUpperCase()}`);
  console.log(`Recorded production migrations: ${report.appliedCount}`);
  console.log(`Canonical migrations: ${report.canonicalCount}`);
  console.log(`Directly covered: ${report.directCoverageCount}`);
  console.log(`Reviewed supersessions: ${report.supersededCount}`);
  console.log(`Production-forbidden exclusions: ${report.excludedCount}`);
  console.log(`Pending production migrations: ${report.pendingCount}`);
  console.log(`Latest recorded production version: ${report.latestAppliedVersion ?? "none"}`);
  if (report.blockers.length) console.log(`Blockers: ${report.blockers.join(", ")}`);
  for (const file of report.pending) console.log(file);
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const inputPath = args.find((arg) => !arg.startsWith("--"));
  if (!inputPath) {
    console.error(
      "Usage: node scripts/compare-production-migration-history.mjs <ordered-history.json|csv> [--json]",
    );
    process.exitCode = 1;
    return;
  }

  const applied = parseMigrationHistory(readFileSync(resolve(inputPath), "utf8"));
  const canonical = readCanonicalMigrations(resolve("supabase/migrations"));
  const policy = JSON.parse(readFileSync(resolve(DEFAULT_POLICY_PATH), "utf8"));
  const report = compareMigrationHistory(applied, canonical, policy);
  if (json) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);
  if (report.status === "blocked") process.exitCode = 2;
}

const invokedPath = globalThis.process?.argv?.[1];
if (invokedPath && resolve(invokedPath) === fileURLToPath(import.meta.url)) main();
