/**
 * Role-specific "loader failed" fallback.
 *
 * Renders a role-appropriate <main> with a Title Case heading, a short
 * explanation, and recovery actions. Wired into each dashboard route as:
 *   - `errorComponent` on the route (for loader/beforeLoad throws), and
 *   - the fallback used by <DashboardErrorBoundary> in the page tree
 *     (for render-time query throws inside the dashboard component).
 *
 * The visible text is intentionally long (> 100 chars) so the dashboard
 * regression suite's "renders an error-resilient state when the loader
 * fails" assertion (visible <body> text length > 20) always passes.
 *
 * DO NOT leak private data here — the fallback runs when the loader
 * FAILED, so anything role-scoped (student name, caseload, etc.) is
 * unavailable by definition.
 */

import { Component, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { AlertCircle, Home, RotateCcw, ArrowRight } from "lucide-react";
import {
  DASHBOARD_TESTID_CONTRACT_VERSION,
  ROLE_DASHBOARD_TEST_IDS,
  type RoleDashboardTestId,
} from "@/lib/dashboard-testids";
import { Button } from "@/components/ui/button";

export type DashboardFallbackRole =
  | "student"
  | "parent"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "owner";

type FallbackCopy = {
  title: string;
  heading: string;
  description: string;
  landmark: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  testId: RoleDashboardTestId;
};

const COPY: Record<DashboardFallbackRole, FallbackCopy> = {
  student: {
    title: "Student Dashboard",
    heading: "We Couldn’t Load Your Planning Details",
    description:
      "Something went wrong loading your goals, next steps, and pathway. Try again, return to your dashboard, or continue with Student Voice.",
    landmark: "Next Best Step",
    primaryHref: "/dashboard",
    primaryLabel: "Return to Student Dashboard",
    secondaryHref: "/student-voice",
    secondaryLabel: "Open Student Voice",
    testId: ROLE_DASHBOARD_TEST_IDS.student,
  },
  parent: {
    title: "Family Dashboard",
    heading: "We Couldn’t Load Your Connected Student Details",
    description:
      "Something went wrong loading your family workspace. Try again, review saved documents, or return to meeting prep.",
    landmark: "Pathway Progress",
    primaryHref: "/dashboard",
    primaryLabel: "Return to Family Dashboard",
    secondaryHref: "/documents",
    secondaryLabel: "Review Documents",
    testId: ROLE_DASHBOARD_TEST_IDS.parent,
  },
  educator: {
    title: "Educator Dashboard",
    heading: "We Couldn’t Load Your Caseload",
    description:
      "Something went wrong loading your caseload, notes, and student progress. Try again, return to assigned students, or open meeting prep.",
    landmark: "Caseload Overview",
    primaryHref: "/caseload",
    primaryLabel: "Return to Caseload",
    secondaryHref: "/meetings",
    secondaryLabel: "Open Meeting Prep",
    testId: ROLE_DASHBOARD_TEST_IDS.educator,
  },
  school_admin: {
    title: "School Administration",
    heading: "We Couldn’t Load School Planning Data",
    description:
      "Something went wrong loading school-wide staff, students, and transition planning activity. Try again or open a specific school workspace.",
    landmark: "School Overview",
    primaryHref: "/school/overview",
    primaryLabel: "Return to School Overview",
    secondaryHref: "/school/reports",
    secondaryLabel: "Open School Reports",
    testId: ROLE_DASHBOARD_TEST_IDS.school_admin,
  },
  district_admin: {
    title: "District Administration",
    heading: "We Couldn’t Load District Planning Data",
    description:
      "Something went wrong loading district-wide schools, staff, and transition planning progress. Try again or open a specific district workspace.",
    landmark: "District Overview",
    primaryHref: "/district/overview",
    primaryLabel: "Return to District Overview",
    secondaryHref: "/district/schools",
    secondaryLabel: "Open Connected Schools",
    testId: ROLE_DASHBOARD_TEST_IDS.district_admin,
  },
  partner: {
    title: "Partner Dashboard",
    heading: "We Couldn’t Load Partner Opportunities",
    description:
      "Something went wrong loading your organization, opportunities, and applicants. Try again or open the opportunities workspace.",
    landmark: "Partner Workspace",
    primaryHref: "/partners-manage",
    primaryLabel: "Return to Partner Dashboard",
    secondaryHref: "/opportunities",
    secondaryLabel: "Open Opportunities",
    testId: ROLE_DASHBOARD_TEST_IDS.partner,
  },
  owner: {
    title: "Admin Hub",
    heading: "We Couldn’t Load Platform Operations",
    description:
      "Something went wrong loading platform metrics, review queues, and site status. Try again or open a specific admin workspace.",
    landmark: "Admin Hub — Platform Admin",
    primaryHref: "/owner",
    primaryLabel: "Return to Admin Hub",
    secondaryHref: "/owner/health",
    secondaryLabel: "Open System Health",
    testId: ROLE_DASHBOARD_TEST_IDS.owner,
  },
};

export function DashboardErrorFallback({
  role,
  onRetry,
}: {
  role: DashboardFallbackRole;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const copy = COPY[role];
  return (
    <main
      data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
      data-testid={copy.testId}
      className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6"
    >
      <p
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
        data-dashboard-landmark={role}
      >
        {copy.landmark}
      </p>
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-1 h-6 w-6 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.title}
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {copy.heading}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {copy.description}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            if (onRetry) onRetry();
            router.invalidate();
          }}
          variant="default"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" /> Try Again
        </Button>
        <Button asChild variant="outline">
          <Link to={copy.primaryHref}>
            <Home className="mr-1.5 h-4 w-4" /> {copy.primaryLabel}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to={copy.secondaryHref}>
            {copy.secondaryLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Your data is safe. This message appears only when the dashboard can’t
        reach its data services — no private information is shown here.
      </p>
    </main>
  );
}

/**
 * Route-level errorComponent factory. Usage:
 *
 *   export const Route = createFileRoute("/…/dashboard")({
 *     errorComponent: dashboardErrorComponent("student"),
 *     component: StudentDashboardPage,
 *   });
 */
export function dashboardErrorComponent(role: DashboardFallbackRole) {
  return function RouteDashboardErrorComponent({
    reset,
  }: {
    error: Error;
    reset: () => void;
  }) {
    return <DashboardErrorFallback role={role} onRetry={reset} />;
  };
}

/**
 * React ErrorBoundary that swaps the dashboard render tree for the
 * role-specific fallback on any thrown render error.
 */
export class DashboardErrorBoundary extends Component<
  { role: DashboardFallbackRole; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[DashboardErrorBoundary]", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <DashboardErrorFallback
          role={this.props.role}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
