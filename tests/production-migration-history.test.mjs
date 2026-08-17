import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareMigrationHistory,
  parseAppliedVersions,
} from "../scripts/compare-production-migration-history.mjs";

const canonical = [
  { version: "20260101000000", file: "20260101000000_first.sql" },
  { version: "20260102000000", file: "20260102000000_second.sql" },
  { version: "20260103000000", file: "20260103000000_third.sql" },
];

test("parses ordered Supabase JSON and CSV exports", () => {
  assert.deepEqual(
    parseAppliedVersions('[{"version":"20260101000000"},{"version":"20260102000000"}]'),
    ["20260101000000", "20260102000000"],
  );
  assert.deepEqual(parseAppliedVersions("version\n20260101000000\n20260102000000\n"), [
    "20260101000000",
    "20260102000000",
  ]);
});

test("reports only the canonical forward tail as pending", () => {
  const report = compareMigrationHistory(["20260101000000", "20260102000000"], canonical);
  assert.equal(report.status, "version-aligned");
  assert.deepEqual(report.pending, ["20260103000000_third.sql"]);
  assert.equal(report.checksumVerified, false);
});

test("fails closed on a historical gap", () => {
  const report = compareMigrationHistory(["20260101000000", "20260103000000"], canonical);
  assert.equal(report.status, "blocked");
  assert.ok(report.blockers.includes("missing-historical-version"));
  assert.deepEqual(report.missingHistorical, ["20260102000000_second.sql"]);
  assert.deepEqual(report.pending, []);
});

test("fails closed on production-only, duplicate, malformed, unordered, or empty history", () => {
  for (const [versions, blocker] of [
    [["20260101000000", "20269999000000"], "production-only-version"],
    [["20260101000000", "20260101000000"], "duplicate-version"],
    [["not-a-version"], "malformed-version"],
    [["20260102000000", "20260101000000"], "history-not-strictly-ordered"],
    [[], "empty-production-history"],
  ]) {
    const report = compareMigrationHistory(versions, canonical);
    assert.equal(report.status, "blocked");
    assert.ok(report.blockers.includes(blocker), `${blocker} was not reported`);
    assert.deepEqual(report.pending, []);
  }
});
