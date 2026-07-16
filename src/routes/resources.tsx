import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { TrustNote } from "@/components/site/TrustNote";
import {
  BookOpen,
  Headphones,
  Film,
  FileText,
  ExternalLink,
  Search,
  Library,
  Bookmark,
  BookmarkCheck,
  Share2,
  
  Sparkles,
  ClipboardList,
  Wrench,
  ListChecks,
  MapPin,
  Clock,
  Users,
  Tag,
  Folder,
  Compass,
  GraduationCap,
  Briefcase,
  Home,
  Heart,
  Hammer,
  Building2,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listVerifiedResources,
  listFeaturedResources,
  listSourceLibraries,
  type DbResource,
  type ResourceSourcePublic,
} from "@/lib/resources-db.functions";
import {
  listSavedResources,
  saveResource,
  unsaveResource,
  type SavedResourceRow,
} from "@/lib/saved-resources.functions";
import { listStudents, type Student } from "@/lib/students.functions";
import { createStudentActionItem } from "@/lib/action-items.functions";
import { toast } from "sonner";
import { ListPlus } from "lucide-react";

import resourcesHeroAsset from "@/assets/student-reading-library.png.asset.json";
const resourcesHero = resourcesHeroAsset.url;
import {
  RESOURCES,
  TOPIC_META,
  FORMAT_META,
  AUDIENCE_META,
  type Resource,
  type ResourceAudience,
  type ResourceFormat,
  type ResourceTopic,
  type ResourceGrade,
  type ReadingLevel,
  type LocationScope,
  type TimeNeeded,
} from "@/lib/resource-library";

import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "The Resource Library | TransitionForward" },
      {
        name: "description",
        content:
          "A curated knowledge hub for transition planning, IEP support, self-advocacy, career exploration, postsecondary planning, independent living, and Connecticut-specific resources.",
      },
      { property: "og:title", content: "The Resource Library | TransitionForward" },
      {
        property: "og:description",
        content:
          "Videos, podcasts, books, online tools, assessments, agency directories, and downloadable templates for the transition years.",
      },
      { property: "og:url", content: "/resources" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: ResourcesPage,
});

// ───────────────────────── Saved state (localStorage)

const SAVE_KEY = "tf.savedResources.v1";
const COLLECTIONS = [
  "For my next meeting",
  "Career exploration",
  "College planning",
  "Independent living",
  "Family questions",
  "Teacher tools",
  "Student favorites",
  "Action steps",
] as const;
type Collection = (typeof COLLECTIONS)[number];

type SavedMap = Record<string, Collection[]>;

