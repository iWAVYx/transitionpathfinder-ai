import { createFileRoute, notFound, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { RouteErrorComponent } from "@/components/routing/RouteErrorComponent";
import { DemoFeatureShell } from "@/components/demo/DemoFeatureShell";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { getParentFeatureDetails, type ParentFeatureId } from "@/lib/demo/parent/feature-details";
import {
  getStudentFeatureDetails,
  type StudentFeatureId,
} from "@/lib/demo/student/feature-details";
import {
  getEducatorFeatureDetails,
  type EducatorFeatureId,
} from "@/lib/demo/educator/feature-details";
import { DemoStudentVoicePreview } from "@/components/demo/DemoStudentVoicePreview";
import { demoCalendarEvents } from "@/lib/demo/calendar-preview";
import { FamilyMeetingPrepCard } from "@/components/dashboard/FamilyMeetingPrepCard";
// PartnerImpactSummaryCard requires an orgId and doesn't ship a sample mode —
// it's intentionally omitted from the rich-module map below.
import { PartnerNetworkPage } from "@/components/partner-network/PartnerNetworkPage";
import type { RoleAudience } from "@/lib/role-policy";
import { PathwayReport } from "@/components/demo/PathwayReport";
import { getDemoProfile, type DemoProfileId } from "@/lib/demo/demo-profiles";
import { DemoPlanningActions } from "@/components/demo/DemoPlanningActions";
import { demoFamilyMeetingPrep } from "@/lib/demo/meeting-preview";
import { TransitionCalendar } from "@/components/calendar/TransitionCalendar";
import { type SampleCalendarRole } from "@/lib/calendar/sample-events";
import { getDemoFeature, isDemoRole, type DemoRole } from "@/lib/demo/feature-routes";
import {
  getSchoolAdminFeatureDetails,
  type SchoolAdminFeatureId,
} from "@/lib/demo/school-admin/feature-details";
import {
  getDistrictAdminFeatureDetails,
  type DistrictAdminFeatureId,
} from "@/lib/demo/district-admin/feature-details";
import {
  getPartnerFeatureDetails,
  type PartnerFeatureId,
} from "@/lib/demo/partner/feature-details";
import { useDemoSchool, useDemoDistrict, useDemoPartnerPlan } from "@/lib/demo/use-role-context";

/**
 * Dedicated demo feature page. One dynamic route serves every
 * (role, featureId) combination. Renders the shared demo shell +
 * generic feature body from the role's feature-details fixture,
 * and layers in the same signed-in module component where one
 * exists so the demo behaves like the real product.
 */
export const Route = createFileRoute("/demo_/feature/$role/$slug")({
  loader: ({ params }) => {
    if (!isDemoRole(params.role)) throw notFound();
    const detail = getDemoFeature(params.role, params.slug);
    if (!detail) throw notFound();
    return { role: params.role, slug: params.slug };
  },
  head: ({ loaderData, params }) => {
    const detail = loaderData ? getDemoFeature(loaderData.role, loaderData.slug) : null;
    const title = detail
      ? `${detail.title} Preview — TransitionForward Demo`
      : "Feature Preview — TransitionForward Demo";
    const description = detail?.summary ?? "Preview a TransitionForward feature with sample data.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: DemoFeaturePage,
  notFoundComponent: UnavailablePreview,
  errorComponent: RouteErrorComponent,
});

function UnavailablePreview() {
  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Preview not available</h1>
      <p className="mt-3 text-muted-foreground">
        This preview is not available for this role. Explore the supported tools from the demo
        dashboards.
      </p>
      <a
        href="/demo"
        className="mt-5 inline-flex rounded-full border px-4 py-2 text-sm font-semibold text-primary"
      >
        Back to demo dashboards
      </a>
    </main>
  );
}

function DemoFeaturePage() {
  const { role, slug } = Route.useParams();
  // Keep an invalid/retired preview safe during hydration as well as navigation.
  if (!isDemoRole(role) || !getDemoFeature(role, slug)) return <UnavailablePreview />;
  return <DemoFeatureContent role={role} slug={slug} />;
}

function DemoFeatureContent({ role, slug }: { role: DemoRole; slug: string }) {
  const demoRole = role as DemoRole;
  const { profileId, hydrated } = useDemoStudent();
  const location = useRouterState({ select: (state) => state.location });
  const navigate = useNavigate();
  const selected = (location.search as Record<string, unknown>).student;
  useEffect(() => {
    if (
      !hydrated ||
      !["family", "student", "educator"].includes(demoRole) ||
      selected === profileId
    )
      return;
    void navigate({
      to: location.pathname,
      search: (previous: Record<string, unknown>) => ({ ...previous, student: profileId }),
      hash: location.hash,
      replace: true,
      resetScroll: false,
    });
  }, [hydrated, demoRole, selected, profileId, navigate, location.pathname, location.hash]);
  const contextual = useContextualDetail(demoRole, slug) ?? getDemoFeature(demoRole, slug)!;
  const detail =
    slug === "calendar"
      ? {
          ...contextual,
          stats: [
            {
              label: "Sample events",
              value: String(demoCalendarEvents(demoRole, getDemoProfile(profileId)).length),
            },
          ],
          rows: demoCalendarEvents(demoRole, getDemoProfile(profileId)).map((event) => ({
            primary: event.title,
            secondary: event.description ?? "Illustrative event — see the sample calendar above.",
            meta: event.scope,
          })),
        }
      : contextual;
  const richModule = renderRichModule(demoRole, slug, profileId);
  return <DemoFeatureShell role={demoRole} detail={detail} richModule={richModule} />;
}

/**
 * Resolves the feature detail against the active demo context so the
 * dedicated feature page reflects the currently selected School / District
 * profile or Partner listing plan. Falls back to the static registry
 * (used for roles without a context selector).
 */
function useContextualDetail(role: DemoRole, slug: string) {
  const { profileId } = useDemoStudent();
  const { schoolId, school } = useDemoSchool();
  const { districtId, district } = useDemoDistrict();
  const { planId } = useDemoPartnerPlan();
  if (role === "family") return getParentFeatureDetails(profileId)[slug as ParentFeatureId] ?? null;
  if (role === "student")
    return getStudentFeatureDetails(profileId)[slug as StudentFeatureId] ?? null;
  if (role === "educator")
    return getEducatorFeatureDetails(profileId)[slug as EducatorFeatureId] ?? null;
  if (role === "school-admin") {
    const detail = getSchoolAdminFeatureDetails(schoolId)[slug as SchoolAdminFeatureId];
    return detail ? { ...detail, eyebrow: `${school.shortName} · ${detail.eyebrow}` } : null;
  }
  if (role === "district-admin") {
    const detail = getDistrictAdminFeatureDetails(districtId)[slug as DistrictAdminFeatureId];
    return detail ? { ...detail, eyebrow: `${district.shortName} · ${detail.eyebrow}` } : null;
  }
  if (role === "partner") {
    return getPartnerFeatureDetails(planId)[slug as PartnerFeatureId] ?? null;
  }
  return null;
}

function renderRichModule(role: DemoRole, slug: string, profileId: DemoProfileId): React.ReactNode {
  const key = `${role}:${slug}`;
  switch (key) {
    // Student
    case "student:student-voice":
      return <DemoStudentVoicePreview profile={getDemoProfile(profileId)} />;
    case "student:pathway-report":
      return <PathwayReport profile={getDemoProfile(profileId)} audience="student" />;
    case "student:action-items":
      return <DemoPlanningActions profile={getDemoProfile(profileId)} audience="student" />;
    // Family
    // The contextual document rows below are the preview; avoid fixed Jordan IEP copy.
    case "family:documents":
      return null;
    case "family:meeting-prep":
      return (
        <FamilyMeetingPrepCard isSample data={demoFamilyMeetingPrep(getDemoProfile(profileId))} />
      );
    case "family:recommended-resources":
      return null; // Use the selected context's existing rows and metrics below.
    case "family:pathway-report":
      return <PathwayReport profile={getDemoProfile(profileId)} audience="family" />;
    case "family:student-profile":
      return null; // Contextual student rows, not a partner candidate-matching panel.
    case "family:action-items":
      return <DemoPlanningActions profile={getDemoProfile(profileId)} audience="family" />;
    // Educator
    case "educator:pathway-reports":
      return null; // Use the selected context's existing rows and metrics below.
    case "educator:pending-input":
      return null; // Use the selected context's existing rows and metrics below.
    case "educator:caseload":
      return null; // Use the selected context's existing rows and metrics below.
    case "educator:action-items":
      return <DemoPlanningActions profile={getDemoProfile(profileId)} audience="educator" />;
    case "educator:meeting-prep":
      return null; // Contextual meeting rows; do not substitute a fixed caseload timeline.
    // School Admin
    case "school-admin:report-completion":
      return null; // Use the selected context's existing rows and metrics below.
    case "school-admin:planning-status":
      return null; // Use the selected context's existing rows and metrics below.
    case "school-admin:school-overview":
      return null; // Use the selected context's existing rows and metrics below.
    // District Admin
    case "district-admin:district-reports":
      return null; // Use the selected context's existing rows and metrics below.
    case "district-admin:school-progress":
      return null; // Use the selected context's existing rows and metrics below.
    case "district-admin:readiness-trend":
      return null; // Use the selected context's existing rows and metrics below.
    // Partner
    case "partner:active-opportunities":
      return null; // Opportunity rows do not imply access to private student matches.
    default: {
      // Partner Network shares one rich module across every applicable role.
      if (slug === "partner-network") {
        const audience = mapDemoRoleToAudience(role);
        if (!audience) return null;
        return <PartnerNetworkPage audienceOverride={audience} demo bare />;
      }
      // Calendar features share one rich module across every role.
      if (slug === "calendar") {
        const calRole = mapRoleForCalendar(role);
        return (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              Fictional example dates only. These are not scheduled meetings, invitations, or live
              reminders.
            </p>
            <TransitionCalendar
              events={demoCalendarEvents(role, getDemoProfile(profileId))}
              sample
              initialView="month"
              eyebrow={eyebrowForRole(calRole)}
              exportFilename={`transitionforward-demo-${calRole}-calendar`}
              emptyStateTitle="Nothing on the calendar yet."
              emptyStateBody={emptyStateBodyForRole(calRole)}
            />
          </div>
        );
      }
      return null;
    }
  }
}

function mapRoleForCalendar(role: DemoRole): SampleCalendarRole {
  // DemoRole and SampleCalendarRole share the same string set today.
  return role as SampleCalendarRole;
}

function mapDemoRoleToAudience(role: DemoRole): RoleAudience | null {
  switch (role) {
    case "student":
      return "student";
    case "family":
      return "family";
    case "educator":
      return "educator";
    case "school-admin":
      return "school_admin";
    case "district-admin":
      return "district_admin";
    case "partner":
      return "partner";
    case "owner":
      return "admin";
    default:
      return null;
  }
}

function eyebrowForRole(role: SampleCalendarRole): string {
  switch (role) {
    case "student":
      return "Your Calendar";
    case "family":
      return "Family Calendar";
    case "educator":
      return "Caseload Calendar";
    case "school-admin":
      return "School Calendar";
    case "district-admin":
      return "District Calendar";
    case "partner":
      return "Partner Calendar";
    case "owner":
      return "Platform Calendar";
  }
}

function emptyStateBodyForRole(role: SampleCalendarRole): string {
  switch (role) {
    case "student":
      return "Your PPT meetings, action-item deadlines, and tour dates will land here as your team schedules them.";
    case "family":
      return "PPT meetings, document deadlines, consent renewals, and family action items land here.";
    case "educator":
      return "Caseload meetings, report review deadlines, and student action-item due dates land here.";
    case "school-admin":
      return "Planning-status milestones, PD sessions, and report deadlines land here.";
    case "district-admin":
      return "District rollout milestones, training dates, and reporting deadlines land here.";
    case "partner":
      return "Program dates, application windows, and renewal reminders land here.";
    case "owner":
      return "Launch reviews, feedback triage, and system checks land here.";
  }
}
