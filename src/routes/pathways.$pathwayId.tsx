import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { RouteErrorComponent } from "@/components/routing/RouteErrorComponent";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { SmartBackLink } from "@/components/site/SmartBackLink";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { photos } from "@/lib/photos";
const pathCollege = photos.pathCollege;
const pathTechnical = photos.pathTechnical;
const pathCareer = photos.pathCareer;
const pathLifeskills = photos.pathLifeskills;
const pathProgress = photos.pathProgress;

import { toTitleCase } from "@/lib/title-case";
type PathwayStep = {
  title: string;
  description: string;
  checklist: string[];
};

type Pathway = {
  id: string;
  label: string;
  tagline: string;
  intro: string;
  image: string;
  steps: PathwayStep[];
};

const PATHWAYS: Record<string, Pathway> = {
  college: {
    id: "college",
    label: "College",
    tagline: "Two- and four-year programs, with the right supports in place.",
    intro:
      "A guided plan for exploring colleges, lining up accommodations, and building the academic habits that make the transition stick.",
    image: pathCollege,
    steps: [
      {
        title: "Picture the goal",
        description:
          "Talk through what kind of campus, schedule, and supports feel right. There is no single right answer — the goal is a shortlist of programs worth visiting.",
        checklist: [
          "Note 2–3 fields of interest",
          "Decide on commute vs. residential",
          "List must-have supports (tutoring, OT, mental health)",
        ],
      },
      {
        title: "Map the supports",
        description:
          "Colleges call it 'Disability Services' or 'Accessibility Resources'. Each campus has different paperwork — start now so accommodations are ready day one.",
        checklist: [
          "Request documentation guidelines from each school",
          "Save IEP and most recent evaluations",
          "Schedule a virtual intake with each disability office",
        ],
      },
      {
        title: "Build the year-by-year plan",
        description:
          "Work backward from the application deadline. Add small checkpoints so nothing piles up senior spring.",
        checklist: [
          "Course load each semester through graduation",
          "Testing windows (SAT/ACT or test-optional confirmation)",
          "Campus visits and info sessions",
        ],
      },
      {
        title: "Practice the transition",
        description:
          "The biggest leap is self-advocacy. Rehearse the conversations a student will have with professors and advisors.",
        checklist: [
          "Draft a self-introduction email to a professor",
          "Role-play asking for an extension",
          "Set a weekly check-in with a trusted adult",
        ],
      },
    ],
  },
  "technical-education": {
    id: "technical-education",
    label: "Technical education",
    tagline: "Hands-on trades, certificates, and apprenticeships.",
    intro:
      "Pair real interests with a clear path to a credential — welding, IT, automotive, healthcare, construction, culinary, and more.",
    image: pathTechnical,
    steps: [
      {
        title: "Try before you commit",
        description:
          "A two-hour shop tour can save two years. Look for taster programs, summer institutes, and CTE pathways at the high school.",
        checklist: [
          "List 3 trades to explore",
          "Schedule a shadow day or shop tour",
          "Ask current students what surprised them",
        ],
      },
      {
        title: "Pick the credential",
        description:
          "Not every trade needs a degree. Certificates, licenses, and registered apprenticeships often pay while you learn.",
        checklist: [
          "Compare certificate vs. associate vs. apprenticeship",
          "Confirm program length and total cost",
          "Check state licensure requirements",
        ],
      },
      {
        title: "Line up the supports",
        description:
          "Technical programs move fast. Accommodations should be confirmed before tools are in hand.",
        checklist: [
          "Request accommodations in writing",
          "Identify a single point of contact at the program",
          "Plan transportation for early-morning labs",
        ],
      },
      {
        title: "Plan the first 90 days",
        description:
          "Most drop-outs happen in the first quarter. Build a simple weekly routine and a backup plan.",
        checklist: [
          "Weekly schedule including travel and rest",
          "Tool/uniform/safety gear checklist",
          "Who to call if something goes wrong",
        ],
      },
    ],
  },
  career: {
    id: "career",
    label: "Career & employment",
    tagline: "Job training, internships, BRS.",
    intro:
      "Move from 'what could I do?' to a real paycheck. We'll line up Bureau of Rehabilitation Services (BRS) and community partners alongside the IEP.",
    image: pathCareer,
    steps: [
      {
        title: "Discover real interests",
        description:
          "Career interest inventories are a starting point — not the final word. Pair them with job tours and informational interviews.",
        checklist: [
          "Complete a career interest inventory",
          "Tour 2 workplaces in different industries",
          "Talk to one adult doing the work",
        ],
      },
      {
        title: "Open the BRS case",
        description:
          "Bureau of Rehabilitation Services can fund job coaching, training, and assistive tech. Apply by age 16 if eligible.",
        checklist: [
          "Confirm eligibility with the BRS counselor",
          "Gather IEP, evaluations, and ID",
          "Attend the intake meeting with a family member",
        ],
      },
      {
        title: "Build the resume and pitch",
        description:
          "Volunteer hours, classroom jobs, and chores count. Frame them as the skills they really are.",
        checklist: [
          "One-page resume",
          "30-second self-introduction",
          "List of 3 references",
        ],
      },
      {
        title: "Land the first placement",
        description:
          "Start with a paid internship, supported employment, or part-time role. Iterate as the student learns what fits.",
        checklist: [
          "Identify 5 target employers",
          "Set a job-coach schedule for the first 30 days",
          "Plan how to disclose (or not) the disability",
        ],
      },
    ],
  },
  "life-skills": {
    id: "life-skills",
    label: "Life skills",
    tagline: "Cooking, transit, money, daily independence.",
    intro:
      "The skills that make every other pathway possible. Build them in small, repeatable doses at home and at school.",
    image: pathLifeskills,
    steps: [
      {
        title: "Start at the kitchen counter",
        description:
          "Cooking teaches sequencing, time, and safety all at once. Pick 3 meals and master them.",
        checklist: [
          "Choose 3 'forever meals'",
          "Practice each one 5 times",
          "Build a grocery list template",
        ],
      },
      {
        title: "Learn the money basics",
        description:
          "Open a real account, use a real debit card, track real spending. Pretend money does not stick.",
        checklist: [
          "Open a checking account",
          "Set up direct deposit (even for allowance)",
          "Review the statement together monthly",
        ],
      },
      {
        title: "Master transportation",
        description:
          "Buses, paratransit, ride-share — pick the mode that fits the next pathway and practice it before it's needed.",
        checklist: [
          "Ride a fixed route together",
          "Ride it alone with a check-in call",
          "Save backup contacts in the phone",
        ],
      },
      {
        title: "Run the apartment day",
        description:
          "Once a month, the student runs everything: meals, laundry, bills, schedule. Notice what's hard.",
        checklist: [
          "Pick a 'practice day' on the calendar",
          "Make a checklist for the day",
          "Debrief what worked and what didn't",
        ],
      },
    ],
  },
  progress: {
    id: "progress",
    label: "Progress, tracked",
    tagline: "Small wins, gently celebrated.",
    intro:
      "Progress is rarely linear. Use this flow to set up a simple tracking rhythm — one any family, teacher, or student can keep up.",
    image: pathProgress,
    steps: [
      {
        title: "Pick 3 goals that matter",
        description:
          "More than three and nothing moves. Pull them straight from the IEP or transition plan.",
        checklist: [
          "Choose 3 goals (academic, life, social)",
          "Write each as a single sentence",
          "Confirm everyone agrees on the wording",
        ],
      },
      {
        title: "Define 'a good week'",
        description:
          "Decide what evidence shows progress — a checklist, a photo, a quick note. Keep it 60 seconds or less.",
        checklist: [
          "Pick one signal per goal",
          "Pick a logging tool (paper, phone, app)",
          "Schedule the weekly 5-minute review",
        ],
      },
      {
        title: "Share with the team",
        description:
          "Loop in teachers, related services, and family. One shared snapshot beats five different versions of the truth.",
        checklist: [
          "Decide who sees the snapshot",
          "Set a monthly send cadence",
          "Note who to call when something dips",
        ],
      },
      {
        title: "Celebrate the wins",
        description:
          "Adolescents repeat what gets noticed. Build a small ritual around every milestone.",
        checklist: [
          "Pick a 'small win' ritual",
          "Pick a 'milestone' ritual",
          "Tell the student exactly what you saw",
        ],
      },
    ],
  },
};

