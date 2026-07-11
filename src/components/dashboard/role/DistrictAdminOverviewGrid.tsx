import {
  Building2,
  School,
  BarChart3,
  TrendingUp,
  Rocket,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { ToolPreviewCard, ToolPreviewGrid, ToolPreviewSection } from "../ToolPreviewCard";

export function DistrictAdminOverviewGrid() {
  return (
    <ToolPreviewSection
      eyebrow="Your District Workspace"
      title="District Readiness And Adoption"
      description="Roll-ups across every connected school — implementation progress, readiness trends, and service gaps that need attention."
    >
      <ToolPreviewGrid>
        <ToolPreviewCard
          icon={Building2}
          title="District Overview"
          status="Current"
          tone="default"
          summary="Students, schools, and reports across the district."
          cta={{ label: "Open district overview", to: "/district/overview" }}
        />
        <ToolPreviewCard
          icon={School}
          title="Connected Schools"
          status="Manage"
          tone="muted"
          summary="Every school onboarded, their admin, and their activity."
          cta={{ label: "Open schools", to: "/district/schools" }}
        />
        <ToolPreviewCard
          icon={BarChart3}
          title="School-by-School Progress"
          status="Compare"
          tone="default"
          summary="Planning status, report completion, and support-needs — by school."
          cta={{ label: "Compare schools", to: "/district/progress" }}
        />
        <ToolPreviewCard
          icon={TrendingUp}
          title="Readiness Trend"
          status="This term"
          tone="success"
          summary="District-wide movement across the four readiness domains."
          cta={{ label: "Open readiness trends", to: "/district/readiness-trends" }}
        />
        <ToolPreviewCard
          icon={Rocket}
          title="Implementation Progress"
          status="Track"
          tone="warning"
          summary="Where each school is in the rollout — onboarding, active, mature."
          cta={{ label: "Open implementation", to: "/district/implementation" }}
        />
        <ToolPreviewCard
          icon={FileText}
          title="District Reports"
          status="View"
          tone="muted"
          summary="Aggregate Pathway Report generation and outcomes."
          cta={{ label: "Open reports", to: "/district/reports" }}
        />
        <ToolPreviewCard
          icon={AlertTriangle}
          title="Service Gaps"
          status="Watch"
          tone="critical"
          summary="Programs, providers, or supports missing where students need them."
          cta={{ label: "Open service gaps", to: "/district/service-gaps" }}
        />

      </ToolPreviewGrid>
    </ToolPreviewSection>
  );
}
