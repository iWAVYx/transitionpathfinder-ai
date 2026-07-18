import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  FolderOpen,
  FileText,
  CalendarDays,
  CheckSquare,
  ShieldCheck,
  BookOpen,
  ClipboardList,
  UserPlus,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { Pill } from "@/components/ui/pill";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import { PartnerNetworkTile } from "@/components/partner-network/PartnerNetworkTile";
import {
  ParentFeatureDrawer,
  type ParentFeatureState,
} from "@/components/dashboard/parent/ParentFeatureDrawer";
import {
  PARENT_FEATURE_DETAILS,
  type ParentFeatureId,
} from "@/lib/demo/parent/feature-details";
import { resolveDemoFeatureRoute } from "@/lib/demo/feature-routes";

type Tile = {
  featureId: ParentFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string };
  /**
   * Illustrative render state for the drawer body. Defaults to "ready".
   * Two tiles below intentionally showcase non-ready states so the
   * loading/empty polish is visible from the dashboard.
   */
  defaultState?: ParentFeatureState;
};

const TILES: Tile[] = [
  {
    featureId: "student-profile",
    icon: Users,
    title: "Connected Student",
    status: "Jordan · G11",
    tone: "default",
    summary: "One shared snapshot — school, team, strengths, and interests.",
    bullets: [
      { label: "Team members", value: "4" },
      { label: "School", value: "Hartford Regional" },
    ],
    cta: { label: "Open Profile", to: "/students" },
  },
  {
    featureId: "pathway-report",
    icon: FileText,
    title: "Pathway Report — Family View",
    status: "Draft · v4",
    tone: "success",
    summary: "Your student's plan, in plain language — pathways, priorities, and next steps.",
    bullets: [
      { label: "Sections complete", value: "5 of 7" },
      { label: "Last updated", value: "3d ago" },
    ],
    cta: { label: "Open Family Report", to: "/pathway/family" },
  },
  {
    featureId: "documents",
    icon: FolderOpen,
    title: "IEP & Documents",
    status: "1 needed",
    tone: "warning",
    summary: "Upload IEPs, evaluations, and family notes — organized and searchable.",
    bullets: [
      { label: "On file", value: "4" },
      { label: "Needs review", value: "1" },
    ],
    cta: { label: "Manage Documents", to: "/documents" },
  },
  {
    featureId: "meeting-prep",
    icon: ClipboardList,
    title: "Meeting Prep",
    status: "3 questions",
    tone: "default",
    summary: "Family-ready questions and an agenda for the next PPT / IEP.",
    bullets: [
      { label: "Next meeting", value: "Sep 15" },
      { label: "Agenda open", value: "2" },
    ],
    cta: { label: "Prep For Meeting", to: "/ppt-prep" },
  },
  {
    featureId: "calendar",
    icon: CalendarDays,
    title: "Calendar",
    status: "1 this week",
    tone: "muted",
    summary: "PPTs, IEP reviews, tours, and check-ins — one calendar for the family.",
    bullets: [{ label: "Next 30 days", value: "3" }],
    cta: { label: "Open Calendar", to: "/meetings" },
  },
  {
    featureId: "action-items",
    icon: CheckSquare,
    title: "Family Action Items",
    status: "2 due",
    tone: "warning",
    summary: "Small next steps for family, student, or educator — no task lost.",
    bullets: [
      { label: "Due this week", value: "2" },
      { label: "Overdue", value: "0" },
    ],
    cta: { label: "Open Action Items", to: "/family/action-items" },
  },
  {
    featureId: "recommended-resources",
    icon: BookOpen,
    title: "Recommended Resources",
    status: "6 matched",
    tone: "muted",
    summary: "Guides tuned to your student's grade, readiness, and family priorities.",
    bullets: [{ label: "Saved", value: "2" }],
    cta: { label: "Open Resources", to: "/family/resources/recommended" },
  },
  {
    featureId: "consent",
    icon: ShieldCheck,
    title: "Sharing & Consent",
    status: "3 people",
    tone: "muted",
    summary: "Choose who can view or edit your student's plan. Revoke anytime.",
    bullets: [{ label: "Active links", value: "1" }],
    cta: { label: "Manage Sharing", to: "/family/consent" },
  },
  {
    featureId: "invite-team",
    icon: UserPlus,
    title: "Invite Team Members",
    status: "1 pending",
    tone: "warning",
    summary: "Bring in a case manager, coach, or advocate — send an invite by email.",
    bullets: [
      { label: "Joined", value: "2" },
      { label: "Pending", value: "1" },
    ],
    cta: { label: "Send An Invite", to: "/family/invites" },
  },
];

/**
 * Family/Parent at-a-glance grid. Every tile:
 *  - has a Preview button that opens the shared ParentFeatureDrawer
 *    (which owns loading / empty / error / permission / ready variants)
 *  - has a direct link into the full feature workflow
 */
export function ParentOverviewGrid({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<ParentFeatureId | null>(null);
  const [state, setState] = useState<ParentFeatureState>("ready");

  const activeTile = TILES.find((t) => t.featureId === openFeature);

  return (
    <ToolPreviewSection
      eyebrow="Your Family Workspace"
      title="Everything You Need Before The Next Meeting"
      description="Preview any tool inline. Every card explains what it does, what feeds it, and the next step you can take today."
    >
      <ToolPreviewGrid>
        {TILES.map((tile) => (
          <ParentTile
            key={tile.featureId}
            tile={tile}
            isSample={isSample}
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
        <PartnerNetworkTile role="family" isSample={isSample} />
      </ToolPreviewGrid>

      <ParentFeatureDrawer
        featureId={openFeature}
        icon={activeTile?.icon}
        isSample={isSample}
        state={state}
        onRetry={() => {
          setState("loading");
          window.setTimeout(() => setState("ready"), 900);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setOpenFeature(null);
            setState("ready");
          }
        }}
      />

      {/* Small state switcher so anyone reviewing this dashboard can
          verify every drawer variant renders. Kept low-key. */}
      {openFeature && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center sm:justify-end sm:pr-6">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background/95 p-1 text-[11px] shadow-lift backdrop-blur">
            {(["ready", "loading", "empty", "error", "permission"] as ParentFeatureState[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(s)}
                  className={
                    state === s
                      ? "rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                      : "rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground"
                  }
                >
                  {toTitleCase(s)}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </ToolPreviewSection>
  );
}

function ParentTile({ tile, onPreview, isSample = false }: { tile: Tile; onPreview: () => void; isSample?: boolean }) {
  const Icon = tile.icon;
  const detail = PARENT_FEATURE_DETAILS[tile.featureId];
  const ctaTo = isSample ? resolveDemoFeatureRoute("family", tile.featureId) : (tile.cta.to as string);
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" aria-hidden />
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
            {toTitleCase(tile.title)}
          </h3>
        </div>
        <Pill tone={tile.tone}>{tile.status}</Pill>
      </div>
      <p className="mt-1.5 line-clamp-2 px-3.5 text-[13px] leading-snug text-muted-foreground">{tile.summary}</p>
      {tile.bullets && tile.bullets.length > 0 && (
        <dl className="mx-3.5 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
          {tile.bullets.slice(0, 4).map((b) => (
            <div key={b.label} className="flex min-w-0 flex-col">
              <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{toTitleCase(b.label)}</dt>
              <dd className="truncate text-[13px] font-semibold text-foreground">{b.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 px-3.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/80">
        {detail.rows.length} items · {detail.connectsTo.length} connected
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3.5 py-2">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          aria-label={`Preview ${tile.title}`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
        </button>
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {toTitleCase(tile.cta.label)}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

