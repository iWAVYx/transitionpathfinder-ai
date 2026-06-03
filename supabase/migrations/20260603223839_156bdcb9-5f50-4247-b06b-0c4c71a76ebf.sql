
-- page_sections
CREATE TABLE public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, section_key)
);
GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_sections TO authenticated;
GRANT ALL ON public.page_sections TO service_role;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published page sections" ON public.page_sections FOR SELECT
  USING (is_published = true OR public.is_admin_hub_member(auth.uid()));
CREATE POLICY "Admin hub can manage page sections" ON public.page_sections FOR ALL TO authenticated
  USING (public.is_admin_hub_member(auth.uid())) WITH CHECK (public.is_admin_hub_member(auth.uid()));
CREATE TRIGGER page_sections_set_updated_at BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX page_sections_page_key_idx ON public.page_sections(page_key);

-- media_assets
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  alt_text text,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view media metadata" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "Admin hub can manage media" ON public.media_assets FOR ALL TO authenticated
  USING (public.is_admin_hub_member(auth.uid())) WITH CHECK (public.is_admin_hub_member(auth.uid()));
CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- faqs
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published faqs" ON public.faqs FOR SELECT
  USING (is_published = true OR public.is_admin_hub_member(auth.uid()));
CREATE POLICY "Admin hub can manage faqs" ON public.faqs FOR ALL TO authenticated
  USING (public.is_admin_hub_member(auth.uid())) WITH CHECK (public.is_admin_hub_member(auth.uid()));
CREATE TRIGGER faqs_set_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- testimonials
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  role text,
  organization text,
  quote text NOT NULL,
  avatar_url text,
  rating smallint CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published testimonials" ON public.testimonials FOR SELECT
  USING (is_published = true OR public.is_admin_hub_member(auth.uid()));
CREATE POLICY "Admin hub can manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (public.is_admin_hub_member(auth.uid())) WITH CHECK (public.is_admin_hub_member(auth.uid()));
CREATE TRIGGER testimonials_set_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- blog_posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  body_markdown text NOT NULL DEFAULT '',
  cover_image_url text,
  author_name text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published blog posts" ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.is_admin_hub_member(auth.uid()));
CREATE POLICY "Admin hub can manage blog posts" ON public.blog_posts FOR ALL TO authenticated
  USING (public.is_admin_hub_member(auth.uid())) WITH CHECK (public.is_admin_hub_member(auth.uid()));
CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX blog_posts_status_published_at_idx ON public.blog_posts(status, published_at DESC);

-- storage policies for site-media bucket (bucket itself created via storage_create_bucket)
CREATE POLICY "Public can read site-media" ON storage.objects FOR SELECT
  USING (bucket_id = 'site-media');
CREATE POLICY "Admin hub can upload site-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.is_admin_hub_member(auth.uid()));
CREATE POLICY "Admin hub can update site-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND public.is_admin_hub_member(auth.uid()))
  WITH CHECK (bucket_id = 'site-media' AND public.is_admin_hub_member(auth.uid()));
CREATE POLICY "Admin hub can delete site-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND public.is_admin_hub_member(auth.uid()));
