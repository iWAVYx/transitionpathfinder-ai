import {
  Building2,
  ClipboardList,
  Users,
  FileText,
  TrendingUp,
  BookOpen,
  LifeBuoy,
} from "lucide-react";
import { ToolPreviewCard, ToolPreviewGrid, ToolPreviewSection } from "../ToolPreviewCard";

export function SchoolAdminOverviewGrid() {
  return (
    <ToolPreviewSection
      eyebrow="Your School Workspace"
      title="School-Level Implementation, At A Glance"
      description="Planning status, team activity, and readiness trends across your school. Every tile deep-links into the underlying report."
    >
      <ToolPreviewGrid>
        <ToolPreviewCard
          icon={Building2}
          title="School Overview"
          status="Current"
          tone="default"
          summary="Students in transition planning, active goals, and current status."
          bullets={[
            { label: "In planning", value: "—" },
            { label: "Reports generated", value: "—" },
          ]}
          cta={{ label: "Open school overview", to: "/school/overview" }}
        />
        <ToolPreviewCard
          icon={ClipboardList}
          title="Planning Status by Grade"
          status="Track"
          tone="warning"
          summary="Which grade bands are on-pace vs. behind on transition planning."
          cta={{ label: "Open planning status", to: "/school/planning-status" }}
        />
        <ToolPreviewCard
          icon={Users}
          title="Team Activity"
          status="Recent"
          tone="muted"
          summary="Case manager and teacher activity across the school."
          cta={{ label: "Open team", to: "/school/team" }}
        />
        <ToolPreviewCard
          icon={FileText}
          title="Report Completion"
          status="View"
          tone="success"
          summary="Percentage of Pathway Reports generated and shared with families."
          cta={{ label: "Open reports", to: "/school/reports" }}
        />
        <ToolPreviewCard
          icon={TrendingUp}
          title="Readiness Trend"
          status="This term"
          tone="default"
          summary="Movement across the four readiness domains, aggregated at the school level."
          cta={{ label: "Open readiness trends", to: "/school/readiness-trends" }}
        />
        <ToolPreviewCard
          icon={BookOpen}
          title="Resource Usage"
          status="Bookmarked"
          tone="muted"
          summary="Guides and checklists you've saved to share with your school team."
          cta={{ label: "Open resource usage", to: "/school/resource-usage" }}
        />
        <ToolPreviewCard
          icon={LifeBuoy}
          title="Support Needs"
          status="Watch"
          tone="warning"
          summary="Students at your school flagged for additional transition support."
          cta={{ label: "Open support needs", to: "/school/support-needs" }}
        />

      </ToolPreviewGrid>
    </ToolPreviewSection>
  );
}
