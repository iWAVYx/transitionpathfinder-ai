import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransitionForward — From IEP goals to real-life pathways" },
      {
        name: "description",
        content:
          "TransitionForward helps students with disabilities, families, and educators plan life after high school — organizing transition goals, student voice, resources, and progress in one warm, easy-to-use platform.",
      },
      { property: "og:title", content: "TransitionForward — From IEP goals to real-life pathways" },
      {
        property: "og:description",
        content:
          "One platform. One plan. Forward together. AI-supported transition planning built for Connecticut families, students, and educators.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Transition planning, made human
            </p>
            <h1 className="mt-4 font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              From IEP goals to real-life pathways.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              TransitionForward helps students with disabilities, families, and
              educators plan life after high school — organizing transition
              goals, student voice, resources, and progress in one warm,
              easy-to-use platform.
            </p>
            <p className="mt-5 font-display text-2xl italic text-foreground/80">
              One platform. One plan. Forward together.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
              >
                Join the waitlist
              </Link>
              <Link
                to="/platform"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted"
              >
                Explore the platform
              </Link>
              <Link
                to="/framework"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-foreground/80 hover:text-foreground"
              >
                See the framework →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Why we built this
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight">
              Transition planning shouldn't feel scattered.
            </h2>
          </div>
          <div className="md:col-span-3">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Families are often left trying to understand complicated documents,
              unclear goals, and missing context — wondering what comes after
              graduation and how to actually help. Educators are balancing heavy
              caseloads, documentation demands, and the very real work of
              preparing students for life beyond high school. Students sometimes
              hear adults talk about their future without feeling part of the
              conversation.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              TransitionForward brings it together — gently, in plain language,
              and with the student at the center.
            </p>
          </div>
        </div>
      </section>

      {/* Solution / bento features */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            What's inside
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight">
            A clearer way to plan what comes next.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            AI-supported recommendations, student-centered goal tracking, and
            real-world opportunity matching — moving every team from paperwork
            to progress.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <FeatureBento
            className="md:col-span-4"
            tone="primary"
            eyebrow="Signature feature"
            title="AI Pathway Builder"
            body="Share your student's strengths, interests, and goals, and TransitionForward generates a personalized Pathway Report — career directions, life-skills focus, family questions for the next PPT, and a 30-day plan you can actually act on."
          />
          <FeatureBento
            className="md:col-span-2"
            title="Student Voice Profile"
            body="A space that's just theirs: what they're good at, what they enjoy, what kind of life they want next."
          />
          <FeatureBento
            className="md:col-span-2"
            title="Family Portal"
            body="Plain-language translation of transition goals — what they mean, why they matter, what to ask next."
          />
          <FeatureBento
            className="md:col-span-2"
            title="Goal & Progress Tracker"
            body="Goal → skill → evidence → next step. Progress finally lines up with the plan."
          />
          <FeatureBento
            className="md:col-span-2"
            title="Assessment Vault"
            body="Keep interest inventories, work samples, and assessments in one place — so growth over time isn't lost."
          />
          <FeatureBento
            className="md:col-span-3"
            title="PPT Meeting Prep"
            body="A gentle agenda builder: strengths, recent progress, family concerns, student talking points, and next steps — ready before you walk in the room."
          />
          <FeatureBento
            className="md:col-span-3"
            title="Resource & Opportunity Match"
            body="Connecticut-aware recommendations — community colleges, technical schools, job training, BRS, internships — matched to interest, location, and grade."
          />
        </div>
      </section>

      {/* Who it helps */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Who it helps
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight">
            Built for everyone at the table.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <AudienceCard
            title="Students"
            body="Understand your own plan, explore careers that match who you are, and walk into your PPT meeting knowing what to say. This is your future — you should help shape it."
            cta={{ to: "/platform", label: "Explore the platform" }}
          />
          <AudienceCard
            title="Families"
            body="Finally see what's happening — in plain language. Track progress, get the questions you didn't know to ask, and find the resources your child actually needs."
            cta={{ to: "/families", label: "For families" }}
          />
          <AudienceCard
            title="Educators"
            body="Less time wrestling with paperwork, more time supporting students. Goal tracking, meeting prep, and family-friendly communication that saves your evenings."
            cta={{ to: "/educators", label: "For educators" }}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Be part of the first cohort
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Help students move forward with a plan that actually makes sense.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            We're opening a small Connecticut pilot for families and educators
            who want to help shape what transition planning should feel like.
            Join the waitlist and we'll reach out personally.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/waitlist"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              Join the waitlist
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold hover:bg-background"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function FeatureBento({
  className = "",
  tone = "default",
  eyebrow,
  title,
  body,
}: {
  className?: string;
  tone?: "default" | "primary";
  eyebrow?: string;
  title: string;
  body: string;
}) {
  const base =
    "rounded-3xl border p-6 shadow-soft transition-all hover:shadow-lift sm:p-8";
  const toneClass =
    tone === "primary"
      ? "bg-gradient-hero border-primary/20"
      : "bg-card border-border/60";
  return (
    <div className={`${base} ${toneClass} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      )}
      <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function AudienceCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border/60 bg-card p-8 shadow-soft transition-all hover:shadow-lift">
      <h3 className="font-display text-2xl font-medium tracking-tight">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link
        to={cta.to}
        className="mt-6 inline-flex items-center text-sm font-semibold text-primary hover:underline"
      >
        {cta.label} →
      </Link>
    </div>
  );
}
