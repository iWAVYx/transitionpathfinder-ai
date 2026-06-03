import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { getBlogPostBySlug, type BlogPost } from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Blog | TransitionForward` },
      { property: "og:title", content: `${params.slug} | TransitionForward Blog` },
    ],
  }),
  component: BlogPostPage,
  errorComponent: ({ error }) => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl">Post not available</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>
      </div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl">Post not found</h1>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>
      </div>
    </SiteShell>
  ),
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const fetchPost = useServerFn(getBlogPostBySlug);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPost({ data: { slug } })
      .then((r) => {
        if (!r.post) setMissing(true);
        else setPost(r.post);
      })
      .finally(() => setLoading(false));
  }, [fetchPost, slug]);

  if (loading) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteShell>
    );
  }
  if (missing || !post) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl">Post not found</h1>
          <p className="mt-2 text-muted-foreground">This article may have been moved or unpublished.</p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </Link>
        </div>
      </SiteShell>
    );
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-24">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>

        <header className="mt-6 border-b border-border pb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {post.category && <Badge variant="secondary">{post.category}</Badge>}
            {date && <span>{date}</span>}
            {post.author_name && <span>· by {post.author_name}</span>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
          )}
        </header>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="my-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-soft"
          />
        )}

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body_markdown}
          </ReactMarkdown>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </SiteShell>
  );
}
