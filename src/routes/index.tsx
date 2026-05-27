import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Compass,
  FileText,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransitionForward — A gentler way to plan your child's future" },
      {
        name: "description",
        content:
          "For families of high schoolers with IEPs. Upload the plan you already have, and we'll walk with you — one grade at a time — toward the life your child wants after graduation.",
      },
      { property: "og:title", content: "TransitionForward — A gentler way to plan your child's future" },
      {
        property: "og:description",
        content:
          "A warm, research-backed companion for transition planning, built by a special-education teacher who saw too many families left to figure it out alone.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <SiteShell>
      <Hero />
      <SixStrandsBento />
      <GradeBands />
      <HowItHelps />
      <ResearchTeaser />
      <ClosingCta />
    </SiteShell>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden />
      <div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-soft blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-peach-soft blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-foreground/80 shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              A quiet companion for families of students with IEPs
            </span>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              You don't have to figure out{" "}
              <span className="italic text-primary">
                what comes next
              </span>{" "}
              alone.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Your child's IEP is more than paperwork — it's the start of a life they're
              building. TransitionForward sits next to you through every grade,
              translating the plan, suggesting the next gentle step, and making
              sure your hopes for them are written into the goals.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/waitlist"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5"
              >
                Walk through it with us
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/framework"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold text-foreground shadow-soft backdrop-blur hover:bg-background"
              >
                See how it works
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
              <Stat value="9th" label="When the journey really begins" />
              <Stat value="6" label="Strands that shape a good life" />
              <Stat value="IDEA" label="& Connecticut IEP aligned" />
            </dl>
          </div>

          {/* Hero card collage */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-6 gap-3">
              <FloatCard
                className="col-span-6 bg-card"
                eyebrow="Where Maya is right now"
                title="10th grade · curious about logistics"
                body="Strong reader, finding her voice. Next gentle step: shadow a day at a local warehouse."
                accent="sky"
              />
              <FloatCard
                className="col-span-3 bg-card"
                eyebrow="A pathway worth exploring"
                title="Technical school"
                body="Strong match for her interests"
                accent="peach"
              />
              <FloatCard
                className="col-span-3 bg-card"
                eyebrow="Before your next PPT"
                title="3 questions ready for you"
                body="Already drafted in plain English"
                accent="sky"
              />
              <div className="col-span-6 rounded-2xl border border-border/60 bg-card p-4 shadow-lift">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" /> A quiet question, answered
                </div>
                <p className="mt-2 text-sm italic text-foreground">
                  "His IEP mentions 'community-based instruction' — what does that
                  actually look like in 10th grade, and what should I ask for?"
                </p>
                <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Grounded in <span className="font-medium text-foreground">your handbook</span> ·{" "}
                  <span className="font-medium text-foreground">Carter et al. 2012</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-3xl font-semibold text-foreground">{value}</dt>
      <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
    </div>
  );
}

