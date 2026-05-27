import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import resourcesHero from "@/assets/resources-hero.jpg";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resource Hub — TransitionForward" },
      {
        name: "description",
        content:
          "A growing, plain-language library for Connecticut families and educators navigating transition planning — agencies, glossary, and forms in one calm place.",
      },
      { property: "og:title", content: "Resource Hub — TransitionForward" },
      {
        property: "og:description",
        content:
          "Agencies, glossary, and downloadable templates for the transition years — curated by us, written for you.",
      },
    ],
  }),
  component: ResourcesPage,
});

const agencies = [
  {
    name: "Bureau of Rehabilitation Services (BRS)",
    summary:
      "Connecticut's vocational rehabilitation agency. Helps eligible students plan for and find work after high school — job coaching, training dollars, and on-the-job supports.",
    who: "Open the door at age 16. Most students apply during 11th or 12th grade.",
    link: "https://portal.ct.gov/aging-and-disability/content-pages/bureaus/bureau-of-rehabilitation-services",
  },
  {
    name: "Department of Developmental Services (DDS)",
    summary:
      "Adult services for individuals with intellectual disability and autism — day programs, employment supports, residential options. Eligibility is determined separately from school services.",
    who: "Apply early — the eligibility process can take a year or more.",
    link: "https://portal.ct.gov/dds",
  },
  {
    name: "CT Parent Advocacy Center (CPAC)",
    summary:
      "Free, family-led support for navigating special education and transition. Trained parents walk you through your rights, your IEP, and your next PPT meeting.",
    who: "Best for: families who want a human on the phone before the next meeting.",
    link: "https://cpacinc.org/",
  },
  {
    name: "SERC — State Education Resource Center",
    summary:
      "Connecticut's training and technical-assistance arm for special education. Hosts transition workshops, family nights, and educator institutes throughout the year.",
    who: "Best for: educators and families looking to learn together.",
    link: "https://ctserc.org/",
  },
];

const glossary = [
  { term: "PPT (Planning and Placement Team)", def: "The team meeting where your child's IEP is written and reviewed. In Connecticut, this is the formal name for what other states call the IEP meeting." },
  { term: "Transition planning", def: "The part of the IEP that prepares a student for life after high school — work, education, independent living. It must start by age 14 in Connecticut." },
  { term: "Postsecondary goals", def: "Measurable goals for what the student will do after leaving high school, in three areas: education or training, employment, and (when needed) independent living." },
  { term: "Age of majority", def: "At 18, educational rights legally transfer from parent to student — unless other arrangements are made. Worth discussing well before the senior year." },
  { term: "Summary of Performance (SOP)", def: "A document the school provides when a student exits special education. It summarizes academic and functional performance and recommendations — a bridge to adult services." },
  { term: "Self-determination", def: "The skill of knowing what you want and asking for it. In transition, this is what students practice when they help lead their own PPT." },
];

const templates = [
  { title: "Family Voice worksheet", description: "A one-page reflection — hopes, worries, what's working, what isn't. Bring it to the next PPT." },
  { title: "Student-led PPT script", description: "A gentle script your student can use to share their strengths, goals, and questions at their own meeting." },
  { title: "First-job readiness checklist", description: "The small, real-life skills behind a first paycheck — interview clothes, transportation plan, time tracking, communication." },
];

function ResourcesPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Resource Hub</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              The map you wish someone had handed you.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transition planning is full of acronyms, agencies, and forms — most of them
              introduced to families one at a time, usually under pressure. Here is a small,
              calm starting point: who the agencies are, what the words mean, and a few
              worksheets we'll be opening up as the platform grows.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={resourcesHero}
              alt="A tidy desk with folders, a map of Connecticut, and a warm mug"
              width={1600}
              height={1100}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mt-4">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Connecticut agencies, in plain words</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {agencies.map((a) => (
              <a
                key={a.name}
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <h3 className="font-display text-xl font-medium tracking-tight group-hover:text-primary">
                  {a.name} →
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
                <p className="mt-3 text-xs italic text-foreground/70">{a.who}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-20">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">A small glossary</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            The words you'll hear in your next PPT — without the jargon wall.
          </p>
          <dl className="mt-8 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card shadow-soft">
            {glossary.map((g) => (
              <div key={g.term} className="grid gap-1 p-7 sm:grid-cols-[1fr_2fr] sm:gap-8">
                <dt className="font-display text-lg font-semibold text-foreground">{g.term}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{g.def}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-20">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Worksheets &amp; templates</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Opening up as part of the pilot. Want early access? Join the waitlist below.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {templates.map((t) => (
              <div key={t.title} className="rounded-3xl border border-dashed border-border/70 bg-gradient-warm p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Coming soon</p>
                <h3 className="mt-3 font-display text-xl font-medium tracking-tight">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 overflow-hidden rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Be the first to use the new worksheets.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
            We're rolling out tools gradually so each one is genuinely helpful, not just
            another thing in your inbox. Joining the waitlist tells us who to invite first.
          </p>
          <Link
            to="/waitlist"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
          >
            Join the waitlist →
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
