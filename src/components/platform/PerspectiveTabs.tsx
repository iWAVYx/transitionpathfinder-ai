import { useState } from "react";
import {
  Heart,
  Mic,
  GraduationCap,
  ShieldCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PerspectivePreview } from "./PerspectivePreview";

import familyDashboardAsset from "@/assets/platform-family-dashboard.png.asset.json";
import studentDashboardAsset from "@/assets/platform-student-dashboard.png.asset.json";
import educatorDashboardAsset from "@/assets/platform-educator-dashboard.png.asset.json";
import adminDashboardAsset from "@/assets/platform-admin-dashboard.png.asset.json";

import { toTitleCase } from "@/lib/title-case";
type Key = "family" | "student" | "educator" | "admin";

const perspectives: Array<{
  key: Key;
  icon: typeof Heart;
  label: string;
  who: string;
  tagline: string;
  url: string;
  previewLabel: string;
  bullets: string[];
  scenario: string;
  image: string;
  imageAlt: string;
}> = [
  {
    key: "family",
    icon: Heart,
    label: "Family",
    who: "Parents And Caregivers",
    tagline: "You Walk In Prepared, Not Translated To.",
    url: "transitionforward.app/dashboard",
    previewLabel: "Family Dashboard",
    bullets: [
      "See your child's Pathway Report in plain language",
      "Save hopes, concerns, and questions between PPT meetings",
      "Accept invites from your child's teacher or case manager",
      "Match Connecticut resources to your child's interests",
    ],
    scenario:
      "Maria opens her dashboard Sunday night, reads the new Pathway Report Mr. Reyes shared, and types three questions she wants to bring to Thursday's PPT.",
    image: familyDashboardAsset.url,
    imageAlt: "Family dashboard showing Connected Student, Pathway Report, IEP & Documents, Meeting Prep, Calendar, and Family Action Items cards.",
  },
  {
    key: "student",
    icon: Mic,
    label: "Student",
    who: "The Person Whose Life This Is",
    tagline: "Your Voice Comes First.",
    url: "transitionforward.app/students/me",
    previewLabel: "Student Voice Profile",
    bullets: [
      "Tell your team what you are good at and what you love",
      "Say what you want life to look like after high school",
      "Read your Pathway Report in your own words",
      "Find programs and jobs that fit who you are",
    ],
    scenario:
      "Jordan adds three things he is proud of, picks animal care as a direction he wants to try, and his teacher sees it before the next meeting.",
    image: studentDashboardAsset.url,
    imageAlt: "Student dashboard showing My Pathway Report, Student Voice, My Action Items, Meeting Prep, Upcoming Meetings, and Saved Resources cards.",
  },
  {
    key: "educator",
    icon: GraduationCap,
    label: "Educator",
    who: "Teachers And Case Managers",
    tagline: "One Snapshot Per Student. Always Current.",
    url: "transitionforward.app/students",
    previewLabel: "Educator Roster",
    bullets: [
      "See every student's progress in one roster",
      "Edit transition goals and track milestones",
      "Invite families to collaborate on a student",
      "Generate PPT prep packets with one click",
    ],
    scenario:
      "Mr. Reyes opens his roster, sees Jordan moved from Explore to Prepare this week, and sends Maria an invite to review the updated plan.",
    image: educatorDashboardAsset.url,
    imageAlt: "Educator dashboard showing Caseload Snapshot, Student Readiness, Pending Educator Input, Pathway Reports, Meeting Prep, and Case Notes cards.",
  },
  {
    key: "admin",
    icon: ShieldCheck,
    label: "Admin",
    who: "District And Program Leads",
    tagline: "Know What's Working, District Wide.",
    url: "transitionforward.app/admin",
    previewLabel: "Admin Console",
    bullets: [
      "Manage staff, families, and student access",
      "Approve and triage the waitlist",
      "See usage across schools and programs",
      "Keep data private and FERPA aware by default",
    ],
    scenario:
      "A program lead opens the admin console, approves five new family accounts from the waitlist, and assigns case managers to their students.",
    image: adminDashboardAsset.url,
    imageAlt: "Admin dashboard showing District Overview, Connected Schools, School-By-School Progress, Readiness Trend, Implementation Progress, and District Reports cards.",
  },
];

