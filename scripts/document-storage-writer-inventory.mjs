import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const INVENTORY_PATH = "docs/production-readiness/evidence/document-storage-scheduled-writer-inventory-2026-11-16.json";
export const SCAN_ROOTS = ["src", "scripts", "supabase/functions", "supabase/migrations", ".github/workflows"];
const signals = /student-documents|(?:\.|\?\.)\s*storage\b|storage\s*\/\s*v1\s*\/\s*object|cron\s*\.\s*(?:un)?schedule|ai-job-processor/i;
const workflowSignals = /^\s*schedule:|supabase[^\n]*functions[^\n]*deploy|cron webhook|protected-file-uploads/im;
const suffixes = /\.(?:ts|tsx|js|jsx|mjs|cjs|sql|ya?ml)$/;

/** Bounded lexical discovery, not call-graph analysis or deployed inventory.
 * Comments and unrelated buckets stay included for human classification. */
export function discoverDocumentStorageCandidates(root) {
  const base = resolve(root); const found = [];
  const inspect = (absolute, config = false) => {
    if (lstatSync(absolute).isSymbolicLink()) throw new Error("Inventory refuses a symbolic-link source.");
    const path = relative(base, absolute).split(sep).join("/");
    const source = readFileSync(absolute, "utf8");
    if (config || signals.test(source) || (path.startsWith(".github/workflows/") && workflowSignals.test(source))) {
      found.push({ path, sha256: createHash("sha256").update(source).digest("hex") });
    }
  };
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Inventory refuses a symbolic-link source.");
      if (entry.isDirectory()) walk(path);
      else if (suffixes.test(entry.name)) inspect(path);
    }
  };
  for (const directory of SCAN_ROOTS) walk(resolve(base, directory));
  inspect(resolve(base, "supabase/config.toml"), true);
  for (const name of readdirSync(base).sort()) if (/^wrangler(?:[.-].*)?\.(?:toml|json|jsonc)$/.test(name) || name === "wrangler.toml") inspect(resolve(base, name), true);
  return found.sort((a,b) => a.path.localeCompare(b.path));
}
export function verifyDocumentStorageInventory(root, inventory) {
  if (inventory.schema !== "transitionforward-checked-in-storage-inventory-v1" || inventory.hosted_verified !== false || inventory.ready_for_cutover !== false || inventory.whole_workstream_complete !== false) throw new Error("Inventory must preserve its source-only scope.");
  if (JSON.stringify(inventory.scan_roots) !== JSON.stringify(SCAN_ROOTS)) throw new Error("Inventory discovery scope changed.");
  const actual = discoverDocumentStorageCandidates(root);
  const reviewed = new Map();
  for (const entry of inventory.entries) {
    if (reviewed.has(entry.path) || !entry.classification || !entry.finding || !entry.remaining_boundary || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Incomplete or duplicate reviewed entry.");
    reviewed.set(entry.path, entry);
  }
  if (reviewed.size !== actual.length) throw new Error("Storage/scheduler candidate count changed; review required.");
  for (const entry of actual) {
    const previous = reviewed.get(entry.path);
    if (!previous || previous.sha256 !== entry.sha256) throw new Error(`Storage/scheduler source requires review: ${entry.path}`);
  }
  return { checked_files: actual.length, hosted_verified: false, ready_for_cutover: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? ".");
  const inventory = JSON.parse(readFileSync(resolve(root, INVENTORY_PATH), "utf8"));
  console.log(JSON.stringify(verifyDocumentStorageInventory(root, inventory)));
}
