import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types ----------

export type PageSection = {
  id: string;
  page_key: string;
  section_key: string;
  content: any;
  is_published: boolean;
  updated_at: string | null;
};

export type MediaAsset = {
  id: string;
  title: string | null;
  alt_text: string | null;
  storage_path: string;
  public_url: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  created_at: string;
};

export type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  position: number;
  is_published: boolean;
};

export type Testimonial = {
  id: string;
  author_name: string;
  role: string | null;
  organization: string | null;
  quote: string;
  avatar_url: string | null;
  rating: number | null;
  is_featured: boolean;
  is_published: boolean;
  position: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  cover_image_url: string | null;
  author_name: string | null;
  category: string | null;
  tags: string[];
  status: "draft" | "published" | "archived";
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string | null;
};

// ---------- Auth helper ----------

async function requireAdminHub(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: Admin Hub access required.");
}

async function logActivity(
  supabase: any,
  userId: string,
  action_type: string,
  target_type: string,
  target_id: string | null,
  details: Record<string, unknown> = {},
) {
  await supabase.from("admin_activity_logs").insert({
    admin_user_id: userId,
    action_type,
    target_type,
    target_id,
    details,
  });
}

// ---------- Page sections (public read + admin write) ----------

export const getPageSection = createServerFn({ method: "GET" })
  .validator((i: unknown) =>
    z.object({ page_key: z.string(), section_key: z.string() }).parse(i),
  )
  .handler(async ({ data }): Promise<{ content: any }> => {
    const { supabasePublic } = await import("@/integrations/supabase/public.server");
    const { data: row } = await supabasePublic
      .from("page_sections")
      .select("content, is_published")
      .eq("page_key", data.page_key)
      .eq("section_key", data.section_key)
      .eq("is_published", true)
      .maybeSingle();
    return { content: (row?.content as Record<string, unknown>) ?? null };
  });

export const adminListPageSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { data, error } = await supabase
      .from("page_sections")
      .select("*")
      .order("page_key")
      .order("section_key");
    if (error) throw new Error(error.message);
    return { sections: (data ?? []) as PageSection[] };
  });

export const adminUpsertPageSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        page_key: z.string().trim().min(1).max(100),
        section_key: z.string().trim().min(1).max(100),
        content: z.record(z.string(), z.any()),
        is_published: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const row: any = {
      page_key: data.page_key,
      section_key: data.section_key,
      content: data.content,
      updated_by: userId,
    };
    if (data.is_published !== undefined) row.is_published = data.is_published;
    const { error } = await supabase
      .from("page_sections")
      .upsert(row, { onConflict: "page_key,section_key" });
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "page_section_updated", "page_section", null, {
      page: data.page_key,
      section: data.section_key,
    });
    return { ok: true };
  });

// ---------- Media (private bucket; signed URLs as public_url) ----------

export const adminListMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { media: (data ?? []) as MediaAsset[] };
  });

export const adminUploadMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        filename: z.string().min(1).max(200),
        mime_type: z.string().min(1).max(100),
        base64: z.string().min(1),
        title: z.string().max(200).optional().nullable(),
        alt_text: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const buffer = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    const { error: upErr } = await supabaseAdmin.storage
      .from("site-media")
      .upload(path, buffer, { contentType: data.mime_type, upsert: false });
    if (upErr) throw new Error(upErr.message);

    // Long-lived signed URL (10 years)
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("site-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw new Error(sErr.message);

    const { data: ins, error: insErr } = await supabase
      .from("media_assets")
      .insert({
        title: data.title ?? data.filename,
        alt_text: data.alt_text ?? null,
        storage_path: path,
        public_url: signed.signedUrl,
        mime_type: data.mime_type,
        file_size: buffer.byteLength,
        uploaded_by: userId,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    await logActivity(supabase, userId, "media_uploaded", "media_asset", ins.id, {
      filename: data.filename,
    });
    return { asset: ins as MediaAsset };
  });

export const adminDeleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabase
      .from("media_assets")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from("site-media").remove([row.storage_path]);
    }
    const { error } = await supabase.from("media_assets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "media_deleted", "media_asset", data.id);
    return { ok: true };
  });

