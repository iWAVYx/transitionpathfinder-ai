import {
  UserCog,
  Sparkles,
  ClipboardList,
  CalendarClock,
  Settings2,
  Award,
  BookOpen,
  ShieldAlert,
} from "lucide-react";
import { ToolPreviewCard, ToolPreviewGrid, ToolPreviewSection } from "../ToolPreviewCard";

/**
 * Partner dashboard tiles. CRITICAL: partners MUST NOT see any student
 * PII, documents, voice, goals, meetings, or pathway reports. Every CTA
 * here points to partner-scoped surfaces only.
 */
export function PartnerOverviewGrid() {
  return (
    <ToolPreviewSection
      eyebrow="Your Partner Workspace"
      title="Publish opportunities. Reach the right families."
      description="Partners never see student data. Everything here is partner-scoped: your profile, your opportunities, and PartnerForward supports."
    >
      <ToolPreviewGrid>
        <ToolPreviewCard
          icon={UserCog}
          title="Partner Profile"
          status="Complete"
          tone="warning"
          summary="Organization details, mission, service areas, and contact."
          bullets={[{ label: "Completion", value: "60%" }]}
          cta={{ label: "Edit profile", to: "/partners-manage/profile" }}
        />
        <ToolPreviewCard
          icon={Sparkles}
          title="Active Opportunities"
          status="Manage"
          tone="success"
          summary="Programs, jobs, and services currently visible to families."
          bullets={[{ label: "Published", value: "—" }]}
          cta={{ label: "See active opportunities", to: "/partners-manage/opportunities" }}
        />
        <ToolPreviewCard
          icon={ClipboardList}
          title="Submitted Programs"
          status="Pending review"
          tone="warning"
          summary="Program submissions awaiting admin approval."
          cta={{ label: "See submissions", to: "/partners-manage/opportunities" }}
        />
        <ToolPreviewCard
          icon={CalendarClock}
          title="Application Windows"
          status="This month"
          tone="default"
          summary="Application links and contact info for every published opportunity."
          cta={{ label: "Open windows", to: "/partners-manage/deadlines" }}
        />
        <ToolPreviewCard
          icon={Settings2}
          title="Opportunity Management"
          status="Edit"
          tone="muted"
          summary="Publish, unpublish, and update opportunities and program details."
          cta={{ label: "Open management", to: "/partners-manage/opportunities" }}
        />
        <ToolPreviewCard
          icon={Award}
          title="PartnerForward Incentives"
          status="Explore"
          tone="success"
          summary="Grants, subsidies, and coaching that reward partners who support transition-age youth."
          cta={{ label: "Open incentives", to: "/partnerforward/incentives" }}
        />
        <ToolPreviewCard
          icon={BookOpen}
          title="Partner Resources"
          status="Library"
          tone="muted"
          summary="Playbooks, templates, and best-practice guides for partners."
          cta={{ label: "Open resources", to: "/partnerforward" }}
        />

      </ToolPreviewGrid>
      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Partners never see student data.</strong> No IEPs, no documents,
            no student voice, no goals, no meetings, no pathway reports. Everything on
            this dashboard is partner-scoped.
          </span>
        </p>
      </div>
    </ToolPreviewSection>
  );
}
