import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { ROLE_DOOR_SLUGS, ROLE_DOORS } from "@/lib/routing/role-doors";

/**
 * /get-started — canonical role router.
 *
 * Every public entry into TransitionForward routes through this page.
 * Each of the six role doors lives at `/get-started/<role>` and exposes
 * the applicable subset of actions (sign in, redeem invitation, redeem
 * access code, request org access, join waitlist, independent signup,
 * request org license, begin Partner Free/Premium). Platform Owner
 * accounts are provisioned internally and are not shown here.
 */
export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Get Started — TransitionForward" },
      {
        name: "description",
        content:
          "Six ways to get started with TransitionForward: student, family, educator, school, district, or community partner. Sign in, redeem an invitation or access code, or request access.",
      },
      { property: "og:title", content: "Get Started — TransitionForward" },
      {
        property: "og:description",
        content:
          "Choose your role: student, family, educator, school, district, or partner. Each door supports sign in, invitations, access codes, and access requests.",
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
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
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

          <ul
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Choose your role"
          >
            {ROLE_DOOR_SLUGS.map((slug) => {
              const door = ROLE_DOORS[slug];
              return (
                <li key={slug}>
                  <Link
                    to="/get-started/$role"
                    params={{ role: slug }}
                    className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                    data-testid={`get-started-door-${slug}`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {door.eyebrow}
                    </span>
                    <h2 className="mt-2 font-display text-xl font-medium">
                      {door.label}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {door.intro}
                    </p>
                    <span className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Open this door{" "}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-muted-foreground">
            Platform Owner accounts are created internally and cannot be
            requested through this page.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