function FloatCard({
  className,
  eyebrow,
  title,
  body,
  accent,
}: {
  className?: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: "sky" | "peach";
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 p-4 shadow-soft ${className ?? ""}`}
    >
      <div
        className={`mb-2 inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ${
          accent === "sky"
            ? "bg-sky-soft text-primary"
            : "bg-peach-soft text-secondary-foreground"
        }`}
      >
        {eyebrow}
      </div>
      <div className="font-display text-base font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------- Six Strands (bento) ---------- */

const strands = [
  {
    icon: GraduationCap,
    title: "Academics that lead somewhere",
    body:
      "Reading, writing, attendance, executive function — held up to the light of what your child is building toward, not graded in isolation.",
    span: "md:col-span-2",
    tint: "bg-sky-soft",
  },
  {
    icon: Compass,
    title: "Finding their own voice",
    body:
      "Your child learns to name their strengths, explain what helps them, and lead the conversation at their own PPT — at a pace that feels safe.",
    span: "md:col-span-2",
    tint: "bg-peach-soft",
  },
  {
    icon: HeartHandshake,
    title: "The skills that shape a day",
    body: "Money, transportation, health, routines, asking for help — small skills practiced early, layered with care over the years.",
    span: "md:col-span-2",
    tint: "bg-card",
  },
  {
    icon: Lightbulb,
    title: "A real look at what's out there",
    body:
      "Campus visits, job shadows, conversations with adults already doing the work — woven in starting freshman year, not crammed into senior spring.",
    span: "md:col-span-3",
    tint: "bg-card",
  },
  {
    icon: Users,
    title: "You, held in the loop",
    body: "No more carrying the whole picture between meetings. The plan lives with you, not buried in a binder at school.",
    span: "md:col-span-3",
    tint: "bg-gradient-warm",
  },
];

function SixStrandsBento() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            How we think about transition
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Six gentle threads, woven through four years.
          </h2>
        </div>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          A good transition plan isn't one big leap at the end of high school. It's
          six quiet threads, picked up early and carried steadily — so by the time
          your child walks across the stage, the next step is already in their hands.
        </p>
      </div>

      <div className="mt-12 grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-6">
        {strands.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className={`${s.span} ${s.tint} rounded-3xl border border-border/60 p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift`}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-background/80 shadow-soft">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-medium text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          );
        })}
        <div className="md:col-span-6 rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-medium">Everyone, finally on the same page</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                You, your child's teachers, their related-service providers, and the
                community partners who'll matter most after graduation — all looking at
                one shared picture of the plan. Nothing slips between meetings.
              </p>
            </div>
            <Link
              to="/framework"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
            >
              See the full framework <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Grade bands ---------- */

const bands = [
  {
    grade: "9",
    title: "Settle in, look around",
    body: "We help you take a clear-eyed look at how the year is starting — schedule, supports, what lights your child up. The early signals become honest conversations, not surprises.",
  },
  {
    grade: "10",
    title: "Try things on",
    body: "Career exposure begins in earnest. Life skills get real practice. Accommodations get reviewed and refined so your child knows what works for them — and can say so.",
  },
  {
    grade: "11",
    title: "Begin to choose",
    body: "Postsecondary interests start narrowing. Visits, work experiences, agency referrals, and applications get scheduled — together — instead of falling on you alone.",
  },
  {
    grade: "12+",
    title: "Hand off with confidence",
    body: "Your child exits high school with real next steps, the right contacts, the documents in hand, and a support plan that doesn't disappear the day after graduation.",
  },
];

function GradeBands() {
  return (
    <section className="relative border-y border-border/60 bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            One year at a time
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Every year of high school deserves its own focus.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            What's right for your child in 9th grade isn't what's right in 11th. Your
            family dashboard quietly shifts with them — so the next best thing to do
            is always grade-appropriate, never generic.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {bands.map((b, i) => (
            <li
              key={b.grade}
              className="relative rounded-3xl border border-border/60 bg-card p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero font-display text-xl font-semibold text-foreground shadow-soft">
                  {b.grade}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Stage {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-medium">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- How it helps ---------- */

const helps = [
  {
    icon: FileText,
    title: "Upload the IEP, get it in plain words",
    body:
      "Drop in your child's IEP or Connecticut SED form. We read it carefully and hand you back what it actually says — transition goals, services, what's strong, what's missing — with the source pages always cited so you can check our work.",
  },
  {
    icon: Compass,
    title: "Pathways that make sense for your child",
    body:
      "Four-year college, two-year, technical school, supported employment, competitive work, day programs. We rank what fits, gently explain why, and never pretend there's only one right answer.",
  },
  {
    icon: MessageCircle,
    title: "A coach you can ask anything, any time",
    body:
      "Stop saving up questions for the next PPT. Ask in the moment, in your own words. The coach knows your child's plan and the research behind every suggestion it makes.",
  },
  {
    icon: ShieldCheck,
    title: "Your child's records stay yours",
    body:
      "Everything you upload is encrypted, locked to your account alone, and never used to train AI. You can delete any document — or your entire account — whenever you choose.",
  },
];

function HowItHelps() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          The questions you've been carrying
        </p>
        <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          You shouldn't have to be the expert on everything.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Most families piece this together from PPT meetings, late-night searches,
          and well-meaning advice from other parents. We built TransitionForward so
          you have one place to bring all of it — and someone steady to talk it through with.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {helps.map((h) => {
          const Icon = h.icon;
          return (
            <div
              key={h.title}
              className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-soft">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-medium">{h.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Research teaser ---------- */

function ResearchTeaser() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Built on what actually works
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Every suggestion comes from research families can trust.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/80">
            Student-led IEPs, work-based learning, self-determination, family
            engagement, the right partners around the table at the right time — these
            are the things researchers like Mazzotti, Test, Allensworth, Carter, Trainor,
            and Burke have shown make a real difference. We don't guess. We point to
            the source every time.
          </p>
          <Link
            to="/research"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
          >
            Read the research library <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Mazzotti et al.", year: "2021", topic: "The updated list of what predicts a good life after high school" },
            { label: "Test et al.", year: "2009", topic: "The original evidence base for transition predictors" },
            { label: "Allensworth", year: "2013", topic: "Why 9th grade is the single most important transition year" },
            { label: "Carter et al.", year: "2011 / 2012", topic: "What work-based learning actually does for students" },
          ].map((p) => (
            <div
              key={p.label}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
            >
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {p.year}
              </div>
              <div className="mt-1 font-display text-base font-semibold">{p.label}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.topic}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Closing CTA ---------- */

function ClosingCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card p-8 shadow-lift sm:p-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-4xl font-medium tracking-tight">
              Come walk through this with us.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              We're inviting a small group of Connecticut families and educators
              into the pilot this season. There's no cost. Your story shapes what we
              build next — and you get a steadier hand to hold through transition.
            </p>
          </div>
          <Link
            to="/waitlist"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:-translate-y-0.5 transition-transform"
          >
            Request your place <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
