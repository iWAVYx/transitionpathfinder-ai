// Reviewed SQL generator only: imports never connect to a database.
import {readFileSync} from 'node:fs';
export const shareLifecycleVersion='20261024030000';
export const shareLifecycleName='enforce_report_share_lifecycle';
export const shareLifecycleSource=readFileSync(`supabase/migrations/${shareLifecycleVersion}_${shareLifecycleName}.sql`,'utf8').replaceAll('\r\n','\n');
export const shareLifecyclePriorSource=readFileSync('supabase/migrations/20261024020000_require_linked_student_report_save.sql','utf8').replaceAll('\r\n','\n');
const literal=(tag,value)=>{if(value.includes(`$${tag}$`))throw new Error('SQL delimiter collision');return `$${tag}$${value}$${tag}$`;};
const prior=literal('share_prior_data',shareLifecyclePriorSource),canonical=literal('share_canonical_data',shareLifecycleSource);
const body=shareLifecycleSource.replace(/^BEGIN;\n/m,'').replace(/\nCOMMIT;\s*$/,'\n');
export const shareLifecycleRolloutSql=`-- PREPARED ONLY; separate staging migration authorization required.
-- Independently verify target qgrertkqbwanerqqemph before using this batch.
-- Existing unbound links are retired; access loss permanently closes new links.
BEGIN;
DO $share_ledger_preflight$
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${shareLifecycleVersion}') THEN RAISE EXCEPTION 'Sharing lifecycle migration already recorded; stop for review.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261024020000' AND name='require_linked_student_report_save' AND statements=ARRAY[${prior}]) THEN RAISE EXCEPTION 'Unexpected linked-student prerequisite ledger; stop for review.'; END IF;
END;
$share_ledger_preflight$;
${body}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES('${shareLifecycleVersion}','${shareLifecycleName}',ARRAY[${canonical}]);
DO $share_ledger_verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${shareLifecycleVersion}' AND name='${shareLifecycleName}' AND statements=ARRAY[${canonical}]) THEN RAISE EXCEPTION 'Exact sharing lifecycle ledger missing'; END IF;
END;
$share_ledger_verify$;
COMMIT;
`;
