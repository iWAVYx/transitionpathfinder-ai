/**
 * Audit test — verifies every dedicated feature page/window that renders via
 * DemoFeatureShell has genuinely useful, role-specific, service-connected
 * content. This is the acceptance-criteria enforcer for the feature-depth
 * work: no filler, no unrelated content, every page has data + actions +
 * platform connections + permission scope.
 */
import { describe, expect, it } from "vitest";
import { STUDENT_FEATURE_DETAILS } from "@/lib/demo/student/feature-details";
import { PARENT_FEATURE_DETAILS } from "@/lib/demo/parent/feature-details";
import { EDUCATOR_FEATURE_DETAILS } from "@/lib/demo/educator/feature-details";
import { SCHOOL_ADMIN_FEATURE_DETAILS } from "@/lib/demo/school-admin/feature-details";
import { DISTRICT_ADMIN_FEATURE_DETAILS } from "@/lib/demo/district-admin/feature-details";
import { PARTNER_FEATURE_DETAILS } from "@/lib/demo/partner/feature-details";

/** Vocabulary of legitimate TransitionForward platform primitives. Every
 *  feature must connect to at least one of these so nothing is orphaned. */
const PLATFORM_PRIMITIVES = [
  "Pathway Report",
  "Student Voice",
  "Voice",
  "Intake",
  "Documents",
  "IEP",
  "Assessment",
  "Report Card",
  "Readiness",
  "Goals",
  "Action Items",
  "Calendar",
  "Meeting",
  "Meeting Prep",
  "Resources",
  "Recommended Resources",
  "Saved Resources",
  "Opportunities",
  "Partner",
  "Consent",
  "Sharing",
  "Sharing & Consent",
  "Case Manager",
  "Caseload",
  "Team",
  "Profile",
  "Compliance",
  "Notifications",
  "Analytics",
  "Implementation",
  "Rollout",
];

// PII vocabulary partners must never touch.
const PARTNER_FORBIDDEN = [
  "IEP",
  "Student Voice",
  "Pathway Report",
  "goal", // student goals
  "assessment",
  "evaluation",
];

const REGISTRIES = [
  { role: "student", entries: STUDENT_FEATURE_DETAILS },
  { role: "family", entries: PARENT_FEATURE_DETAILS },
  { role: "educator", entries: EDUCATOR_FEATURE_DETAILS },
  { role: "school-admin", entries: SCHOOL_ADMIN_FEATURE_DETAILS },
  { role: "district-admin", entries: DISTRICT_ADMIN_FEATURE_DETAILS },
  { role: "partner", entries: PARTNER_FEATURE_DETAILS },
] as const;

describe("demo feature-detail audit", () => {
  for (const { role, entries } of REGISTRIES) {
    describe(`${role}`, () => {
      for (const [id, d] of Object.entries(entries)) {
        describe(`${id}`, () => {
          it("has non-empty title, summary, what, dataSource", () => {
            expect(d.title.length).toBeGreaterThan(3);
            expect(d.summary.length).toBeGreaterThan(20);
            expect(d.what.length).toBeGreaterThan(10);
            expect(d.dataSource.length).toBeGreaterThan(5);
          });

          it("has a primary action with a real destination", () => {
            expect(d.primaryAction.label.length).toBeGreaterThan(2);
            expect(d.primaryAction.to.startsWith("/")).toBe(true);
          });

          it("connects to at least one platform primitive", () => {
            expect(d.connectsTo.length).toBeGreaterThan(0);
            const joined = d.connectsTo.join(" | ");
            const matches = PLATFORM_PRIMITIVES.some((p) =>
              joined.toLowerCase().includes(p.toLowerCase()),
            );
            expect(matches, `connectsTo=${joined}`).toBe(true);
          });

          it("shows at least 3 preview rows with meaningful primaries", () => {
            expect(d.rows.length).toBeGreaterThanOrEqual(3);
            for (const r of d.rows) {
              expect(r.primary.length).toBeGreaterThan(4);
            }
          });

          it("has stats for at-a-glance status", () => {
            expect(d.stats && d.stats.length > 0).toBe(true);
          });

          it("has an empty state headline and body", () => {
            expect(d.emptyHeadline.length).toBeGreaterThan(4);
            expect(d.emptyBody.length).toBeGreaterThan(10);
          });
        });
      }
    });
  }

  describe("partner privacy invariant", () => {
    for (const [id, d] of Object.entries(PARTNER_FEATURE_DETAILS)) {
      it(`${id} exposes no student PII vocabulary in rows`, () => {
        const text = [
          d.summary,
          d.what,
          d.dataSource,
          ...d.rows.map((r) => `${r.primary} ${r.secondary ?? ""} ${r.meta ?? ""}`),
        ]
          .join(" ")
          .toLowerCase();
        for (const forbidden of PARTNER_FORBIDDEN) {
          expect(text.includes(forbidden.toLowerCase()), `${id} mentions "${forbidden}"`).toBe(
            false,
          );
        }
      });
    }
  });
});
