import {
  Users,
  Gauge,
  ClipboardEdit,
  FileText,
  MessageCircleQuestion,
  NotebookPen,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import { ToolPreviewCard, ToolPreviewGrid, ToolPreviewSection } from "../ToolPreviewCard";

/**
 * Educator / Case Manager at-a-glance grid — caseload-scoped tool previews
 * shown at the top of the Caseload Planning Hub.
 */
export function EducatorOverviewGrid() {
  return (
    <ToolPreviewSection
      eyebrow="Your Caseload Workspace"
      title="Every tool for your caseload, at a glance"
      description="Each card links to the deep tool. Data respects RLS — you only see students you're assigned to."
    >
      <ToolPreviewGrid>
        <ToolPreviewCard
          icon={Users}
          title="Caseload Snapshot"
          status="Open"
          tone="default"
          summary="Every student you support — grade, readiness, and next action."
          cta={{ label: "Open caseload", to: "/caseload" }}
        />
        <ToolPreviewCard
          icon={Gauge}
          title="Student Readiness"
          status="Track"
          tone="warning"
          summary="Employment, education, independent living, and self-advocacy scores across your caseload."
          cta={{ label: "See readiness gaps", to: "/educator/readiness-gaps" }}
        />
        <ToolPreviewCard
          icon={ClipboardEdit}
          title="Pending Educator Input"
          status="Action needed"
          tone="warning"
          summary="Sections of Pathway Reports waiting on your input."
          cta={{ label: "Add input", to: "/teacher-portal" }}
        />
        <ToolPreviewCard
          icon={FileText}
          title="Pathway Reports"
          status="View all"
          tone="success"
          summary="Latest reports for your caseload — snapshot, pathways, and questions for the team."
          cta={{ label: "Open reports", to: "/reports" }}
        />
        <ToolPreviewCard
          icon={MessageCircleQuestion}
          title="Meeting Prep"
          status="Prep"
          tone="default"
          summary="PPT prep templates and question sets tailored to each student."
          cta={{ label: "Prep for meetings", to: "/ppt-prep" }}
        />
        <ToolPreviewCard
          icon={NotebookPen}
          title="Case Notes"
          status="Recent"
          tone="muted"
          summary="Quick notes tied to each student, timestamped and searchable."
          cta={{ label: "Open notes", to: "/educator/notes" }}
        />
        <ToolPreviewCard
          icon={CheckSquare}
          title="Action Items"
          status="View list"
          tone="muted"
          summary="Assign next steps to family, student, or yourself — track completion."
          cta={{ label: "See action items", to: "/educator/action-items" }}
        />
        <ToolPreviewCard
          icon={CalendarDays}
          title="Calendar"
          status="Today"
          tone="muted"
          summary="Meetings and check-ins across your caseload."
          cta={{ label: "Open calendar", to: "/meetings" }}
        />
      </ToolPreviewGrid>
    </ToolPreviewSection>
  );
}