// ---------- FAQs ----------

export const getPublishedFaqs = createServerFn({ method: "GET" })
  .validator((i: unknown) =>
    z.object({ category: z.string().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabasePublic } = await import("@/integrations/supabase/public.server");
    let q = supabasePublic
      .from("faqs")
      .select("*")
      .eq("is_published", true)
      .order("position");
    if (data.category) q = q.eq("category", data.category);
    const { data: rows } = await q;
    return { faqs: (rows ?? []) as Faq[] };
  });

export const adminListFaqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("category")
      .order("position");
    if (error) throw new Error(error.message);
    return { faqs: (data ?? []) as Faq[] };
  });

const faqInput = z.object({
  id: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(60).default("general"),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(5000),
  position: z.number().int().min(0).max(9999).default(0),
  is_published: z.boolean().default(true),
});

export const adminSaveFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => faqInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabase.from("faqs").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "faq_updated", "faq", id);
    } else {
      const { error } = await supabase.from("faqs").insert(row);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "faq_created", "faq", null);
    }
    return { ok: true };
  });

export const adminDeleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { error } = await supabase.from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "faq_deleted", "faq", data.id);
    return { ok: true };
  });

// ---------- Testimonials ----------


export const adminListTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("position");
    if (error) throw new Error(error.message);
    return { testimonials: (data ?? []) as Testimonial[] };
  });

const testimonialInput = z.object({
  id: z.string().uuid().optional(),
  author_name: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).optional().nullable(),
  organization: z.string().trim().max(200).optional().nullable(),
  quote: z.string().trim().min(1).max(2000),
  avatar_url: z.string().trim().url().max(2000).optional().nullable().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  is_featured: z.boolean().default(false),
  is_published: z.boolean().default(true),
  position: z.number().int().min(0).max(9999).default(0),
});

export const adminSaveTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => testimonialInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { id, ...rest } = data;
    const row: Record<string, any> = { ...rest };
    if (row.avatar_url === "") row.avatar_url = null;
    if (id) {
      const { error } = await supabase.from("testimonials").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "testimonial_updated", "testimonial", id);
    } else {
      const { error } = await supabase.from("testimonials").insert(row);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "testimonial_created", "testimonial", null);
    }
    return { ok: true };
  });

export const adminDeleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { error } = await supabase.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "testimonial_deleted", "testimonial", data.id);
    return { ok: true };
  });

// ---------- Blog posts ----------

export const getPublishedBlogPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabasePublic } = await import("@/integrations/supabase/public.server");
  const { data } = await supabasePublic
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, author_name, category, tags, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return { posts: data ?? [] };
});

export const getBlogPostBySlug = createServerFn({ method: "GET" })
  .validator((i: unknown) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { supabasePublic } = await import("@/integrations/supabase/public.server");
    const { data: row } = await supabasePublic
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return { post: row as BlogPost | null };
  });

export const adminListBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { posts: (data ?? []) as BlogPost[] };
  });

const blogInput = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only"),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).optional().nullable(),
  body_markdown: z.string().max(200000).default(""),
  cover_image_url: z.string().trim().max(2000).optional().nullable(),
  author_name: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  published_at: z.string().min(1).max(64).optional().nullable(),
  seo_title: z.string().trim().max(200).optional().nullable(),
  seo_description: z.string().trim().max(500).optional().nullable(),
});

export const adminSaveBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => blogInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { id, ...rest } = data;
    const row: Record<string, any> = { ...rest };
    // Auto-set published_at when first publishing
    if (rest.status === "published" && !rest.published_at) {
      row.published_at = new Date().toISOString();
    }
    if (id) {
      const { error } = await supabase.from("blog_posts").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "blog_post_updated", "blog_post", id);
      return { ok: true, id };
    } else {
      row.author_id = userId;
      const { data: ins, error } = await supabase
        .from("blog_posts")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "blog_post_created", "blog_post", ins.id);
      return { ok: true, id: ins.id };
    }
  });

export const adminDeleteBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminHub(supabase, userId);
    const { error } = await supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "blog_post_deleted", "blog_post", data.id);
    return { ok: true };
  });
