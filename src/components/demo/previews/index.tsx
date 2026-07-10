/**
 * Demo preview registry with lazy loading, skeleton fallback, and error
 * boundary. Runtime issues inside a single inline demo preview must never
 * crash the surrounding dashboard tile grid.
 */
import {
  Component,
  Suspense,
  lazy,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

type PreviewModule = { default: ComponentType };

// Split the components chunk out of the main bundle and expose each named
// export as its own lazy component. Any load-time error surfaces via the
// error boundary below instead of taking down the dashboard.
const load = () =>
  import("./components") as unknown as Promise<Record<string, ComponentType>>;

const lazyPreview = (name: string) =>
  lazy(async (): Promise<PreviewModule> => {
    const mod = await load();
    const Cmp = mod[name];
    if (!Cmp) {
      throw new Error(`Demo preview "${name}" is not exported from ./components`);
    }
    return { default: Cmp };
  });

export const DEMO_PREVIEWS = {
  calendar: lazyPreview("PreviewCalendar"),
  "meeting-prep": lazyPreview("PreviewMeetingPrep"),
  "saved-resources": lazyPreview("PreviewSavedResources"),
  documents: lazyPreview("PreviewDocuments"),
  consent: lazyPreview("PreviewConsent"),
  caseload: lazyPreview("PreviewCaseload"),
  "readiness-gaps": lazyPreview("PreviewReadinessGaps"),
  notes: lazyPreview("PreviewNotes"),
  "team-activity": lazyPreview("PreviewTeamActivity"),
  "report-completion": lazyPreview("PreviewReportCompletion"),
  trends: lazyPreview("PreviewTrends"),
  "schools-list": lazyPreview("PreviewSchoolsList"),
  "school-progress": lazyPreview("PreviewSchoolProgress"),
  "service-gaps": lazyPreview("PreviewServiceGaps"),
  "resource-usage": lazyPreview("PreviewResourceUsage"),
  "support-needs": lazyPreview("PreviewSupportNeeds"),
  opportunities: lazyPreview("PreviewOpportunities"),
  deadlines: lazyPreview("PreviewDeadlines"),
  partnerforward: lazyPreview("PreviewPartnerForward"),
  "partner-profile": lazyPreview("PreviewPartnerProfile"),
  "partner-submissions": lazyPreview("PreviewPartnerSubmissions"),
  waitlist: lazyPreview("PreviewWaitlist"),
  contacts: lazyPreview("PreviewContacts"),
  "resource-queue": lazyPreview("PreviewResourceQueue"),
  "system-health": lazyPreview("PreviewSystemHealth"),
  outreach: lazyPreview("PreviewOutreach"),
} as const;

export type DemoPreviewId = keyof typeof DEMO_PREVIEWS;

/* -------------------------------------------------------------------------- */
/* Skeletons — variants per preview shape                                     */
/* -------------------------------------------------------------------------- */

type SkeletonVariant = "list" | "bars";

// Previews that render stacked label + % + horizontal bar rows.
const BAR_PREVIEWS = new Set<DemoPreviewId>(["readiness-gaps", "school-progress"]);

function getSkeletonVariant(id: DemoPreviewId): SkeletonVariant {
  return BAR_PREVIEWS.has(id) ? "bars" : "list";
}

function SkeletonFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3"
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

function SkeletonListRow({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/40 py-1.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-3 animate-pulse rounded bg-muted-foreground/15" style={{ width: left }} />
      </div>
      {right ? (
        <div
          className="h-3 shrink-0 animate-pulse rounded bg-muted-foreground/10"
          style={{ width: right }}
        />
      ) : null}
    </div>
  );
}

const LIST_ROWS: Array<{ left: string; right?: string }> = [
  { left: "70%", right: "28px" },
  { left: "55%", right: "44px" },
  { left: "65%", right: "34px" },
];

const BAR_ROW_WIDTHS = [62, 48, 81];

export function DemoPreviewSkeleton({
  variant = "list",
}: { variant?: SkeletonVariant } = {}) {
  if (variant === "bars") {
    return (
      <SkeletonFrame label="Loading chart preview">
        <div className="space-y-2.5">
          {BAR_ROW_WIDTHS.map((w, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/15" />
                <div className="h-3 w-8 animate-pulse rounded bg-muted-foreground/10" />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full animate-pulse bg-muted-foreground/25"
                  style={{ width: `${w}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </SkeletonFrame>
    );
  }
  return (
    <SkeletonFrame label="Loading preview">
      <div>
        {LIST_ROWS.map((r, i) => (
          <SkeletonListRow key={i} left={r.left} right={r.right} />
        ))}
      </div>
    </SkeletonFrame>
  );
}


/* -------------------------------------------------------------------------- */
/* Error boundary                                                             */
/* -------------------------------------------------------------------------- */

function DemoPreviewErrorFallback({ id }: { id: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Preview unavailable{id ? ` (${id})` : ""}. The rest of this dashboard is
        unaffected.
      </span>
    </div>
  );
}

class DemoPreviewErrorBoundary extends Component<
  { id: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep noise low; log once per failure so devs can trace it without
    // taking the dashboard down.
    if (typeof console !== "undefined") {
      console.error(`[demo-preview:${this.props.id}]`, error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <DemoPreviewErrorFallback id={this.props.id} />;
    }
    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* Public renderer                                                            */
/* -------------------------------------------------------------------------- */

export function renderDemoPreview(id: DemoPreviewId): ReactNode {
  const Cmp = DEMO_PREVIEWS[id];
  if (!Cmp) return null;
  const variant = getSkeletonVariant(id);
  return (
    <DemoPreviewErrorBoundary id={id}>
      <Suspense fallback={<DemoPreviewSkeleton variant={variant} />}>
        <Cmp />
      </Suspense>
    </DemoPreviewErrorBoundary>
  );
}

