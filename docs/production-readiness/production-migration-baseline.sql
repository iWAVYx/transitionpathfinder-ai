-- READ-ONLY PRODUCTION AUDIT.
-- Run only in the Lovable Cloud production project's SQL editor after visually
-- confirming project ref lrqcntqyekucamifpffs. Export the ordered result as
-- JSON or CSV. Do not add credentials or application data to the export.
select version::text as version
from supabase_migrations.schema_migrations
order by version;
