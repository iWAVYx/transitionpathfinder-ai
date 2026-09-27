import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  RUNTIME_SOURCE_FINGERPRINT_ALGORITHM,
  RUNTIME_SOURCE_FINGERPRINT_SCHEMA,
  createRuntimeSourceFingerprint,
  isRuntimeSourceFingerprint,
  runtimeSourceParityErrors,
} from "../scripts/runtime-source-fingerprint.mjs";

function withFixture(run) {
  const rootDirectory = mkdtempSync(join(tmpdir(), "transitionforward-runtime-fingerprint-"));
  try {
    mkdirSync(join(rootDirectory, "src", "nested"), { recursive: true });
    mkdirSync(join(rootDirectory, "public"), { recursive: true });
    writeFileSync(join(rootDirectory, "src", "entry.ts"), "export const value = 1;\n");
    writeFileSync(join(rootDirectory, "src", "nested", "feature.ts"), "export const ok = true;\n");
    writeFileSync(join(rootDirectory, "public", "asset.txt"), "fixture\n");
    run(rootDirectory);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
}

const FIXTURE_ENTRIES = ["src", "public"];

test("produces deterministic, non-sensitive SHA-256 metadata", () => {
  withFixture((rootDirectory) => {
    const first = createRuntimeSourceFingerprint({ rootDirectory, entries: FIXTURE_ENTRIES });
    const second = createRuntimeSourceFingerprint({ rootDirectory, entries: FIXTURE_ENTRIES });

    assert.deepEqual(second, first);
    assert.equal(first.schema, RUNTIME_SOURCE_FINGERPRINT_SCHEMA);
    assert.equal(first.algorithm, RUNTIME_SOURCE_FINGERPRINT_ALGORITHM);
    assert.equal(first.fileCount, 3);
    assert.equal(isRuntimeSourceFingerprint(first.fingerprint), true);
    assert.deepEqual(Object.keys(first).sort(), [
      "algorithm",
      "fileCount",
      "fingerprint",
      "schema",
    ]);
  });
});

test("changes when an included runtime file changes", () => {
  withFixture((rootDirectory) => {
    const before = createRuntimeSourceFingerprint({ rootDirectory, entries: FIXTURE_ENTRIES });
    writeFileSync(join(rootDirectory, "src", "entry.ts"), "export const value = 2;\n");
    const after = createRuntimeSourceFingerprint({ rootDirectory, entries: FIXTURE_ENTRIES });

    assert.notEqual(after.fingerprint, before.fingerprint);
    assert.equal(after.fileCount, before.fileCount);
  });
});

test("ignores files outside the explicit runtime source scope", () => {
  withFixture((rootDirectory) => {
    const before = createRuntimeSourceFingerprint({ rootDirectory, entries: FIXTURE_ENTRIES });
    mkdirSync(join(rootDirectory, "docs"));
    writeFileSync(join(rootDirectory, "docs", "operator-notes.md"), "not shipped\n");
    writeFileSync(join(rootDirectory, ".env"), "SECRET_VALUE=never-hash-environment-files\n");
    const after = createRuntimeSourceFingerprint({ rootDirectory, entries: FIXTURE_ENTRIES });

    assert.deepEqual(after, before);
  });
});

test("fails closed when a required source entry is absent", () => {
  withFixture((rootDirectory) => {
    assert.throws(
      () => createRuntimeSourceFingerprint({ rootDirectory, entries: ["src", "missing.json"] }),
      /ENOENT/,
    );
  });
});

test("the checked-out application has a valid runtime fingerprint", () => {
  const result = createRuntimeSourceFingerprint();
  assert.equal(result.schema, RUNTIME_SOURCE_FINGERPRINT_SCHEMA);
  assert.equal(result.algorithm, "sha256");
  assert.equal(isRuntimeSourceFingerprint(result.fingerprint), true);
  assert.ok(result.fileCount > 100);
});

for (const environment of ["staging", "production"]) {
  test(`${environment} parity fails closed on a mismatched or incomplete runtime identity`, () => {
    const expectedFingerprint = "a".repeat(64);
    assert.deepEqual(
      runtimeSourceParityErrors({
        expectedFingerprint,
        actualFingerprint: expectedFingerprint,
        schema: RUNTIME_SOURCE_FINGERPRINT_SCHEMA,
        algorithm: RUNTIME_SOURCE_FINGERPRINT_ALGORITHM,
        fileCount: 500,
      }),
      [],
    );

    const errors = runtimeSourceParityErrors({
      expectedFingerprint,
      actualFingerprint: "b".repeat(64),
      schema: "unknown-schema",
      algorithm: "unknown-algorithm",
      fileCount: 0,
    });
    assert.deepEqual(errors, [
      `runtime_source_fingerprint=${"b".repeat(64)}`,
      "runtime_source_fingerprint_schema=unknown-schema",
      "runtime_source_fingerprint_algorithm=unknown-algorithm",
      "runtime_source_file_count=0",
    ]);
  });
}
