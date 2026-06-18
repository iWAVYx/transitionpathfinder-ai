import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://transitionforwardct.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static pathway IDs match PATHWAYS keys in src/routes/pathways.$pathwayId.tsx
const PATHWAY_IDS = ["college", "technical", "career", "lifeskills"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.8" },
          { path: "/educators", changefreq: "monthly", priority: "0.8" },
          { path: "/families", changefreq: "monthly", priority: "0.8" },
          { path: "/programs/transitionforward", changefreq: "monthly", priority: "0.7" },
          { path: "/bridgeforward", changefreq: "monthly", priority: "0.7" },
          { path: "/partners", changefreq: "monthly", priority: "0.7" },
          { path: "/partnerforward", changefreq: "monthly", priority: "0.7" },
          { path: "/partner-directory", changefreq: "weekly", priority: "0.6" },
          { path: "/platform", changefreq: "monthly", priority: "0.8" },
          { path: "/pricing", changefreq: "monthly", priority: "0.8" },
          { path: "/research", changefreq: "weekly", priority: "0.7" },
          { path: "/resources", changefreq: "weekly", priority: "0.7" },
          { path: "/waitlist", changefreq: "monthly", priority: "0.9" },
          { path: "/demo", changefreq: "monthly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/help", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/trust-and-safety", changefreq: "yearly", priority: "0.3" },
        ];

        for (const id of PATHWAY_IDS) {
          entries.push({ path: `/pathways/${id}`, changefreq: "monthly", priority: "0.7" });
        }

        // Dynamic blog posts
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: posts } = await supabaseAdmin
            .from("blog_posts")
            .select("slug, updated_at, published_at")
            .eq("status", "published");
          for (const p of posts ?? []) {
            entries.push({
              path: `/blog/${p.slug}`,
              lastmod: (p.updated_at ?? p.published_at ?? undefined)?.slice(0, 10),
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch {
          // Fail open — still emit static entries if the DB call fails.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
