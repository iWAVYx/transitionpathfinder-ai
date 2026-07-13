import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Target,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  GraduationCap,
  Mail,
  Bookmark,
  Building2,
  Users,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PathwayTimeline } from "@/components/pathway/PathwayTimeline";
import { DocumentReadinessMeter } from "@/components/documents/DocumentReadinessMeter";

export const Route = createFileRoute("/_authenticated/demo-mode")({
  head: () => ({ meta: [{ title: "Demo Mode — TransitionForward" }] }),
  component: DemoModePage,
});

/**
 * Read-only preview of the family/student dashboard, kept in sync with the
 * real `StudentDashboard` widgets so that anyone signed in can see exactly
 * what they'll get after creating a student. The fully seeded, interactive
 * version lives on the Demo Parent account (see Platform Admin → Demo Hub).
 */
function DemoModePage() {
  return (
    <SiteShell>
      <div className="container max-w-6xl py-8 space-y-6">
        <Breadcrumbs trail={[{ label: "Demo Mode" }]} />

        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">You're previewing the family dashboard</div>
            <p className="text-muted-foreground">
              Read-only sample for Jordan Rivera. Nothing here is saved to your account.
              To use the fully seeded, clickable version, sign in with the Demo Parent account
              (Platform Admins can provision it from <Link to="/owner/demo" className="underline">Demo Hub</Link>).
            </p>
          </div>
        </div>

        {/* Next best action — mirrors NextBestAction widget */}
        <section className="rounded-3xl border bg-gradient-hero p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Next best action
          </p>
          <h2 className="mt-2 font-display text-2xl">
            Review Jordan's pathway report together
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sit down with Jordan this week and read the summary section out loud. Star one
            recommendation to bring to the next PPT.
          </p>
          <Button size="sm" className="mt-4">
            Mark as done <CheckCircle2 className="ml-1.5 h-4 w-4" />
          </Button>
        </section>

        <PathwayTimeline />
        <DocumentReadinessMeter />

        {/* Header */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl tracking-tight">Jordan Rivera</h1>
            <Badge variant="outline" className="border-primary text-primary">DEMO</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            they/them · Grade 11 · Hartford Regional High School
          </p>
          <blockquote className="mt-5 border-l-4 border-primary/40 bg-background/60 px-4 py-3 text-sm italic text-foreground/80">
            "I want to keep learning about computers and maybe work with animals too."
            <span className="ml-2 text-xs not-italic text-muted-foreground">— in Jordan's words</span>
          </blockquote>
        </div>

        {/* Fact cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FactCard icon={<GraduationCap className="h-4 w-4" />} label="Grade" value="11" />
          <FactCard icon={<Sparkles className="h-4 w-4" />} label="Readiness" value="Developing" />
          <FactCard icon={<Calendar className="h-4 w-4" />} label="Next meeting" value="Sep 15" />
        </div>

        {/* Goals + things to do */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel icon={<Target className="h-5 w-5" />} title="Goals">
            <ul className="space-y-2">
              {[
                { title: "Tour 2 community colleges by June", category: "postsecondary education", status: "in progress" },
                { title: "Complete one job-shadow at a vet clinic", category: "employment", status: "not started" },
                { title: "Practice public-transit route to MCC", category: "independent living", status: "not started" },
              ].map((g) => (
                <li key={g.title} className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.category}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.status}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<ClipboardList className="h-5 w-5" />} title="Things you can do">
            <ul className="space-y-2">
              {[
                { title: "Review Jordan's pathway report together", status: "not_started" as const },
                { title: "Request transition assessment from school", status: "not_started" as const },
                { title: "Recommend assistive-tech evaluation", status: "in_progress" as const },
                { title: "Save 2 program brochures from the library", status: "complete" as const },
                { title: "Add PPT meeting to calendar", status: "not_started" as const },
              ].map((a) => (
                <li key={a.title} className="flex items-start gap-3 rounded-xl border bg-background p-3">
                  <span className="mt-0.5 shrink-0">
                    {a.status === "complete" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : a.status === "in_progress" ? (
                      <PlayCircle className="h-5 w-5 text-primary/70" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </span>
                  <p className={a.status === "complete" ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>
                    {a.title}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Calendar preview */}
        <Panel icon={<Calendar className="h-5 w-5" />} title="Calendar" action={<span className="text-xs text-muted-foreground">Next 90 days</span>}>
          <ul className="divide-y divide-border/60">
            {[
              { date: "Jun 8", title: "MCC Campus Tour", kind: "Tour" },
              { date: "Jul 1", title: "Transition Assessment Window Opens", kind: "Deadline" },
              { date: "Sep 15", title: "Annual PPT Meeting", kind: "PPT" },
            ].map((e) => (
              <li key={e.title} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">{e.date}</span>
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                <Badge variant="outline">{e.kind}</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Pathway report + Invites */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel icon={<FileText className="h-5 w-5" />} title="Latest pathway report">
            <p className="text-sm text-muted-foreground">
              Jordan thrives with hands-on learning and steady mentorship. Best fit: community
              college + animal-care certificate, paired with self-advocacy practice and travel
              training.
            </p>
            <Button size="sm" className="mt-4" disabled>
              <FileText className="mr-1.5 h-4 w-4" /> Read it (demo)
            </Button>
          </Panel>

          <Panel icon={<Mail className="h-5 w-5" />} title="Invites">
            <div className="rounded-xl border bg-background p-3">
              <p className="text-sm font-medium">demo.coach@transitionforward.demo</p>
              <p className="text-xs text-muted-foreground">Viewer · Pending</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" disabled>Accept</Button>
                <Button size="sm" variant="ghost" disabled>Decline</Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Saved resources + Recommended partners */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel icon={<Bookmark className="h-5 w-5" />} title="Saved resources">
            <ul className="space-y-2">
              {[
                { title: "Transition Planning 101 for Families", why: "Matches Jordan's animal-care interest." },
                { title: "Self-Advocacy Workbook", why: "Supports the self-advocacy growth area." },
                { title: "Connecticut BRS Overview", why: "Connects family to transition services." },
              ].map((r) => (
                <li key={r.title} className="rounded-xl border bg-background p-3">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.why}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<Building2 className="h-5 w-5" />} title="Recommended partners">
            <ul className="space-y-2">
              {[
                { name: "The Kennedy Collective", note: "Reached out — waiting on intake call.", pinned: true },
                { name: "BRS Regional Offices", note: "Bookmarked for summer planning." },
              ].map((p) => (
                <li key={p.name} className="rounded-xl border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.pinned && <Badge variant="outline">Pinned</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Care team */}
        <Panel icon={<Users className="h-5 w-5" />} title="Care team">
          <ul className="space-y-3">
            {[
              { name: "Maya Rivera", role: "Parent · Owner", initials: "MR" },
              { name: "Sam Patel", role: "Case manager · Editor", initials: "SP" },
              { name: "demo.coach@transitionforward.demo", role: "Viewer · Pending invite", initials: "DC" },
            ].map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {c.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="rounded-xl border bg-card p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold">Ready to set up a real student?</h3>
            <p className="text-sm text-muted-foreground">Add a student profile to generate a real pathway report and dashboard.</p>
          </div>
          <Button asChild>
            <Link to="/students">
              Add a student <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}

function FactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-base font-medium text-foreground">{value}</p>
    </div>
  );
}

function Panel({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}
