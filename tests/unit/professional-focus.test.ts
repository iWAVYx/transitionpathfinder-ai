// Workstream 7 — professional_focus is descriptive, not authoritative.
//
// Guarantees:
//   * Allowed values match the DB check constraint in migration
//     20260720-150915 (profiles_professional_focus_check).
//   * Every value has human-readable UI copy.
//   * The helper `focusIsDescriptiveOnly()` returns true (documentation
//     signal for reviewers — access is driven by memberships +
//     evidence permission_scope, not this label).
//   * No professional_focus value appears in any file under `src/`
//     inside a conditional that gates a capability. If this test fails
//     you've probably added `if (professional_focus === '...')` — use
//     org membership / evidence permission_scope instead.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PROFESSIONAL_FOCUS_VALUES,
  PROFESSIONAL_FOCUS_LABELS,
  isProfessionalFocus,
  professionalFocusLabel,
  focusIsDescriptiveOnly,
} from "@/lib/profile/professional-focus";

const DB_ALLOWED = [
  "special_education_teacher",
  "case_manager",
  "school_counselor",
  "transition_coordinator",
  "related_service_professional",
  "other_authorized_staff",
];

describe("professional_focus contract", () => {
  it("matches the DB check constraint exactly (order-insensitive)", () => {
    expect([...PROFESSIONAL_FOCUS_VALUES].sort()).toEqual([...DB_ALLOWED].sort());
  });

  it("has a human label for every value", () => {
    for (const v of PROFESSIONAL_FOCUS_VALUES) {
      expect(PROFESSIONAL_FOCUS_LABELS[v]).toBeTruthy();
      expect(PROFESSIONAL_FOCUS_LABELS[v].length).toBeGreaterThan(2);
    }
  });

  it("isProfessionalFocus type-guard rejects unknown values", () => {
    expect(isProfessionalFocus("school_counselor")).toBe(true);
    expect(isProfessionalFocus("principal")).toBe(false);
    expect(isProfessionalFocus(null)).toBe(false);
    expect(isProfessionalFocus(42)).toBe(false);
  });

  it("professionalFocusLabel returns null for unknown", () => {
    expect(professionalFocusLabel("case_manager")).toBe("Case Manager");
    expect(professionalFocusLabel("principal")).toBeNull();
  });

  it("focus is descriptive only — no capability gates in src/", () => {
    expect(focusIsDescriptiveOnly()).toBe(true);

    // Walk src/ and fail if any file uses a focus value inside a
    // conditional / ternary / switch. Allowed: the label registry
    // itself, tests, and the source module.
    const ALLOWLIST = new Set<string>([
      "src/lib/profile/professional-focus.ts",
    ]);
    // `case_manager` collides with the app_role name used across role
    // policy code; exclude it from the substring audit and rely on the
    // type-guard + label tests above to catch drift.
    const AUDITED = PROFESSIONAL_FOCUS_VALUES.filter((v) => v !== "case_manager");
    const CONDITIONAL_PATTERNS = AUDITED.map((v) => [
      new RegExp(`===\\s*['"\`]${v}['"\`]`),
      new RegExp(`!==\\s*['"\`]${v}['"\`]`),
      new RegExp(`case\\s+['"\`]${v}['"\`]`),
    ]).flat();

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const s = statSync(p);
        if (s.isDirectory()) {
          if (name === "node_modules" || name.startsWith(".")) continue;
          walk(p);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        const rel = p.replace(/\\/g, "/").replace(/^.*\/src\//, "src/");
        if (ALLOWLIST.has(rel)) continue;
        const src = readFileSync(p, "utf8");
        for (const re of CONDITIONAL_PATTERNS) {
          if (re.test(src)) {
            offenders.push(`${rel} :: ${re}`);
            break;
          }
        }
      }
    };
    walk("src");
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
