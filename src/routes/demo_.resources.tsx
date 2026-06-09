import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  BookOpen,
  Compass,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Mic,
  Video,
  FileText,
  ExternalLink,
  Filter,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDemoStudent } from "@/lib/demo-data";

export const Route = createFileRoute("/demo_/resources")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Resource Matches — TransitionForward demo" },
      {
        name: "description",
        content:
          "Curated, student-specific resource matches with what it is, who it helps, why it matters, and how to use it.",
      },
      { property: "og:url", content: "/demo/resources" },
    ],
    links: [{ rel: "canonical", href: "/demo/resources" }],
  }),
  component: DemoResourcesPage,
});

const CATEGORIES = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "transition", label: "Transition Basics", icon: Compass },
  { id: "selfadvocacy", label: "Self-Advocacy", icon: HeartHandshake },
  { id: "career", label: "Career Exploration", icon: Briefcase },
  { id: "college", label: "College / Training", icon: GraduationCap },
  { id: "life", label: "Life Skills", icon: HeartHandshake },
  { id: "ct", label: "Connecticut", icon: Compass },
  { id: "video", label: "Videos", icon: Video },
  { id: "podcast", label: "Podcasts", icon: Mic },
  { id: "worksheet", label: "Worksheets", icon: FileText },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

type Resource = {
  id: string;
  title: string;
  format: "Article" | "Worksheet" | "Video" | "Podcast" | "Program" | "Service";
  categories: CategoryId[];
  matchedTo: ("maya" | "jordan" | "all")[];
  what_it_is: string;
  who_it_helps: string;
  why_it_matters: string;
  how_to_use: string;
  source: string;
};

