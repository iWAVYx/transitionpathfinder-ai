import {
  Users,
  FolderOpen,
  HeartHandshake,
  FileText,
  MessageCircleQuestion,
  CheckSquare,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { ToolPreviewCard, ToolPreviewGrid, ToolPreviewSection } from "../ToolPreviewCard";

/**
 * Family/Parent at-a-glance grid — every tool a parent uses, previewed
 * with status and a jump-in CTA. Renders inside the Family Planning Hub
 * above the spoke grid.
 */
export function ParentOverviewGrid() {
  return (
    <ToolPreviewSection
      eyebrow="Your Family Workspace"
      title="Everything You Need Before The Next Meeting"
      description="Documents, priorities, prep questions, and the Pathway Report — organized so you walk into every PPT ready."
    >
      <ToolPreviewGrid>
        <ToolPreviewCard
          icon={Users}
          title="Connected Student"
          status="View profile"
          tone="default"
          summary="Grade, school, readiness, strengths, and interests — one snapshot."
          cta={{ label: "Open student hub", to: "/students" }}
        />
        <ToolPreviewCard
          icon={FolderOpen}
          title="Documents"
          status="Upload IEP"
          tone="warning"
          summary="IEPs, assessments, evaluations — organized and searchable."
          bullets={[{ label: "On file", value: "0" }, { label: "Needs review", value: "0" }]}
          cta={{ label: "Manage documents", to: "/documents" }}
        />
        <ToolPreviewCard
          icon={HeartHandshake}
          title="Family Priorities"
          status="Share now"
          tone="default"
          summary="What matters most for life after high school — feeds the Pathway Report."
          cta={{ label: "Open Family Priorities", to: "/family/priorities" }}
        />
        <ToolPreviewCard
          icon={FileText}
          title="Pathway Report — Family View"
          status="Preview"
          tone="success"
          summary="Snapshot, pathways, action plan, matched resources — in one family-friendly document."
          cta={{ label: "Open family report", to: "/pathway/family" }}
        />
        <ToolPreviewCard
          icon={MessageCircleQuestion}
          title="Meeting Prep Questions"
          status="Prep now"
          tone="default"
          summary="Family-ready questions to bring to the next PPT."
          cta={{ label: "Prep for a meeting", to: "/ppt-prep" }}
        />
        <ToolPreviewCard
          icon={CheckSquare}
          title="Action Items"
          status="View list"
          tone="muted"
          summary="Small next steps assigned to family, educator, or student."
          cta={{ label: "See action items", to: "/family/action-items" }}
        />
        <ToolPreviewCard
          icon={ShieldCheck}
          title="Sharing & Consent"
          status="Manage"
          tone="muted"
          summary="Copy family/educator report links, control what you share, revoke anytime."
          cta={{ label: "Manage sharing", to: "/family/consent" }}
        />
        <ToolPreviewCard
          icon={BookOpen}
          title="Recommended Resources"
          status="Browse"
          tone="muted"
          summary="Guides tuned to your student's grade, readiness, and priorities."
          cta={{ label: "Open resources", to: "/resources/saved" }}
        />
      </ToolPreviewGrid>
    </ToolPreviewSection>
  );
}
