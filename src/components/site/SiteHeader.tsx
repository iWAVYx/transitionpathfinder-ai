import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { Menu, Sparkles, LayoutDashboard, LogOut, LogIn, ChevronDown, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "./NotificationsBell";
import { getMyRoles } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { audiencesForRoles, type RoleAudience } from "@/lib/role-policy";

type NavLink = { to: string; label: string; desc?: string };
type NavGroup = { label: string; items: NavLink[] };
type UserNavGroup = NavGroup & { roles: RoleAudience[] };





const navGroups: NavGroup[] = [
  {
    label: "Product",
    items: [
      { to: "/platform", label: "The Platform", desc: "How TransitionForward fits together." },
      { to: "/framework", label: "The Framework", desc: "Grade 9 to graduation, one connected story." },
      { to: "/demo", label: "See Demo", desc: "A guided walkthrough of a real pathway." },
    ],
  },
  {
    label: "Audiences",
    items: [
      { to: "/families", label: "For Families", desc: "Plain-language transition planning." },
      { to: "/educators", label: "For Educators", desc: "Tools for transition teams." },
      { to: "/partners", label: "Partners", desc: "Districts, agencies, and community orgs." },
    ],
  },
  {
    label: "Resources",
    items: [
      { to: "/resources", label: "Resource Hub", desc: "Connecticut-aware tools and links." },
      { to: "/research", label: "Research", desc: "The evidence behind every suggestion." },
      { to: "/blog", label: "Blog", desc: "News, stories, and updates." },
    ],
  },
];

const navSingles: NavLink[] = [
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/help", label: "Help & Contact" },
];

const userGroups: UserNavGroup[] = [
  {
    label: "Students",
    roles: ["parent", "teacher", "admin"],
    items: [
      { to: "/students", label: "Students" },
      { to: "/goals", label: "Goal Tracker" },
      { to: "/documents", label: "Documents" },
    ],
  },
  {
    label: "Planning",
    roles: ["parent", "teacher", "admin"],
    items: [
      { to: "/pathway", label: "Create Pathway Report" },
      { to: "/reports", label: "Pathway Reports" },
      { to: "/ppt-prep", label: "PPT Meeting Prep" },
      { to: "/meetings", label: "Meetings" },
    ],
  },
  {
    label: "Collaboration",
    roles: ["parent", "teacher", "admin", "partner"],
    items: [
      { to: "/messages", label: "Messages" },
      { to: "/feed", label: "Feed" },
      { to: "/forms", label: "Forms" },
      { to: "/opportunities", label: "Opportunities" },
    ],
  },
  {
    label: "Insights",
    roles: ["teacher", "admin"],
    items: [
      { to: "/insights", label: "Insights" },
      { to: "/analytics", label: "Analytics" },
    ],
  },
  {
    label: "Admin",
    roles: ["admin", "partner"],
    items: [
      { to: "/admin-school", label: "School Admin" },
      { to: "/partners-manage", label: "Partner Workspace" },
      { to: "/settings", label: "Settings" },
    ],
  },
];




const mobileMarketingLinks: NavLink[] = [
  ...navGroups.flatMap((g) => g.items),
  ...navSingles,
  { to: "/privacy", label: "Privacy" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const fetchRoles = useServerFn(getMyRoles);
  const fetchAdminRoles = useServerFn(getMyAdminRoles);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsPlatformAdmin(false);
      return;
    }
    let cancelled = false;
    fetchRoles()
      .then((res) => {
        if (!cancelled) setRoles(res.roles);
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      });
    fetchAdminRoles()
      .then((res) => {
        if (!cancelled) setIsPlatformAdmin(Boolean(res.isPlatformAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsPlatformAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, fetchRoles, fetchAdminRoles]);

  const visibleUserGroups = useMemo(() => {
    const audiences = audiencesForRoles(roles);
    return userGroups.filter((g) => g.roles.some((r) => audiences.has(r)));
  }, [roles]);


  return (
    <header
      className={
        "sticky top-0 z-40 border-b transition-all duration-300 " +
        (scrolled
          ? "border-border/60 bg-background/85 shadow-soft backdrop-blur-xl"
          : "border-transparent bg-background/60 backdrop-blur-lg")
      }
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2 whitespace-nowrap"
          onClick={() => setOpen(false)}
        >
          <motion.span
            aria-hidden
            whileHover={{ rotate: 12, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-hero shadow-soft"
          >
            <motion.span
              className="h-3 w-3 rounded-full bg-primary"
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.span>
          <span className="font-display text-lg font-semibold tracking-tight">
            TransitionForward
          </span>
        </Link>


        <nav className="hidden min-w-0 items-center gap-0.5 xl:flex">
          {navGroups.map((group) => (
            <DropdownMenu key={group.label}>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:px-3">
                {group.label} <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-64 p-2">
                {group.items.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                    <Link
                      to={item.to}
                      className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      {item.desc && (
                        <span className="text-xs text-primary/75">{item.desc}</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
          {navSingles.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:px-3"
              activeProps={{ className: "text-foreground bg-muted" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          {user ? (
            <>
              <NotificationsBell userId={user.id} />

              <Link
                to="/dashboard"
                className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-foreground/80 hover:text-foreground xl:px-3"
              >
                Dashboard
              </Link>

              {isPlatformAdmin && (
                <Link
                  to="/owner"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 xl:px-3"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin Hub
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground xl:px-3">
                  More <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56 p-1.5">
                  {visibleUserGroups.map((group, idx) => (
                    <div key={group.label}>
                      {idx > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {group.label}
                      </DropdownMenuLabel>
                      {group.items.map((item) => (
                        <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                          <Link to={item.to} className="rounded-md px-2 py-1.5 text-sm">
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>

              </DropdownMenu>

              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift xl:px-4"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground xl:px-4"
              >
                Sign In
              </Link>
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift xl:px-4"
              >
                Join the Waitlist
              </Link>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[88%] max-w-sm flex-col gap-0 p-0 sm:max-w-sm"
          >
            <div className="border-b border-border/60 px-5 py-4">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero shadow-soft"
                >
                  <span className="h-3 w-3 rounded-full bg-primary" />
                </span>
                <span className="font-display text-base font-semibold tracking-tight">
                  TransitionForward
                </span>
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Explore
              </p>
              <nav className="flex flex-col gap-0.5">
                {mobileMarketingLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "text-foreground bg-muted" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {user && (
                <>
                  <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Your Workspace
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      activeProps={{ className: "text-foreground bg-muted" }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    {isPlatformAdmin && (
                      <Link
                        to="/owner"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Hub
                      </Link>
                    )}
                  </nav>
                  {visibleUserGroups.map((group) => (
                    <div key={group.label} className="mt-4">
                      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                        {group.label}
                      </p>
                      <nav className="flex flex-col gap-0.5">
                        {group.items.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setOpen(false)}
                            className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            activeProps={{ className: "text-foreground bg-muted" }}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </nav>
                    </div>
                  ))}
                </>
              )}

            </div>

            <div className="border-t border-border/60 bg-muted/30 px-4 py-4">
              {user ? (
                <div className="space-y-2">
                  <Link
                    to="/pathway"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    <Sparkles className="h-4 w-4" />
                    Create a Pathway Report
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/waitlist"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    <Sparkles className="h-4 w-4" />
                    Join the Waitlist
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
