import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const publicPolicyMigration = read(
  "supabase/migrations/20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql",
);
const adminPolicyMigration = read(
  "supabase/migrations/20260825050000_scope_public_cms_admin_policies.sql",
);
const cmsFunctions = read("src/lib/cms/cms.functions.ts");
const blogRoute = read("src/routes/blog.tsx");
const blogPostRoute = read("src/routes/blog.$slug.tsx");
const helpRoute = read("src/routes/help.tsx");

const publicPolicies = [
  ["page sections", "page_sections", "is_published = true"],
  ["FAQs", "faqs", "is_published = true"],
  ["testimonials", "testimonials", "is_published = true"],
  ["blog posts", "blog_posts", "status = 'published'"],
];

test("anonymous CMS policies evaluate publication state without admin helpers", () => {
  for (const [label, table, predicate] of publicPolicies) {
    const escapedPredicate = predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const policy = publicPolicyMigration.match(
      new RegExp(
        `CREATE POLICY "Public can view published [^"]+"[\\s\\S]*?ON public\\.${table}[\\s\\S]*?FOR SELECT[\\s\\S]*?TO anon, authenticated[\\s\\S]*?USING \\(${escapedPredicate}\\);`,
      ),
    )?.[0];
    assert.ok(policy, `${label} must retain an anonymous published-only policy`);
    assert.doesNotMatch(policy, /is_platform_admin|is_admin_hub_member|has_role/);
  }
});

test("CMS management policies remain authenticated-only", () => {
  for (const table of ["blog_posts", "testimonials", "page_sections", "faqs", "media_assets"]) {
    const policy = adminPolicyMigration.match(
      new RegExp(
        `CREATE POLICY "Platform admins can manage [^"]+"[\\s\\S]*?ON public\\.${table}[\\s\\S]*?FOR ALL[\\s\\S]*?TO authenticated[\\s\\S]*?WITH CHECK \\(public\\.is_platform_admin\\(auth\\.uid\\(\\)\\)\\);`,
      ),
    )?.[0];
    assert.ok(policy, `${table} management must remain authenticated-only`);
  }
  assert.doesNotMatch(adminPolicyMigration, /TO anon\b/);
});

test("every public CMS query fails visibly instead of converting errors into empty content", () => {
  assert.match(
    cmsFunctions,
    /data: row, error[\s\S]*?throwIfPublicCmsReadFailed\(error, "page-section"\)/,
  );
  assert.match(
    cmsFunctions,
    /data: rows, error[\s\S]*?throwIfPublicCmsReadFailed\(error, "faqs"\)/,
  );
  assert.match(
    cmsFunctions,
    /data, error[\s\S]*?throwIfPublicCmsReadFailed\(error, "blog-posts"\)/,
  );
  assert.match(
    cmsFunctions,
    /data: row, error[\s\S]*?throwIfPublicCmsReadFailed\(error, "blog-post"\)/,
  );
});

test("public FAQ and blog routes expose accessible recovery actions", () => {
  for (const source of [blogRoute, blogPostRoute, helpRoute]) {
    assert.match(source, /setLoadError\(true\)/);
    assert.match(source, /role="alert"/);
    assert.match(source, /Try again/);
  }
  assert.match(helpRoute, /Send us a message/);
});
