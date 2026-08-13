// Role-guard regression QA: deterministic access matrix snapshot.
//
// Why this exists
// ---------------
// `src/lib/role-policy.ts` is the single source of truth for which roles can
// reach which workspace routes. A bad edit there (or a missing `<RoleGuard>`
// wrap on a new route) silently changes who can see what — including PII.
// This test computes the full role × route access matrix from the source
// file and compares it against a committed snapshot. Any change to the
// matrix — intentional or not — fails CI and must be reviewed.
//
// To intentionally update the matrix after a policy change:
//   UPDATE_SNAPSHOTS=1 node --test tests/role-guard-matrix.test.mjs
//
// Run normally with:
//   node --test tests/role-guard-matrix.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const POLICY_FILE = new URL("src/lib/role-policy.ts", ROOT);
const ROUTES_DIR = new URL("src/routes/_authenticated/", ROOT);
const SNAPSHOT_FILE = new URL("tests/__snapshots__/role-guard-matrix.snap.json", ROOT);
const DOCUMENTS_ROUTE_FILE = new URL("src/routes/_authenticated/documents.tsx", ROOT);

const POLICY_SRC = readFileSync(POLICY_FILE, "utf8");

// ---------- 1. Extract ROUTE_AUDIENCES from source ----------

function extractRouteAudiences(src) {
  const start = src.indexOf("export const ROUTE_AUDIENCES");
  assert.ok(start >= 0, "ROUTE_AUDIENCES export not found in role-policy.ts");
  const objStart = src.indexOf("{", start);
  // Find matching closing brace
  let depth = 0;
  let end = -1;
  for (let i = objStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(end > objStart, "Could not find end of ROUTE_AUDIENCES object");
  const body = src.slice(objStart + 1, end);

  const entries = {};
  // Match: "path": ["aud", "aud"],  (skip lines that are entirely a comment)
  const re = /"([^"]+)"\s*:\s*\[([^\]]*)\]/g;
  for (const m of body.matchAll(re)) {
    const path = m[1];
    const audiences = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort();
    entries[path] = audiences;
  }
  return entries;
}

const ROUTE_AUDIENCES = extractRouteAudiences(POLICY_SRC);

// ---------- 2. Mirror of audiencesForRoles / fallbackPathFor ----------
// Kept in lockstep with src/lib/role-policy.ts. If you change the role →
// audience mapping or the fallback priority list there, update these too
// AND regenerate the snapshot (snapshot diff will remind you).

const ROLE_TO_AUDIENCES = {
  student: ["student"],
  parent: ["family"],
  guardian: ["family"],
  teacher: ["educator"],
  educator: ["educator"],
  case_manager: ["educator"],
  school_admin: ["school_admin"],
  district_admin: ["district_admin"],
  admin: ["admin"],
  partner: ["partner"],
  // unknown / "other" / "administrator" UI label → no audience
  other: [],
  unknown: [],
};

function audiencesForRoles(roles) {
  const out = new Set();
  for (const r of roles) for (const a of ROLE_TO_AUDIENCES[r] ?? []) out.add(a);
  return out;
}

function isAllowed(path, roles) {
  const req = ROUTE_AUDIENCES[path];
  if (!req) return true;
  const have = audiencesForRoles(roles);
  return req.some((r) => have.has(r));
}

function fallbackPathFor(roles) {
  const a = audiencesForRoles(roles);
  if (a.has("admin")) return "/admin";
  if (a.has("district_admin")) return "/district/overview";
  if (a.has("school_admin")) return "/school/overview";
  if (a.has("educator")) return "/caseload";
  if (a.has("partner")) return "/partners-manage";
  if (a.has("family") || a.has("student")) return "/dashboard";
  return "/onboarding";
}

// ---------- 3. Compute matrix ----------

