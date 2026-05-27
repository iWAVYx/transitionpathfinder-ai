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
          "One platform. One plan. Forward together. Expert-built Pathway planning for Connecticut families, students, and educators.",
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
              Expert-built Pathway recommendations, student-centered goal tracking, and
              real-world opportunity matching — moving every team from paperwork
              to progress.
            </p>
          </div>

          <div className="space-y-24">
            <Zigzag
              eyebrow="The Signature Output"
              title="The Pathway Report"
              body="Share your student's strengths, interests, and goals. TransitionForward delivers a personalized Pathway Report — the career direction, life-skills focus, family questions for the next PPT, and a 30-day plan you can actually act on. Every Pathway is built from specialist-designed formulas, Connecticut transition data, and the lived experience of special educators."
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

      {/* PATHWAYS — image tile grid of real next-step destinations */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Real-life pathways
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Many roads forward. One plan that fits.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              College, technical training, supported employment, daily life skills,
              and the steady progress in between — TransitionForward helps every
              student picture what's next and the small steps to get there.
            </p>
          </div>
        </div>
        <div className="grid auto-rows-[14rem] grid-cols-2 gap-4 sm:auto-rows-[16rem] md:auto-rows-[18rem] md:grid-cols-12 md:gap-5">
          <PathwayTile
            className="col-span-2 row-span-2 md:col-span-6 md:row-span-2"
            image={pathCollege}
            label="College"
            caption="Two- and four-year programs, with the right supports in place."
            size="lg"
            pathwayId="college"
          />
          <PathwayTile
            className="col-span-2 md:col-span-6"
            image={pathTechnical}
            label="Technical Education"
            caption="Hands-on trades, certificates, and apprenticeships."
            pathwayId="technical-education"
          />
          <PathwayTile
            className="col-span-2 md:col-span-2"
            image={pathCareer}
            label="Career & Employment"
            caption="Job training, internships, BRS."
            compact
            pathwayId="career"
          />
          <PathwayTile
            className="col-span-1 md:col-span-2"
            image={pathLifeskills}
            label="Life Skills"
            caption="Cooking, transit, money, daily independence."
            compact
            pathwayId="life-skills"
          />
          <PathwayTile
            className="col-span-1 md:col-span-2"
            image={pathProgress}
            label="Progress Tracked"
            caption="Small wins, gently celebrated."
            compact
            pathwayId="progress"
          />
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

function PathwayTile({
  image,
  label,
  caption,
  className = "",
  size = "md",
  compact = false,
  pathwayId,
}: {
  image: string;
  label: string;
  caption: string;
  className?: string;
  size?: "md" | "lg";
  compact?: boolean;
  pathwayId: string;
}) {
  return (
    <Link
      to="/pathways/$pathwayId"
      params={{ pathwayId }}
      aria-label={`Open the ${label} guided pathway`}
      className={`group relative block overflow-hidden rounded-3xl shadow-soft transition-all hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
      <div
        className={`absolute inset-x-0 bottom-0 text-background ${
          compact ? "p-4 sm:p-5" : size === "lg" ? "p-6 sm:p-8" : "p-5 sm:p-6"
        }`}
      >
        <h3
          className={`font-display font-medium tracking-tight ${
            size === "lg"
              ? "text-2xl sm:text-3xl md:text-4xl"
              : compact
                ? "text-base sm:text-lg"
                : "text-xl sm:text-2xl"
          }`}
        >
          {label}
        </h3>
        {!compact && (
          <p
            className={`mt-1.5 leading-relaxed text-background/85 ${
              size === "lg" ? "text-sm sm:text-base max-w-md" : "text-xs sm:text-sm"
            }`}
          >
            {caption}
          </p>
        )}
        <span className="mt-2 inline-flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-background/90 opacity-0 transition-opacity group-hover:opacity-100">
          Open guided flow →
        </span>
      </div>
    </Link>
  );
}
