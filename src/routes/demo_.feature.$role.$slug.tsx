import { createFileRoute, notFound } from "@tanstack/react-router";
import { DemoFeatureShell } from "@/components/demo/DemoFeatureShell";
import { StudentVoiceModule } from "@/components/dashboard/student-voice/StudentVoiceModule";
import { IepTranslatorCard } from "@/components/dashboard/IepTranslatorCard";
import { FamilyMeetingPrepCard } from "@/components/dashboard/FamilyMeetingPrepCard";
import { AdvocacyResourcesCard } from "@/components/dashboard/AdvocacyResourcesCard";
import { EvidenceReviewCard } from "@/components/dashboard/EvidenceReviewCard";
import { DataGapsCard } from "@/components/dashboard/DataGapsCard";
import { ComplianceOverviewCard } from "@/components/dashboard/ComplianceOverviewCard";
import { TransitionEvidenceCard } from "@/components/dashboard/TransitionEvidenceCard";
import { CaseloadRollupsCard } from "@/components/dashboard/CaseloadRollupsCard";
import { DistrictComplianceCard } from "@/components/dashboard/DistrictComplianceCard";
import { DistrictEvidenceCoverageCard } from "@/components/dashboard/DistrictEvidenceCoverageCard";
import { DistrictTrendMetricsCard } from "@/components/dashboard/DistrictTrendMetricsCard";
// PartnerImpactSummaryCard requires an orgId and doesn't ship a sample mode —
// it's intentionally omitted from the rich-module map below.
import { PartnerMatchesCard } from "@/components/dashboard/PartnerMatchesCard";
import {
  getDemoFeature,
  isDemoRole,
  type DemoRole,
} from "@/lib/demo/feature-routes";

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
    const detail = loaderData
      ? getDemoFeature(loaderData.role, loaderData.slug)
      : null;
    const title = detail ? `${detail.title} Preview — TransitionForward Demo` : "Feature Preview — TransitionForward Demo";
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
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Preview not available</h1>
      <p className="mt-3 text-muted-foreground">
        That demo feature doesn't exist yet. Head back to the demo dashboards.
      </p>
    </div>
  ),
});

function DemoFeaturePage() {
  const { role, slug } = Route.useLoaderData();
  const detail = getDemoFeature(role as DemoRole, slug)!;
  const richModule = renderRichModule(role as DemoRole, slug);
  return <DemoFeatureShell role={role as DemoRole} detail={detail} richModule={richModule} />;
}

function renderRichModule(role: DemoRole, slug: string): React.ReactNode {
  const key = `${role}:${slug}`;
  switch (key) {
    // Student
    case "student:student-voice":
      return <StudentVoiceModule />;
    // Family
    case "family:documents":
      return <IepTranslatorCard isSample />;
    case "family:meeting-prep":
      return <FamilyMeetingPrepCard isSample />;
    case "family:recommended-resources":
      return <AdvocacyResourcesCard isSample />;
    // Educator
    case "educator:pathway-reports":
      return <EvidenceReviewCard isSample />;
    case "educator:pending-input":
      return <DataGapsCard isSample />;
    case "educator:caseload":
      return <CaseloadRollupsCard isSample />;
    // School Admin
    case "school-admin:report-completion":
      return <ComplianceOverviewCard isSample />;
    case "school-admin:planning-status":
      return <TransitionEvidenceCard isSample />;
    case "school-admin:school-overview":
      return <CaseloadRollupsCard isSample />;
    // District Admin
    case "district-admin:district-reports":
      return <DistrictComplianceCard isSample />;
    case "district-admin:school-progress":
      return <DistrictEvidenceCoverageCard isSample />;
    case "district-admin:readiness-trend":
      return <DistrictTrendMetricsCard isSample />;
    // Partner
    case "partner:active-opportunities":
      return <PartnerMatchesCard isSample />;
    default:
      return null;
  }
}
