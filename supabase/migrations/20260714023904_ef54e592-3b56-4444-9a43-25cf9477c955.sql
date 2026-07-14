
-- 1) Restrict content-management policies to platform admins only

-- blog_posts
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts" ON public.blog_posts
  FOR SELECT USING ((status = 'published'::text) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub can manage blog posts" ON public.blog_posts;
CREATE POLICY "Platform admins can manage blog posts" ON public.blog_posts
  FOR ALL USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- testimonials
DROP POLICY IF EXISTS "Public can view published testimonials" ON public.testimonials;
CREATE POLICY "Public can view published testimonials" ON public.testimonials
  FOR SELECT USING ((is_published = true) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub can manage testimonials" ON public.testimonials;
CREATE POLICY "Platform admins can manage testimonials" ON public.testimonials
  FOR ALL USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- page_sections
DROP POLICY IF EXISTS "Public can view published page sections" ON public.page_sections;
CREATE POLICY "Public can view published page sections" ON public.page_sections
  FOR SELECT USING ((is_published = true) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub can manage page sections" ON public.page_sections;
CREATE POLICY "Platform admins can manage page sections" ON public.page_sections
  FOR ALL USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- faqs
DROP POLICY IF EXISTS "Public can view published faqs" ON public.faqs;
CREATE POLICY "Public can view published faqs" ON public.faqs
  FOR SELECT USING ((is_published = true) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub can manage faqs" ON public.faqs;
CREATE POLICY "Platform admins can manage faqs" ON public.faqs
  FOR ALL USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- media_assets
DROP POLICY IF EXISTS "Admin hub can manage media" ON public.media_assets;
CREATE POLICY "Platform admins can manage media" ON public.media_assets
  FOR ALL USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- resource_sources
DROP POLICY IF EXISTS "Authed can view non-archived sources" ON public.resource_sources;
CREATE POLICY "Authed can view non-archived sources" ON public.resource_sources
  FOR SELECT USING ((review_status <> 'archived'::text) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub manages sources insert" ON public.resource_sources;
CREATE POLICY "Platform admins manage sources insert" ON public.resource_sources
  FOR INSERT WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub manages sources update" ON public.resource_sources;
CREATE POLICY "Platform admins manage sources update" ON public.resource_sources
  FOR UPDATE USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- admin_activity_logs
DROP POLICY IF EXISTS "Admin hub members insert their own activity" ON public.admin_activity_logs;
CREATE POLICY "Platform admins insert their own activity" ON public.admin_activity_logs
  FOR INSERT WITH CHECK ((admin_user_id = auth.uid()) AND public.is_platform_admin(auth.uid()));

-- storage.objects site-media
DROP POLICY IF EXISTS "Admin hub can upload site-media" ON storage.objects;
CREATE POLICY "Platform admins can upload site-media" ON storage.objects
  FOR INSERT WITH CHECK ((bucket_id = 'site-media'::text) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub can update site-media" ON storage.objects;
CREATE POLICY "Platform admins can update site-media" ON storage.objects
  FOR UPDATE USING ((bucket_id = 'site-media'::text) AND public.is_platform_admin(auth.uid()))
  WITH CHECK ((bucket_id = 'site-media'::text) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin hub can delete site-media" ON storage.objects;
CREATE POLICY "Platform admins can delete site-media" ON storage.objects
  FOR DELETE USING ((bucket_id = 'site-media'::text) AND public.is_platform_admin(auth.uid()));


-- 2) Prevent self-escalation on student_relationships
-- The related_user may only flip consent_status pending->approved; other
-- columns (permission_level, relationship_type, student_id, related_user_id)
-- must not change on the self-update path. Editor-side changes are enforced
-- by the existing RLS WITH CHECK (consent_status <> 'approved').

CREATE OR REPLACE FUNCTION public.enforce_student_relationship_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only guard the self-update path (related user acting on their own row).
  IF NEW.related_user_id IS NOT DISTINCT FROM auth.uid()
     AND OLD.related_user_id IS NOT DISTINCT FROM auth.uid()
     AND NOT public.can_edit_student(auth.uid(), NEW.student_id)
  THEN
    IF NEW.permission_level IS DISTINCT FROM OLD.permission_level THEN
      RAISE EXCEPTION 'Only an editor can change permission_level' USING ERRCODE = '42501';
    END IF;
    IF NEW.relationship_type IS DISTINCT FROM OLD.relationship_type THEN
      RAISE EXCEPTION 'Only an editor can change relationship_type' USING ERRCODE = '42501';
    END IF;
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Cannot change student_id' USING ERRCODE = '42501';
    END IF;
    IF NEW.related_user_id IS DISTINCT FROM OLD.related_user_id THEN
      RAISE EXCEPTION 'Cannot change related_user_id' USING ERRCODE = '42501';
    END IF;
    IF NEW.consent_status IS DISTINCT FROM OLD.consent_status
       AND NEW.consent_status <> 'approved' THEN
      RAISE EXCEPTION 'Related user may only approve consent' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_student_relationship_self_update ON public.student_relationships;
CREATE TRIGGER trg_enforce_student_relationship_self_update
BEFORE UPDATE ON public.student_relationships
FOR EACH ROW EXECUTE FUNCTION public.enforce_student_relationship_self_update();
