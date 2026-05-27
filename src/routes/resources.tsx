import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { BookOpen, Headphones, Film, FileText, ExternalLink, Search, Library } from "lucide-react";
import { useMemo, useState } from "react";
import resourcesHero from "@/assets/resources-hero-v2.jpg";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "The Resource Library | TransitionForward" },
      {
        name: "description",
        content:
          "A growing online library for Connecticut families and educators navigating transition planning. Videos, podcasts, guides, agency directories, and downloadable templates in one calm place.",
      },
      { property: "og:title", content: "The Resource Library | TransitionForward" },
      {
        property: "og:description",
        content:
          "Videos, podcasts, agency directories, and downloadable templates for the transition years, curated by us and written for you.",
      },
    ],
  }),
  component: ResourcesPage,
});

type MediaItem = {
  id: string;
  type: "video" | "podcast" | "guide" | "agency";
  title: string;
  source: string;
  summary: string;
  duration?: string;
  youtubeId?: string;
  audioUrl?: string;
  link?: string;
  tags: string[];
};

const library: MediaItem[] = [
  {
    id: "v1",
    type: "video",
    title: "What Is Transition Planning, Really?",
    source: "PACER National Parent Center",
    summary: "A short, calm explainer for families hearing the words 'transition plan' for the first time.",
    duration: "6 min watch",
    youtubeId: "kCS8RJ4ZdaA",
    tags: ["families", "starting point"],
  },
  {
    id: "v2",
    type: "video",
    title: "Inside a Student Led PPT Meeting",
    source: "CPIR Center",
    summary: "Watch a real student lead her own planning meeting. The shift is quiet and total.",
    duration: "9 min watch",
    youtubeId: "3W6Ed4dxLDA",
    tags: ["students", "self determination"],
  },
  {
    id: "v3",
    type: "video",
    title: "Connecticut BRS Explained for Families",
    source: "CT Bureau of Rehabilitation Services",
    summary: "How the Bureau of Rehabilitation Services partners with students starting at age 16.",
    duration: "8 min watch",
    youtubeId: "rdwz7QiG0lk",
    tags: ["agency", "Connecticut"],
  },
  {
    id: "v4",
    type: "video",
    title: "Writing Postsecondary Goals That Actually Mean Something",
    source: "IRIS Center, Vanderbilt",
    summary: "For educators. What separates a measurable postsecondary goal from a wish.",
    duration: "12 min watch",
    youtubeId: "1aA1WGON49E",
    tags: ["educators", "goals"],
  },
  {
    id: "p1",
    type: "podcast",
    title: "The Transition Years Podcast: Episode 01",
    source: "TransitionForward Studio",
    summary: "Caysi sits down with a parent and an educator to talk about the meeting nobody prepares you for.",
    duration: "28 min listen",
    audioUrl: "https://cdn.simplecast.com/audio/sample.mp3",
    tags: ["families", "educators"],
  },
  {
    id: "p2",
    type: "podcast",
    title: "Age of Majority, in Plain English",
    source: "TransitionForward Studio",
    summary: "What changes the day your student turns 18, and what you can decide together long before.",
    duration: "19 min listen",
    audioUrl: "https://cdn.simplecast.com/audio/sample.mp3",
    tags: ["families", "legal"],
  },
  {
    id: "g1",
    type: "guide",
    title: "The Connecticut Transition Roadmap",
    source: "CT State Department of Education",
    summary: "The official guide to transition services in Connecticut, grade by grade.",
    link: "https://portal.ct.gov/sde/special-education/bureau-of-special-education/transition",
    tags: ["Connecticut", "starting point"],
  },
  {
    id: "g2",
    type: "guide",
    title: "Your Rights at 18: A Family Conversation Guide",
    source: "CPAC",
    summary: "A printable conversation framework for the year before your student turns 18.",
    link: "https://cpacinc.org/",
    tags: ["families", "legal"],
  },
  {
    id: "a1",
    type: "agency",
    title: "Bureau of Rehabilitation Services (BRS)",
    source: "State of Connecticut",
    summary: "Vocational rehabilitation for eligible students. Job coaching, training dollars, on the job supports. Door opens at 16.",
    link: "https://portal.ct.gov/aging-and-disability/content-pages/bureaus/bureau-of-rehabilitation-services",
    tags: ["agency", "Connecticut", "employment"],
  },
  {
    id: "a2",
    type: "agency",
    title: "Department of Developmental Services (DDS)",
    source: "State of Connecticut",
    summary: "Adult services for individuals with intellectual disability and autism. Apply early; eligibility can take a year or more.",
    link: "https://portal.ct.gov/dds",
    tags: ["agency", "Connecticut", "adult services"],
  },
  {
    id: "a3",
    type: "agency",
    title: "CT Parent Advocacy Center (CPAC)",
    source: "Connecticut nonprofit",
    summary: "Free, family led support for navigating special education. Trained parents on the phone before your next meeting.",
    link: "https://cpacinc.org/",
    tags: ["agency", "families", "support"],
  },
  {
    id: "a4",
    type: "agency",
    title: "SERC, the State Education Resource Center",
    source: "Connecticut training arm",
    summary: "Workshops, family nights, and educator institutes on transition throughout the year.",
    link: "https://ctserc.org/",
    tags: ["agency", "educators", "training"],
  },
];

