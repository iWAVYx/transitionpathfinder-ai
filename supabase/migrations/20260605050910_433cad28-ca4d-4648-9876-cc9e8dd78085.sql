
CREATE OR REPLACE FUNCTION public.diag_insert_student(_owner uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE rid uuid; uid uuid := auth.uid();
BEGIN
  INSERT INTO public.students(owner_id, first_name) VALUES (_owner, 'Diag') RETURNING id INTO rid;
  RETURN jsonb_build_object('ok', true, 'uid', uid, 'owner', _owner, 'match', uid = _owner, 'id', rid);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'uid', uid, 'owner', _owner, 'match', uid = _owner, 'err', SQLERRM, 'state', SQLSTATE);
END;
$$;
GRANT EXECUTE ON FUNCTION public.diag_insert_student(uuid) TO authenticated;
