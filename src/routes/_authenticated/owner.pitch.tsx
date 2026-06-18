import { createFileRoute } from "@tanstack/react-router";
import {
  Megaphone,
  Target,
  Users,
  Sparkles,
  Route as RouteIcon,
  Image as ImageIcon,
  MessageSquare,
  GraduationCap,
  School,
  Building2,
  Briefcase,
  ShieldCheck,
  CalendarDays,
  BookOpen,
  HeartHandshake,
  ClipboardList,
  BarChart3,
} from "lucide-react";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/owner/pitch")({
  head: () => ({ meta: [{ title: "Pitch & Demo — Admin Hub" }] }),
  component: OwnerPitchPage,
});

/* ─── Core message (verbatim) ─── */
const CORE_PITCH =
  "TransitionForward is a specialist-built, AI-assisted transition planning platform that helps students with IEPs, their families, and school teams build personalized post-school pathways — from first assessment to independent adulthood.";

const PROBLEM =
  "Most transition planning is fragmented: IEP goals live in one system, community resources in another, and family input is often captured too late. Students fall through the gap between school services and adult life — not because teams don't care, but because the tools don't connect.";

const SOLUTION =
  "TransitionForward connects the entire support ecosystem around a student. AI-assisted Pathway Reports turn IEPs and student voice into actionable, time-bound plans. A curated Resource Library and Partner Network surface real opportunities. Calendar, action items, and meeting prep keep teams aligned — all scoped by consent and role.";

/* ─── Audiences ─── */
const AUDIENCES = [
  {
    icon: Users,
    label: "Families",
    hook: "See your child's pathway clearly — and know exactly what to do next.",
    pain: "I don't know what questions to ask at the PPT, or what's available after graduation.",
    win: "A personalized roadmap, recommended resources, and a calendar that keeps the team on track.",
  },
  {
    icon: GraduationCap,
    label: "Educators / Case Managers",
    hook: "Spend less time chasing paperwork and more time supporting students.",
    pain: "Transition plans are repetitive, compliance-heavy, and hard to personalize.",
    win: "AI-generated drafts from IEP + student voice, with one-click action items and calendar integration.",
  },
  {
    icon: School,
    label: "School Admins",
    hook: "One dashboard for every transition student in your building.",
    pain: "I can't see which students are at risk of aging out without a plan.",
    win: "Caseload overview, readiness scores, and team collaboration tools — all RLS-scoped.",
  },
  {
    icon: Building2,
    label: "District Admins",
    hook: "District-wide visibility into transition outcomes.",
    pain: "We don't have aggregate data on where students go after high school.",
    win: "Cross-school reports, analytics, and compliance tracking in one place.",
  },
  {
    icon: Briefcase,
    label: "Partner Organizations",
    hook: "Connect with families who actually need your services.",
    pain: "We submit information but never hear back, or get mismatched referrals.",
    win: "Partner directory, opportunity postings, and direct family engagement — scoped by interest.",
  },
  {
    icon: ShieldCheck,
    label: "Platform Admins",
    hook: "A secure, auditable platform built for student data.",
    pain: "We need to prove compliance, manage content, and monitor system health.",
    win: "Admin Hub with health checks, testing scripts, content management, and granular RLS.",
  },
];

/* ─── Core features ─── */
const FEATURES = [
  {
    icon: Sparkles,
    title: "Pathway Report",
    summary:
      "AI-assisted transition report generated from IEP uploads and Student Voice inputs. Produces 30/90-day action plans, teacher next steps, and family questions for the PPT.",
  },
  {
    icon: BookOpen,
    title: "Resource Library",
    summary:
      "Curated, tagged resources with source libraries, review queues, and saved bookmarks per student. Families and educators save what matters and return to it.",
  },
  {
    icon: HeartHandshake,
    title: "Partner Network",
    summary:
      "Self-service partner directory with opportunity postings, outreach tracking, and direct family matching. Partners manage their own profiles and submissions.",
  },
  {
    icon: CalendarDays,
    title: "Calendar & Action Items",
    summary:
      "Due dates from pathway reports become calendar events. Action items track ownership, priority, and completion — with links back to their source reports.",
  },
  {
    icon: ClipboardList,
    title: "Meeting Prep",
    summary:
      "Auto-generated meeting agendas from pathway data, with family questions, readiness scores, and recommended talking points — so PPTs start prepared.",
  },
  {
    icon: BarChart3,
    title: "Admin Hub",
    summary:
      "System health, testing scripts, demo mode, content editing, user management, analytics, and audit trails — all scoped to platform admin role.",
  },
];

/* ─── Demo flow ─── */
const DEMO_FLOW = [
  {
    step: "1. Sign up & onboarding",
    detail:
      "Choose a role (Family, Educator, School/District Admin, Partner). Complete profile and consent. For demo: use pre-seeded demo accounts.",
  },
  {
    step: "2. Add a student",
    detail:
      "Create a student profile, upload an IEP (optional), and invite collaborators. The student is now the hub for everything that follows.",
  },
  {
    step: "3. Student Voice",
    detail:
      "Student (or proxy) completes interests, strengths, support needs, and post-school goals. This feeds directly into the Pathway Report.",
  },
  {
    step: "4. Generate Pathway Report",
    detail:
      "AI reads the IEP and Student Voice to produce a draft report: recommended pathways, 30/90-day actions, teacher next steps, and family PPT questions.",
  },
  {
    step: "5. Connect to plan",
    detail:
      "Push report items into Action Items and Calendar. Review recommended resources and partner opportunities.",
  },
  {
    step: "6. Collaborate & track",
    detail:
      "Share with the team (scoped by consent), schedule meetings, mark action items complete, and watch readiness scores update.",
  },
  {
    step: "7. Admin oversight",
    detail:
      "Platform admin reviews system health, runs testing scripts, manages content, and monitors analytics — without accessing student PII beyond role scope.",
  },
];

