import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareMigrationHistory,
  parseMigrationHistory,
} from "../scripts/compare-production-migration-history.mjs";

const canonical = [
  {
    version: "20260101000000",
    name: "first",
    file: "20260101000000_first.sql",
    statementsMd5: "11111111111111111111111111111111",
    codeMd5: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  {
    version: "20260102000000",
    name: "second",
    file: "20260102000000_second.sql",
    statementsMd5: "22222222222222222222222222222222",
    codeMd5: "cccccccccccccccccccccccccccccccc",
  },
  {
    version: "20260103000000",
    name: "third",
    file: "20260103000000_third.sql",
    statementsMd5: "33333333333333333333333333333333",
    codeMd5: "cccccccccccccccccccccccccccccccc",
  },
  {
    version: "20260104000000",
    name: "staging_fixture",
    file: "20260104000000_staging_fixture.sql",
    statementsMd5: "44444444444444444444444444444444",
    codeMd5: "dddddddddddddddddddddddddddddddd",
  },
];

const row = (overrides) => ({
  version: "20260101000000",
  name: "first",
  statementCount: 1,
  statementsMd5: "11111111111111111111111111111111",
  codeMd5: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ...overrides,
});

const policy = {
  schemaVersion: 1,
  target: "lovable-production",
  versionAliases: [
    {
      productionVersion: "20260101999999",
      canonicalFile: "20260102000000_second.sql",
      expectedProductionStatementsMd5: "22222222222222222222222222222222",
      expectedCanonicalStatementsMd5: "22222222222222222222222222222222",
      reason: "reviewed execution timestamp alias",
    },
  ],
  historicalVariants: [
    {
      productionVersion: "20260103000000",
      canonicalFile: "20260103000000_third.sql",
      expectedName: "third",
      expectedStatementsMd5: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      sourceCommit: "12345678",
      reason: "reviewed historical form",
    },
  ],
  supersededCanonicalFiles: [],
  excludedCanonicalFiles: [
    {
      file: "20260104000000_staging_fixture.sql",
      productionForbidden: true,
      reason: "synthetic staging-only fixture",
    },
  ],
};

test("parses ordered JSON and CSV hash evidence", () => {
  const expected = [
    row({}),
    row({
      version: "20260101999999",
      name: "second",
      statementsMd5: "22222222222222222222222222222222",
      codeMd5: "cccccccccccccccccccccccccccccccc",
    }),
  ];
  assert.deepEqual(parseMigrationHistory(JSON.stringify(expected)), expected);
  assert.deepEqual(
    parseMigrationHistory(
      "version,name,statement_count,statements_md5,code_md5\n" +
        "20260101000000,first,1,11111111111111111111111111111111,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
    ),
    [row({})],
  );
});

test("aligns exact content, reviewed aliases, historical variants, and exclusions", () => {
  const applied = [
    row({}),
    row({
      version: "20260101999999",
      name: "second",
      statementsMd5: "22222222222222222222222222222222",
      codeMd5: "cccccccccccccccccccccccccccccccc",
    }),
    row({
      version: "20260103000000",
      name: "third",
      statementsMd5: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      codeMd5: "ffffffffffffffffffffffffffffffff",
    }),
  ];
  const report = compareMigrationHistory(applied, canonical, policy);
  assert.equal(report.status, "aligned");
  assert.equal(report.directCoverageCount, 3);
  assert.equal(report.excludedCount, 1);
  assert.equal(report.pendingCount, 0);
  assert.equal(report.mappingMethods["reviewed-version-alias"], 1);
  assert.equal(report.mappingMethods["reviewed-historical-variant"], 1);
});

test("accepts a reviewed semantic supersession only with the pinned production hash", () => {
  const supersessionPolicy = {
    ...policy,
    versionAliases: [],
    historicalVariants: [],
    supersededCanonicalFiles: [
      {
        file: "20260102000000_second.sql",
        coveredByProductionVersion: "20260103000000",
        expectedProductionStatementsMd5: "33333333333333333333333333333333",
        expectedProductionCodeMd5: "cccccccccccccccccccccccccccccccc",
        reason: "later synchronized copy repeats the same executable SQL",
      },
    ],
  };
  const report = compareMigrationHistory(
    [
      row({}),
      row({
        version: "20260103000000",
        name: "third",
        statementsMd5: "33333333333333333333333333333333",
        codeMd5: "cccccccccccccccccccccccccccccccc",
      }),
    ],
    canonical,
    supersessionPolicy,
  );
  assert.equal(report.status, "aligned");
  assert.equal(report.supersededCount, 1);
  assert.equal(report.pendingCount, 0);
});

test("fails closed on missing hashes, unknown content, ordering errors, or policy drift", () => {
  for (const [applied, changedPolicy, blocker] of [
    [[row({ statementsMd5: "" })], policy, "malformed-or-incomplete-evidence"],
    [
      [
        row({
          statementsMd5: "99999999999999999999999999999999",
          codeMd5: "99999999999999999999999999999999",
        }),
      ],
      policy,
      "unresolved-production-history",
    ],
    [
      [row({ version: "20260103000000" }), row({ version: "20260101000000" })],
      policy,
      "history-not-strictly-ordered",
    ],
    [[row({})], { ...policy, target: "staging" }, "invalid-alignment-policy"],
  ]) {
    const report = compareMigrationHistory(applied, canonical, changedPolicy);
    assert.equal(report.status, "blocked");
    assert.ok(report.blockers.includes(blocker), `${blocker} was not reported`);
  }
});
