import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPageSection } from "@/lib/cms/cms.functions";
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
import { PublicJourneyStrip } from "@/components/site/PublicJourneyStrip";

import { HeroCTAs } from "@/components/site/HeroCTAs";
import { photos, photoSrcSet, srcSetFor } from "@/lib/photos";
import ctMapAsset from "@/assets/ct-map-illustration.jpg.asset.json";
import pptPlanningShot from "@/assets/ppt-planning-desk.png.asset.json";
import studentPhoneMapShot from "@/assets/gps-walking.png.asset.json";
import culinaryTrainingShot from "@/assets/baking-in-kitchen.png.asset.json";
import constructionTrainingShot from "@/assets/cutting-wood-final.png.asset.json";

import whyWeBuiltThisShot from "@/assets/why-we-built-this.jpg.asset.json";
import studentsCohortShot from "@/assets/students-cohort.jpg.asset.json";
import connectShot from "@/assets/construction-final.png.asset.json";
import { observeWatermarkSafeguards } from "@/lib/watermark-contrast-telemetry";
const HERO_ID = "photo-1571260899304-425eee4c7efc";
const heroImg = photos.homeHero;
const heroSrcSet = photoSrcSet(HERO_ID);

const studentImg = photos.homeStudent;
const studentPhotoImg = photos.homeStudentPhoto;
const studentPhotoSrcSet = srcSetFor("homeStudentPhoto");
const familyImg = photos.homeFamily;
const educatorImg = photos.homeEducator;
const pathwayImg = photos.homePathway;
const roadImg = photos.homeRoad;
const roadSrcSet = srcSetFor("homeRoad");
import collegeCampusAsset from "@/assets/college-campus.png.asset.json";
const pathCollege = collegeCampusAsset.url;
const pathCollegeSrcSet: string | undefined = undefined;
const pathTechnical = photos.pathTechnical;
const pathTechnicalSrcSet = srcSetFor("pathTechnical");
const pathCareer = photos.pathCareer;
const pathCareerSrcSet = srcSetFor("pathCareer");
const pathLifeskills = photos.pathLifeskills;
const pathLifeskillsSrcSet = srcSetFor("pathLifeskills");
import progressTrackedAsset from "@/assets/bookmark-progress.png.asset.json";
const pathProgress = progressTrackedAsset.url;
const pathProgressSrcSet = undefined;
const dashboardImg = photos.dashboard;
import iepUploadBuriedAsset from "@/assets/iep-upload-buried.png.asset.json";
import womanHoldingIepAsset from "@/assets/woman-holding-iep.png.asset.json";
const iepUploadImg = womanHoldingIepAsset.url;
import glassesPaperworkAsset from "@/assets/glasses-on-paperwork.png.asset.json";
const layerOrganizeImg = glassesPaperworkAsset.url;
import stickyNotesFinalAsset from "@/assets/sticky-notes-final.png.asset.json";
const layerGenerateImg = stickyNotesFinalAsset.url;
const layerConnectImg = photos.layerConnect;
const layerConnectSrcSet = srcSetFor("layerConnect");
const resourcesImg = iepUploadBuriedAsset.url;
const frameworkImg = photos.framework;
const frameworkSrcSet = srcSetFor("framework");

import stickerCollege from "@/assets/sticker-college.png";
import stickerTechnical from "@/assets/sticker-technical.png";
import stickerCareer from "@/assets/sticker-career.png";
import stickerLifeskills from "@/assets/sticker-lifeskills.png";
import stickerProgress from "@/assets/sticker-progress.png";
import doodlePlane from "@/assets/doodle-plane.png";
import familyDashboardShot from "@/assets/family-dashboard-screenshot.png.asset.json";

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
import { motion, useInView } from "motion/react";




import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransitionForward — From IEP Goals to Real-Life Pathways." },
      {
        name: "description",
        content:
          "TransitionForward helps students with disabilities, families, and educators plan life after high school — all in one platform.",
      },
      { property: "og:title", content: "TransitionForward — From IEP Goals to Real-Life Pathways." },
      {
        property: "og:description",
        content:
          "One Platform. One Plan. Forward Together. Expert-built Pathway planning for Connecticut families, students, and educators.",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: heroImg },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "" },
      {
        rel: "preload",
        as: "image",
        href: heroImg,
        imagesrcset: heroSrcSet,
        imagesizes: "100vw",
        fetchpriority: "high",
      },
    ],
  }),
  component: HomePage,
});