const RESOURCES: Resource[] = [
  {
    id: "ct-brs-preets",
    title: "CT BRS Pre-Employment Transition Services (Pre-ETS)",
    format: "Service",
    categories: ["ct", "career", "transition"],
    matchedTo: ["all"],
    what_it_is:
      "Connecticut's Bureau of Rehabilitation Services offers free pre-employment services for students with disabilities ages 14–21.",
    who_it_helps: "Any CT student with a disability who has not yet graduated.",
    why_it_matters:
      "Unlocks job coaches, paid summer work experiences, and travel-training funding before adult services start.",
    how_to_use:
      "Ask your case manager for a referral letter at the next PPT, then call your regional BRS office.",
    source: "Connecticut Bureau of Rehabilitation Services",
  },
  {
    id: "gateway-music",
    title: "Gateway Community College — Music & Sound Recording",
    format: "Program",
    categories: ["college", "career", "ct"],
    matchedTo: ["jordan"],
    what_it_is:
      "A 1-year certificate in audio engineering and music production at Gateway in New Haven.",
    who_it_helps: "Students interested in audio, podcasting, live sound, or music production.",
    why_it_matters:
      "Credentialed and short — proves you can finish college-level work without committing to a 4-year degree.",
    how_to_use:
      "Schedule a tour through admissions; ask for the disability services office to join. Dual-enrollment may be possible in 12th grade.",
    source: "Gateway Community College",
  },
  {
    id: "ct-humane",
    title: "Connecticut Humane Society — Youth Volunteer Program",
    format: "Program",
    categories: ["ct", "career", "life"],
    matchedTo: ["maya"],
    what_it_is:
      "Structured volunteer program at CT Humane Society locations across the state.",
    who_it_helps: "Students interested in animal care, veterinary work, or shelter operations.",
    why_it_matters:
      "Real animal-care experience builds skills, references, and confidence around new adults.",
    how_to_use:
      "Family books an orientation visit; volunteer coordinator handles onboarding and weekly schedule.",
    source: "Connecticut Humane Society",
  },
  {
    id: "ct-transit-travel",
    title: "CT Transit Travel Training",
    format: "Service",
    categories: ["ct", "life", "transition"],
    matchedTo: ["all"],
    what_it_is:
      "Free 1:1 instruction in how to ride CT Transit buses safely and independently.",
    who_it_helps: "Students who want to ride public transit to school, work, or appointments.",
    why_it_matters:
      "Transportation independence unlocks every other postsecondary goal — work, college, social life.",
    how_to_use:
      "Request through your case manager or the school transition coordinator. Add as an IEP goal.",
    source: "CT Department of Transportation",
  },
  {
    id: "self-advocacy-script",
    title: "Self-Advocacy Conversation Script",
    format: "Worksheet",
    categories: ["selfadvocacy", "worksheet", "transition"],
    matchedTo: ["all"],
    what_it_is:
      "A one-page script for practicing how to introduce yourself and your accommodations to a new teacher or boss.",
    who_it_helps:
      "Any student who finds it hard to speak up about what they need from new adults.",
    why_it_matters:
      "Self-advocacy is the #1 predictor of successful postsecondary transition. It's a learnable skill.",
    how_to_use:
      "Practice the script at home, then use it with one new teacher each quarter. Reflect with your case manager.",
    source: "TransitionForward",
  },
  {
    id: "thinkcollege",
    title: "Think College — Inclusive Postsecondary Programs",
    format: "Program",
    categories: ["college", "transition"],
    matchedTo: ["all"],
    what_it_is:
      "National directory of college programs for students with intellectual and developmental disabilities.",
    who_it_helps:
      "Students who want a college experience with built-in academic and social supports.",
    why_it_matters:
      "College isn't only the traditional 4-year path. Inclusive programs build skills + community in a real campus.",
    how_to_use:
      "Search by state, filter by program type, and bring 2–3 options to your next PPT meeting.",
    source: "thinkcollege.net",
  },
  {
    id: "iep-decoder",
    title: "How to Read Your IEP — A Family Guide",
    format: "Article",
    categories: ["transition", "selfadvocacy"],
    matchedTo: ["all"],
    what_it_is:
      "A plain-English explainer for parents and students on how to read and respond to an IEP.",
    who_it_helps: "Families new to the IEP process or who want to come to PPT meetings prepared.",
    why_it_matters:
      "Families who understand the IEP shape the plan. Families who don't, accept what's offered.",
    how_to_use:
      "Read together as a family the week before a PPT. Highlight 3 questions to bring.",
    source: "TransitionForward",
  },
  {
    id: "ct-dds-eligibility",
    title: "CT DDS Eligibility — Apply Before 18",
    format: "Service",
    categories: ["ct", "transition", "life"],
    matchedTo: ["all"],
    what_it_is:
      "Connecticut Department of Developmental Services adult-eligibility application.",
    who_it_helps:
      "Students with intellectual or developmental disabilities who will need adult services after 21.",
    why_it_matters:
      "Missing the application window delays adult supports — sometimes by years.",
    how_to_use:
      "Start the application before age 18. Case manager or a family-advocacy nonprofit can help.",
    source: "CT Department of Developmental Services",
  },
  {
    id: "money-tracker",
    title: "Weekly Money Tracker — One-Page Sheet",
    format: "Worksheet",
    categories: ["life", "worksheet"],
    matchedTo: ["all"],
    what_it_is: "A one-page sheet to track money in, money out, and one savings goal per week.",
    who_it_helps:
      "Students starting their first job, side hustle, or learning to use a debit card.",
    why_it_matters:
      "Real money skills are built from real money tracking, not a textbook unit.",
    how_to_use:
      "Print or use on phone. Review weekly with a family member or case manager for 8 weeks.",
    source: "TransitionForward",
  },
  {
    id: "job-shadow-prep",
    title: "Job Shadow Prep Worksheet",
    format: "Worksheet",
    categories: ["career", "worksheet"],
    matchedTo: ["all"],
    what_it_is:
      "A simple worksheet to plan a half-day job shadow: what to bring, what to ask, what to notice.",
    who_it_helps:
      "Any student trying out a career interest for the first time.",
    why_it_matters:
      "Job shadows go better when there's a plan. A great first shadow leads to a real internship.",
    how_to_use:
      "Fill out the day before the shadow. Reflect on it the same evening with a trusted adult.",
    source: "TransitionForward",
  },
  {
    id: "the-transition-podcast",
    title: "The Transition Podcast",
    format: "Podcast",
    categories: ["podcast", "transition", "career"],
    matchedTo: ["all"],
    what_it_is:
      "Conversations with families and adults on the other side of the transition years.",
    who_it_helps: "Families who want to hear from others who've done this.",
    why_it_matters:
      "Hearing real stories normalizes the bumps and shows what's possible.",
    how_to_use:
      "Listen in the car together. Pick one episode that matches a current question.",
    source: "Open podcast platforms",
  },
  {
    id: "video-iep-meeting",
    title: "What to Expect at an IEP Meeting (Video)",
    format: "Video",
    categories: ["video", "transition", "selfadvocacy"],
    matchedTo: ["all"],
    what_it_is:
      "Short video walking through a real IEP/PPT meeting from start to finish.",
    who_it_helps:
      "First-time families or students attending their first PPT.",
    why_it_matters:
      "Knowing what's coming reduces anxiety and helps families speak up.",
    how_to_use: "Watch the week before the PPT, then write down 2 questions you want to ask.",
    source: "TransitionForward channel",
  },
  {
    id: "ct-tech-highschools",
    title: "Connecticut Technical High Schools — Tour Guide",
    format: "Article",
    categories: ["ct", "career", "college"],
    matchedTo: ["all"],
    what_it_is:
      "Overview of CT's technical high schools and which programs serve which career clusters.",
    who_it_helps:
      "Students considering a hands-on technical path (auto, agriscience, culinary, IT, manufacturing).",
    why_it_matters:
      "A technical pathway can be a faster, cheaper, more aligned route to a real career.",
    how_to_use:
      "Read together; pick 2 schools to visit; reach out to the program coordinator before the tour.",
    source: "CT Technical Education and Career System",
  },
];

