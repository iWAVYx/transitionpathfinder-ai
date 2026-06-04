import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, Users, FileText, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/school/overview", label: "Overview", icon: Building2 },
  { to: "/school/team", label: "Staff & Team", icon: Users },
  { to: "/school/reports", label: "Reports", icon: FileText },
  { to: "/school/implementation", label: "Implementation", icon: BarChart3 },
];

export function SchoolNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="mt-4 flex flex-wrap gap-1 border-b border-border/60">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm transition-colors",
              active
                ? "border-b-2 border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
