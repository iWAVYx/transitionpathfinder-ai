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

const familyRolePage = "/platform-role-family.png";
const studentRolePage = "/platform-role-student.png";
const educatorRolePage = "/platform-role-educator.png";
const adminRolePage = "/platform-role-district-admin.png";

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
    url: "transitionforward.app/demo/family",
    previewLabel: "Family Preview",
    bullets: [
      "See your child's Pathway Report in plain language",
      "Save hopes, concerns, and questions between PPT meetings",
      "Accept invites from your child's teacher or case manager",
      "Match Connecticut resources to your child's interests",
    ],
    scenario:
      "Maria opens her dashboard Sunday night, reads the new Pathway Report Mr. Reyes shared, and types three questions she wants to bring to Thursday's PPT.",
    image: familyRolePage,
    imageAlt: "Family role preview page showing the parent/guardian command strip, connected student card, pathway report, IEP & documents, meeting prep, and family action items.",
  },
  {
    key: "student",
    icon: Mic,
    label: "Student",
    who: "The Person Whose Life This Is",
    tagline: "Your Voice Comes First.",
    url: "transitionforward.app/demo/student",
    previewLabel: "Student Preview",
    bullets: [
      "Tell your team what you are good at and what you love",
      "Say what you want life to look like after high school",
      "Read your Pathway Report in your own words",
      "Find programs and jobs that fit who you are",
    ],
    scenario:
      "Jordan adds three things he is proud of, picks animal care as a direction he wants to try, and his teacher sees it before the next meeting.",
    image: studentRolePage,
    imageAlt: "Student role preview page showing the student command strip, pathway stage, student voice, action items, next meeting, and saved resources.",
  },
  {
    key: "educator",
    icon: GraduationCap,
    label: "Educator",
    who: "Teachers And Case Managers",
    tagline: "One Snapshot Per Student. Always Current.",
    url: "transitionforward.app/demo/educator",
    previewLabel: "Educator Preview",
    bullets: [
      "See every student's progress in one roster",
      "Edit transition goals and track milestones",
      "Invite families to collaborate on a student",
      "Generate PPT prep packets with one click",
    ],
    scenario:
      "Mr. Reyes opens his roster, sees Jordan moved from Explore to Prepare this week, and sends Maria an invite to review the updated plan.",
    image: educatorRolePage,
    imageAlt: "Educator role preview page showing the case-manager command strip, caseload snapshot, readiness signals, pending educator input, pathway reports, and meeting prep.",
  },
  {
    key: "admin",
    icon: ShieldCheck,
    label: "Admin",
    who: "District And Program Leads",
    tagline: "Know What's Working, District Wide.",
    url: "transitionforward.app/demo/district-admin",
    previewLabel: "District Admin Preview",
    bullets: [
      "Manage staff, families, and student access",
      "Approve and triage the waitlist",
      "See usage across schools and programs",
      "Keep data private and FERPA aware by default",
    ],
    scenario:
      "A program lead opens the admin console, approves five new family accounts from the waitlist, and assigns case managers to their students.",
    image: adminRolePage,
    imageAlt: "District admin role preview page showing the district command strip, connected schools, district readiness, school-by-school progress, and implementation status.",
  },
];

export function PerspectiveTabs() {
  const [active, setActive] = useState<Key>("family");
  const current = perspectives.find((p) => p.key === active)!;

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
        <div className="text-left">
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
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            <img
              src={current.image}
              alt={current.imageAlt}
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
          </div>
        </PerspectivePreview>
      </div>
    </div>
  );
}