const filters = [
  { id: "all", label: "All", icon: Library },
  { id: "video", label: "Videos", icon: Film },
  { id: "podcast", label: "Podcasts", icon: Headphones },
  { id: "guide", label: "Guides", icon: BookOpen },
  { id: "agency", label: "Agencies", icon: FileText },
] as const;

function ResourcesPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [filter, query]);

  const videos = visible.filter((i) => i.type === "video");
  const podcasts = visible.filter((i) => i.type === "podcast");
  const guides = visible.filter((i) => i.type === "guide");
  const agencies = visible.filter((i) => i.type === "agency");

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">The Resource Library</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              An Online Library for the Transition Years.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Pull up a chair. Inside you will find short videos, conversational podcasts,
              plain language guides, and a directory of the Connecticut agencies you will
              actually need. Curated by us, written for you, no acronyms left unexplained.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={resourcesHero}
              alt="Illustrated reading nook with shelves of glowing tablet covers, a velvet armchair, and headphones"
              width={1600}
              height={1100}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="sticky top-2 z-10 mb-10 rounded-3xl border border-border/60 bg-background/85 p-4 shadow-soft backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the library: BRS, age 18, podcasts, goals..."
                className="w-full rounded-full border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map(({ id, label, icon: Icon }) => {
                const active = filter === id;
                return (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "border border-border bg-background text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {videos.length > 0 && (
          <div className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Watch</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{videos.length} Videos</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {videos.map((v) => (
                <article key={v.id} className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${v.youtubeId}`}
                      title={v.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{v.source} · {v.duration}</p>
                    <h3 className="mt-2 font-display text-xl font-medium tracking-tight">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {podcasts.length > 0 && (
          <div className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Listen</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{podcasts.length} Episodes</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {podcasts.map((p) => (
                <article key={p.id} className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{p.source} · {p.duration}</p>
                      <h3 className="mt-1 font-display text-lg font-medium tracking-tight">{p.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
                    </div>
                  </div>
                  <audio controls preload="none" className="mt-5 w-full">
                    <source src={p.audioUrl} type="audio/mpeg" />
                    Your browser does not support embedded audio.
                  </audio>
                </article>
              ))}
            </div>
          </div>
        )}

        {guides.length > 0 && (
          <div className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Read</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{guides.length} Guides</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {guides.map((g) => (
                <a
                  key={g.id}
                  href={g.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-warm text-foreground/80">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{g.source}</p>
                    <h3 className="mt-1 font-display text-lg font-medium tracking-tight group-hover:text-primary">
                      {g.title} <ExternalLink className="ml-1 inline h-4 w-4" />
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.summary}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {agencies.length > 0 && (
          <div className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Connecticut Agencies</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{agencies.length} Listed</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {agencies.map((a) => (
                <a
                  key={a.id}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{a.source}</p>
                  <h3 className="mt-1 font-display text-xl font-medium tracking-tight group-hover:text-primary">
                    {a.title} <ExternalLink className="ml-1 inline h-4 w-4" />
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {a.tags.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground/70">{t}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {visible.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/70 bg-gradient-warm p-12 text-center">
            <p className="font-display text-xl">No matches yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different word, or clear the filter to browse the whole shelf.</p>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Be the First to Use the New Worksheets.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
            We are rolling out tools gradually so each one is genuinely helpful, not just
            another thing in your inbox. Joining the waitlist tells us who to invite first.
          </p>
          <Link
            to="/waitlist"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
          >
            Join the Waitlist
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