const HERO_DEFAULTS = {
  eyebrow: "Transition planning, made human",
  headline_lead: "From IEP Goals to",
  headline_accent: "Real-Life",
  headline_tail: "Pathways.",
  subhead:
    "A warm, easy-to-use platform that helps students with disabilities, families, and educators plan life after high school — together.",
  tagline: "One Platform. One Plan. Forward Together.",
  cta_primary_label: "Join the Waitlist",
  cta_secondary_label: "Try the Live Demo",
};

function HomePage() {
  const fetchSection = useServerFn(getPageSection);
  const [hero, setHero] = useState(HERO_DEFAULTS);
  const [careerImage, setCareerImage] = useState<string>(culinaryTrainingShot.url);
  useEffect(() => {
    let cancelled = false;
    fetchSection({ data: { page_key: "home", section_key: "hero" } })
      .then((r: any) => {
        if (cancelled || !r?.content) return;
        setHero({ ...HERO_DEFAULTS, ...r.content });
      })
      .catch(() => {});
    fetchSection({ data: { page_key: "home", section_key: "pathway_images" } })
      .then((r: any) => {
        if (cancelled) return;
        const url = r?.content?.career_url;
        if (typeof url === "string" && url.length > 0) setCareerImage(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchSection]);
  return (
    <SiteShell>
      {/* HERO — full-bleed image with overlaid text */}
      <section className="relative isolate -mt-px overflow-hidden">
        <ParallaxImage
          src={heroImg}
          srcSet={heroSrcSet}
          sizes="100vw"
          eager
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
              {hero.eyebrow}
            </p>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {hero.headline_lead}{" "}
              <span className="relative inline-block whitespace-nowrap not-italic text-primary">
                {hero.headline_accent.replace(/-/g, "\u2011")}
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
              </span>
              {"\u00A0"}
              <span className="whitespace-nowrap">{hero.headline_tail}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80 sm:text-xl">
              {hero.subhead}
            </p>
            <p className="mt-5 font-display text-xl italic text-foreground/75 sm:text-2xl">
              <span className="whitespace-nowrap">One&nbsp;Platform.</span>{" "}
              <span className="whitespace-nowrap">One&nbsp;Plan.</span>{" "}
              <span className="whitespace-nowrap">Forward&nbsp;Together.</span>
            </p>
            <HeroCTAs forceRow className="mt-9 gap-1 sm:gap-3">
              <Link
                to="/waitlist"
                className="group inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-primary px-2 py-2 text-[10px] font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-xl sm:gap-1.5 sm:px-4 sm:py-3 sm:text-xs lg:px-7 lg:py-3.5 lg:text-sm"
              >
                <span className="whitespace-nowrap">{hero.cta_primary_label}</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
              </Link>
              <Link
                to="/demo"
                className="group inline-flex items-center justify-center gap-1 rounded-full border border-primary/30 bg-background/90 px-2 py-2 text-[10px] font-semibold text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-background sm:gap-1.5 sm:px-4 sm:py-3 sm:text-xs lg:px-7 lg:py-3.5 lg:text-sm"
              >
                <span className="whitespace-nowrap">{hero.cta_secondary_label}</span>
                <ArrowRight className="h-3 w-3 text-primary transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
              </Link>
              <Link
                to="/platform"
                className="group inline-flex items-center justify-center gap-1 rounded-full border border-foreground/15 bg-background/80 px-2 py-2 text-[10px] font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background sm:gap-1.5 sm:px-4 sm:py-3 sm:text-xs lg:px-7 lg:py-3.5 lg:text-sm"
              >
                <span className="whitespace-nowrap">Explore the Platform</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
              </Link>
            </HeroCTAs>



          </div>
        </div>
      </section>

      {/* PROBLEM — split panel: photo + statement */}
      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
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
                src={whyWeBuiltThisShot.url}
                sizes="(min-width: 1024px) 42vw, 100vw"
                alt="A student raising a hand in a bright classroom discussion"
                width={1400}
                height={933}
                speed={0.35}
                className="absolute inset-0 h-full w-full object-cover"
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

      {/* STAT STRIP — animated counters on scroll */}
      <HomeStatStrip />


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
      <section className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
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
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
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
              to="/get-started/$role"
              params={{ role: "family" }}
              tone="peach"
            />
            <RoleCard
              icon={GraduationCap}
              label="Student"
              body="Tell us who you are. See careers, colleges, and life paths that fit."
              cta="Explore My Future Path"
              to="/get-started/$role"
              params={{ role: "student" }}
              tone="sky"
            />
            <RoleCard
              icon={Users}
              label="Teacher / Case Manager / Counselor"
              body="Organize goals, documents, and meetings for your whole caseload."
              cta="Organize My Caseload"
              to="/get-started/$role"
              params={{ role: "educator" }}
              tone="primary"
            />
            <RoleCard
              icon={Building2}
              label="School / District"
              body="A coordinated view across students, teams, and transition outcomes."
              cta="Request A School Or District License"
              to="/get-started/$role"
              params={{ role: "district" }}
              tone="muted"
            />
            <RoleCard
              icon={Briefcase}
              label="Partner Organization"
              body="Colleges, training programs, employers, and community supports."
              cta="Become A Partner"
              to="/get-started/$role"
              params={{ role: "partner" }}
              tone="peach"
            />
          </div>
        </div>
      </section>

      {/* PRODUCT GLIMPSE — visual tour of real platform elements */}
      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
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
        <div className="mb-4 grid items-stretch gap-3 md:grid-cols-5">
          <FeatureShot
            className="md:col-span-3"
            image="/pathway-report-current.png"
            label="The Pathway Report"
            alt="Pathway Report preview for Jordan Rivera showing chapter navigation and the student voice quote"
            caption="The signature deliverable — career direction, life-skills focus, family questions, and a 30-day plan in one personalized document."
            aspect="aspect-[16/10]"
            objectPosition="center"
            imageClassName="translate-y-[3%] scale-[1.02] md:translate-y-[4%] md:scale-[1.05]"
          />
          <FeatureShot
            className="md:col-span-2"
            image={familyDashboardShot.url}
            label="Your dashboard"
            alt="Family dashboard view showing Jordan Rivera's plan overview"
            caption="A calm hub for what's next — reports, goals, and meeting prep."
            aspect="aspect-[16/10]"
          />
        </div>

        {/* Symmetric trio — the three core layers */}
        <div className="grid gap-3 md:grid-cols-3">
          <FeatureShot
            image={layerOrganizeImg}
            label="Organize"
            alt="Organize dashboard interface showing student goals and assessments"
            caption="Student voice, assessments, IEP goals, and PPT notes — held together year over year."
            aspect="aspect-[4/3]"
          />
          <FeatureShot
            image={layerGenerateImg}
            label="Generate"
            alt="Generate pathway report interface with personalized recommendations"
            caption="Specialist-built formulas turn the full picture into a personalized Pathway."
            aspect="aspect-[4/3]"
          />
          <FeatureShot
            image={connectShot.url}
            label="Connect"
            alt="Two trainees framing interior walls during a construction skills program"
            caption="Match interests to CT colleges, technical schools, BRS, and job training near home."
            aspect="aspect-[4/3]"
            objectPosition="50% 40%"
          />
        </div>

        {/* Secondary trio — supporting elements */}
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <FeatureShot
            image={iepUploadImg}
            label="IEP upload & summary"
            caption="Drop in the document — we read it and surface what matters in plain language."
            aspect="aspect-[4/3]"
          />
          <FeatureShot
            image={resourcesImg}
            label="Resource library"
            caption="Curated CT-specific guides, videos, and worksheets matched to each pathway."
            aspect="aspect-[4/3]"
          />
          <FeatureShot
            image={pptPlanningShot.url}
            label="PPT meeting prep"
            alt="Student at desk with notebook planning for a PPT meeting"
            caption="A one-page agenda, the right questions, and scripts you can borrow word-for-word."
            aspect="aspect-[4/3]"
            objectPosition="35% 45%"
          />

        </div>
      </section>

      {/* PATHWAYS — image tile grid of real next-step destinations */}
      <section id="pathways" className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 scroll-mt-20">
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
        <div className="grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:auto-rows-[14rem] md:grid-cols-12 md:gap-3">
          <PathwayTile
            className="col-span-2 row-span-2 md:col-span-6 md:row-span-2"
            image={pathCollege}
            srcSet={pathCollegeSrcSet}
            sizes="(min-width: 768px) 50vw, 100vw"
            sticker={stickerCollege}
            label="College"
            caption="Two- and four-year programs, with the right supports in place."
            size="lg"
            pathwayId="college"
          />
          <PathwayTile
            className="col-span-2 md:col-span-6"
            image={constructionTrainingShot.url}
            sizes="(min-width: 768px) 50vw, 100vw"
            sticker={stickerTechnical}
            label="Technical Education"
            caption="Hands-on trades, certificates, and apprenticeships."
            pathwayId="technical-education"
            objectPosition="50% 40%"
          />
          <PathwayTile
            className="col-span-2 md:col-span-2"
            image={careerImage}
            sizes="(min-width: 768px) 17vw, 100vw"
            sticker={stickerCareer}
            label="Career & Employment"
            caption="Job training, internships, BRS."
            compact
            pathwayId="career"
            objectPosition="50% 40%"
          />
          <PathwayTile
            className="col-span-1 md:col-span-2"
            image={studentPhoneMapShot.url}
            sizes="(min-width: 768px) 17vw, 50vw"
            sticker={stickerLifeskills}
            label="Life Skills"
            caption="Cooking, transit, money, daily independence."
            compact
            pathwayId="life-skills"
            objectPosition="60% 40%"
          />
          <PathwayTile
            className="col-span-1 md:col-span-2"
            image={pathProgress}
            srcSet={pathProgressSrcSet}
            sizes="(min-width: 768px) 17vw, 50vw"
            sticker={stickerProgress}
            label="Progress Tracked"
            caption="Small wins, gently celebrated."
            compact
            pathwayId="progress"
          />

        </div>
      </section>

      {/* CT SEDS COMPANION + IMPACT + TRUST */}
      <section className="bg-muted/40 py-14">
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

          <div className="mt-10">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                What we're trying to change
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                The Outcomes We Measure Ourselves Against.
              </h2>
              <p className="mt-3 hidden text-sm text-muted-foreground lg:block">
                Scroll to fly across the map — each stop zooms into the outcome
                we're chasing.
              </p>
            </div>

            {/* Mobile / tablet: simple grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
              {IMPACT_ITEMS.map((it) => (
                <ImpactCard key={it.title} icon={it.icon} title={it.title} body={it.body} />
              ))}
            </div>

            {/* Desktop: scroll-driven zoomable map */}
            <div className="hidden lg:block">
              <ImpactMap items={IMPACT_ITEMS} />
            </div>
          </div>



        </div>
      </section>






      {/* RESOURCE HUB PREVIEW — creative library teaser */}
      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <DotField className="absolute right-0 top-0 -z-10 hidden h-40 w-40 text-primary/15 md:block" />
        <ArcStack className="absolute -left-10 -bottom-4 -z-10 hidden h-56 w-56 text-primary/20 lg:block" />
        <Parallax speed={0.25} className="absolute right-6 top-4 hidden h-14 w-20 text-primary/55 md:block">
          <ArrowDoodle className="h-full w-full rotate-180" />
        </Parallax>

        <div className="grid items-start gap-12 lg:grid-cols-[5fr_7fr]">
          {/* Left: intro */}
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Inside the Library
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              A Hub Built for the Questions You're Actually Asking.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Hundreds of vetted articles, checklists, podcasts, and Connecticut
              agencies — organized by topic, audience, and reading level so the
              right resource finds you in under a minute.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
              <Link
                to="/resources"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
              >
                Open the library <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-medium text-muted-foreground sm:inline-flex sm:justify-start">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Specialist-Reviewed
              </span>
            </div>

            {/* Format counters */}
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { n: "120+", label: "Articles & guides" },
                { n: "40+", label: "Checklists & worksheets" },
                { n: "25+", label: "CT agencies" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border bg-card px-3 py-4 text-center shadow-soft"
                >
                  <dt className="font-display text-2xl text-primary">{s.n}</dt>
                  <dd className="mt-1 text-[11px] leading-tight text-muted-foreground">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: feature preview (live composition) */}
          <div className="relative">
            <Sparkle className="absolute -top-4 -right-2 h-8 w-8 text-primary/60" />

            {/* Faux search bar */}
            <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-soft">
              <Compass className="h-4 w-4 text-primary" />
              <span className="flex-1 text-sm text-muted-foreground">
                Try{" "}
                <em className="not-italic font-medium text-foreground">
                  "preparing for my first PPT"
                </em>
              </span>
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                ⌘K
              </kbd>
            </div>

            {/* Topic chip cloud */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: Compass, label: "Transition Planning" },
                { icon: ClipboardCheck, label: "IEP & PPT Support" },
                { icon: UserCheck, label: "Self-Advocacy" },
                { icon: Briefcase, label: "Career Exploration" },
                { icon: GraduationCap, label: "Postsecondary" },
                { icon: HeartHandshake, label: "Family Support" },
                { icon: Building2, label: "Independent Living" },
                { icon: Users, label: "CT Agencies" },
              ].map(({ icon: Icon, label }) => (
                <Link
                  key={label}
                  to="/resources"
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-soft transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </Link>
              ))}
            </div>

            {/* Featured resource cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ResourcePreviewCard
                eyebrow="Guide · 12 min"
                title="A Family's First Look at the Transition IEP"
                source="TransitionForward Editorial"
                topic="IEP & PPT Support"
                icon={ClipboardCheck}
                tint="from-primary/15 to-primary/5"
              />
              <ResourcePreviewCard
                eyebrow="Podcast · 32 min"
                title="Letting Your Teen Lead Their Own PPT"
                source="The Pathway Podcast"
                topic="Self-Advocacy"
                icon={MessagesSquare}
                tint="from-amber-500/15 to-amber-500/5"
              />
              <ResourcePreviewCard
                eyebrow="Checklist"
                title="30 Skills to Practice Before Graduation"
                source="Independent Living Series"
                topic="Independent Living"
                icon={Building2}
                tint="from-emerald-500/15 to-emerald-500/5"
              />
              <ResourcePreviewCard
                eyebrow="CT Agency"
                title="Bureau of Rehabilitation Services (BRS)"
                source="State of Connecticut"
                topic="CT Resources"
                icon={Sparkles}
                tint="from-sky-500/15 to-sky-500/5"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA — full-bleed road image */}
      <section className="relative isolate overflow-hidden">
        <ParallaxImage
          src={studentsCohortShot.url}
          sizes="100vw"
          alt="A diverse group of students and an educator smiling together on a campus walkway"
          width={1920}
          height={1280}
          speed={0.5}
          className="absolute inset-0 -z-10 h-full w-full"
          imgClassName="object-[70%_35%] sm:object-[center_30%]"
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/30" />
        <FloatingShape className="pointer-events-none absolute right-10 top-10 z-0 hidden h-20 w-20 text-background/70 md:block" delay={0.4} duration={18}>
          <PaperPlane className="h-full w-full" />
        </FloatingShape>
        <FloatingShape className="pointer-events-none absolute right-1/4 bottom-12 z-0 hidden h-8 w-8 text-background/70 md:block" delay={1.2} duration={14}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <Starburst className="pointer-events-none absolute right-6 bottom-8 hidden h-24 w-24 text-background/30 lg:block" />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-14 lg:px-8 lg:py-16">

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
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground shadow-lift transition-all hover:-translate-y-0.5"
              >
                Join the waitlist
              </Link>
              <Link
                to="/login"
                search={{}}
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
              <div className="flex flex-col flex-wrap items-center gap-x-3 gap-y-1 text-center sm:flex-row sm:items-baseline sm:text-left">
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
      <span className="mt-5 flex items-center justify-center text-sm font-semibold text-primary sm:inline-flex sm:justify-start">
        {cta} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

type ImpactItem = {
  icon: typeof Sparkles;
  title: string;
  body: string;
  pos: { x: number; y: number };
};

const IMPACT_ITEMS: ImpactItem[] = [
  { icon: MessagesSquare, title: "Clearer family understanding", body: "Plain-language translation of every goal, term, and meeting note.", pos: { x: -520, y: -240 } },
  { icon: Sparkles, title: "Stronger student self-advocacy", body: "A space where students name their own strengths, interests, and hopes.", pos: { x: 480, y: -280 } },
  { icon: ClipboardCheck, title: "Better goal tracking", body: "Goals connected to evidence, progress, and the next small step.", pos: { x: -540, y: 60 } },
  { icon: Users, title: "Tighter school + home collaboration", body: "Shared notes, tasks, and a single source of truth between meetings.", pos: { x: 540, y: 80 } },
  { icon: Compass, title: "Easier meeting preparation", body: "Questions, talking points, and printable checklists, ready before PPT.", pos: { x: -300, y: 340 } },
  { icon: Briefcase, title: "Real postsecondary connections", body: "Curated CT colleges, training, BRS, employers — matched to the student.", pos: { x: 320, y: 360 } },
];

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

function ImpactMap({ items }: { items: ImpactItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const watermarkImgRef = useRef<HTMLImageElement>(null);

  // Log + report whenever accessibility prefs cause the CT map watermark
  // to be hidden or dimmed by the safeguard CSS rules.
  useEffect(() => observeWatermarkSafeguards(watermarkImgRef.current), []);
  const [active, setActive] = useState<number>(-1);
  const stops = items.length + 1; // overview + each card

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      // First 10% = overview, then split the rest evenly across cards
      let idx = -1;
      if (p >= 0.1) {
        const local = (p - 0.1) / 0.9;
        idx = Math.min(items.length - 1, Math.floor(local * items.length));
      }
      setActive(idx);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items.length]);

  const scrollToStep = (idx: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    // -1 = overview (pick midpoint of intro slab), otherwise center of that card's slab
    const p =
      idx === -1
        ? 0.05
        : 0.1 + ((idx + 0.5) / items.length) * 0.9;
    const top = el.getBoundingClientRect().top + window.scrollY + p * total;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const overviewScale = 0.6;
  const focusScale = 1.45;
  const target =
    active === -1
      ? { tx: 0, ty: 0, s: overviewScale }
      : {
          tx: -items[active].pos.x * focusScale,
          ty: -items[active].pos.y * focusScale,
          s: focusScale,
        };

  const current = active === -1 ? null : items[active];

  // Mini-map: scale full canvas (~1400x900 effective) into a 160x100 widget
  const miniW = 160;
  const miniH = 100;
  const canvasW = 1400;
  const canvasH = 900;

  return (
    <div ref={sectionRef} className="relative" style={{ height: `${stops * 130}vh` }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* CT illustrated backdrop — hand-drawn map of Connecticut, blended into the page so it reads as a soft watermark behind the cards.
            Wrapped in `ct-watermark` so accessibility prefs (forced colors, prefers-contrast: more, prefers-reduced-transparency)
            automatically suppress or dim the image whenever it would risk reducing text contrast. See `ct-watermark` rules in styles.css. */}
        <div
          aria-hidden
          className="ct-watermark pointer-events-none absolute inset-0 m-auto flex items-center justify-center"
        >
          <img
            ref={watermarkImgRef}
            src={ctMapAsset.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="ct-watermark-img h-[140vmin] w-[150vmin] max-w-none object-contain opacity-[0.18] mix-blend-multiply sm:h-[150vmin] sm:w-[150vmin] lg:h-[160vmin] lg:w-[160vmin] dark:opacity-25 dark:invert dark:mix-blend-screen"
            style={{
              maskImage:
                "radial-gradient(ellipse at center, black 82%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 82%, transparent 100%)",
            }}
          />
          {/* Contrast scrim — a theme-matched veil that sits between the watermark and the cards/text.
              Keeps effective luminance close to the section's background so text always meets WCAG AA contrast,
              regardless of which part of the map sits behind a given card. */}
          <div
            className="ct-watermark-scrim pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in oklab, var(--background) 35%, transparent) 0%, color-mix(in oklab, var(--background) 60%, transparent) 55%, color-mix(in oklab, var(--background) 85%, transparent) 100%)",
            }}
          />
        </div>
        {/* Map backdrop grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          }}
        />

        {/* Radial glow that follows active card */}
        <div
          className="pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-primary/10 blur-3xl transition-all duration-700 ease-out"
          style={{
            transform: current
              ? `translate(${current.pos.x * 0.4}px, ${current.pos.y * 0.4}px)`
              : "translate(0, 0)",
          }}
        />

        {/* Header chip + clickable step indicator */}
        <div className="absolute left-1/2 top-8 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => scrollToStep(-1)}
            className="rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-soft backdrop-blur transition-colors hover:border-primary/60"
          >
            {active === -1 ? "Six outcomes — view all" : `Stop ${active + 1} / ${items.length}`}
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToStep(i)}
                aria-label={`Jump to ${item.title}`}
                className={`h-2.5 rounded-full transition-all duration-500 hover:bg-primary/70 ${
                  i === active ? "w-10 bg-primary" : "w-2.5 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mini-map nav (top-right) — clickable pins */}
        <div className="absolute right-4 top-6 z-20 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-soft backdrop-blur sm:right-6 sm:top-8">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Map
          </p>
          <div
            className="relative rounded-md bg-muted/40"
            style={{ width: miniW, height: miniH }}
          >
            {items.map((item, i) => {
              const left = miniW / 2 + (item.pos.x / canvasW) * miniW;
              const top = miniH / 2 + (item.pos.y / canvasH) * miniH;
              const isActive = i === active;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => scrollToStep(i)}
                  aria-label={`Jump to ${item.title}`}
                  title={item.title}
                  className={`group absolute flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "scale-150 bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
                      : "bg-primary/40 hover:scale-125 hover:bg-primary"
                  }`}
                  style={{ left, top }}
                />
              );
            })}
          </div>
        </div>

        {/* The map canvas */}
        <div
          className="relative h-full w-full"
          style={{ perspective: "1400px" }}
        >
          <div
            className="absolute left-1/2 top-1/2 will-change-transform transition-transform duration-[900ms]"
            style={{
              transform: `translate(-50%, -50%) translate(${target.tx}px, ${target.ty}px) scale(${target.s})`,
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {items.map((item, i) => {
              const isActive = i === active;
              const isOverview = active === -1;
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="absolute"
                  style={{
                    left: item.pos.x,
                    top: item.pos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={`w-[260px] rounded-2xl border bg-card p-5 shadow-soft transition-all duration-700 ${
                      isActive
                        ? "border-primary/60 shadow-lift ring-2 ring-primary/30 scale-[1.04]"
                        : isOverview
                          ? "border-border/60 opacity-95"
                          : "border-border/40 opacity-35 blur-[1px] scale-95"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold tracking-tight">
                      {toTitleCase(item.title)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                  {/* Connector pin */}
                  <span
                    className={`absolute left-1/2 top-full mt-1 h-2 w-2 -translate-x-1/2 rounded-full transition-colors ${
                      isActive ? "bg-primary" : "bg-border"
                    }`}
                  />
                </div>
              );
            })}

            {/* Faint connector lines between cards (overview only feel) */}
            <svg
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
              width="1600"
              height="1000"
              viewBox="-800 -500 1600 1000"
            >
              <path
                d={items
                  .map((it, i) => `${i === 0 ? "M" : "L"} ${it.pos.x} ${it.pos.y}`)
                  .join(" ")}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.25"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              />
            </svg>
          </div>
        </div>

        {/* Active caption bar (bottom) */}
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-4">
          <div
            key={active}
            className="animate-fade-in max-w-xl rounded-2xl border border-border/60 bg-background/85 px-5 py-3 text-center shadow-soft backdrop-blur"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {current ? "Now focusing" : "The full map"}
            </p>
            <p className="mt-1 font-display text-base tracking-tight">
              {current ? toTitleCase(current.title) : "Six outcomes we measure ourselves against"}
            </p>
          </div>
        </div>
      </div>
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


function AudiencePhoto({
  image,
  srcSet,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  alt,
  title,
  body,
  cta,
}: {
  image: string;
  srcSet?: string;
  sizes?: string;
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
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
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

function ResourcePreviewCard({

  eyebrow,
  title,
  source,
  topic,
  icon: Icon,
  tint,
}: {
  eyebrow: string;
  title: string;
  source: string;
  topic: string;
  icon: typeof Compass;
  tint: string;
}) {
  return (
    <Link
      to="/resources"
      className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div
        className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${tint} -z-0`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 text-primary shadow-soft backdrop-blur">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
          {eyebrow}
        </span>
      </div>
      <h4 className="relative mt-6 font-display text-lg leading-snug text-foreground">
        {title}
      </h4>
      <p className="relative mt-2 text-xs text-muted-foreground">{source}</p>
      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground/70">
          {topic}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}


function PathwayTile({
  image,
  srcSet,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  sticker,
  label,
  caption,
  className = "",
  size = "md",
  compact = false,
  pathwayId,
  objectPosition = "center",
}: {
  image: string;
  srcSet?: string;
  sizes?: string;
  sticker?: string;
  label: string;
  caption: string;
  className?: string;
  size?: "md" | "lg";
  compact?: boolean;
  pathwayId: string;
  /** Focal point for the cover crop so the subject stays in frame
   *  as tiles reflow across breakpoints. */
  objectPosition?: string;
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
        srcSet={srcSet}
        sizes={sizes}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ objectPosition }}
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
  srcSet,
  sizes = "(min-width: 768px) 33vw, 100vw",
  label,
  alt,
  caption,
  className = "",
  aspect = "aspect-[16/10]",
  objectPosition = "center",
  imageClassName = "",
}: {
  image: string;
  srcSet?: string;
  sizes?: string;
  label: string;
  alt?: string;
  caption: string;
  className?: string;
  aspect?: string;
  /** CSS object-position. Lets the photo's focal point stay in frame
   *  across breakpoints as the aspect-ratio crop tightens/loosens. */
  objectPosition?: string;
  imageClassName?: string;
}) {
  return (
    <figure
      className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${className}`}
    >
      <div className={`relative ${aspect} overflow-hidden`}>
        <img
          src={image}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt || label}
          loading="lazy"
          decoding="async"
          style={{ objectPosition }}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${imageClassName}`}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center justify-center rounded-full bg-background/90 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary shadow-soft backdrop-blur">
          {label}
        </span>
      </div>
      <figcaption className="p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
      </figcaption>
    </figure>
  );
}

/* -------------------- HOME STAT STRIP -------------------- */
const HOME_STATS = [
  { value: 85000, suffix: "+", label: "Connecticut students have an IEP today — each one deserves a plan for what comes next." },
  { value: 1, suffix: " in 6", label: "CT public-school students receives special education services. Every voice belongs at the table." },
  { value: 14, suffix: "", label: "the age CT law requires transition planning in every IEP. We make that plan readable from day one." },
  { value: 169, suffix: "", label: "Connecticut towns. One shared Pathway framework that travels with the student, family, and team." },
];


function HomeStatStrip() {
  return (
    <section className="relative border-y border-foreground/10 bg-foreground py-12 text-background sm:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-10 px-4 sm:gap-x-10 sm:px-6 lg:grid-cols-4 lg:gap-x-12 lg:px-12">

        {HOME_STATS.map((s, i) => (
          <HomeStat key={i} {...s} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}

function HomeStat({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const formatted = value >= 1000 ? n.toLocaleString() : String(n);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      <div className="font-display text-4xl font-medium leading-none tracking-tight text-background sm:text-5xl lg:text-[2.75rem] xl:text-5xl">
        {formatted}
        <span className="text-primary">{suffix}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-background/70">{label}</p>

    </motion.div>
  );
}