const ROLES_UNDER_TEST = [
  ["student"],
  ["parent"],
  ["guardian"],
  ["teacher"],
  ["educator"],
  ["case_manager"],
  ["school_admin"],
  ["district_admin"],
  ["partner"],
  ["admin"],
  ["other"],
  [], // signed-in but no role rows
];

function buildMatrix() {
  const paths = Object.keys(ROUTE_AUDIENCES).sort();
  const matrix = {
    routeAudiences: Object.fromEntries(paths.map((p) => [p, ROUTE_AUDIENCES[p]])),
    fallbacks: {},
    access: {},
  };
  for (const roles of ROLES_UNDER_TEST) {
    const key = roles.length ? roles.join("+") : "(none)";
    matrix.fallbacks[key] = fallbackPathFor(roles);
    matrix.access[key] = Object.fromEntries(
      paths.map((p) => [p, isAllowed(p, roles) ? "allow" : "deny"]),
    );
  }
  return matrix;
}

const current = buildMatrix();

// ---------- 4. Snapshot diff ----------

test("route audience matrix matches committed snapshot", () => {
  const snapPath = fileURLToPath(SNAPSHOT_FILE);
  if (process.env.UPDATE_SNAPSHOTS === "1" || !existsSync(snapPath)) {
    mkdirSync(dirname(snapPath), { recursive: true });
    writeFileSync(snapPath, JSON.stringify(current, null, 2) + "\n");
    return;
  }
  const expected = JSON.parse(readFileSync(snapPath, "utf8"));
  assert.deepEqual(
    current,
    expected,
    "Route audience matrix changed.\n" +
      "If this change is intentional, regenerate the snapshot with:\n" +
      "  UPDATE_SNAPSHOTS=1 node --test tests/role-guard-matrix.test.mjs\n" +
      "Then commit tests/__snapshots__/role-guard-matrix.snap.json.",
  );
});

// ---------- 5. Every <RoleGuard path="..."> must resolve ----------

function collectRouteFiles(dirUrl) {
  const dir = fileURLToPath(dirUrl);
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...collectRouteFiles(new URL(entry.name + "/", dirUrl)));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      out.push(dir + entry.name);
    }
  }
  return out;
}

test("every <RoleGuard path=...> references a known ROUTE_AUDIENCES entry or uses inline allow=", () => {
  const files = collectRouteFiles(ROUTES_DIR);
  const offenders = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const re = /<RoleGuard\s+path="([^"]+)"([^>]*)>/g;
    for (const m of src.matchAll(re)) {
      const path = m[1];
      const rest = m[2];
      const hasAllow = /\ballow\s*=/.test(rest);
      if (!hasAllow && !(path in ROUTE_AUDIENCES)) {
        offenders.push(`${file.replace(fileURLToPath(ROOT), "")}: path="${path}"`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "Found <RoleGuard path=...> references with no matching ROUTE_AUDIENCES entry " +
      "(and no inline allow= override). Add the path to ROUTE_AUDIENCES in " +
      "src/lib/role-policy.ts, or pass allow={[...]} on the guard.\nOffenders:\n  " +
      offenders.join("\n  "),
  );
});

// /documents exposes student records and uploaded IEP metadata. Its component
// guard remains useful defense-in-depth, but direct navigation must be rejected
// before the route renders so a denied user is never left on the sensitive URL.
test("/documents beforeLoad guard matches the central route policy", () => {
  const src = readFileSync(DOCUMENTS_ROUTE_FILE, "utf8");
  const match = src.match(/beforeLoad\s*:\s*\(\)\s*=>\s*ensureRoleAccess\s*\(\s*\[([^\]]*)\]\s*\)/);

  assert.ok(match, "The /documents route must call ensureRoleAccess([...]) in beforeLoad.");

  const actual = [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]).sort();
  assert.deepEqual(
    actual,
    [...ROUTE_AUDIENCES["/documents"]].sort(),
    "The /documents beforeLoad audiences must match ROUTE_AUDIENCES.",
  );
});
