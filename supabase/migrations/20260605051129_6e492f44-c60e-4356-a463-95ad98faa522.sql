
CREATE OR REPLACE FUNCTION public.diag_insert_student(_owner uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE rid uuid; uid uuid := auth.uid();
        cu text := current_user; su text := session_user;
        rs text := current_setting('role', true);
        jwt text := current_setting('request.jwt.claims', true);
BEGIN
  INSERT INTO public.students(owner_id, first_name) VALUES (_owner, 'Diag2') RETURNING id INTO rid;
  RETURN jsonb_build_object('ok', true, 'id', rid, 'cu', cu, 'su', su, 'rs', rs, 'uid', uid, 'jwt_preview', left(jwt,80));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'err', SQLERRM, 'state', SQLSTATE, 'cu', cu, 'su', su, 'rs', rs, 'uid', uid, 'jwt_preview', left(jwt,80));
END;
$$;
