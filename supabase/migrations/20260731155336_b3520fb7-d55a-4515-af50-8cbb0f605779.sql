-- 1) Scope resource_tags reads to resources the viewer can already see.
DROP POLICY IF EXISTS "Anyone reads resource tags" ON public.resource_tags;

CREATE POLICY "Read tags of visible resources"
ON public.resource_tags
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = resource_tags.resource_id
      AND (
        r.published_status = ANY (ARRAY['published','featured','approved'])
        OR r.verified_status = 'verified'
        OR r.created_by_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 2) Defense in depth: only admins may change promotion/visibility fields on resources.
CREATE OR REPLACE FUNCTION public.tg_resources_guard_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.published_status, 'draft') <> 'draft'
       OR COALESCE(NEW.verified_status, 'pending') <> 'pending'
       OR COALESCE(NEW.featured, false) IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'Only admins can set resource publication, verification, or featured state'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.published_status IS DISTINCT FROM OLD.published_status
     OR NEW.verified_status IS DISTINCT FROM OLD.verified_status
     OR NEW.featured IS DISTINCT FROM OLD.featured THEN
    RAISE EXCEPTION 'Only admins can change resource publication, verification, or featured state'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resources_guard_admin_fields ON public.resources;
CREATE TRIGGER resources_guard_admin_fields
BEFORE INSERT OR UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.tg_resources_guard_admin_fields();