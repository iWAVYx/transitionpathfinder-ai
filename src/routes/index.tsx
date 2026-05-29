import { Link, createFileRoute } from "@tanstack/react-router";
import {
  HeartHandshake,
  GraduationCap,
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  MessagesSquare,
  Compass,
  Lock,
  UserCheck,
  Download,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import heroImg from "@/assets/home-hero.jpg";
import studentImg from "@/assets/home-student.jpg";
import studentPhotoImg from "@/assets/home-student-photo.jpg";
import familyImg from "@/assets/home-family.jpg";
import educatorImg from "@/assets/home-educator.jpg";
import pathwayImg from "@/assets/home-pathway.jpg";
import roadImg from "@/assets/home-road.jpg";
import pathCollege from "@/assets/path-college.jpg";
import pathTechnical from "@/assets/path-technical.jpg";
import pathCareer from "@/assets/path-career.jpg";
import pathLifeskills from "@/assets/path-lifeskills.jpg";
import pathProgress from "@/assets/path-progress.jpg";
import dashboardImg from "@/assets/dashboard-hero.jpg";
import iepUploadImg from "@/assets/iep-upload.jpg";
import layerOrganizeImg from "@/assets/layer-organize.jpg";
import layerGenerateImg from "@/assets/layer-generate.jpg";
import layerConnectImg from "@/assets/layer-connect.jpg";
import resourcesImg from "@/assets/resources-hero-v2.jpg";
import frameworkImg from "@/assets/framework-hero.jpg";
import stickerCollege from "@/assets/sticker-college.png";
import stickerTechnical from "@/assets/sticker-technical.png";
import stickerCareer from "@/assets/sticker-career.png";
import stickerLifeskills from "@/assets/sticker-lifeskills.png";
import stickerProgress from "@/assets/sticker-progress.png";
import doodlePlane from "@/assets/doodle-plane.png";
import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  Marquee,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";
import { FloatingShape } from "@/components/effects/ImmersiveEffects";
import {
  DotField,
  Squiggle,
  Starburst,
  Sparkle,
  ArrowDoodle,
  PaperPlane,
  BookDoodle,
  CompassRose,
  Confetti,
  UnderlineSwoosh,
  ArcStack,
} from "@/components/effects/Decorations";


import { toTitleCase } from "@/lib/title-case";
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
        <ParallaxImage
          src={heroImg}
          alt="A young person walking a tree-lined path at golden hour"
          width={1920}
          height={1080}
          speed={0.45}
          className="absolute inset-0 -z-10 h-full w-full"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* Dramatic 3D morphing shape — primary blob */}
        <ShapeScroll
          className="absolute -left-40 -top-24 -z-10 h-[44rem] w-[44rem] text-primary/45 mix-blend-multiply md:block"
          spin={220}
          scale={1.1}
          tilt={45}
          drift={140}
          gradientFrom="hsl(210 90% 70%)"
          gradientTo="hsl(280 80% 65%)"
        />
        {/* Secondary counter-rotating shape, right side */}
        <ShapeScroll
          className="absolute -right-32 top-40 -z-10 hidden h-[34rem] w-[34rem] mix-blend-multiply lg:block"
          spin={-180}
          scale={0.9}
          tilt={35}
          drift={-100}
          gradientFrom="hsl(20 90% 70%)"
          gradientTo="hsl(340 85% 70%)"
        />
        {/* Smaller accent shape lower-left */}
        <ShapeScroll
          className="absolute left-1/3 bottom-10 -z-10 hidden h-56 w-56 lg:block"
          spin={300}
          scale={1.4}
          tilt={60}
          drift={80}
          gradientFrom="hsl(150 70% 65%)"
          gradientTo="hsl(190 80% 60%)"
        />


        {/* Floating playful doodles */}
        <Parallax speed={-0.25} className="pointer-events-none absolute right-4 top-20 -z-10 hidden md:block lg:right-16 lg:top-24">
          <img
            src={doodlePlane}
            alt=""
            aria-hidden="true"
            className="w-72 opacity-80 float-y-slow lg:w-96"
          />
        </Parallax>

        <span aria-hidden="true" className="pointer-events-none absolute right-[28%] top-32 -z-10 hidden h-3 w-3 rounded-full bg-primary/70 sparkle-twinkle md:block" />
        <span aria-hidden="true" className="pointer-events-none absolute right-[18%] top-[260px] -z-10 hidden h-2 w-2 rounded-full bg-amber-400 sparkle-twinkle md:block" style={{ animationDelay: "0.8s" }} />
        <span aria-hidden="true" className="pointer-events-none absolute right-[40%] top-[200px] -z-10 hidden h-2.5 w-2.5 rounded-full bg-pink-400 sparkle-twinkle md:block" style={{ animationDelay: "1.4s" }} />
        {/* Soft blob behind headline */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl blob-drift" />

        <div className="mx-auto max-w-7xl px-4 pb-32 pt-28 sm:px-6 sm:pb-40 sm:pt-32 lg:px-8 lg:pb-56 lg:pt-40">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Transition planning, made human
            </p>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              From IEP goals to{" "}
              <span className="relative inline-block not-italic text-primary">
                real-life
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 24"
                  preserveAspectRatio="none"
                  className="draw-underline absolute -bottom-2 left-0 h-3 w-full"
                >
                  <path
                    d="M5 16 C 60 4, 140 22, 200 10 S 290 14, 295 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-primary/80"
                  />
                </svg>
              </span>{" "}
              pathways.
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
                className="group inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Join the waitlist
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/platform"
                className="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-background/80 px-7 py-3.5 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background"
              >
                Explore the platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM — split panel: photo + statement */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <ShapeScroll
          className="absolute -right-10 top-10 -z-10 hidden h-72 w-72 text-amber-300/20 lg:block"
          spin={140}
          scale={0.5}
        />
        <DotField className="absolute -left-4 top-4 -z-10 hidden h-40 w-40 text-primary/15 md:block" />
        <FloatingShape className="absolute right-6 top-10 z-0 hidden h-9 w-9 text-primary/60 md:block" delay={0.4}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <FloatingShape className="absolute left-1/3 -top-2 z-0 hidden h-7 w-7 text-secondary-foreground/60 md:block" duration={14} delay={1.2}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <Parallax speed={0.15} className="absolute -right-8 bottom-8 -z-0 hidden h-24 w-24 text-primary/70 lg:block">
          <PaperPlane className="h-full w-full" />
        </Parallax>

        <div className="grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5" y={36}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
              <ParallaxImage
                src={studentPhotoImg}
                alt="A student writing in a notebook by a sunlit window"
                width={1080}
                height={1600}
                speed={0.35}
                className="absolute inset-0 h-full w-full"
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
          </Reveal>
          <Reveal className="lg:col-span-7" delay={120}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Why we built this
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Transition planning shouldn't feel scattered.
              <UnderlineSwoosh className="mt-2 block h-3 w-64 text-primary/55" />
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
          </Reveal>
        </div>
      </section>

      {/* MARQUEE — voices band */}
      <section aria-label="Voices from the table" className="relative border-y border-border/40 bg-muted/30 py-6">
        <FloatingShape className="absolute left-6 top-1/2 -translate-y-1/2 hidden h-6 w-6 text-primary/55 md:block" delay={0.2}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <FloatingShape className="absolute right-6 top-1/2 -translate-y-1/2 hidden h-7 w-7 text-secondary-foreground/55 md:block" delay={1.1} duration={16}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>

        <Marquee
          speed={70}
          items={[
            "“She finally felt heard at her PPT.”",
            "“The Pathway Report did what six binders never could.”",
            "“Plain-language summaries my whole family understood.”",
            "“Goals → evidence → next step. In one place.”",
            "“The student voice section made him cry — in a good way.”",
            "“It writes the draft. I keep the judgement.”",
          ].map((q, i) => (
            <span key={i} className="font-display text-xl italic text-foreground/75 sm:text-2xl">
              {q}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      {/* TEXT SCROLL FILL — mission line, sleeker with floating decor */}
      <section className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <CompassRose className="absolute -left-6 top-4 hidden h-24 w-24 text-primary/25 lg:block" />
        <Starburst className="absolute -right-6 top-6 hidden h-20 w-20 text-secondary-foreground/30 lg:block" />
        <Parallax speed={0.2} className="absolute right-10 -top-2 hidden h-12 w-16 text-primary/60 md:block">
          <ArrowDoodle className="h-full w-full -rotate-12" />
        </Parallax>
        <FloatingShape className="absolute left-1/2 top-2 -translate-x-1/2 h-6 w-6 text-primary/60" delay={0.3}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <Squiggle className="absolute inset-x-0 bottom-6 mx-auto h-5 w-80 text-primary/30" />
        <TextScrollFill
          className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl"
          text="From the IEP on the kitchen table to the first job after graduation — every student deserves a plan that reads like their life, not paperwork."
        />
      </section>



      {/* ROLE ROUTER — five doors into the platform */}
      <section
        id="choose-your-path"
        aria-labelledby="role-router-heading"
        className="border-y border-border/40 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Start where you are
            </p>
            <h2
              id="role-router-heading"
              className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl"
            >
              Choose Your Path In.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Transition planning looks different from every chair at the table.
              Pick the door that fits — we'll meet you with the right tools, language,
              and next steps.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 [&>:last-child:nth-child(odd)]:sm:col-span-2 [&>:last-child:nth-child(odd)]:sm:mx-auto [&>:last-child:nth-child(odd)]:sm:max-w-[calc(50%-0.5rem)] lg:[&>:last-child]:!col-span-1 lg:[&>:last-child]:!max-w-none lg:[&>:last-child]:!mx-0">
            <RoleCard
              icon={HeartHandshake}
              label="Family / Guardian"
              body="Understand the plan, see what's next, and walk into PPTs prepared."
              cta="Build My Child's Transition Plan"
              to="/families"
              tone="peach"
            />
            <RoleCard
              icon={GraduationCap}
              label="Student"
              body="Tell us who you are. See careers, colleges, and life paths that fit."
              cta="Explore My Future Path"
              to="/waitlist"
              search={{ role: "student" }}
              tone="sky"
            />
            <RoleCard
              icon={Users}
              label="Teacher / Case Manager"
              body="Organize goals, documents, and meetings for your whole caseload."
              cta="Organize My Caseload"
              to="/educators"
              tone="primary"
            />
            <RoleCard
              icon={Building2}
              label="School / District"
              body="A coordinated view across students, teams, and transition outcomes."
              cta="Request a School Demo"
              to="/waitlist"
              search={{ role: "administrator" }}
              tone="muted"
            />
            <RoleCard
              icon={Briefcase}
              label="Partner Organization"
              body="Colleges, training programs, employers, and community supports."
              cta="Become a Partner"
              to="/partners"
              tone="peach"
            />
          </div>
        </div>
      </section>

      {/* PRODUCT GLIMPSE — visual tour of real platform elements */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <DotField className="absolute left-0 top-10 -z-10 hidden h-40 w-40 text-primary/15 md:block" />
        <ArcStack className="absolute -right-8 bottom-10 -z-10 hidden h-56 w-56 text-secondary-foreground/25 lg:block" />
        <FloatingShape className="absolute right-10 top-12 z-0 hidden h-8 w-8 text-primary/55 md:block" delay={0.7}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>

        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            A look inside
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            See the elements you'll actually use.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Every screen is built for the family at the kitchen table, the student at
            their desk, and the teacher between meetings — calm, plain-language, and
            ready to act on.
          </p>
        </div>

        {/* Hero feature — Pathway Report */}
        <div className="mb-6 grid items-stretch gap-5 md:grid-cols-5">
          <FeatureShot
            className="md:col-span-3"
            image={pathwayImg}
            label="The Pathway Report"
            caption="The signature deliverable — career direction, life-skills focus, family questions, and a 30-day plan in one personalized document."
            aspect="aspect-[16/10]"
          />
          <FeatureShot
            className="md:col-span-2"
            image={dashboardImg}
            label="Your dashboard"
            caption="A calm hub for what's next — reports, goals, and meeting prep."
            aspect="aspect-[16/10]"
          />
        </div>

        {/* Symmetric trio — the three core layers */}
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureShot
            image={layerOrganizeImg}
            label="Organize"
            caption="Student voice, assessments, IEP goals, and PPT notes — held together year over year."
          />
          <FeatureShot
            image={layerGenerateImg}
            label="Generate"
            caption="Specialist-built formulas turn the full picture into a personalized Pathway."
          />
          <FeatureShot
            image={layerConnectImg}
            label="Connect"
            caption="Match interests to CT colleges, technical schools, BRS, and job training near home."
          />
        </div>

        {/* Secondary trio — supporting elements */}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <FeatureShot
            image={iepUploadImg}
            label="IEP upload & summary"
            caption="Drop in the document — we read it and surface what matters in plain language."
          />
          <FeatureShot
            image={resourcesImg}
            label="Resource library"
            caption="Curated CT-specific guides, videos, and worksheets matched to each pathway."
          />
          <FeatureShot
            image={frameworkImg}
            label="PPT meeting prep"
            caption="A one-page agenda, the right questions, and scripts you can borrow word-for-word."
          />
        </div>
      </section>

      <section className="bg-muted/40 py-24">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              What's inside
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              A Clearer Way to Plan What Comes Next.
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
              alt="A sample Pathway Report screen showing strengths, a recommended career pathway, a readiness scorecard, and a 30-day plan"
              align="left"
            />
            <Zigzag
              eyebrow="Student voice profile"
              title="A space that's just theirs."
              body="What they're good at, what they enjoy, what kind of life they want next — in their own words. Their voice anchors every plan and every meeting."
              image={studentImg}
              alt="A sample Student Hub screen with the greeting Hi Jordan, About me quotes, goals checklist, and matching careers"
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
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Parallax speed={0.2} className="absolute -left-4 top-6 hidden h-20 w-28 text-primary/55 md:block">
          <BookDoodle className="h-full w-full" />
        </Parallax>
        <Confetti className="absolute right-2 top-4 hidden h-24 w-32 md:block" />
        <Starburst className="absolute right-8 bottom-8 hidden h-16 w-16 text-secondary-foreground/35 lg:block" />
        <FloatingShape className="absolute left-1/3 top-2 hidden h-7 w-7 text-primary/60 md:block" delay={0.5}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>

        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Real-life pathways
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Many Roads Forward. One Plan That Fits.
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
            sticker={stickerCollege}
            label="College"
            caption="Two- and four-year programs, with the right supports in place."
            size="lg"
            pathwayId="college"
          />
          <PathwayTile
            className="col-span-2 md:col-span-6"
            image={pathTechnical}
            sticker={stickerTechnical}
            label="Technical Education"
            caption="Hands-on trades, certificates, and apprenticeships."
            pathwayId="technical-education"
          />
          <PathwayTile
            className="col-span-2 md:col-span-2"
            image={pathCareer}
            sticker={stickerCareer}
            label="Career & Employment"
            caption="Job training, internships, BRS."
            compact
            pathwayId="career"
          />
          <PathwayTile
            className="col-span-1 md:col-span-2"
            image={pathLifeskills}
            sticker={stickerLifeskills}
            label="Life Skills"
            caption="Cooking, transit, money, daily independence."
            compact
            pathwayId="life-skills"
          />
          <PathwayTile
            className="col-span-1 md:col-span-2"
            image={pathProgress}
            sticker={stickerProgress}
            label="Progress Tracked"
            caption="Small wins, gently celebrated."
            compact
            pathwayId="progress"
          />
        </div>
      </section>

      {/* CT SEDS COMPANION + IMPACT + TRUST */}
      <section className="bg-muted/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              A companion to CT SEDS — not a replacement
            </p>
            <p className="mt-4 font-display text-2xl leading-snug tracking-tight sm:text-3xl">
              TransitionForward helps families and educators make sense of transition
              planning, organize important information, and turn goals into clear
              action steps.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Your official IEP and PPT determinations still live where they belong.
              We sit alongside — translating, organizing, and connecting plans to the
              real opportunities waiting in Connecticut.
            </p>
          </div>

          <div className="mt-16">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                What we're trying to change
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                The Outcomes We Measure Ourselves Against.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ImpactCard icon={MessagesSquare} title="Clearer family understanding" body="Plain-language translation of every goal, term, and meeting note." />
              <ImpactCard icon={Sparkles} title="Stronger student self-advocacy" body="A space where students name their own strengths, interests, and hopes." />
              <ImpactCard icon={ClipboardCheck} title="Better goal tracking" body="Goals connected to evidence, progress, and the next small step." />
              <ImpactCard icon={Users} title="Tighter school + home collaboration" body="Shared notes, tasks, and a single source of truth between meetings." />
              <ImpactCard icon={Compass} title="Easier meeting preparation" body="Questions, talking points, and printable checklists, ready before PPT." />
              <ImpactCard icon={Briefcase} title="Real postsecondary connections" body="Curated CT colleges, training, BRS, employers — matched to the student." />
            </div>
          </div>



        </div>
      </section>



      {/* AUDIENCE — three tall image cards with text overlay */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <DotField className="absolute right-0 top-0 -z-10 hidden h-40 w-40 text-primary/15 md:block" />
        <ArcStack className="absolute -left-10 -bottom-4 -z-10 hidden h-56 w-56 text-primary/20 lg:block" />
        <Parallax speed={0.25} className="absolute right-6 top-4 hidden h-14 w-20 text-primary/55 md:block">
          <ArrowDoodle className="h-full w-full rotate-180" />
        </Parallax>

        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Who it helps
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Built for Everyone at the Table.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <AudiencePhoto
            image={studentPhotoImg}
            alt="A high school student writing in a notebook at a sunlit desk"
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
        <ParallaxImage
          src={roadImg}
          alt="A winding road through fields at sunset"
          width={1920}
          height={1080}
          speed={0.5}
          className="absolute inset-0 -z-10 h-full w-full"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/30" />
        <FloatingShape className="pointer-events-none absolute right-10 top-10 z-0 hidden h-20 w-20 text-background/70 md:block" delay={0.4} duration={18}>
          <PaperPlane className="h-full w-full" />
        </FloatingShape>
        <FloatingShape className="pointer-events-none absolute right-1/4 bottom-12 z-0 hidden h-8 w-8 text-background/70 md:block" delay={1.2} duration={14}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <Starburst className="pointer-events-none absolute right-6 bottom-8 hidden h-24 w-24 text-background/30 lg:block" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">

          <div className="max-w-2xl text-background">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/80">
              Be part of the first cohort
            </p>
            <h2 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Help Students Move Forward with a Plan That Actually Makes Sense.
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

      {/* PRIVACY & TRUST — animated graphic + pillars (page footer band) */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-transparent text-foreground">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <div className="relative isolate flex shrink-0 items-center justify-center self-center">
              <div className="relative h-32 w-32 sm:h-36 sm:w-36">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="trust-twinkle absolute h-[2px] w-[2px] rounded-full bg-primary/60"
                    style={{
                      left: `${(i * 37) % 100}%`,
                      top: `${(i * 53) % 100}%`,
                      animationDelay: `${(i % 5) * 0.3}s`,
                    }}
                  />
                ))}
                <span className="absolute inset-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 trust-pulse-ring" />
                <span className="absolute inset-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 trust-pulse-ring" style={{ animationDelay: '1.4s' }} />
                <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full trust-orbit">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="oklch(0.7 0.18 55)" strokeWidth="2" className="trust-dash" />
                </svg>
                <div className="absolute inset-0 trust-orbit">
                  {[Lock, UserCheck, ShieldCheck, Download].map((Ic, i) => {
                    const angle = (i / 4) * 2 * Math.PI;
                    const x = 50 + 40 * Math.cos(angle);
                    const y = 50 + 40 * Math.sin(angle);
                    return (
                      <span
                        key={i}
                        className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-background text-primary shadow-soft ring-1 ring-border trust-orbit-rev"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        <Ic className="h-3 w-3" aria-hidden />
                      </span>
                    );
                  })}
                </div>
                <div className="absolute inset-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.7_0.18_45)] text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.75_0.18_55/0.7)] trust-float">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/20">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Privacy &amp; trust
                </span>
                <h3 className="font-display text-xl font-medium leading-tight tracking-tight text-foreground sm:text-2xl">
                  Built Around Student Privacy From Day One.
                </h3>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 lg:grid-cols-4">
                <CompactPillar icon={Lock} title="Secure by default" body="Encrypted in transit and at rest." />
                <CompactPillar icon={UserCheck} title="Role-based access" body="Each role sees only what's theirs." />
                <CompactPillar icon={ShieldCheck} title="Human-reviewed AI" body="A planning aid, never a determination." />
                <CompactPillar icon={Download} title="Export and delete" body="Your information, on your terms." />
              </ul>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

type RoleTone = "peach" | "sky" | "primary" | "muted";
const toneStyles: Record<RoleTone, string> = {
  peach: "bg-peach-soft/60",
  sky: "bg-sky-soft/60",
  primary: "bg-primary/10",
  muted: "bg-muted",
};

function RoleCard({
  icon: Icon,
  label,
  body,
  cta,
  to,
  search,
  tone,
}: {
  icon: typeof HeartHandshake;
  label: string;
  body: string;
  cta: string;
  to: string;
  search?: Record<string, string>;
  tone: RoleTone;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      aria-label={`${label}: ${cta}`}
      className="group flex h-full flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneStyles[tone]} text-foreground`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-lg font-medium leading-snug tracking-tight">{toTitleCase(label)}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">
        {cta} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function ImpactCard({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{toTitleCase(title)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function CompactPillar({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[13px] font-medium leading-tight tracking-tight text-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function TrustPillar({
  num,
  icon: Icon,
  title,
  body,
}: {
  num: string;
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <li className="group relative flex flex-col gap-3 border-b border-white/10 p-6 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition-transform group-hover:-translate-y-0.5">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
          {num}
        </span>
      </div>
      <p className="font-display text-lg font-medium leading-tight tracking-tight text-white">
        {title}
      </p>
      <p className="text-xs leading-relaxed text-white/65">{body}</p>
    </li>
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
          {toTitleCase(title)}
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
          {toTitleCase(title)}
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
  sticker,
  label,
  caption,
  className = "",
  size = "md",
  compact = false,
  pathwayId,
}: {
  image: string;
  sticker?: string;
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
      className={`group relative block overflow-hidden rounded-3xl shadow-soft transition-all duration-300 hover:-translate-y-1 hover:rotate-[-0.4deg] hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
      {sticker && (
        <img
          src={sticker}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className={`pointer-events-none absolute drop-shadow-xl wiggle-hover ${
            compact
              ? "right-2 top-2 h-14 w-14 -rotate-6"
              : size === "lg"
                ? "right-5 top-5 h-28 w-28 -rotate-6 sm:h-32 sm:w-32"
                : "right-3 top-3 h-20 w-20 -rotate-6"
          }`}
          style={{ ["--rot" as string]: "-6deg" }}
        />
      )}
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
          {toTitleCase(label)}
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
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-background/90 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
          Open guided flow <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

function FeatureShot({
  image,
  label,
  caption,
  className = "",
  aspect = "aspect-[4/3]",
}: {
  image: string;
  label: string;
  caption: string;
  className?: string;
  aspect?: string;
}) {
  return (
    <figure
      className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${className}`}
    >
      <div className={`relative ${aspect} overflow-hidden`}>
        <img
          src={image}
          alt={label}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary shadow-soft backdrop-blur">
          {label}
        </span>
      </div>
      <figcaption className="p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
      </figcaption>
    </figure>
  );
}

