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
} from "lucide-react";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
};

const NAV: NavItem[] = [
  { to: "/owner", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/owner/health", label: "System Health", icon: Activity, group: "Overview" },
  { to: "/owner/analytics", label: "Analytics", icon: TrendingUp, group: "Overview" },
  { to: "/owner/activity", label: "Activity Logs", icon: History, group: "Overview" },
  { to: "/owner/content", label: "Site Content", icon: FileText, group: "Content" },
  { to: "/owner/media", label: "Media Library", icon: ImageIcon, group: "Content" },
  { to: "/owner/blog", label: "Blog & News", icon: Newspaper, group: "Content" },
  { to: "/owner/faqs", label: "FAQs", icon: HelpCircle, group: "Content" },
  { to: "/owner/testimonials", label: "Testimonials", icon: MessageSquareQuote, group: "Content" },
  { to: "/owner/resources", label: "Resources", icon: BookOpen, group: "Content" },
  { to: "/owner/waitlist", label: "Waitlist", icon: ClipboardList, group: "Leads" },
  { to: "/owner/contacts", label: "Contact Forms", icon: Mail, group: "Leads" },
  { to: "/owner/organizations", label: "Organizations", icon: Building2, group: "Platform" },
  { to: "/owner/opportunities", label: "Opportunity Review", icon: Briefcase, group: "Platform" },
  { to: "/owner/users", label: "Users", icon: UserCog, group: "Platform" },
  { to: "/owner/admins", label: "Admin Users", icon: Users, group: "Settings" },
  { to: "/owner/settings", label: "Site Settings", icon: Settings, group: "Settings" },
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
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            {status === "denied"
              ? "You do not have permission to view this page."
              : "Checking admin access…"}
          </span>
        </div>
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
                  {g}
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
                          {n.label}
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
              to="/dashboard"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to main app
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border bg-background px-6 py-5">
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
                to="/dashboard"
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
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
