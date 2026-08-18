-- READ-ONLY PRODUCTION AUDIT.
-- Run only in the Lovable Cloud production project's SQL editor after visually
-- confirming project ref lrqcntqyekucamifpffs. Export the ordered result as
-- CSV or JSON. The query returns hashes and metadata, never migration SQL.
select
  version::text as version,
  name,
  cardinality(statements) as statement_count,
  md5(array_to_string(statements, '')) as statements_md5,
  md5(
    regexp_replace(
      regexp_replace(array_to_string(statements, ''), '--[^\n\r]*', '', 'g'),
      '\s+',
      '',
      'g'
    )
  ) as code_md5
from supabase_migrations.schema_migrations
order by version;
