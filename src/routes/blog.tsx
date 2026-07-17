import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Newspaper, Search, ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getPublishedBlogPosts } from "@/lib/cms/cms.functions";

type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
};

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog | TransitionForward" },
      {
        name: "description",
        content:
          "News, Stories, and Updates from TransitionForward on transition planning, postsecondary support, and Connecticut families.",
      },
      { property: "og:title", content: "Blog | TransitionForward" },
      {
        property: "og:description",
        content:
          "News, Stories, and Updates from TransitionForward on transition planning and postsecondary support.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const fetchPosts = useServerFn(getPublishedBlogPosts);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetchPosts()
      .then((r) => setPosts((r.posts ?? []) as PostCard[]))
      .finally(() => setLoaded(true));
  }, [fetchPosts]);

  const categories = useMemo(
    () =>
      Array.from(new Set(posts.map((p) => p.category).filter(Boolean) as string[])).sort(),
    [posts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((p) => {
      const matchesCat = activeCategory === "all" || p.category === activeCategory;
      if (!term) return matchesCat;
      const hay = [p.title, p.excerpt ?? "", p.author_name ?? "", ...(p.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return matchesCat && hay.includes(term);
    });
  }, [posts, search, activeCategory]);

  return (
    <SiteShell>
      <section className="bg-gradient-to-b from-primary/5 to-background pb-12 pt-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5" />
            From the Blog
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            News, Stories, and Updates
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Field notes from TransitionForward on transition planning, postsecondary
            pathways, and what Connecticut families and educators are learning.
          </p>
          <div className="relative mx-auto mt-8 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {categories.length > 0 && (
            <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
              <CategoryPill
                label="All"
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              />
              {categories.map((c) => (
                <CategoryPill
                  key={c}
                  label={c}
                  active={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        {!loaded ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Newspaper className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-medium text-foreground">
              {posts.length === 0 ? "No posts yet" : "No matching posts"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {posts.length === 0
                ? "Check back soon — we're working on our first stories."
                : "Try a different search term or category."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <PostCardItem key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  );
}

function PostCardItem({ post }: { post: PostCard }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/10 via-muted to-background" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {post.category && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {post.category}
            </span>
          )}
          {date && <span>{date}</span>}
        </div>
        <h3 className="mt-3 font-display text-lg font-medium leading-snug text-foreground group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <span>{post.author_name ?? "TransitionForward"}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            Read <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
