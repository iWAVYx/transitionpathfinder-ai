import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import type { ReactNode } from "react";

export function ComingSoon({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-28 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-5xl font-medium tracking-tight sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{body}</p>
        {children}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/waitlist"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Join the pilot
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold"
          >
            Back to home
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