export const Route = createFileRoute("/pathways/$pathwayId")({
  loader: ({ params }): { pathway: Pathway } => {
    const pathway = PATHWAYS[params.pathwayId];
    if (!pathway) throw notFound();
    return { pathway };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.pathway;
    const title = p
      ? `${p.label} pathway — TransitionForward`
      : "Pathway — TransitionForward";
    const description = p?.intro ?? "A guided flow for transition planning.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `/pathways/${params.pathwayId}` },
        ...(p ? [{ property: "og:image", content: p.image }] : []),
      ],
      links: [{ rel: "canonical", href: `/pathways/${params.pathwayId}` }],
    };
  },
  component: PathwayFlow,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-14 text-center">
        <h1 className="font-display text-3xl">Pathway Not Found</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn't find that pathway. Try one of the five on the home page.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </SiteShell>
  ),
  errorComponent: RouteErrorComponent,
});

function PathwayFlow() {
  const { pathway } = Route.useLoaderData();
  const [activeIdx, setActiveIdx] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const articleRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  const total = pathway.steps.length;
  const completed = done.size;
  const progress = Math.round((completed / total) * 100);
  const step = pathway.steps[activeIdx];
  const isLastStep = activeIdx === total - 1;
  const allDone = completed === total;

  // Scroll to top when the pathway route mounts (fixes coming in mid-scroll from home).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathway.id]);

  // When the user picks a step, bring the step detail into view on small screens
  // where the rail sits above the article. Skip the first render.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) return;
    articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIdx]);

  const goToStep = (i: number) => setActiveIdx(i);

  const markDone = () => {
    setDone((prev) => {
      const next = new Set(prev);
      next.add(activeIdx);
      return next;
    });
    if (!isLastStep) setActiveIdx(activeIdx + 1);
  };

  const unmarkDone = (idx: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-64 w-full overflow-hidden sm:h-80">
          <img
            src={pathway.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-foreground/10" />
          <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-8 text-background sm:px-6 lg:px-8">
            <SmartBackLink
              fallbackTo="/"
              label="Back to all pathways"
              className="mb-3 -ml-2 text-background/85 hover:bg-background/10 hover:text-background"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/80">
              Guided flow
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-5xl">
              {toTitleCase(pathway.label)}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-background/90 sm:text-base">
              {pathway.tagline}
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[18rem_1fr] lg:px-8">
        {/* Step rail */}
        <aside aria-label="Steps" className="md:sticky md:top-6 md:self-start">
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Step {activeIdx + 1} of {total}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
          <ol className="space-y-1.5">
            {pathway.steps.map((s: PathwayStep, i: number) => {
              const isActive = i === activeIdx;
              const isDone = done.has(i);
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    <span
                      onClick={(e) => {
                        if (isDone) {
                          e.stopPropagation();
                          unmarkDone(i);
                        }
                      }}
                      role={isDone ? "button" : undefined}
                      aria-label={isDone ? "Mark as not done" : undefined}
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isDone
                          ? "bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer"
                          : isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        isActive ? "font-semibold text-foreground" : "text-foreground/80",
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Step detail */}
        <article ref={articleRef} className="min-w-0 scroll-mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {pathway.label}
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium sm:text-3xl">
            {toTitleCase(step.title)}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          <div className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Try This
            </h3>
            <ul className="mt-3 space-y-2.5">
              {step.checklist.map((item: string) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
              disabled={activeIdx === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            {done.has(activeIdx) ? (
              <Button variant="secondary" onClick={() => unmarkDone(activeIdx)}>
                Mark as not done
              </Button>
            ) : (
              <Button onClick={markDone}>
                {isLastStep ? (
                  <>
                    <Check className="h-4 w-4" /> Mark complete
                  </>
                ) : (
                  <>
                    Mark done & continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            {!isLastStep && (
              <Button
                variant="ghost"
                onClick={() => setActiveIdx(Math.min(total - 1, activeIdx + 1))}
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {allDone && (
            <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-display text-xl">
                    Nice Work — Every Step Is Complete.
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bring these notes to your next PPT meeting, or generate a
                    Pathway Report so the whole team is on the same page.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild>
                      <Link to="/pathway">Create a Pathway Report</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/">Explore Another Pathway</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </SiteShell>
  );
}