export function PerspectiveTabs() {
  const [active, setActive] = useState<Key>("family");
  const current = perspectives.find((p) => p.key === active)!;
  const Preview = current.preview;

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-soft backdrop-blur">
        {perspectives.map((p) => {
          const Icon = p.icon;
          const isActive = p.key === active;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActive(p.key)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {current.who}
          </p>
          <h3 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
            {toTitleCase(current.tagline)}
          </h3>
          <ul className="mt-6 space-y-3">
            {current.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-foreground/85">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 rounded-2xl border border-dashed border-border bg-muted/40 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              A Day In The Life
            </p>
            <p className="mt-2 text-sm italic leading-relaxed text-foreground/80">
              {current.scenario}
            </p>
          </div>
        </div>

        <PerspectivePreview label={current.previewLabel} url={current.url}>
          <Preview />
        </PerspectivePreview>
      </div>
    </div>
  );
}

/* ----------------------- previews ----------------------- */

function FamilyPreview() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Inbox className="h-3.5 w-3.5" /> New Invite
        </div>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Mr. Reyes</span> invited you to collaborate on{" "}
          <span className="font-semibold">Jordan's</span> Pathway.
        </p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Accept
          </span>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs">
            Preview
          </span>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <FileText className="h-3.5 w-3.5" /> Latest Pathway Report
        </div>
        <p className="mt-2 font-display text-lg">A Plan For Jordan.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Curious, hands-on, calm with animals. Strong fit with veterinary support and small engine work.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <CalendarClock className="h-3.5 w-3.5" /> Upcoming PPT
        </div>
        <p className="mt-2 text-sm">Thursday, 3:30 PM with Mr. Reyes and Ms. Park.</p>
        <p className="mt-1 text-xs text-muted-foreground">3 questions saved for this meeting.</p>
      </div>
    </div>
  );
}

function StudentPreview() {
  const strengths = ["Patient", "Hands-on", "Reliable", "Animal lover"];
  const interests = ["Animals", "Engines", "Helping kids"];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          What I'm Good At
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {strengths.map((s) => (
            <span
              key={s}
              className="rounded-full bg-sky-soft px-3 py-1 text-xs font-medium text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          What I Love
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {interests.map((s) => (
            <span
              key={s}
              className="rounded-full bg-peach-soft px-3 py-1 text-xs font-medium text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          What I Want After High School
        </p>
        <p className="mt-2 text-sm italic leading-relaxed text-foreground/85">
          "I want to work with animals, live close to my family, and earn my own money."
        </p>
      </div>
    </div>
  );
}

function EducatorPreview() {
  const roster = [
    { name: "Jordan M.", phase: "Prepare", progress: 62, color: "bg-primary" },
    { name: "Aaliyah S.", phase: "Explore", progress: 38, color: "bg-sky" },
    { name: "Diego R.", phase: "Launch", progress: 84, color: "bg-peach" },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Users className="mr-1 inline h-3.5 w-3.5" /> Your Roster
          </p>
          <span className="text-[11px] text-muted-foreground">12 Students</span>
        </div>
        <div className="mt-3 space-y-3">
          {roster.map((r) => (
            <div key={r.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.phase} · {r.progress}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", r.color)}
                  style={{ width: `${r.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ClipboardList className="mr-1 inline h-3.5 w-3.5" /> Goal · Jordan M.
        </p>
        <p className="mt-2 text-sm font-medium">
          Complete two job shadow visits in animal care by June.
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            In Progress
          </span>
          <span className="text-muted-foreground">Updated 2 days ago</span>
        </div>
      </div>
    </div>
  );
}

function AdminPreview() {
  const rows = [
    { name: "Maria Santos", role: "Family", status: "Active" },
    { name: "James Reyes", role: "Educator", status: "Active" },
    { name: "P. Okonkwo", role: "Family", status: "Waitlist" },
    { name: "L. Park", role: "Admin", status: "Active" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Families" value="148" />
        <Stat label="Educators" value="32" />
        <Stat label="Waitlist" value="27" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            <MapPin className="mr-1 inline h-3.5 w-3.5" /> Recent Accounts
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {rows.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <span className="font-medium">{r.name}</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/80">
                  {r.role}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    r.status === "Active"
                      ? "bg-primary/10 text-primary"
                      : "bg-peach-soft text-foreground/80",
                  )}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
      <p className="font-display text-2xl font-medium">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
