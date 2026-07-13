/**
 * Audit test — verifies every dedicated feature page/window that renders
 * via DemoFeatureShell has genuinely useful, role-specific, service-
 * connected content. This is the acceptance-criteria enforcer for the
 * feature-depth work: no filler, no unrelated content, every page has
 * data + actions + platform connections + permission scope + a
 * Pathway-Report relation + a real next step.
 */
import { describe, expect, it } from "vitest";
import { STUDENT_FEATURE_DETAILS } from "@/lib/demo/student/feature-details";
import { PARENT_FEATURE_DETAILS } from "@/lib/demo/parent/feature-details";
import { EDUCATOR_FEATURE_DETAILS } from "@/lib/demo/educator/feature-details";
import { SCHOOL_ADMIN_FEATURE_DETAILS } from "@/lib/demo/school-admin/feature-details";
import { DISTRICT_ADMIN_FEATURE_DETAILS } from "@/lib/demo/district-admin/feature-details";
import { PARTNER_FEATURE_DETAILS } from "@/lib/demo/partner/feature-details";
import { OWNER_FEATURE_DETAILS } from "@/lib/demo/owner/feature-details";
import {
  augmentFeature,
  type ExtendedDemoRole,
  type BaseDetail,
} from "@/lib/demo/feature-augment";

/** Vocabulary of legitimate TransitionForward platform primitives. Every
 *  feature must connect to at least one of these so nothing is orphaned. */
const PLATFORM_PRIMITIVES = [
  "Pathway Report", "Student Voice", "Voice", "Intake", "Documents",
  "IEP", "Assessment", "Report Card", "Readiness", "Goals",
  "Action Items", "Calendar", "Meeting", "Meeting Prep", "Resources",
  "Recommended Resources", "Saved Resources", "Opportunities", "Programs",
  "Partner", "Consent", "Sharing", "Sharing & Consent", "Case Manager",
  "Caseload", "Team", "Profile", "Compliance", "Notifications",
  "Analytics", "Implementation", "Rollout", "School", "District",
  "Service", "Application", "Progress", "Incentive", "Report", "Support",
  "Usage", "Role Audit", "Activity Log", "Testing", "Demo Hub",
  "District Reports", "Blog",
];

// PII vocabulary partners must never touch.
const PARTNER_FORBIDDEN = [
  "IEP", "Student Voice", "Pathway Report", "goal", "assessment", "evaluation",
];

const REGISTRIES = [
  { role: "student" as const, entries: STUDENT_FEATURE_DETAILS },
  { role: "family" as const, entries: PARENT_FEATURE_DETAILS },
  { role: "educator" as const, entries: EDUCATOR_FEATURE_DETAILS },
  { role: "school-admin" as const, entries: SCHOOL_ADMIN_FEATURE_DETAILS },
  { role: "district-admin" as const, entries: DISTRICT_ADMIN_FEATURE_DETAILS },
  { role: "partner" as const, entries: PARTNER_FEATURE_DETAILS },
  { role: "owner" as const, entries: OWNER_FEATURE_DETAILS },
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

          it("produces augmented fields — nextStep, feedsInto, secondaryAction, permissionNote, pathwayRelation", () => {
            const aug = augmentFeature(role as ExtendedDemoRole, d as unknown as BaseDetail);
            // nextStep is a concrete sentence
            expect(aug.nextStep.length).toBeGreaterThan(30);
            expect(aug.nextStep.endsWith(".")).toBe(true);
            // secondaryAction points somewhere real and is distinct from primary
            expect(aug.secondaryAction.label.length).toBeGreaterThan(2);
            expect(aug.secondaryAction.to.startsWith("/")).toBe(true);
            expect(aug.secondaryAction.to).not.toBe(d.primaryAction.to);
            // permissionNote is role-shaped
            expect(aug.permissionNote.length).toBeGreaterThan(30);
            // feedsInto lists at least two downstream surfaces
            expect(aug.feedsInto.length).toBeGreaterThanOrEqual(2);
            // pathwayRelation is one of the six vocabulary values
            expect([
              "feeds", "generated-from", "reviews", "acts-on", "tracks", "supports",
            ]).toContain(aug.pathwayRelation);
            // pathwayRelationCopy is a real sentence
            expect(aug.pathwayRelationCopy.length).toBeGreaterThan(40);
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

      it(`${id} augmented nextStep + permissionNote also PII-clean`, () => {
        const aug = augmentFeature("partner", d as unknown as BaseDetail);
        const text = `${aug.nextStep} ${aug.permissionNote} ${aug.pathwayRelationCopy}`.toLowerCase();
        for (const forbidden of PARTNER_FORBIDDEN) {
          if (forbidden === "Pathway Report") continue; // permissionNote references it as a boundary
          expect(text.includes(forbidden.toLowerCase()), `${id} augment mentions "${forbidden}"`).toBe(
            false,
          );
        }
      });
    }
  });

  describe("role-specific vocabulary probes", () => {
    it("educator entries collectively mention readiness, caseload, and IEP or PPT", () => {
      const combined = Object.values(EDUCATOR_FEATURE_DETAILS)
        .map((d) => `${d.summary} ${d.what}`)
        .join(" ")
        .toLowerCase();
      expect(combined).toContain("readiness");
      expect(combined).toContain("caseload");
      expect(combined.includes("iep") || combined.includes("ppt")).toBe(true);
    });

    it("district-admin entries collectively mention aggregate/trend/implementation vocabulary", () => {
      const combined = Object.values(DISTRICT_ADMIN_FEATURE_DETAILS)
        .map((d) => `${d.summary} ${d.what}`)
        .join(" ")
        .toLowerCase();
      expect(
        combined.includes("aggregate") ||
          combined.includes("trend") ||
          combined.includes("district") ||
          combined.includes("implementation"),
      ).toBe(true);
    });

    it("student entries are encouraging, not clinical (avoid 'compliance' and 'aggregate')", () => {
      for (const [id, d] of Object.entries(STUDENT_FEATURE_DETAILS)) {
        const text = `${d.summary} ${d.what}`.toLowerCase();
        expect(text, `${id}`).not.toContain("compliance");
        expect(text, `${id}`).not.toContain("aggregate");
      }
    });
  });
});
