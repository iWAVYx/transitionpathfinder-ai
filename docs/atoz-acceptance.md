# TransitionForward A-to-Z Acceptance Sweep

Status against the 22-point service-logic checklist after the 6-phase pass.
Pass = wired end-to-end and visible in product. Partial = present but needs
deeper polish in a follow-up. N/A = explicitly out of scope per the brief.

| # | Capability | Status | Notes |
|---|---|---|---|
| 1 | Role-aware sign-up & onboarding (family, student, educator/CM, school admin, district admin, partner, platform admin) | Pass | Existing onboarding + RoleGuard. Wording sweep done in Phase 1. |
| 2 | Create or connect to a student | Pass | Empty-state CTAs updated to point to /students/new. |
| 3 | A-to-Z journey legible from every dashboard | Pass | `JourneyStrip` + role-tuned `NextBestAction`. |
| 4 | Student profile is the hub | Pass | `ProfileCompleteness` chip + section coverage audit (Phase 2). |
| 5 | IEP upload — multiple entry points | Pass | `FamilyDocumentUpload` exposed from student page, family dashboard, onboarding. |
| 6 | IEP upload — type / details / consent | Pass | Phase 3 added school_year, meeting/effective/review dates, visibility, consent checkbox. |
| 7 | Document permissions (per-user + per-role) | Pass | `document_permissions` table + `can_view_document` + `DocumentPermissionsDialog`. |
| 8 | Partners hard-blocked from IEPs | Pass | RLS through `can_access_student`; permissions table does not grant partner audience by default. |
| 9 | Guided IEP extraction (section review) | Pass | `document_extractions` + `/documents/$id/review` route with Accept / Edit / Reject / Uncertain. |
| 10 | Only accepted extractions write through to profile | Pass | `applyAcceptedExtraction` filters by accepted/edited state. |
| 11 | Pathway Report draws from IEP + voice + family + educator | Pass | `generateReport` already merges intake fields; extraction feeds profile that intake reads from. |
| 12 | Pathway Report version history | Pass | `pathway_report_versions` + `ReportVersionsPanel` (Phase 5). |
| 13 | Pathway Report sharing (family + educator links) | Pass | Existing `share_tokens` flow. |
| 14 | Meeting Prep pulls latest report for a student | Pass | `getLatestReportForStudent` helper (Phase 5). |
| 15 | Action items (create from report, resources, partners) | Pass | Existing buttons audited; gaps filled in Phase 6. |
| 16 | Calendar surfaces meetings, review dates, action items | Pass | Existing `calendar_events` wiring; review_date now flows in via Phase 3 metadata. |
| 17 | Resource Library — save resources to a student | Pass | Existing `saved_resources` + `RecommendedResourcesPanel`. |
| 18 | Partner Network — match + save | Pass | Existing partner matching + `student_saved_partners`. |
| 19 | Privacy / AI disclaimer on sensitive surfaces | Pass | `AIDisclaimer` + `TrustNote` on upload, extraction review, report. |
| 20 | Audit log for document views, permission grants, extraction reviews | Pass | `logDocumentView`, grant/revoke audit entries, extraction apply log (Phase 6). |
| 21 | Continue updating the student's pathway over time | Pass | Profile + report editing + version history together enable iteration. |
| 22 | Pathway Report PDF export | Partial | Print-to-PDF works today; native export is explicitly out of scope. |

## Out of scope (per brief)

- No visual redesign, no branding changes.
- No structural changes to Admin Hub, Resource Library, Partner Network, Calendar, Action Items, or Pathway Report layout.
- No new auth providers, no role renames.

## Follow-ups parked for future passes

- Source badges ("From IEP", "From Voice", etc.) inline in `ReportView` —
  deferred to avoid invasive edits to a 2,000+ line file. The version-history
  surface gives reviewers an alternative way to see what fed each save.
- Native PDF export endpoint for Pathway Reports.
- Calendar backfill helper for older students whose review/meeting dates were
  set before Phase 3 metadata existed.
