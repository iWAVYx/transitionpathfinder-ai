import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, MailQuestion } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";

/**
 * /get-started — the decision gate between Signup and Waitlist.
 *
 * Signup is for users who already have a valid access path: an invitation,
 * an active school/district/partner organization, an approved pilot, an
 * approved early-access family, or an internally-provisioned admin.
 *
 * Waitlist is the access-routing layer for everyone else: schools that
 * aren't active yet, families without an active student connection,
 * educators interested in a demo, school/district pilot inquiries, and
 * partner organizations awaiting review.
 */
export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Get Started — TransitionForward" },
      {
        name: "description",
        content:
          "Choose your path: sign in if you already have an invitation or approved access, or join the waitlist to request access, a demo, or a school/district pilot.",
      },
      { property: "og:title", content: "Get Started — TransitionForward" },
      {
        property: "og:description",
        content:
          "Two doors: Create an account with your invitation, or join the waitlist for school, district, family, educator, or partner access.",
      },
      { property: "og:url", content: "/get-started" },
    ],
    links: [{ rel: "canonical", href: "/get-started" }],
  }),
  component: GetStartedPage,
});

function GetStartedPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <header className="text-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Get Started
            </span>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              Pick The Door That Fits You.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              TransitionForward access depends on your role and your
              connection to a school, district, partner organization, or
              approved early-access cohort. Choose the path that matches
              where you are today.
            </p>
          </header>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <Link
              to="/login"
              search={{}}
              className="group flex flex-col rounded-3xl border border-border bg-card p-7 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              data-testid="get-started-have-invite"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                <KeyRound className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-medium">
                I Have An Invite Or Approved Access
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                For invited users, approved pilot participants, members of
                active schools or districts, approved partner organizations,
                and approved early-access families.
              </p>
              <span className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Sign in or create your account{" "}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/waitlist"
              className="group flex flex-col rounded-3xl border border-border bg-card p-7 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              data-testid="get-started-request-access"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                <MailQuestion className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-medium">
                I Want To Request Access
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                For requesting access, a demo, a school or district pilot,
                partner review, or updates as TransitionForward opens up in
                your area. A real person reviews every request.
              </p>
              <span className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Join the waitlist{" "}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-muted-foreground">
            Platform admin accounts are created internally and cannot be
            requested through this page.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