function useSaved() {
  const [saved, setSaved] = useState<SavedMap>({});
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(SAVE_KEY) : null;
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved]);
  const toggle = (id: string, collection: Collection = "Student favorites") =>
    setSaved((prev) => {
      const next = { ...prev };
      if (next[id]?.includes(collection)) {
        next[id] = next[id].filter((c) => c !== collection);
        if (next[id].length === 0) delete next[id];
      } else {
        next[id] = Array.from(new Set([...(next[id] || []), collection]));
      }
      return next;
    });
  const remove = (id: string) =>
    setSaved((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  return { saved, toggle, remove };
}

// ───────────────────────── Filter state

type Filters = {
  format: ResourceFormat | "all";
  audience: ResourceAudience | "all";
  topic: ResourceTopic | "all";
  grade: ResourceGrade | "all";
  reading: ReadingLevel | "all";
  location: LocationScope | "all";
  time: TimeNeeded | "all";
};

const EMPTY_FILTERS: Filters = {
  format: "all",
  audience: "all",
  topic: "all",
  grade: "all",
  reading: "all",
  location: "all",
  time: "all",
};

// ───────────────────────── Topic icons

const TOPIC_ICON: Record<ResourceTopic, typeof Compass> = {
  "transition-planning": Compass,
  "iep-ppt": ClipboardList,
  "self-advocacy": Heart,
  career: Briefcase,
  employment: Hammer,
  postsecondary: GraduationCap,
  "independent-living": Home,
  "family-support": Users,
  "teacher-tools": Wrench,
  "ct-resources": MapPin,
};

// ───────────────────────── Page

function ResourcesPage() {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<"browse" | "saved" | "recommended">("browse");
  const { saved, toggle, remove } = useSaved();
  const [liveMessage, setLiveMessage] = useState("");
  const hasAnnounced = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset filter expansion when returning to the top of the page.
  useEffect(() => {
    if (!scrolled) setFiltersExpanded(false);
  }, [scrolled]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      searchToggleRef.current?.focus();
    }
  };

  const [viewDensity, setViewDensity] = useState<"compact" | "comfortable">(() => {
    try {
      return (typeof window !== "undefined" && localStorage.getItem("tf.viewDensity") as "compact" | "comfortable") || "compact";
    } catch { return "compact"; }
  });
  useEffect(() => {
    try { if (typeof window !== "undefined") localStorage.setItem("tf.viewDensity", viewDensity); } catch {}
  }, [viewDensity]);

  const fetchDb = useServerFn(listVerifiedResources);
  const fetchFeatured = useServerFn(listFeaturedResources);
  const fetchSources = useServerFn(listSourceLibraries);
  const fetchSaved = useServerFn(listSavedResources);
  const doSave = useServerFn(saveResource);
  const doUnsave = useServerFn(unsaveResource);
  const [dbResources, setDbResources] = useState<DbResource[] | null>(null);
  const [featuredDb, setFeaturedDb] = useState<DbResource[]>([]);
  const [sourceLibs, setSourceLibs] = useState<ResourceSourcePublic[]>([]);
  const [savedDb, setSavedDb] = useState<SavedResourceRow[]>([]);
  const savedIds = useMemo(() => new Set(savedDb.map((s) => s.resource_id)), [savedDb]);
  const { user } = useAuth();
  useEffect(() => {
    fetchDb()
      .then((r) => setDbResources(r.resources))
      .catch(() => setDbResources([]));
    fetchFeatured()
      .then((r) => setFeaturedDb(r.resources))
      .catch(() => setFeaturedDb([]));
    fetchSources()
      .then((r) => setSourceLibs(r.sources))
      .catch(() => setSourceLibs([]));
  }, [fetchDb, fetchFeatured, fetchSources]);
  useEffect(() => {
    if (!user) {
      setSavedDb([]);
      return;
    }
    fetchSaved()
      .then((r) => setSavedDb(r.items))
      .catch(() => {});
  }, [fetchSaved, user]);

  async function handleToggleSaveDb(id: string) {
    try {
      if (savedIds.has(id)) {
        await doUnsave({ data: { resource_id: id } });
        setSavedDb((p) => p.filter((s) => s.resource_id !== id));
        toast.success("Removed from your library");
      } else {
        await doSave({ data: { resource_id: id } });
        const r = await fetchSaved();
        setSavedDb(r.items);
        toast.success("Saved to your library");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update saved resource.");
    }
  }



  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((p) => ({ ...p, [k]: v }));
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  };

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== "all").length + (query ? 1 : 0);

  // Global search helper for DB resources
  const dbMatchesQuery = (r: DbResource) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      r.title,
      r.description ?? "",
      r.source_name ?? "",
      r.topic ?? "",
      r.resource_type,
      r.location_scope,
      r.grade_range ?? "",
      r.estimated_time ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter((r) => {
      if (filters.format !== "all" && r.format !== filters.format) return false;
      if (filters.audience !== "all" && !r.audiences.includes(filters.audience)) return false;
      if (filters.topic !== "all" && !r.topics.includes(filters.topic)) return false;
      if (filters.grade !== "all" && !(r.grades || []).includes(filters.grade)) return false;
      if (filters.reading !== "all" && r.readingLevel !== filters.reading) return false;
      if (filters.location !== "all" && r.location !== filters.location) return false;
      if (filters.time !== "all" && r.time !== filters.time) return false;
      if (!q) return true;
      const hay = [
        r.title,
        r.description,
        r.source,
        r.author || "",
        r.whyItHelps || "",
        ...r.topics.map((t) => TOPIC_META[t].label),
        ...r.audiences.map((a) => AUDIENCE_META[a]),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, filters]);

  const savedResources = useMemo(
    () => RESOURCES.filter((r) => saved[r.id]),
    [saved],
  );

  // Announce filter/result changes to screen readers
  useEffect(() => {
    if (!hasAnnounced.current) {
      hasAnnounced.current = true;
      return;
    }
    let msg = "";
    if (tab === "browse") {
      const c = visible.length;
      if (c === 0) {
        msg = "No resources match those filters.";
      } else {
        msg = `${c} resource${c !== 1 ? "s" : ""} found.`;
      }
    } else if (tab === "saved") {
      const c = savedResources.length;
      msg = `${c} saved resource${c !== 1 ? "s" : ""}.`;
    }
    setLiveMessage(msg);
  }, [tab, visible.length, savedResources.length, query, filters]);

  const featured = RESOURCES.filter((r) => r.featured);

  const filteredFeaturedDb = useMemo(
    () => featuredDb.filter(dbMatchesQuery),
    [featuredDb, query],
  );
  const filteredDbResources = useMemo(
    () => (dbResources ?? []).filter(dbMatchesQuery),
    [dbResources, query],
  );

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-[88rem] items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              The Resource Library
            </p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              A Curated Knowledge Hub for the Transition Years.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Videos, podcasts, books, assessments, online tools, downloadable
              worksheets, and Connecticut-specific agency contacts — organized
              by audience, topic, and how much time you have. Save what matters,
              build collections, and connect resources straight to a student's
              pathway plan.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => setTab("browse")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
              >
                <Library className="h-4 w-4" /> Browse the Library
              </button>
              <button
                onClick={() => setTab("recommended")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <Sparkles className="h-4 w-4" /> Personalized Picks
              </button>
              <button
                onClick={() => setTab("saved")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <Bookmark className="h-4 w-4" /> My Saved
                {savedResources.length > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                    {savedResources.length}
                  </span>
                )}
              </button>
            </div>
            <TrustNote variant="resources" className="mt-6 max-w-xl" />
          </div>

          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={resourcesHero}
              alt="Student reading a book between library shelves"
              width={1600}
              height={1100}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      {/* CATEGORY GRID */}
      <section className="mx-auto max-w-[88rem] px-4 pb-6 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          Ten Core Categories
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap a category to filter the library. Each one is curated for the
          questions families, students, and educators actually ask.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(TOPIC_META) as ResourceTopic[]).map((t) => {
            const Icon = TOPIC_ICON[t];
            const count = RESOURCES.filter((r) => r.topics.includes(t)).length;
            const active = filters.topic === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setF("topic", active ? "all" : t);
                  setTab("browse");
                }}
                className={`group rounded-2xl border p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border/60 bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-sky text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    {count} items
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-medium leading-snug">
                  {TOPIC_META[t].label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {TOPIC_META[t].description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* FEATURED RESOURCES (curated picks from DB) */}
      {filteredFeaturedDb.length > 0 && (
        <section className="mx-auto max-w-[88rem] px-4 pt-10 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
                Featured
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                Editors' picks this month
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hand-selected by the TransitionForward team for high impact and trusted sourcing.
              </p>
            </div>
          </div>
          <div className={`mt-5 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${viewDensity === "compact" ? "gap-1.5" : "gap-4"}`}>
            {filteredFeaturedDb.slice(0, 6).map((r) => (
              <a
                key={r.id}
                href={r.url ?? "#"}
                target={r.url ? "_blank" : undefined}
                rel={r.url ? "noreferrer" : undefined}
                className={`group flex flex-col rounded-2xl border-2 border-amber-500/40 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${viewDensity === "compact" ? "p-3" : "p-5"}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400">Featured</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{r.resource_type}</span>
                  {r.url && <span className="rounded-full bg-muted px-2 py-0.5">External</span>}
                </div>
                <h3 className={`mt-2 font-display font-medium leading-snug group-hover:text-primary ${viewDensity === "compact" ? "text-sm" : "text-lg"}`}>
                  {r.title}
                </h3>
                {r.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{r.description}</p>
                )}
                {r.source_name && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Source: {r.source_name}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* VERIFIED LIBRARY (live from DB) */}
      {filteredDbResources.length > 0 && (
        <section className="mx-auto max-w-[88rem] px-4 pt-10 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Verified by TransitionForward
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                Newly added to the library
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live from the TransitionForward resource database. Reviewed by our team.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {filteredDbResources.length} verified
            </span>
          </div>
          <div className={`mt-5 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${viewDensity === "compact" ? "gap-1.5" : "gap-4"}`}>
            {filteredDbResources.slice(0, 6).map((r) => (
              <article
                key={r.id}
                className={`flex flex-col rounded-2xl border border-border/60 bg-card shadow-soft transition-shadow hover:shadow-lift ${viewDensity === "compact" ? "p-3" : "p-5"}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {r.resource_type}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5">External</span>
                  {r.location_scope && r.location_scope.toLowerCase() !== "connecticut" && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {r.location_scope.replace(/_/g, " ")}
                    </span>
                  )}
                  {r.featured && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400">Featured</span>
                  )}
                  {r.topic && <span>{r.topic.replace(/_/g, " ")}</span>}
                </div>

                <h3 className={`mt-2 font-display font-medium leading-snug ${viewDensity === "compact" ? "text-sm" : "text-lg"}`}>
                  {r.title}
                </h3>
                {r.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {r.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
                  <span className="truncate">
                    {r.source_name ? `Source: ${r.source_name}` : r.location_scope}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSaveDb(r.id)}
                      aria-label={savedIds.has(r.id) ? "Unsave" : "Save"}
                      className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-primary"
                    >
                      {savedIds.has(r.id) ? (
                        <BookmarkCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Bookmark className="h-3 w-3" />
                      )}
                      {savedIds.has(r.id) ? "Saved" : "Save"}
                    </button>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <AddToPathwayButton title={r.title} description={r.description} link={r.url} />
                </div>

              </article>
            ))}
          </div>
          {savedDb.length > 0 && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-muted/40 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-medium">
                  <BookmarkCheck className="mr-2 inline h-4 w-4 text-primary" />
                  My library ({savedDb.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  Synced across your devices
                </span>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {savedDb.slice(0, 8).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/40 bg-background px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.resource?.title ?? "Resource"}</p>
                      {s.resource?.source_name && (
                        <p className="truncate text-muted-foreground">{s.resource.source_name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleSaveDb(s.resource_id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}


      {/* BROWSE BY SOURCE LIBRARY */}
      {sourceLibs.length > 0 && (
        <section className="mx-auto max-w-[88rem] px-4 pt-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Trusted source libraries
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                Browse by source
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Resources curated from leading professional, government, nonprofit, and educational libraries.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {sourceLibs.length} sources
            </span>
          </div>
          <div className={`mt-5 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${viewDensity === "compact" ? "gap-1.5" : "gap-4"}`}>
            {sourceLibs.map((s) => (
              <article key={s.id} className={`flex flex-col rounded-2xl border border-border/60 bg-card shadow-soft transition-shadow hover:shadow-lift ${viewDensity === "compact" ? "p-3" : "p-5"}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {s.source_type.replace(/_/g, " ")}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{s.location_scope}</span>
                  {s.review_status === "featured" && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400">Featured</span>
                  )}
                </div>
                <h3 className={`mt-2 font-display font-medium leading-snug ${viewDensity === "compact" ? "text-sm" : "text-lg"}`}>{s.source_name}</h3>
                {s.organization_name && (
                  <p className="mt-1 text-xs text-muted-foreground">{s.organization_name}</p>
                )}
                {s.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{s.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
                  <span>{s.resource_count} curated</span>
                  {s.source_url && (
                    <a href={s.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                      Visit library <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* STICKY SEARCH + FILTERS */}
      <section
        data-testid="resources-sticky-search"
        className="sticky top-16 z-40 mx-auto max-w-[88rem] px-4 pt-2 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-border/60 bg-background/95 p-1.5 shadow-soft backdrop-blur-md">
          {/* Mobile toggle */}
          <button
            ref={searchToggleRef}
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 sm:hidden"
            aria-expanded={searchOpen}
            aria-controls="resources-search-input"
            aria-label="Toggle search"
            data-testid="resources-search-toggle"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{query ? query : "Search resources"}</span>
            </div>
            {searchOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {/* Search input — always visible on desktop, toggled on mobile */}
          <div
            id="resources-search-input"
            className={`${searchOpen ? "block" : "hidden"} sm:block`}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Search resources"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search videos, podcasts, books, worksheets, agencies…"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {query && (
              <p className="mt-1 px-2 text-[11px] text-muted-foreground">
                Searching across {filteredFeaturedDb.length + filteredDbResources.length + visible.length} resources
              </p>
            )}
          </div>

          {/* Filters — collapsible when scrolling; only on Browse tab */}
          {tab === "browse" && (
            <div className="mt-1.5">
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  scrolled && !filtersExpanded
                    ? "max-h-0 opacity-0"
                    : "max-h-[500px] opacity-100"
                }`}
                aria-hidden={scrolled && !filtersExpanded ? "true" : undefined}
              >
                <div className="grid gap-2 pt-1.5 sm:grid-cols-2 lg:grid-cols-4">
                  <FilterSelect
                    icon={Tag}
                    label="Format"
                    value={filters.format}
                    onChange={(v) => setF("format", v as Filters["format"])}
                    options={[
                      ["all", "All formats"],
                      ...Object.entries(FORMAT_META).map(([k, v]) => [k, v.label] as [string, string]),
                    ]}
                  />
                  <FilterSelect
                    icon={Users}
                    label="Audience"
                    value={filters.audience}
                    onChange={(v) => setF("audience", v as Filters["audience"])}
                    options={[
                      ["all", "All audiences"],
                      ...(Object.entries(AUDIENCE_META) as [string, string][]).filter(
                        ([k]) => k !== "admin",
                      ),
                    ]}
                  />
                  <FilterSelect
                    icon={Folder}
                    label="Topic"
                    value={filters.topic}
                    onChange={(v) => setF("topic", v as Filters["topic"])}
                    options={[
                      ["all", "All topics"],
                      ...Object.entries(TOPIC_META).map(([k, v]) => [k, v.label] as [string, string]),
                    ]}
                  />
                  <FilterSelect
                    icon={GraduationCap}
                    label="Grade / age"
                    value={filters.grade}
                    onChange={(v) => setF("grade", v as Filters["grade"])}
                    options={[
                      ["all", "Any grade"],
                      ["middle", "Middle school"],
                      ["9", "9th grade"],
                      ["10", "10th grade"],
                      ["11", "11th grade"],
                      ["12", "12th grade"],
                      ["18-22", "Ages 18–22"],
                    ]}
                  />
                  <FilterSelect
                    icon={BookOpen}
                    label="Reading level"
                    value={filters.reading}
                    onChange={(v) => setF("reading", v as Filters["reading"])}
                    options={[
                      ["all", "Any reading level"],
                      ["student", "Student-friendly"],
                      ["family", "Family-friendly"],
                      ["professional", "Professional"],
                    ]}
                  />
                  <FilterSelect
                    icon={MapPin}
                    label="Location"
                    value={filters.location}
                    onChange={(v) => setF("location", v as Filters["location"])}
                    options={[
                      ["all", "Anywhere"],
                      ["national", "National"],
                      ["connecticut", "Connecticut-specific"],
                      ["local", "Local / regional"],
                    ]}
                  />
                  <FilterSelect
                    icon={Clock}
                    label="Time needed"
                    value={filters.time}
                    onChange={(v) => setF("time", v as Filters["time"])}
                    options={[
                      ["all", "Any length"],
                      ["quick", "Quick read / watch"],
                      ["deep", "Deep dive"],
                      ["workshop", "Workshop length"],
                      ["printable", "Printable"],
                    ]}
                  />
                  <button
                    onClick={clearFilters}
                    disabled={activeFilterCount === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground/80 transition hover:bg-muted disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" /> Clear ({activeFilterCount})
                  </button>
                </div>
              </div>

              {/* Collapsed filter toggle */}
              {scrolled && !filtersExpanded && (
                <button
                  type="button"
                  onClick={() => setFiltersExpanded(true)}
                  className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  aria-expanded={false}
                  aria-label="Show filters"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Filters {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ""}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Expanded filter close toggle */}
              {scrolled && filtersExpanded && (
                <button
                  type="button"
                  onClick={() => setFiltersExpanded(false)}
                  className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  aria-expanded={true}
                  aria-label="Hide filters"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Hide filters
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Screen-reader announcement for filter/result changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      {/* TAB BAR */}

      <section className="mx-auto max-w-[88rem] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "browse", label: "Browse all", icon: Library },
                { id: "recommended", label: "Recommended for you", icon: Sparkles },
                { id: "saved", label: `Saved (${savedResources.length})`, icon: Bookmark },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            <button
              onClick={() => setViewDensity("compact")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewDensity === "compact" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={viewDensity === "compact"}
            >
              Compact
            </button>
            <button
              onClick={() => setViewDensity("comfortable")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewDensity === "comfortable" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={viewDensity === "comfortable"}
            >
              Comfortable
            </button>
          </div>
        </div>
      </section>

      {tab === "browse" && (
        <BrowseTab
          query={query}
          setQuery={setQuery}
          filters={filters}
          setF={setF}
          clearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          visible={visible}
          featured={featured}
          saved={saved}
          toggleSave={toggle}
          density={viewDensity}
        />
      )}

      {tab === "recommended" && (
        <RecommendedTab saved={saved} toggleSave={toggle} density={viewDensity} />
      )}

      {tab === "saved" && (
        <SavedTab saved={saved} resources={savedResources} remove={remove} toggleSave={toggle} density={viewDensity} />
      )}

      {/* CTA */}
      <section className="mx-auto max-w-[88rem] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Connect Resources to a Real Plan.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
            Start a student profile and the library can recommend videos,
            worksheets, and agencies that match their goals, grade, and
            interests — and add them straight to a pathway plan.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/waitlist"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              Join the waitlist
            </Link>
            <Link
              to="/pathways/$pathwayId"
              params={{ pathwayId: "intake" }}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted"
            >
              Build a pathway report
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

// ───────────────────────── Browse Tab

function BrowseTab(props: {
  query: string;
  setQuery: (s: string) => void;
  filters: Filters;
  setF: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  visible: Resource[];
  featured: Resource[];
  saved: SavedMap;
  toggleSave: (id: string, collection?: Collection) => void;
  density: "compact" | "comfortable";
}) {
  const { query, setQuery, filters, setF, clearFilters, activeFilterCount, visible, featured, saved, toggleSave, density } = props;

  // Group visible by format for sectioned display when no topic filter selected
  const grouped = useMemo(() => {
    const buckets: Partial<Record<ResourceFormat, Resource[]>> = {};
    for (const r of visible) {
      (buckets[r.format] = buckets[r.format] || []).push(r);
    }
    return buckets;
  }, [visible]);

  return (
    <section className="mx-auto max-w-[88rem] px-4 pb-12 sm:px-6 lg:px-8">
      {/* Featured strip (only when no filters) */}
      {activeFilterCount === 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Featured This Week
            </h2>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Editors' picks
            </p>
          </div>
          <div className={`grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${density === "compact" ? "gap-1.5" : "gap-6"}`}>
            {featured.map((r) => (
              <ResourceCard key={r.id} resource={r} saved={!!saved[r.id]} onSave={() => toggleSave(r.id)} compact={density === "compact"} />
            ))}
          </div>
        </div>
      )}

      {/* Grouped results */}
      <div className="mt-12 space-y-14">
        {(Object.keys(grouped) as ResourceFormat[]).map((fmt) => (
          <div key={fmt}>
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                {FORMAT_META[fmt].label}s
              </h2>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {grouped[fmt]?.length} resources
              </p>
            </div>
            <div className={`grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${density === "compact" ? "gap-1.5" : "gap-6"}`}>
              {grouped[fmt]!.map((r) => (
                <ResourceCard key={r.id} resource={r} saved={!!saved[r.id]} onSave={() => toggleSave(r.id)} compact={density === "compact"} />
              ))}
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <EmptyState
            title="No resources match those filters."
            body="Try clearing a filter or searching for a single word — like BRS, college, or budgeting."
            cta={{ label: "Clear filters", onClick: clearFilters }}
          />
        )}
      </div>
    </section>
  );
}

// ───────────────────────── Recommended Tab

function RecommendedTab({
  saved,
  toggleSave,
  density,
}: {
  saved: SavedMap;
  toggleSave: (id: string, c?: Collection) => void;
  density: "compact" | "comfortable";
}) {
  // Lightweight demo recommendations — in production this reads from
  // student profile, pathway report goals, and readiness scorecard.
  const demoGoals = "employment goal, independent living, self-advocacy at IEP";

  const recs = useMemo(() => {
    const text = demoGoals.toLowerCase();
    const topics: ResourceTopic[] = [];
    if (/(job|work|employ|career)/.test(text)) topics.push("employment", "career");
    if (/(independent|living|cook|budget|transport)/.test(text)) topics.push("independent-living");
    if (/(advocate|self|voice|iep)/.test(text)) topics.push("self-advocacy", "iep-ppt");
    if (/(college|university|postsecondary)/.test(text)) topics.push("postsecondary");
    return RESOURCES.filter((r) => r.topics.some((t) => topics.includes(t))).slice(0, 9);
  }, []);

  return (
    <section className="mx-auto max-w-[88rem] px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mt-8 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-medium tracking-tight">
              Personalized for the Active Student Profile
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Recommendations update as you add goals, interests, uploaded
              documents, family concerns, and readiness scores to a student's
              profile. Connect a profile to power this section.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-background px-3 py-1 font-medium">Detected: employment goal</span>
              <span className="rounded-full bg-background px-3 py-1 font-medium">Detected: independent living</span>
              <span className="rounded-full bg-background px-3 py-1 font-medium">Detected: self-advocacy at IEP</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/students"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Open student profiles
              </Link>
              <Link
                to="/pathways/$pathwayId"
                params={{ pathwayId: "intake" }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Start a pathway report
              </Link>
            </div>
          </div>
        </div>
      </div>

      {recs.length === 0 ? (
        <EmptyState
          title="Complete a student profile to unlock recommendations."
          body="Once a student has goals, interests, and a grade level, the library can suggest videos, agencies, and worksheets that match."
        />
      ) : (
        <div className={`mt-10 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${density === "compact" ? "gap-1.5" : "gap-6"}`}>
          {recs.map((r) => (
            <ResourceCard key={r.id} resource={r} saved={!!saved[r.id]} onSave={() => toggleSave(r.id)} compact={density === "compact"} />
          ))}
        </div>
      )}
    </section>
  );
}

// ───────────────────────── Saved Tab

function SavedTab({
  saved,
  resources,
  remove,
  toggleSave,
  density,
}: {
  saved: SavedMap;
  resources: Resource[];
  remove: (id: string) => void;
  toggleSave: (id: string, c?: Collection) => void;
  density: "compact" | "comfortable";
}) {
  // Group by collection
  const byCollection = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    for (const r of resources) {
      for (const c of saved[r.id] || []) {
        (map[c] = map[c] || []).push(r);
      }
    }
    return map;
  }, [resources, saved]);

  return (
    <section className="mx-auto max-w-[88rem] px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-medium tracking-tight">
            Your Saved Resources
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Organize what you save into collections — one for next month's
            meeting, one for college planning, one to share with your case
            manager.
          </p>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          title="No saved resources yet."
          body="Tap the bookmark on any resource to save it. Build collections to take to your next meeting or share with your team."
        />
      ) : (
        <div className="mt-8 space-y-10">
          {COLLECTIONS.filter((c) => byCollection[c]?.length).map((c) => (
            <div key={c}>
              <h3 className="mb-4 font-display text-xl font-medium tracking-tight">
                <Folder className="mr-2 inline h-4 w-4 text-primary" />
                {c}{" "}
                <span className="text-sm text-muted-foreground">
                  · {byCollection[c].length}
                </span>
              </h3>
              <div className={`grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${density === "compact" ? "gap-1.5" : "gap-6"}`}>
                {byCollection[c].map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    saved={true}
                    onSave={() => remove(r.id)}
                    compact={density === "compact"}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ───────────────────────── Add to Pathway

const LOCATION_LABEL: Record<LocationScope, string> = {
  national: "National",
  connecticut: "Connecticut",
  local: "Local",
};

function AddToPathwayButton({
  title,
  description,
  link,
}: {
  title: string;
  description?: string | null;
  link?: string | null;
}) {
  const { user } = useAuth();
  const fetchStudents = useServerFn(listStudents);
  const addItem = useServerFn(createStudentActionItem);
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user || students !== null) return;
    fetchStudents()
      .then((r) => setStudents(r.students))
      .catch(() => setStudents([]));
  }, [open, user, students, fetchStudents]);

  const handleAdd = async (studentId: string) => {
    setBusyId(studentId);
    try {
      const desc = [description, link].filter(Boolean).join("\n\n");
      const { item } = await addItem({
        data: {
          student_id: studentId,
          title: title.slice(0, 200),
          description: desc ? desc.slice(0, 2000) : undefined,
          category: "family",
          priority: "medium",
        },
      });
      toast.success("Added to pathway", {
        description: (
          <span className="block">
            <span className="block text-[11px] font-mono text-muted-foreground mb-1">
              ID: {item.id}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(item.id);
                    try {
                      const pasted = await navigator.clipboard.readText();
                      if (pasted === item.id) {
                        toast.success("Copied to clipboard", {
                          description: `Action item ID ${item.id.slice(0, 8)}… verified and ready to paste.`,
                        });
                      } else {
                        toast.error("Clipboard mismatch", {
                          description: "Copied text doesn't match the action-item ID. Please try again.",
                        });
                      }
                    } catch {
                      toast.success("Copied to clipboard", {
                        description: `Action item ID ${item.id.slice(0, 8)}… ready to paste.`,
                      });
                    }
                  } catch {
                    toast.error("Could not copy ID");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium hover:bg-muted/80"
              >
                <Copy className="h-3 w-3" /> Copy ID
              </button>
              <Link
                to="/students/$studentId"
                params={{ studentId }}
                className="text-[11px] underline text-primary"
              >
                View on student page
              </Link>
            </span>
          </span>
        ),
      });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to pathway");
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
      >
        <ListPlus className="h-3.5 w-3.5" /> Add to pathway
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
      >
        <ListPlus className="h-3.5 w-3.5" /> Add to pathway
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-2 shadow-lift">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Add to which student?
          </p>
          {students === null ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>
          ) : students.length === 0 ? (
            <Link
              to="/students"
              className="block px-2 py-2 text-xs text-primary hover:underline"
            >
              Create a student first →
            </Link>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(s.id)}
                    disabled={busyId === s.id}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
                  >
                    <span className="truncate">
                      {s.first_name}
                      {s.last_name ? ` ${s.last_name}` : ""}
                    </span>
                    {busyId === s.id && (
                      <span className="text-[10px] text-muted-foreground">…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Resource Card



function ResourceCard({
  resource: r,
  saved,
  onSave,
  compact = false,
}: {
  resource: Resource;
  saved: boolean;
  onSave: () => void;
  compact?: boolean;
}) {
  const fmt = FORMAT_META[r.format];

  const onShare = async () => {
    if (typeof window === "undefined") return;
    const url = r.link || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: r.title, text: r.description, url });
      } else {
        await navigator.clipboard.writeText(`${r.title} — ${url}`);
        alert("Link copied to clipboard");
      }
    } catch {}
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      {r.format === "video" && r.youtubeId && !compact && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${r.youtubeId}`}
            title={r.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}
      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-5"}`}>
        <div className={`flex flex-wrap items-center ${compact ? "gap-1" : "gap-2"}`}>
          <Badge tone="primary">{fmt.label}</Badge>
          <Badge tone="muted">External</Badge>
          {r.location === "connecticut" ? (
            <Badge tone="warm">Connecticut</Badge>
          ) : (
            <Badge tone="muted">{LOCATION_LABEL[r.location]}</Badge>
          )}
          {r.audiences.slice(0, compact ? 1 : 3).map((a) => (
            <Badge key={a} tone="muted">
              {AUDIENCE_META[a]}
            </Badge>
          ))}
        </div>

        <p className={`mt-1.5 font-semibold uppercase tracking-[0.16em] text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
          {r.source}
          {r.author ? ` · ${r.author}` : ""}
        </p>
        <h3 className={`mt-0.5 font-display font-medium leading-snug tracking-tight ${compact ? "text-sm" : "text-lg"}`}>
          {toTitleCase(r.title)}
        </h3>
        <p className={`mt-1 leading-relaxed text-muted-foreground ${compact ? "text-xs line-clamp-2" : "text-sm line-clamp-3"}`}>
          {r.description}
        </p>
        {!compact && r.whyItHelps && (
          <p className="mt-2 rounded-xl bg-muted/60 px-3 py-1.5 text-xs leading-relaxed text-foreground/80">
            <span className="font-semibold">Why it helps:</span> {r.whyItHelps}
          </p>
        )}
        <div className={`mt-1.5 flex flex-wrap ${compact ? "gap-1" : "gap-2"}`}>
          {r.topics.slice(0, compact ? 2 : 5).map((t) => (
            <span
              key={t}
              className={`rounded-full bg-secondary/60 font-medium text-foreground/70 ${compact ? "px-2 py-[1px] text-[10px]" : "px-3 py-1 text-xs"}`}
            >
              {TOPIC_META[t].label}
            </span>
          ))}
        </div>
        <div className={`flex items-center gap-3 text-muted-foreground ${compact ? "mt-2 text-[10px]" : "mt-4 text-xs"}`}>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {r.estimatedTime}
          </span>
          {r.grades && r.grades.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> {r.grades.join(", ")}
            </span>
          )}
        </div>

        {/* Podcast inline audio */}
        {!compact && r.format === "podcast" && r.audioUrl && (
          <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {r.podcastTitle} · {r.episodeTitle}
            </p>
            <audio controls preload="none" className="mt-1 w-full">
              <source src={r.audioUrl} type="audio/mpeg" />
              Your browser does not support embedded audio.
            </audio>
          </div>
        )}

        <div className={`mt-auto flex flex-wrap items-center gap-1.5 ${compact ? "pt-3" : "pt-5"}`}>
          {r.link ? (
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-primary font-semibold text-primary-foreground shadow-soft hover:shadow-lift ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"}`}
            >
              {fmt.verb} <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          <button
            onClick={onSave}
            aria-label={saved ? "Remove from saved" : "Save"}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold transition ${
              saved
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-muted"
            } ${compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}
          >
            {saved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background font-semibold hover:bg-muted ${compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}
          >
            <Share2 className="h-3 w-3" /> Share
          </button>
          <AddToPathwayButton title={r.title} description={r.description} link={r.link} />
        </div>
      </div>
    </article>
  );
}


// ───────────────────────── Small UI bits

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "warm" | "muted";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "warm"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
        : "bg-muted text-foreground/70";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

function FilterSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xs font-medium outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-border/70 bg-gradient-warm p-10 text-center sm:p-14">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-soft">
        <ListChecks className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-4 font-display text-xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

// Avoid TS unused-import complaints if any icons were imported but trimmed
void Building2;
void FileText;
void Film;
void Headphones;
void BookOpen;
