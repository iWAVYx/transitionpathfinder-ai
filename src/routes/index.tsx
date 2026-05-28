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
                src={studentPhotoImg}
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
              Choose your path in.
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
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
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
                The outcomes we measure ourselves against.
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

          <div className="mt-16 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[oklch(0.18_0.04_250)] via-[oklch(0.22_0.06_260)] to-[oklch(0.15_0.05_245)] text-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-12">
              {/* Animated graphic */}
              <div className="relative isolate overflow-hidden border-b border-white/10 p-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-10">
                {/* twinkling dots background */}
                <div className="pointer-events-none absolute inset-0 opacity-70">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span
                      key={i}
                      className="trust-twinkle absolute h-[3px] w-[3px] rounded-full bg-white/70"
                      style={{
                        left: `${(i * 37) % 100}%`,
                        top: `${(i * 53) % 100}%`,
                        animationDelay: `${(i % 7) * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
                {/* scan sweep */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/30 to-transparent blur-2xl trust-scan" />

                <span className="relative inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-soft backdrop-blur ring-1 ring-white/20">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Privacy &amp; trust
                </span>
                <h3 className="relative mt-4 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
                  Built around student privacy from day one.
                </h3>
                <p className="relative mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                  Four commitments we make to every family, student, and educator
                  who trusts us with their plan.
                </p>

                {/* Orbiting shield graphic */}
                <div className="relative mx-auto mt-8 aspect-square w-full max-w-xs">
                  {/* pulse rings */}
                  <span className="absolute inset-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 trust-pulse-ring" style={{ animationDelay: '0s' }} />
                  <span className="absolute inset-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 trust-pulse-ring" style={{ animationDelay: '1.4s' }} />

                  {/* orbit ring with dashed SVG */}
                  <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full trust-orbit">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="oklch(0.85 0.16 60)" strokeWidth="2" className="trust-dash" />
                  </svg>
                  <svg viewBox="0 0 200 200" className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] trust-orbit-rev">
                    <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 8" />
                  </svg>

                  {/* orbiting icon chips */}
                  <div className="absolute inset-0 trust-orbit">
                    {[Lock, UserCheck, ShieldCheck, Download].map((Ic, i) => {
                      const angle = (i / 4) * 2 * Math.PI;
                      const x = 50 + 40 * Math.cos(angle);
                      const y = 50 + 40 * Math.sin(angle);
                      return (
                        <span
                          key={i}
                          className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white/95 text-primary shadow-soft ring-1 ring-white/40 trust-orbit-rev"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          <Ic className="h-4 w-4" aria-hidden />
                        </span>
                      );
                    })}
                  </div>

                  {/* center core */}
                  <div className="absolute inset-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.7_0.18_45)] text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.75_0.18_55/0.7)] trust-float">
                    <ShieldCheck className="h-9 w-9" aria-hidden />
                  </div>
                </div>
              </div>

              <ul className="grid grid-cols-1 bg-white/[0.03] backdrop-blur sm:grid-cols-2 lg:col-span-7">
                <TrustPillar num="01" icon={Lock} title="Secure by default" body="Private student data, encrypted in transit and at rest." />
                <TrustPillar num="02" icon={UserCheck} title="Role-based access" body="Families, students, and educators only see what's theirs to see." />
                <TrustPillar num="03" icon={ShieldCheck} title="Human-reviewed AI" body="Every AI suggestion is a planning aid — never an official determination." />
                <TrustPillar num="04" icon={Download} title="Export & delete" body="Your information, on your terms. Download or remove it any time." />
              </ul>
            </div>
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
            alt="A sample Student Hub screen showing a personalized profile for a teen learner"
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
          src={roadImg}
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
      <h3 className="mt-5 font-display text-lg font-medium leading-snug tracking-tight">{label}</h3>
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
      <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
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

