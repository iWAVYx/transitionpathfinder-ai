import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";

/**
 * Recommended Resources — family-scoped feature window that surfaces guides
 * matched to the student's grade, readiness signals, and family priorities.
 * Distinct from /resources/saved (the family's bookmarks).
 */
export const Route = createFileRoute("/_authenticated/family/resources/recommended")({
  head: () => ({
    meta: [
      { title: "Recommended Resources — TransitionForward" },
      {
        name: "description",
        content:
          "Guides, checklists, and tools recommended for your student based on their grade, readiness signals, and family priorities.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/family/resources/recommended">
      <RecommendedResourcesPage />
    </RoleGuard>
  ),
});

type Rec = {
  title: string;
  kind: string;
  why: string;
  minutes: string;
};

const RECOMMENDED: Rec[] = [
  {
    title: "Age of Majority — Family Guide",
    kind: "Guide",
    why: "Your student is 17 · plain-language walkthrough of upcoming legal changes",
    minutes: "6 min",
  },
  {
    title: "Work-Based Learning Conversation Starters",
    kind: "Template",
    why: "Employment readiness is emerging · matches Pathway Report gap",
    minutes: "3 min",
  },
  {
    title: "Travel Training Toolkit",
    kind: "Toolkit",
    why: "Independent living flag on your student's report",
    minutes: "Video + PDF",
  },
  {
    title: "PPT Meeting Questions — Family One-Pager",
    kind: "Template",
    why: "Meeting scheduled Sep 15 · brings your voice into the room",
    minutes: "1 page",
  },
  {
    title: "Family Priorities Worksheet",
    kind: "Worksheet",
    why: "You haven't logged priorities yet · takes 10 minutes",
    minutes: "10 min",
  },
  {
    title: "Adult Services Handoff Guide",
    kind: "Guide",
    why: "G11 · start planning warm handoffs a year ahead",
    minutes: "8 min",
  },
];

function RecommendedResourcesPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Breadcrumbs
          trail={[
            { label: "Family", to: "/hubs/family" },
            { label: "Resources" },
            { label: "Recommended" },
          ]}
        />
        <header className="mt-4 mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-primary" aria-hidden />
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Recommended For Your Family
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Matched to your student's grade, readiness signals, and family priorities.
            Save any of these to your library or share them with your team.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Personalized
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
              Based on Pathway Report v4
            </span>
          </div>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {RECOMMENDED.map((r) => (
            <li key={r.title} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {r.kind} · {r.minutes}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-medium leading-tight">{r.title}</h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Why this: </span>
                {r.why}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Save to library
                </button>
                <Link
                  to="/resources/saved"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Open resource <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/hubs/family">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back To Family Workspace
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/resources/saved">Open Saved Library</Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  );
}
