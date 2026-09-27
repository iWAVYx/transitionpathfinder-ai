import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const RUNTIME_SOURCE_FINGERPRINT_SCHEMA = "transitionforward-runtime-source-v1";
export const RUNTIME_SOURCE_FINGERPRINT_ALGORITHM = "sha256";

/**
 * Files that determine the shipped application and its build output.
 *
 * Database migrations, CI workflows, tests, documentation, and environment
 * files are intentionally excluded. They are validated by their own controls
 * and are not copied into the isolated Lovable runtime.
 */
export const RUNTIME_SOURCE_ENTRIES = Object.freeze([
  "src",
  "public",
  "scripts",
  "package.json",
  "bun.lock",
  "bunfig.toml",
  "components.json",
  "eslint.config.js",
  "tsconfig.json",
  "vite.config.ts",
]);

function toPortablePath(path) {
  return path.split(sep).join("/");
}

function collectEntryFiles(rootDirectory, entry, output) {
  const absoluteEntry = resolve(rootDirectory, entry);
  const stat = lstatSync(absoluteEntry);

  if (stat.isSymbolicLink()) {
    throw new Error(`Runtime fingerprint refuses symbolic links: ${entry}`);
  }
  if (stat.isFile()) {
    output.push(toPortablePath(relative(rootDirectory, absoluteEntry)));
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`Runtime fingerprint found an unsupported source entry: ${entry}`);
  }

  for (const child of readdirSync(absoluteEntry, { withFileTypes: true })) {
    const childEntry = toPortablePath(`${entry}/${child.name}`);
    if (child.isSymbolicLink()) {
      throw new Error(`Runtime fingerprint refuses symbolic links: ${childEntry}`);
    }
    if (child.isDirectory()) {
      collectEntryFiles(rootDirectory, childEntry, output);
    } else if (child.isFile()) {
      output.push(childEntry);
    } else {
      throw new Error(`Runtime fingerprint found an unsupported source entry: ${childEntry}`);
    }
  }
}

export function collectRuntimeSourceFiles({
  rootDirectory = process.cwd(),
  entries = RUNTIME_SOURCE_ENTRIES,
} = {}) {
  const root = resolve(rootDirectory);
  const files = [];
  for (const entry of entries) collectEntryFiles(root, entry, files);
  return files.sort();
}

export function createRuntimeSourceFingerprint({
  rootDirectory = process.cwd(),
  entries = RUNTIME_SOURCE_ENTRIES,
} = {}) {
  const root = resolve(rootDirectory);
  const files = collectRuntimeSourceFiles({ rootDirectory: root, entries });
  const hash = createHash(RUNTIME_SOURCE_FINGERPRINT_ALGORITHM);
  hash.update(`${RUNTIME_SOURCE_FINGERPRINT_SCHEMA}\0`, "utf8");

  for (const file of files) {
    const contents = readFileSync(resolve(root, file));
    hash.update(file, "utf8");
    hash.update("\0", "utf8");
    hash.update(String(contents.byteLength), "utf8");
    hash.update("\0", "utf8");
    hash.update(contents);
    hash.update("\0", "utf8");
  }

  return Object.freeze({
    schema: RUNTIME_SOURCE_FINGERPRINT_SCHEMA,
    algorithm: RUNTIME_SOURCE_FINGERPRINT_ALGORITHM,
    fingerprint: hash.digest("hex"),
    fileCount: files.length,
  });
}

export function isRuntimeSourceFingerprint(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function runtimeSourceParityErrors({
  expectedFingerprint,
  actualFingerprint,
  schema,
  algorithm,
  fileCount,
}) {
  const errors = [];
  if (!isRuntimeSourceFingerprint(expectedFingerprint)) {
    errors.push("expected runtime source fingerprint is invalid");
  }
  if (!isRuntimeSourceFingerprint(actualFingerprint)) {
    errors.push("runtime_source_fingerprint is invalid");
  } else if (actualFingerprint !== expectedFingerprint) {
    errors.push(`runtime_source_fingerprint=${actualFingerprint}`);
  }
  if (schema !== RUNTIME_SOURCE_FINGERPRINT_SCHEMA) {
    errors.push(`runtime_source_fingerprint_schema=${schema}`);
  }
  if (algorithm !== RUNTIME_SOURCE_FINGERPRINT_ALGORITHM) {
    errors.push(`runtime_source_fingerprint_algorithm=${algorithm}`);
  }
  if (!Number.isSafeInteger(fileCount) || fileCount <= 0) {
    errors.push(`runtime_source_file_count=${fileCount}`);
  }
  return errors;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  const result = createRuntimeSourceFingerprint();
  const outputMode = process.argv[2] ?? "--json";
  if (outputMode === "--fingerprint") {
    process.stdout.write(`${result.fingerprint}\n`);
  } else if (outputMode === "--json") {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    throw new Error(`Unknown runtime fingerprint output mode: ${outputMode}`);
  }
}
