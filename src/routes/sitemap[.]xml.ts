import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.8" },
          { path: "/demo", changefreq: "weekly", priority: "0.9" },
          { path: "/educators", changefreq: "monthly", priority: "0.8" },
          { path: "/families", changefreq: "monthly", priority: "0.8" },
          { path: "/framework", changefreq: "monthly", priority: "0.7" },
          { path: "/login", changefreq: "monthly", priority: "0.5" },
          { path: "/partners", changefreq: "monthly", priority: "0.7" },
          { path: "/platform", changefreq: "monthly", priority: "0.8" },
          { path: "/pricing", changefreq: "monthly", priority: "0.8" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/research", changefreq: "weekly", priority: "0.7" },
          { path: "/reset-password", changefreq: "yearly", priority: "0.3" },
          { path: "/resources", changefreq: "weekly", priority: "0.7" },
          { path: "/waitlist", changefreq: "monthly", priority: "0.6" },
          { path: "/demo/hub", changefreq: "weekly", priority: "0.7" },
          { path: "/demo/intake", changefreq: "weekly", priority: "0.7" },
          { path: "/demo/meeting", changefreq: "weekly", priority: "0.7" },
          { path: "/demo/plan", changefreq: "weekly", priority: "0.7" },
          { path: "/demo/report", changefreq: "weekly", priority: "0.7" },
          { path: "/demo/resources", changefreq: "weekly", priority: "0.7" },
        ];

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
