import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  getRoleDoor,
  isRoleDoorSlug,
  ROLE_DOOR_SLUGS,
  type RoleDoor,
  type RoleDoorSlug,
} from "@/lib/routing/role-doors";

export const Route = createFileRoute("/get-started/$role")({
  loader: ({ params }) => {
    if (!isRoleDoorSlug(params.role)) throw notFound();
    return { door: getRoleDoor(params.role) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Get Started — TransitionForward" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { door } = loaderData;
    const title = `${door.label} — Get Started With TransitionForward`;
    const description = door.intro;
    const url = `/get-started/${door.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: RoleDoorPage,
  notFoundComponent: RoleDoorNotFound,
});

function RoleDoorPage() {
  const { door } = Route.useLoaderData() as { door: RoleDoor };
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-50" />
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Link
            to="/get-started"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Roles
          </Link>

          <header className="mt-6 text-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {door.eyebrow}
            </span>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              {door.headline}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {door.intro}
            </p>
          </header>

          <ul
            className="mt-10 grid gap-4 sm:grid-cols-2"
            aria-label={`Ways to get started as ${door.label}`}
          >
            {door.actions.map((action, index) => {
              const isLastOdd =
                index === door.actions.length - 1 &&
                door.actions.length % 2 === 1;
              return (
                <li
                  key={action.key}
                  className={
                    isLastOdd
                      ? "sm:col-span-2 sm:flex sm:justify-center"
                      : undefined
                  }
                >
                  <Link
                    to={action.to}
                    search={action.search ?? {}}
                    className={`group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${
                      isLastOdd ? "w-full sm:max-w-[calc(50%-0.5rem)]" : ""
                    }`}
                    data-testid={`role-door-action-${action.key}`}
                  >
                  <h2 className="font-display text-lg font-medium">
                    {action.label}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                  <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Continue{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
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

function RoleDoorNotFound() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-medium">
          That Role Door Doesn't Exist
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Choose one of the six canonical roles below.
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {ROLE_DOOR_SLUGS.map((slug: RoleDoorSlug) => (
            <li key={slug}>
              <Link
                to="/get-started/$role"
                params={{ role: slug }}
                className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted"
              >
                {getRoleDoor(slug).label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