/* ─── Talking points by audience ─── */
const TALKING_POINTS: Record<string, string[]> = {
  Families: [
    "This isn't another portal you have to check — it's a plan that tells you what to do next.",
    "Your child's voice shapes the report, not just the IEP.",
    "You control who sees what. Revoke sharing anytime.",
    "Resources are curated and tagged, not just a Google search.",
  ],
  "Educators / Case Managers": [
    "Cut transition paperwork time by starting with an AI draft, not a blank page.",
    "Student Voice inputs surface what compliance forms miss.",
    "Action items and calendar integration mean fewer 'did you do the thing?' emails.",
    "Everything is scoped to your role and the student's consent.",
  ],
  "School / District Admins": [
    "See readiness scores and at-risk flags across your caseload.",
    "Prove transition compliance with audit trails and health checks.",
    "No student data is visible beyond role scope — RLS is enforced at the database level.",
    "Demo mode lets you train staff without touching real records.",
  ],
  Partners: [
    "Post opportunities to families who have explicitly indicated interest.",
    "Manage your own profile and submissions — no back-and-forth with admins.",
    "Track outreach and engagement from one dashboard.",
  ],
  "Platform Admins / Investors": [
    "Built on Supabase with row-level security, role-based access, and audit logging.",
    "Testing scripts and system health give you confidence before every demo.",
    "Demo mode + reset means clean state for every sales call.",
    "Modular architecture: new features plug in without rewrites.",
  ],
};

/* ─── Screenshot placeholders ─── */
const SCREENSHOTS = [
  { label: "Dashboard (Family view)", desc: "Student card, next best action, readiness score" },
  { label: "Pathway Report", desc: "AI-generated plan with 30/90-day actions and PPT questions" },
  { label: "Student Voice", desc: "Interest, strength, support, and goal inputs" },
  { label: "Resource Library", desc: "Curated list with filters, saved bookmarks, source libraries" },
  { label: "Partner Directory", desc: "Organization cards with opportunities and contact flow" },
  { label: "Calendar + Action Items", desc: "Timeline view with due dates, priorities, and source links" },
  { label: "Admin Hub", desc: "System health, testing scripts, demo mode, analytics" },
  { label: "Mobile view", desc: "Key screens at 375px and 768px widths" },
];

function OwnerPitchPage() {
  return (
    <OwnerShell
      title="Pitch & Demo"
      description="One-page reference for demos, investor conversations, and sales calls."
    >
      <div className="space-y-8">
        {/* Core pitch */}
        <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-medium">One-sentence pitch</h2>
          </div>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            {CORE_PITCH}
          </p>
        </section>

        {/* Problem / Solution */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Target className="h-4 w-4 text-rose-500" />
                Problem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {PROBLEM}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Solution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {SOLUTION}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Audiences */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium">
            <Users className="h-5 w-5 text-primary" />
            Audiences
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Card key={a.label} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <a.icon className="h-4 w-4 text-primary" />
                    {a.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-sm font-medium text-foreground">{a.hook}</p>
                  <div>
                    <Badge variant="secondary" className="mb-1 text-[10px]">
                      Pain
                    </Badge>
                    <p className="text-xs text-muted-foreground">{a.pain}</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                      Win
                    </Badge>
                    <p className="text-xs text-muted-foreground">{a.win}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Core features */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium">
            <Sparkles className="h-5 w-5 text-primary" />
            Core Features
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <f.icon className="h-4 w-4 text-primary" />
                    {f.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {f.summary}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Demo flow */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium">
            <RouteIcon className="h-5 w-5 text-primary" />
            Demo Flow Walkthrough
          </h2>
          <div className="space-y-3">
            {DEMO_FLOW.map((d, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-border/60 bg-card p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.step}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Talking points */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium">
            <MessageSquare className="h-5 w-5 text-primary" />
            Talking Points by Audience
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(TALKING_POINTS).map(([audience, points]) => (
              <Card key={audience}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{audience}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
                    {points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Screenshot placeholders */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium">
            <ImageIcon className="h-5 w-5 text-primary" />
            Screenshot Checklist
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCREENSHOTS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center"
              >
                <ImageIcon className="mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs font-medium text-foreground">{s.label}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core message (verbatim, again, for emphasis) */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium">
            <Megaphone className="h-5 w-5 text-primary" />
            Core Message (verbatim)
          </h2>
          <blockquote className="border-l-2 border-primary pl-4 text-sm italic text-foreground">
            {CORE_PITCH}
          </blockquote>
          <p className="mt-2 text-xs text-muted-foreground">
            Use this exact wording in investor decks, grant applications, and
            press materials unless you've A/B tested alternatives.
          </p>
        </section>
      </div>
    </OwnerShell>
  );
}
