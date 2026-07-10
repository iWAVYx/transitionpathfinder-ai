import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Scale,
  Users,
  Landmark,
  Wrench,
  Compass,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * AdvocacyResourcesCard — a curated set of resources for the family
 * organized by advocacy purpose (know your rights, connect with other
 * families, adult-services intake, self-advocacy tools, next-step guides).
 */

type AdvocacyCategory =
  | "rights"
  | "peers"
  | "adult_services"
  | "self_advocacy"
  | "planning";

export interface AdvocacyResource {
  title: string;
  description: string;
  category: AdvocacyCategory;
  /** Optional external URL — omit for internal-only resources. */
  href?: string;
  /** Optional in-app route. */
  to?: string;
  /** Optional tag line (e.g. "Free", "Age 16+"). */
  tag?: string;
}

const SAMPLE: AdvocacyResource[] = [
  {
    title: "Know Your Rights Under IDEA",
    description:
      "Plain-language guide to procedural safeguards, transition planning by age 16, and what to do if you disagree with the team.",
    category: "rights",
    tag: "Federal Law",
    to: "/resources",
  },
  {
    title: "CT Parental Rights In Special Education",
    description:
      "State-specific version of your rights, with sample letters for requesting evaluations and mediation.",
    category: "rights",
    tag: "State Guide",
    to: "/resources",
  },
  {
    title: "Parent-To-Parent Of Connecticut",
    description:
      "Get matched with a trained parent who has walked the same transition — one call, no cost.",
    category: "peers",
    tag: "Free · Matched",
    to: "/resources",
  },
  {
    title: "Bureau Of Rehabilitation Services (BRS) Intake",
    description:
      "Apply at age 16+ to unlock job coaching, adult-services planning, and postsecondary support.",
    category: "adult_services",
    tag: "Age 16+",
    to: "/resources",
  },
  {
    title: "DDS Level Of Need Assessment",
    description:
      "Understand whether your student qualifies for Developmental Services and how to apply before graduation.",
    category: "adult_services",
    tag: "Before Grad",
    to: "/resources",
  },
  {
    title: "Self-Advocacy Toolkit For Families",
    description:
      "Coaching scripts your student can practice before leading a section of the next meeting.",
    category: "self_advocacy",
    tag: "Practice",
    to: "/resources",
  },
  {
    title: "Family Guide To Transition Planning",
    description:
      "Month-by-month checklist from Grade 8 through the year after graduation.",
    category: "planning",
    tag: "Checklist",
    to: "/resources",
  },
  {
    title: "Age Of Majority Planning",
    description:
      "What changes at 18 — supported decision-making, guardianship alternatives, and how to talk with your student.",
    category: "planning",
    tag: "Age 17–18",
    to: "/resources",
  },
];

const CATEGORY_META: Record<
  AdvocacyCategory,
  { label: string; icon: LucideIcon; chip: string }
> = {
  rights: {
    label: "Know Your Rights",
    icon: Scale,
    chip: "bg-primary/10 text-primary ring-primary/20",
  },
  peers: {
    label: "Connect With Families",
    icon: Users,
    chip: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  adult_services: {
    label: "Adult Services",
    icon: Landmark,
    chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
  self_advocacy: {
    label: "Self-Advocacy",
    icon: Wrench,
    chip: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  },
  planning: {
    label: "Planning Guides",
    icon: Compass,
    chip: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  },
};

const CATEGORY_ORDER: AdvocacyCategory[] = [
  "rights",
  "peers",
  "adult_services",
  "self_advocacy",
  "planning",
];

export function AdvocacyResourcesCard({
  resources,
  isSample = true,
  browseHref = "/resources",
}: {
  resources?: AdvocacyResource[];
  isSample?: boolean;
  browseHref?: string;
}) {
  const list = resources && resources.length > 0 ? resources : SAMPLE;
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    meta: CATEGORY_META[cat],
    items: list.filter((r) => r.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <section
      aria-labelledby="advocacy-resources-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="advocacy-resources-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <BookOpen className="h-3 w-3" aria-hidden /> Advocacy Resources
          </p>
          <h2
            id="advocacy-resources-title"
            className="mt-1 font-display text-2xl font-medium tracking-tight"
          >
            Resources Chosen For Your Family
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Curated guides, agencies, and toolkits — grouped by what you're
            trying to do next.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={browseHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Browse All <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mt-5 space-y-5">
        {grouped.map(({ cat, meta, items }) => {
          const Icon = meta.icon;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${meta.chip}`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {meta.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {items.length} {items.length === 1 ? "resource" : "resources"}
                </span>
              </div>
              <ul className="mt-2 grid gap-2 md:grid-cols-2">
                {items.map((r) => (
                  <li
                    key={r.title}
                    className="rounded-xl border bg-background p-3 text-xs shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {r.title}
                      </p>
                      {r.tag && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {r.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      {r.description}
                    </p>
                    {r.to ? (
                      <Link
                        to={r.to}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary no-underline hover:underline"
                      >
                        Open resource <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    ) : r.href ? (
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary no-underline hover:underline"
                      >
                        Visit site <ArrowRight className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
