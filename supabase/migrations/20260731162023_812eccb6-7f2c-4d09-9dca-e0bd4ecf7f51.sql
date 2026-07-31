-- 1) Defense in depth: remove blanket `anon` privileges from every public table
--    whose RLS policies never target the anon/public role. RLS already denied
--    these reads; this makes a future policy mistake non-exploitable by the
--    publishable key that ships in the browser bundle.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    WITH pol AS (
      SELECT polrelid,
             bool_or(0 = ANY(polroles) OR 'anon'::regrole = ANY(polroles)) AS anon_reachable
      FROM pg_policy GROUP BY polrelid
    )
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pol p ON p.polrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT COALESCE(p.anon_reachable, false)
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- 2) Index every foreign-key column that has no leading index. Missing FK
--    indexes make student/org-scoped joins and cascading deletes scan.
DO $$
DECLARE r record; idx text;
BEGIN
  FOR r IN
    SELECT DISTINCT c.relname AS tbl, a.attname AS col
    FROM pg_constraint ct
    JOIN pg_class c ON c.oid = ct.conrelid
    JOIN LATERAL unnest(ct.conkey) k(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = ct.conrelid AND a.attnum = k.attnum
    WHERE ct.contype = 'f'
      AND ct.connamespace = 'public'::regnamespace
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = ct.conrelid AND (i.indkey::int2[])[0] = a.attnum
      )
  LOOP
    idx := left('idx_' || r.tbl || '_' || r.col, 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', idx, r.tbl, r.col);
  END LOOP;
END $$;