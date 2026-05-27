import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import heroImg from "@/assets/home-hero.jpg";
import studentImg from "@/assets/home-student.jpg";
import familyImg from "@/assets/home-family.jpg";
import educatorImg from "@/assets/home-educator.jpg";
import pathwayImg from "@/assets/home-pathway.jpg";
import pathCollege from "@/assets/path-college.jpg";
import pathTechnical from "@/assets/path-technical.jpg";
import pathCareer from "@/assets/path-career.jpg";
import pathLifeskills from "@/assets/path-lifeskills.jpg";
import pathProgress from "@/assets/path-progress.jpg";

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
      { property: "og:image", content: heroImg },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      {/* HERO — full-bleed image with overlaid text */}
      <section className="relative isolate -mt-px overflow-hidden">
        <img
          src={heroImg}
          alt="A young person walking a tree-lined path at golden hour"
          width={1920}
          height={1080}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        <div className="mx-auto max-w-7xl px-4 pb-32 pt-28 sm:px-6 sm:pb-40 sm:pt-32 lg:px-8 lg:pb-56 lg:pt-40">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Transition planning, made human
            </p>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              From IEP goals to <em className="not-italic text-primary">real-life</em> pathways.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80 sm:text-xl">
              A warm, easy-to-use platform that helps students with disabilities,
              families, and educators plan life after high school — together.
            </p>
            <p className="mt-5 font-display text-2xl italic text-foreground/75">
              One platform. One plan. Forward together.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5"
              >
                Join the waitlist
              </Link>
              <Link
                to="/platform"
                className="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-background/80 px-7 py-3.5 text-sm font-semibold backdrop-blur hover:bg-background"
              >
                Explore the platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM — split panel: photo + statement */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
              <img
                src={studentImg}
                alt="A student writing in a notebook by a sunlit window"
                width={1080}
                height={1600}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-background/85 p-5 backdrop-blur">
                <p className="font-display text-lg italic leading-snug text-foreground">
                  "I want to know what's next — in words I actually understand."
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  — A student, in their own words
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Why we built this
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Transition planning shouldn't feel scattered.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Families are often left trying to understand complicated documents,
              unclear goals, and missing context — wondering what comes after
              graduation and how to actually help. Educators are balancing heavy
              caseloads and the very real work of preparing students for life
              beyond high school. Students sometimes hear adults talk about
              their future without feeling part of the conversation.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-foreground">
              TransitionForward brings it together — gently, in plain language,
              and with the student at the center.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES — alternating zigzag, no boxes */}
      <section className="bg-muted/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              What's inside
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              A clearer way to plan what comes next.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              AI-supported recommendations, student-centered goal tracking, and
              real-world opportunity matching — moving every team from paperwork
              to progress.
            </p>
          </div>

          <div className="space-y-24">
            <Zigzag
              eyebrow="Signature feature"
              title="AI Pathway Builder"
              body="Share your student's strengths, interests, and goals. TransitionForward generates a personalized Pathway Report — career directions, life-skills focus, family questions for the next PPT, and a 30-day plan you can actually act on."
              image={pathwayImg}
              alt="A winding road through golden fields at sunset"
              align="left"
            />
            <Zigzag
              eyebrow="Student voice profile"
              title="A space that's just theirs."
              body="What they're good at, what they enjoy, what kind of life they want next — in their own words. Their voice anchors every plan and every meeting."
              image={studentImg}
              alt="A student writing thoughtfully at a sunlit desk"
              align="right"
            />
            <Zigzag
              eyebrow="Family portal"
              title="Plain-language translation."
              body="Transition goals explained — what they mean, why they matter, what to ask next. Track progress, find the right resources, and walk into PPT meetings prepared."
              image={familyImg}
              alt="A parent and teenager looking at a laptop together"
              align="left"
            />
            <Zigzag
              eyebrow="For educators"
              title="Less paperwork. More presence."
              body="Goal tracking, PPT meeting prep, and a Connecticut-aware Resource & Opportunity Match — community colleges, technical schools, BRS, internships — all matched to interest, location, and grade."
              image={educatorImg}
              alt="A teacher working calmly at a classroom desk"
              align="right"
            />
          </div>
        </div>
      </section>

      {/* AUDIENCE — three tall image cards with text overlay */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Who it helps
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Built for everyone at the table.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <AudiencePhoto
            image={studentImg}
            alt="A student writing in a notebook"
            title="Students"
            body="Understand your own plan, explore careers that match who you are, and walk into your PPT meeting knowing what to say."
            cta={{ to: "/platform", label: "Explore the platform" }}
          />
          <AudiencePhoto
            image={familyImg}
            alt="A parent and teen at a kitchen table"
            title="Families"
            body="Finally see what's happening — in plain language. Track progress and find the resources your child actually needs."
            cta={{ to: "/families", label: "For families" }}
          />
          <AudiencePhoto
            image={educatorImg}
            alt="A teacher working at a classroom desk"
            title="Educators"
            body="Less time wrestling with paperwork, more time supporting students. Goal tracking, meeting prep, and family-friendly communication."
            cta={{ to: "/educators", label: "For educators" }}
          />
        </div>
      </section>

      {/* CTA — full-bleed road image */}
      <section className="relative isolate overflow-hidden">
        <img
          src={pathwayImg}
          alt="A winding road through fields at sunset"
          width={1920}
          height={1080}
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/30" />
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-2xl text-background">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/80">
              Be part of the first cohort
            </p>
            <h2 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Help students move forward with a plan that actually makes sense.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-background/85">
              We're opening a small Connecticut pilot for families and educators
              who want to help shape what transition planning should feel like.
              Join the waitlist and we'll reach out personally.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground shadow-lift transition-all hover:-translate-y-0.5"
              >
                Join the waitlist
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border border-background/30 px-7 py-3.5 text-sm font-semibold text-background hover:bg-background/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Zigzag({
  eyebrow,
  title,
  body,
  image,
  alt,
  align,
}: {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  align: "left" | "right";
}) {
  const imageFirst = align === "left";
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div
        className={`lg:col-span-7 ${
          imageFirst ? "lg:order-1" : "lg:order-2"
        }`}
      >
        <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] shadow-lift">
          <img
            src={image}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
          />
        </div>
      </div>
      <div
        className={`lg:col-span-5 ${
          imageFirst ? "lg:order-2" : "lg:order-1"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h3 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h3>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {body}
        </p>
      </div>
    </div>
  );
}

function AudiencePhoto({
  image,
  alt,
  title,
  body,
  cta,
}: {
  image: string;
  alt: string;
  title: string;
  body: string;
  cta: { to: string; label: string };
}) {
  return (
    <Link
      to={cta.to}
      className="group relative block aspect-[3/4] overflow-hidden rounded-[2rem] shadow-soft transition-all hover:shadow-lift"
    >
      <img
        src={image}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-7 text-background">
        <h3 className="font-display text-3xl font-medium tracking-tight">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-background/85">
          {body}
        </p>
        <span className="mt-5 inline-flex items-center text-sm font-semibold text-background">
          {cta.label} <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}
