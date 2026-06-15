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
import { SmartLink } from "./SmartLink";
import { getMyRoles } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { getProgramEligibility } from "@/lib/bridgeforward.functions";
import { audiencesForRoles, type RoleAudience } from "@/lib/role-policy";
import { toTitleCase } from "@/lib/title-case";

type NavLink = { to: string; label: string; desc?: string };
type NavGroup = { label: string; items: NavLink[] };
type UserNavGroup = NavGroup & { roles: RoleAudience[] };





const navGroups: NavGroup[] = [
  {
    label: "Product",
    items: [
      { to: "/platform", label: "The Platform", desc: "How TransitionForward fits together." },
      { to: "/demo", label: "See Demo", desc: "A guided walkthrough of a real pathway." },
    ],
  },
  {
    label: "Audiences",
    items: [
      { to: "/families", label: "For Families", desc: "Plain-language transition planning." },
      { to: "/educators", label: "For Educators", desc: "Tools for transition teams." },
      { to: "/partners", label: "For Partners", desc: "Districts, agencies, and community orgs." },
    ],
  },
  {
    label: "Programs",
    items: [
      { to: "/bridgeforward", label: "BridgeForward (6–8)", desc: "Middle-school bridge into high school." },
      { to: "/programs/transitionforward", label: "TransitionForward (9–12)", desc: "High school planning through graduation." },
      { to: "/partnerforward", label: "PartnerForward", desc: "Incentives & support for partner organizations." },
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
  // Educator / Case Manager — direct student/caseload support
  {
    label: "Caseload",
    roles: ["educator"],
    items: [
      { to: "/caseload", label: "My Caseload" },
      { to: "/goals", label: "Goal Tracker" },
      { to: "/documents", label: "Documents" },
    ],
  },
  // Family + Student — their own profile/students
  {
    label: "Students",
    roles: ["family", "admin"],
    items: [
      { to: "/students", label: "Students" },
      { to: "/goals", label: "Goal Tracker" },
      { to: "/documents", label: "Documents" },
    ],
  },
  {
    label: "Planning Tools",
    roles: ["family", "educator", "student", "admin"],
    items: [
      { to: "/pathway", label: "Create Pathway Report" },
      { to: "/reports", label: "Pathway Reports" },
      { to: "/student-voice", label: "Student Voice" },
      { to: "/ppt-prep", label: "PPT / IEP Meeting Prep" },
      { to: "/meetings", label: "Meetings" },
      { to: "/bridgeforward", label: "BridgeForward (Middle School)" },
      { to: "/trust", label: "Trust & Consent" },
      { to: "/demo-mode", label: "Demo Mode" },
    ],
  },
  {
    label: "Collaboration",
    roles: ["family", "educator", "admin", "partner"],
    items: [
      { to: "/messages", label: "Messages" },
      { to: "/feed", label: "Feed" },
      { to: "/forms", label: "Forms" },
      { to: "/opportunities", label: "Opportunities" },
    ],
  },
  {
    label: "Insights",
    roles: ["educator", "school_admin", "district_admin", "admin"],
    items: [
      { to: "/insights", label: "Insights" },
      { to: "/analytics", label: "Analytics" },
    ],
  },
  // School Administrator — school-level oversight (separate from Platform Admin)
  {
    label: "School Administration",
    roles: ["school_admin", "admin"],
    items: [
      { to: "/school/overview", label: "School Overview" },
      { to: "/school/team", label: "Staff & Team" },
      { to: "/school/reports", label: "School Reports" },
      { to: "/school/implementation", label: "Implementation" },
    ],
  },
  // School District Administrator — district-level oversight across schools
  {
    label: "District Administration",
    roles: ["district_admin", "admin"],
    items: [
      { to: "/district/overview", label: "District Overview" },
      { to: "/district/schools", label: "Schools" },
      { to: "/district/team", label: "People & Access" },
      { to: "/district/reports", label: "District Reports" },
    ],
  },
  // Partner Organization workspace — existing Partner Dashboard.
  // PartnerForward is an Incentives & Support layer here, not a second dashboard.
  {
    label: "Partner Workspace",
    roles: ["partner", "admin"],
    items: [
      { to: "/partners-manage", label: "Partner Profile & Opportunities" },
      { to: "/partners-manage/impact", label: "Partner Impact" },
      { to: "/partnerforward/incentives", label: "Incentives & Support (PartnerForward)" },
    ],
  },
  // Account — visible to every signed-in user
  {
    label: "Account",
    roles: ["student", "family", "educator", "school_admin", "district_admin", "admin", "partner"],
    items: [
      { to: "/settings", label: "Settings" },
      { to: "/help", label: "Help & Support" },
    ],
  },
];





export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [hasMS, setHasMS] = useState(false);
  const fetchRoles = useServerFn(getMyRoles);
  const fetchAdminRoles = useServerFn(getMyAdminRoles);
  const fetchElig = useServerFn(getProgramEligibility);

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
      setHasMS(false);
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
    fetchElig()
      .then((res) => {
        if (!cancelled) setHasMS(Boolean(res.hasMiddleSchoolStudent));
      })
      .catch(() => {
        if (!cancelled) setHasMS(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, fetchRoles, fetchAdminRoles, fetchElig]);

  const visibleUserGroups = useMemo(() => {
    const audiences = audiencesForRoles(roles);
    return userGroups
      .filter((g) => g.roles.some((r) => audiences.has(r)))
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          // Hide BridgeForward entry from Planning Tools unless the user
          // is connected to a grade 6–8 student (or is a platform admin).
          if (item.to === "/bridgeforward" && !hasMS && !audiences.has("admin")) {
            return false;
          }
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [roles, hasMS]);


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
        <SmartLink
          to="/"
          reload
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
        </SmartLink>


        <nav aria-label="Primary" className="hidden min-w-0 items-center gap-0.5 xl:flex">
          {navGroups.map((group) => (
            <DropdownMenu key={group.label}>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:px-2.5">
                {group.label} <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" data-lenis-prevent className="max-h-[min(70vh,32rem)] min-w-64 overflow-y-auto overscroll-contain p-2">
                {group.items.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                    <SmartLink
                      to={item.to}
                      className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">{toTitleCase(item.label)}</span>
                      {item.desc && (
                        <span className="text-xs text-primary/75">{toTitleCase(item.desc)}</span>
                      )}
                    </SmartLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
          {navSingles.map((item) => (
            <SmartLink
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:px-2.5"
              activeProps={{ className: "text-foreground bg-muted" }}
            >
              {item.label}
            </SmartLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          {user ? (
            <>
              <NotificationsBell userId={user.id} />

              <SmartLink
                to="/dashboard"
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground lg:px-2.5"
              >
                Dashboard
              </SmartLink>

              {isPlatformAdmin && (
                <SmartLink
                  to="/owner"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 lg:px-2.5"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin Hub
                </SmartLink>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground lg:px-2.5">
                  More <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-lenis-prevent className="max-h-[min(70vh,32rem)] min-w-56 overflow-y-auto overscroll-contain p-1.5">
                  {visibleUserGroups.map((group, idx) => (
                    <div key={group.label}>
                      {idx > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {group.label}
                      </DropdownMenuLabel>
                      {group.items.map((item) => (
                        <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                          <SmartLink to={item.to} className="rounded-md px-2 py-1.5 text-sm">
                            {item.label}
                          </SmartLink>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>

              </DropdownMenu>

              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift lg:px-3.5"

              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <SmartLink
                to="/login"
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground lg:px-3"
              >
                Sign In
              </SmartLink>
              <SmartLink
                to="/waitlist"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift lg:px-3.5"
              >
                Join the Waitlist
              </SmartLink>
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
            data-lenis-prevent
            className="flex w-[88%] max-w-sm flex-col gap-0 p-0 sm:max-w-sm"
          >
            <div className="border-b border-border/60 px-5 py-4">
              <SmartLink
                to="/"
                reload
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
              </SmartLink>
            </div>

            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Explore
              </p>
              <nav className="flex flex-col gap-0.5">
                {navGroups.map((group) => (
                  <details key={group.label} className="group/menu rounded-xl">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <span>{group.label}</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-open/menu:rotate-180" />
                    </summary>
                    <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                      {group.items.map((item) => (
                        <SmartLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          activeProps={{ className: "text-foreground bg-muted" }}
                        >
                          {item.label}
                        </SmartLink>
                      ))}
                    </div>
                  </details>
                ))}
                {navSingles.map((item) => (
                  <SmartLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "text-foreground bg-muted" }}
                  >
                    {item.label}
                  </SmartLink>
                ))}
                <SmartLink
                  to="/privacy"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-muted" }}
                >
                  Privacy
                </SmartLink>
              </nav>


              {user && (
                <>
                  <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Your Workspace
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    <SmartLink
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      activeProps={{ className: "text-foreground bg-muted" }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </SmartLink>
                    {isPlatformAdmin && (
                      <SmartLink
                        to="/owner"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Hub
                      </SmartLink>
                    )}
                  </nav>
                  {visibleUserGroups.map((group) => (
                    <details key={group.label} className="group/menu mt-1 rounded-xl">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                        <span>{group.label}</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open/menu:rotate-180" />
                      </summary>
                      <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                        {group.items.map((item) => (
                          <SmartLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setOpen(false)}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            activeProps={{ className: "text-foreground bg-muted" }}
                          >
                            {item.label}
                          </SmartLink>
                        ))}
                      </div>
                    </details>
                  ))}

                </>
              )}

            </div>

            <div className="border-t border-border/60 bg-muted/30 px-4 py-4">
              {user ? (
                <div className="space-y-2">
                  <SmartLink
                    to="/pathway"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    <Sparkles className="h-4 w-4" />
                    Create a Pathway Report
                  </SmartLink>
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
                  <SmartLink
                    to="/waitlist"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    <Sparkles className="h-4 w-4" />
                    Join the Waitlist
                  </SmartLink>
                  <SmartLink
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </SmartLink>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