function DemoResourcesPage() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile } = bundle;
  const [active, setActive] = useState<CategoryId>("all");
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [density, setDensity] = useState<"compact" | "comfortable">(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem("tf.viewDensity") : null;
      return v === "comfortable" ? "comfortable" : "compact";
    } catch { return "compact"; }
  });
  useEffect(() => {
    try { localStorage.setItem("tf.viewDensity", density); } catch { /* ignore */ }
  }, [density]);
  const compact = density === "compact";

  const matched = useMemo(() => {
    return RESOURCES.filter((r) => {
      const inCategory = active === "all" || r.categories.includes(active);
      const inSearch =
        !q ||
        r.title.toLowerCase().includes(q.toLowerCase()) ||
        r.what_it_is.toLowerCase().includes(q.toLowerCase());
      const matchedToStudent =
        showAll || r.matchedTo.includes("all") || r.matchedTo.includes(s);
      return inCategory && inSearch && matchedToStudent;
    });
  }, [active, q, s, showAll]);

  return (
    <SiteShell>
      <DemoStepBar current="resources" student={s} />

      <section className={`mx-auto px-4 sm:px-6 lg:px-8 ${compact ? "max-w-[88rem] py-6" : "max-w-6xl py-10"}`}>
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Resource Hub
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Matches for {profile.first_name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every resource is tagged with what it is, who it helps, why it matters, and how to use
            it — so families and educators aren't stuck guessing.
          </p>

          {/* Search */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search resources…"
                className="pl-9"
              />
            </div>
            <Button
              variant={showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAll((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              {showAll ? "Showing all" : `Matched to ${profile.first_name}`}
            </Button>
            <div className="ml-auto inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="View density">
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`rounded px-2 py-1 text-xs ${compact ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={compact}
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`rounded px-2 py-1 text-xs ${!compact ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={!compact}
              >
                Comfortable
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="scrollbar-none -mx-1 mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = active === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {matched.map((r) => (
            <ResourceCard key={r.id} r={r} />
          ))}
          {matched.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              No matches yet — try clearing the search or switching categories.
            </div>
          )}
        </div>

        <DemoStepFooter current="resources" student={s} />
      </section>
    </SiteShell>
  );
}

function ResourceCard({ r }: { r: Resource }) {
  return (
    <article className="rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {r.format}
          </Badge>
          <h3 className="mt-2 font-display text-lg leading-snug">{r.title}</h3>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="What it is" value={r.what_it_is} />
        <Row label="Who it helps" value={r.who_it_helps} />
        <Row label="Why it matters" value={r.why_it_matters} />
        <Row label="How to use it" value={r.how_to_use} />
      </dl>
      <p className="mt-4 text-[11px] text-muted-foreground">Source · {r.source}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 leading-relaxed text-foreground/85">{value}</dd>
    </div>
  );
}
