CREATE OR REPLACE FUNCTION public.debug_try_insert_student()
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.students(owner_id, first_name) VALUES (auth.uid(), 'DiagInsert') RETURNING id INTO new_id;
  DELETE FROM public.students WHERE id = new_id;
  RETURN 'OK uid=' || auth.uid()::text;
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERR ' || SQLSTATE || ' uid=' || COALESCE(auth.uid()::text,'NULL') || ' msg=' || SQLERRM;
END $$;
GRANT EXECUTE ON FUNCTION public.debug_try_insert_student() TO authenticated;