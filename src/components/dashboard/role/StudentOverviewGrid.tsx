import {
  MessageCircleQuestion,
  Compass,
  ClipboardCheck,
  BookmarkCheck,
  CalendarDays,
  FileText,
  Target,
} from "lucide-react";
import { ToolPreviewCard, ToolPreviewGrid, ToolPreviewSection } from "../ToolPreviewCard";

/**
 * Student at-a-glance workspace tiles. Renders inside the Student Planning
 * Hub above the spoke grid so students see every key tool with a status,
 * a preview, and a direct link into the full page.
 *
 * Values are intentionally illustrative — RLS still gates the deep pages.
 */
export function StudentOverviewGrid() {
  return (
    <ToolPreviewSection
      eyebrow="Your Workspace"
      title="Your Plan, One Place"
      description="These are the tools you'll use to share your voice, build your plan, and get ready for what's next. Tap any card to jump in."
    >
      <ToolPreviewGrid>
        <ToolPreviewCard
          icon={MessageCircleQuestion}
          title="Student Voice"
          status="Share yours"
          tone="default"
          summary="Tell your team what you want, worry about, and dream of."
          bullets={[
            { label: "Prompts answered", value: "0 of 6" },
            { label: "Last update", value: "—" },
          ]}
          cta={{ label: "Open Student Voice", to: "/student-voice" }}
        />
        <ToolPreviewCard
          icon={Compass}
          title="My Pathway"
          status="In progress"
          tone="warning"
          summary="Your readiness across employment, education, independent living, and advocacy."
          bullets={[
            { label: "Readiness areas", value: "4" },
            { label: "Goals tracked", value: "3" },
          ]}
          cta={{ label: "Open my pathway", to: "/pathway" }}
        />
        <ToolPreviewCard
          icon={ClipboardCheck}
          title="Next Action"
          status="1 due"
          tone="warning"
          summary="Small next step so momentum stays with you, not the paperwork."
          bullets={[{ label: "This week", value: "1 due" }, { label: "Overdue", value: "0" }]}
          cta={{ label: "See action items", to: "/action-items" }}
        />
        <ToolPreviewCard
          icon={BookmarkCheck}
          title="Saved Resources"
          status="View library"
          tone="muted"
          summary="Guides, checklists, and tools you or your team bookmarked."
          cta={{ label: "Open saved resources", to: "/resources/saved" }}
        />
        <ToolPreviewCard
          icon={FileText}
          title="Meeting Prep"
          status="Prep now"
          tone="default"
          summary="Walk into your PPT with the questions you want answered."
          bullets={[{ label: "Prep items", value: "0" }]}
          cta={{ label: "Prep for a meeting", to: "/ppt-prep" }}
        />
        <ToolPreviewCard
          icon={CalendarDays}
          title="Upcoming Meetings"
          status="View calendar"
          tone="muted"
          summary="PPTs, IEP reviews, and check-ins in one place."
          cta={{ label: "Open calendar", to: "/meetings" }}
        />
        <ToolPreviewCard
          icon={Target}
          title="Pathway Report — Student View"
          status="Preview"
          tone="success"
          summary="Your plan, in one family-friendly document."
          cta={{ label: "Open my report", to: "/pathway/student" }}
        />
      </ToolPreviewGrid>
    </ToolPreviewSection>
  );
}
