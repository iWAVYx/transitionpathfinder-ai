#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^\d{14}$/;
const MIGRATION_FILE_PATTERN = /^(\d{14})_[A-Za-z0-9_-]+\.sql$/;

function versionsFromJson(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => versionsFromJson(entry));
  }

  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (typeof value.version === "string" || typeof value.version === "number") {
    return [String(value.version)];
  }

  for (const key of ["applied_versions", "data", "rows", "result"]) {
    if (key in value) return versionsFromJson(value[key]);
  }

  return [];
}

function unquoteCsvField(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('""', '"');
  }
  return trimmed;
}

export function parseAppliedVersions(source) {
  const trimmed = source.trim().replace(/^\uFEFF/, "");
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return versionsFromJson(JSON.parse(trimmed)).map(String);
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines[0]?.split(",", 1)[0]?.trim().replace(/^"|"$/g, "").toLowerCase();
  const dataLines = header === "version" ? lines.slice(1) : lines;

  return dataLines.map((line) => unquoteCsvField(line.split(",", 1)[0]));
}

export function readCanonicalMigrations(migrationsDirectory) {
  return readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((file) => {
      const match = file.match(MIGRATION_FILE_PATTERN);
      if (!match) throw new Error(`Invalid canonical migration filename: ${file}`);
      return { version: match[1], file };
    });
}

export function compareMigrationHistory(appliedVersions, canonicalMigrations) {
  const canonicalVersions = canonicalMigrations.map(({ version }) => version);
  const canonicalSet = new Set(canonicalVersions);
  const malformed = appliedVersions.filter((version) => !VERSION_PATTERN.test(version));
  const duplicates = [
    ...new Set(
      appliedVersions.filter((version, index) => appliedVersions.indexOf(version) !== index),
    ),
  ];
  const productionOnly = [
    ...new Set(
      appliedVersions.filter(
        (version) => VERSION_PATTERN.test(version) && !canonicalSet.has(version),
      ),
    ),
  ];
  const outOfOrder = appliedVersions.some(
    (version, index) => index > 0 && appliedVersions[index - 1].localeCompare(version) >= 0,
  );

  const appliedCanonicalIndexes = appliedVersions
    .map((version) => canonicalVersions.indexOf(version))
    .filter((index) => index >= 0);
  const latestAppliedIndex = appliedCanonicalIndexes.length
    ? Math.max(...appliedCanonicalIndexes)
    : -1;
  const appliedSet = new Set(appliedVersions);
  const missingHistorical = canonicalMigrations
    .slice(0, latestAppliedIndex + 1)
    .filter(({ version }) => !appliedSet.has(version));
  const pending = canonicalMigrations.slice(latestAppliedIndex + 1);

  const blockers = [];
  if (appliedVersions.length === 0) blockers.push("empty-production-history");
  if (malformed.length) blockers.push("malformed-version");
  if (duplicates.length) blockers.push("duplicate-version");
  if (productionOnly.length) blockers.push("production-only-version");
  if (outOfOrder) blockers.push("history-not-strictly-ordered");
  if (missingHistorical.length) blockers.push("missing-historical-version");

  return {
    status: blockers.length ? "blocked" : "version-aligned",
    blockers,
    canonicalCount: canonicalMigrations.length,
    appliedCount: appliedVersions.length,
    latestAppliedVersion: latestAppliedIndex >= 0 ? canonicalVersions[latestAppliedIndex] : null,
    malformed,
    duplicates,
    productionOnly,
    missingHistorical: missingHistorical.map(({ file }) => file),
    pending: blockers.length ? [] : pending.map(({ file }) => file),
    checksumVerified: false,
    checksumNote:
      "schema_migrations proves recorded versions only; review pending SQL and investigate any checksum or renamed-file concern separately.",
  };
}

function printHumanReport(report) {
  console.log(`Production migration history: ${report.status.toUpperCase()}`);
  console.log(`Canonical migrations: ${report.canonicalCount}`);
  console.log(`Recorded production versions: ${report.appliedCount}`);
  console.log(`Latest recorded canonical version: ${report.latestAppliedVersion ?? "none"}`);

  if (report.blockers.length) {
    console.log(`Blockers: ${report.blockers.join(", ")}`);
    for (const key of ["malformed", "duplicates", "productionOnly", "missingHistorical"]) {
      if (report[key].length) console.log(`${key}: ${report[key].join(", ")}`);
    }
  } else {
    console.log(`Pending canonical migrations: ${report.pending.length}`);
    for (const file of report.pending) console.log(file);
  }

  console.log(report.checksumNote);
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const inputPath = args.find((arg) => arg !== "--json");
  if (!inputPath) {
    console.error(
      "Usage: node scripts/compare-production-migration-history.mjs <ordered-history.json|csv|txt> [--json]",
    );
    process.exitCode = 1;
    return;
  }

  const appliedVersions = parseAppliedVersions(readFileSync(resolve(inputPath), "utf8"));
  const canonical = readCanonicalMigrations(resolve("supabase/migrations"));
  const report = compareMigrationHistory(appliedVersions, canonical);
  if (json) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);
  if (report.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
