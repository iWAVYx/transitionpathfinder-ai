import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { workspaceToolGroups } from "@/lib/workspace-tools";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Menu,
  Sparkles,
  LayoutDashboard,
  LogOut,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { NotificationsBell } from "./NotificationsBell";
import { SmartLink } from "./SmartLink";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { dashboardHomeForRoles } from "@/lib/role-policy";
import { toTitleCase } from "@/lib/title-case";

type NavLink = { to: string; label: string; desc?: string };
type NavGroup = { label: string; items: NavLink[] };

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
      {
        to: "/bridgeforward",
        label: "BridgeForward (6–8)",
        desc: "Middle-school bridge into high school.",
      },
      {
        to: "/programs/transitionforward",
        label: "TransitionForward (9–12)",
        desc: "High school planning through graduation.",
      },
      {
        to: "/partnerforward",
        label: "PartnerForward",
        desc: "Incentives & support for partner organizations.",
      },
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

export function SiteHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [signedInNavAllowed, setSignedInNavAllowed] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const fetchRoles = useServerFn(getMyRoles);
  const fetchAdminRoles = useServerFn(getMyAdminRoles);
  const [openDropdowns, setOpenDropdowns] = useState(0);

  const isMenuOpen = open || openDropdowns > 0;

  useEffect(() => {
    const lenis = window.__lenis;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      lenis?.stop();
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      lenis?.start();
    };
  }, [isMenuOpen]);

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
      setSignedInNavAllowed(false);
      setWorkspaceLoaded(false);
      return;
    }
    let cancelled = false;
    setSignedInNavAllowed(false);
    setWorkspaceLoaded(false);
    setRoles([]);
    setIsPlatformAdmin(false);
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (cancelled) return;
        setSignedInNavAllowed(!(data?.nextLevel === "aal2" && data.currentLevel !== "aal2"));
      })
      .catch(() => {
        if (!cancelled) setSignedInNavAllowed(false);
      });
    // Resolve both identities before exposing any role menu. A fast planning
    // lookup must not briefly show a family/educator workspace to an owner.
    Promise.allSettled([fetchRoles(), fetchAdminRoles()]).then(([profile, owner]) => {
      if (cancelled) return;
      if (owner.status === "fulfilled") {
        setIsPlatformAdmin(Boolean(owner.value.isPlatformAdmin));
        setRoles(profile.status === "fulfilled" ? profile.value.roles : []);
      }
      // If owner lookup fails, keep the neutral guarded dashboard entry and
      // Account links; do not guess a planning role until it can be verified.
      setWorkspaceLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, fetchRoles, fetchAdminRoles]);

  const visibleUserGroups = useMemo(
    () => workspaceToolGroups(roles, isPlatformAdmin),
    [roles, isPlatformAdmin],
  );

  const showSignedInNav = Boolean(user && signedInNavAllowed && workspaceLoaded);
  const signedInUser = showSignedInNav ? user : null;
  const dashboardHome = dashboardHomeForRoles(roles, isPlatformAdmin);

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
          aria-label="TransitionForward — home"
          className="brand-focus-ring group flex shrink-0 items-center gap-2 whitespace-nowrap"
          onClick={() => setOpen(false)}
        >
          <BrandLogo variant="lockup" size="md" decorative className="dark:hidden" />
          <BrandLogo variant="dark" size="md" decorative className="hidden dark:inline-flex" />
        </SmartLink>

        <nav aria-label="Primary" className="hidden min-w-0 items-center gap-0.5 xl:flex">
          {navGroups.map((group) => (
            <DropdownMenu
              key={group.label}
              onOpenChange={(v) => setOpenDropdowns((c) => c + (v ? 1 : -1))}
            >
              <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:px-2.5">
                {group.label} <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                data-lenis-prevent
                className="max-h-[min(70vh,32rem)] min-w-64 overflow-y-auto overscroll-contain p-2"
              >
                {group.items.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                    <SmartLink
                      to={item.to}
                      className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {toTitleCase(item.label)}
                      </span>
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
          {signedInUser ? (
            <>
              <NotificationsBell userId={signedInUser.id} />

              <SmartLink
                to={dashboardHome.to}
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground lg:px-2.5"
              >
                {dashboardHome.label}
              </SmartLink>

              <DropdownMenu onOpenChange={(v) => setOpenDropdowns((c) => c + (v ? 1 : -1))}>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground lg:px-2.5">
                  Tools <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  data-lenis-prevent
                  className="max-h-[min(70vh,32rem)] min-w-56 overflow-y-auto overscroll-contain p-1.5"
                >
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
          ) : user ? null : (
            <>
              <SmartLink
                to="/login"
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground lg:px-3"
              >
                Sign In
              </SmartLink>
              <SmartLink
                to="/get-started"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift lg:px-3.5"
              >
                Get Started
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
            <SheetTitle className="sr-only">Site navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Open a tool or return to your workspace.
            </SheetDescription>
            <div className="border-b border-border/60 px-5 py-4">
              <SmartLink
                to="/"
                reload
                onClick={() => setOpen(false)}
                aria-label="TransitionForward — home"
                className="brand-focus-ring flex items-center gap-2"
              >
                <BrandLogo variant="lockup" size="sm" decorative className="dark:hidden" />
                <BrandLogo
                  variant="dark"
                  size="sm"
                  decorative
                  className="hidden dark:inline-flex"
                />
              </SmartLink>
            </div>

            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              {signedInUser && (
                <nav aria-label="Return to workspace" className="mb-5">
                  <SmartLink
                    to={dashboardHome.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
                    activeProps={{ className: "bg-primary/15" }}
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden />
                    {dashboardHome.label}
                  </SmartLink>
                </nav>
              )}
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

              {signedInUser && (
                <>
                  <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Your Workspace
                  </p>
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
              {signedInUser ? (
                <div className="space-y-2">
                  <SmartLink
                    to={dashboardHome.to}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    <Sparkles className="h-4 w-4" />
                    {dashboardHome.label}
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
              ) : user ? null : (
                <div className="space-y-2">
                  <SmartLink
                    to="/get-started"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    <Sparkles className="h-4 w-4" />
                    Get Started
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
      {showSignedInNav &&
        !location.pathname.startsWith("/demo") &&
        (location.pathname !== dashboardHome.to || location.searchStr) && (
          <nav
            aria-label="Return to dashboard"
            className="border-t border-border/50 bg-background/95"
          >
            <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
              <SmartLink
                to={dashboardHome.to}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {dashboardHome.label}
              </SmartLink>
            </div>
          </nav>
        )}
    </header>
  );
}
