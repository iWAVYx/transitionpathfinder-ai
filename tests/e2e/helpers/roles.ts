/**
 * Shared role table for the dashboard regression suite.
 *
 * Each entry maps an app role to:
 *  - the storage-state file produced by auth-roles.setup.ts
 *  - the env vars holding that role's seeded test credentials
 *  - the dashboard route the role should land on (matches
 *    fallbackPathFor() in src/lib/role-policy.ts)
 *  - the headings / nav items that MUST appear when the dashboard renders
 *  - any role-specific surfaces that MUST NOT appear (PII gates etc.)
 *
 * Credentials follow the convention used elsewhere in tests/:
 *   E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD
 * When a role's creds are missing the corresponding spec auto-skips so PRs
 * from forks (no secrets) don't fail the suite.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "..", ".auth");

export type RoleKey =
  | "student"
  | "parent"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "owner";

export interface RoleSpec {
  key: RoleKey;
  label: string;
  storageState: string;
  emailEnv: string;
  passwordEnv: string;
  dashboard: string;
  mustSee: RegExp[];      // headings / labels that must render
  mustNotSee: RegExp[];   // surfaces that would indicate a role leak
}

export const ROLES: RoleSpec[] = [
  {
    key: "student",
    label: "Student",
    storageState: path.join(AUTH_DIR, "student.json"),
    emailEnv: "E2E_STUDENT_EMAIL",
    passwordEnv: "E2E_STUDENT_PASSWORD",
    dashboard: "/dashboard",
    mustSee: [/next best/i],
    mustNotSee: [/caseload/i, /admin hub/i, /partner network/i],
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    storageState: path.join(AUTH_DIR, "parent.json"),
    emailEnv: "E2E_PARENT_EMAIL",
    passwordEnv: "E2E_PARENT_PASSWORD",
    dashboard: "/dashboard",
    mustSee: [/next best|pathway|goals/i],
    mustNotSee: [/caseload/i, /partner network/i, /platform admin/i],
  },
  {
    key: "educator",
    label: "Educator / Case Manager",
    storageState: path.join(AUTH_DIR, "educator.json"),
    emailEnv: "E2E_EDUCATOR_EMAIL",
    passwordEnv: "E2E_EDUCATOR_PASSWORD",
    dashboard: "/caseload",
    mustSee: [/caseload/i],
    mustNotSee: [/platform admin/i, /partner network/i],
  },
  {
    key: "school_admin",
    label: "School Administrator",
    storageState: path.join(AUTH_DIR, "school_admin.json"),
    emailEnv: "E2E_SCHOOL_ADMIN_EMAIL",
    passwordEnv: "E2E_SCHOOL_ADMIN_PASSWORD",
    dashboard: "/school/overview",
    mustSee: [/school/i],
    mustNotSee: [/platform admin/i],
  },
  {
    key: "district_admin",
    label: "District Administrator",
    storageState: path.join(AUTH_DIR, "district_admin.json"),
    emailEnv: "E2E_DISTRICT_ADMIN_EMAIL",
    passwordEnv: "E2E_DISTRICT_ADMIN_PASSWORD",
    dashboard: "/district/overview",
    mustSee: [/district/i],
    mustNotSee: [/platform admin/i],
  },
  {
    key: "partner",
    label: "Partner Organization",
    storageState: path.join(AUTH_DIR, "partner.json"),
    emailEnv: "E2E_PARTNER_EMAIL",
    passwordEnv: "E2E_PARTNER_PASSWORD",
    dashboard: "/partners-manage",
    mustSee: [/partner|opportunit/i],
    // Partners must never see student PII surfaces.
    mustNotSee: [/caseload/i, /goals/i, /documents/i, /platform admin/i],
  },
  {
    key: "owner",
    label: "Platform Admin",
    storageState: path.join(AUTH_DIR, "owner.json"),
    emailEnv: "E2E_OWNER_EMAIL",
    passwordEnv: "E2E_OWNER_PASSWORD",
    dashboard: "/admin",
    mustSee: [/admin/i],
    mustNotSee: [],
  },
];

export const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
] as const;
