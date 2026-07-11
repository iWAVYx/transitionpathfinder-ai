import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Mail,
  Settings,
  History,
  Shield,
  Loader2,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  HelpCircle,
  MessageSquareQuote,
  Newspaper,
  BookOpen,
  TrendingUp,
  Building2,
  Briefcase,
  UserCog,
  Activity,
  ClipboardCheck,
  Megaphone,
  HeartHandshake,
} from "lucide-react";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { toTitleCase } from "@/lib/title-case";
import {
  DASHBOARD_TESTID_CONTRACT_VERSION,
  ROLE_DASHBOARD_TEST_IDS,
} from "@/lib/dashboard-testids";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
};

// Sections mirror the 10-section Admin Hub spec. Order matters — sidebar
// renders groups in this declaration order, and "Overview" leads.
const NAV: NavItem[] = [
  // 1. Overview
  { to: "/owner", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/owner/analytics", label: "Analytics", icon: TrendingUp, group: "Overview" },
  { to: "/owner/activity", label: "Recent activity", icon: History, group: "Overview" },

  // 2. Access & Accounts
  { to: "/owner/users", label: "Manage users", icon: UserCog, group: "Access & Accounts" },
  { to: "/owner/admins", label: "Admin team", icon: Users, group: "Access & Accounts" },
  { to: "/owner/waitlist", label: "Review waitlist", icon: ClipboardList, group: "Access & Accounts" },
  { to: "/owner/contacts", label: "Contact requests", icon: Mail, group: "Access & Accounts" },

  // 3. Organizations & Entitlements
  { to: "/owner/organizations", label: "Manage organizations", icon: Building2, group: "Organizations" },
  { to: "/owner/pilot-packages", label: "Pilot packages", icon: Briefcase, group: "Organizations" },

  // 5. Content & Resources
  { to: "/owner/content", label: "Site content", icon: FileText, group: "Content & Resources" },
  { to: "/owner/media", label: "Media library", icon: ImageIcon, group: "Content & Resources" },
  { to: "/owner/blog", label: "Blog & news", icon: Newspaper, group: "Content & Resources" },
  { to: "/owner/faqs", label: "FAQs", icon: HelpCircle, group: "Content & Resources" },
  { to: "/owner/testimonials", label: "Testimonials", icon: MessageSquareQuote, group: "Content & Resources" },
  { to: "/owner/resources", label: "Resource library", icon: BookOpen, group: "Content & Resources" },
  { to: "/owner/resource-sources", label: "Resource sources", icon: BookOpen, group: "Content & Resources" },
  { to: "/owner/bridgeforward-sources", label: "BridgeForward sources", icon: BookOpen, group: "Content & Resources" },
  { to: "/owner/resource-review", label: "Resource review queue", icon: ClipboardCheck, group: "Content & Resources" },
  { to: "/owner/import-audit", label: "Import history", icon: History, group: "Content & Resources" },

  // 6. Partners & Opportunities
  { to: "/owner/partner-network", label: "Partner network", icon: HeartHandshake, group: "Partners & Opportunities" },
  { to: "/owner/partner-submissions", label: "Partner requests", icon: ClipboardList, group: "Partners & Opportunities" },
  { to: "/owner/opportunities", label: "Approve opportunities", icon: Briefcase, group: "Partners & Opportunities" },
  { to: "/owner/outreach", label: "Outreach pipeline", icon: HeartHandshake, group: "Partners & Opportunities" },

  // 7. PartnerForward Resource Manager
  { to: "/owner/partnerforward-resources", label: "Incentives & supports", icon: Briefcase, group: "PartnerForward" },

  // 8. Product Operations
  { to: "/owner/feedback", label: "Feedback", icon: MessageSquareQuote, group: "Product Operations" },
  { to: "/owner/issues", label: "Issue tracker", icon: ClipboardList, group: "Product Operations" },
  { to: "/owner/beta-testers", label: "Beta testers", icon: Users, group: "Product Operations" },
  { to: "/owner/testing", label: "QA test runs", icon: ClipboardCheck, group: "Product Operations" },

  // 9. Launch & Pilot Readiness
  { to: "/owner/launch", label: "Launch readiness", icon: ClipboardCheck, group: "Launch & Pilot" },
  { to: "/owner/role-audit", label: "Role dashboard audit", icon: ClipboardCheck, group: "Launch & Pilot" },
  { to: "/owner/pitch", label: "Pitch deck", icon: Megaphone, group: "Launch & Pilot" },
  { to: "/owner/demo", label: "Demo workspace", icon: Activity, group: "Launch & Pilot" },


  // 10. System Health
  { to: "/owner/health", label: "System health", icon: Activity, group: "System Health" },
  { to: "/owner/emails", label: "Email delivery", icon: Mail, group: "System Health" },
  { to: "/owner/broadcasts", label: "Broadcasts", icon: Megaphone, group: "System Health" },
  { to: "/owner/iep-audit", label: "Document access audit", icon: Shield, group: "System Health" },

  // Settings
  { to: "/owner/settings", label: "Site settings", icon: Settings, group: "Settings" },
];

export function OwnerShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const fetchRoles = useServerFn(getMyAdminRoles);
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    fetchRoles()
      .then((res) => {
        if (cancelled) return;
        if (res.isPlatformAdmin) {
          setStatus("allowed");
        } else {
          setStatus("denied");
          navigate({ to: "/dashboard", replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("denied");
          navigate({ to: "/dashboard", replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRoles, navigate]);

  if (status !== "allowed") {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <main
          data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
          data-testid={ROLE_DASHBOARD_TEST_IDS.owner}
          className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:py-8"
        >
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            data-dashboard-landmark="admin"
          >
            Admin Hub — Platform Admin
          </p>
          <div className="mx-auto max-w-2xl py-10 text-center">
            <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              {status === "denied"
                ? "You Don’t Have Access to the Admin Hub"
                : "Preparing the Admin Hub"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === "denied"
                ? "This workspace is for platform administrators. If you believe you should have access, contact the TransitionForward team."
                : "Verifying your administrator access before loading platform metrics, waitlist activity, contacts, review queues, and system status."}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {status === "denied"
                  ? "Redirecting you to your workspace…"
                  : "Checking admin access…"}
              </span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground">
      <div className="flex min-h-dvh">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:flex lg:flex-col">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-semibold leading-none">Admin Hub</div>
              <div className="mt-1 text-xs text-muted-foreground">TransitionForward</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {groups.map((g) => (
              <div key={g} className="mb-5">
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {toTitleCase(g)}
                </div>
                <ul className="space-y-0.5">
                  {NAV.filter((n) => n.group === g).map((n) => {
                    const active =
                      location.pathname === n.to ||
                      (n.to !== "/owner" && location.pathname.startsWith(n.to));
                    const Icon = n.icon;
                    return (
                      <li key={n.to}>
                        <Link
                          to={n.to}
                          className={
                            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors " +
                            (active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground")
                          }
                        >
                          <Icon className="h-4 w-4" />
                          {toTitleCase(n.label)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="border-t border-border px-3 py-3">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to main app
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            {/* Mobile nav */}
            <div className="mt-4 flex items-center gap-1.5 overflow-x-auto lg:hidden">
              <Link
                to="/"
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Main app
              </Link>
              <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
              {NAV.map((n) => {
                const active =
                  location.pathname === n.to ||
                  (n.to !== "/owner" && location.pathname.startsWith(n.to));
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={
                      "whitespace-nowrap rounded-full px-3 py-1 text-xs " +
                      (active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground/70")
                    }
                  >
                    {toTitleCase(n.label)}
                  </Link>
                );
              })}
            </div>
          </header>
          <main data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION} data-testid={ROLE_DASHBOARD_TEST_IDS.owner} className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:py-8">
            {/* Stable role landmark — keeps the Platform Admin dashboard
                regression matching /admin/i in every viewport, even before
                the metric loaders resolve. Visible (not sr-only) so
                Playwright's toBeVisible() treats it as on-screen text. */}
            <p
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
              data-dashboard-landmark="admin"
            >
              Admin Hub — Platform Admin
            </p>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
