// Prepared batch generator only. Importing never connects to a database.
import { readFileSync } from 'node:fs';
export const evidenceMigrationVersion='20261026010000';
export const evidenceMigrationName='save_extracted_report_evidence';
export const evidenceMigrationSource=readFileSync(`supabase/migrations/${evidenceMigrationVersion}_${evidenceMigrationName}.sql`,'utf8').replaceAll('\r\n','\n');
const prior=readFileSync('supabase/migrations/20261024010000_remove_implicit_admin_student_access.sql','utf8').replaceAll('\r\n','\n');
const literal=(tag,value)=>{if(value.includes(`$${tag}$`))throw Error('SQL delimiter collision');return `$${tag}$${value}$${tag}$`;};
const body=evidenceMigrationSource.replace(/^BEGIN;\n/m,'').replace(/\nCOMMIT;\s*$/,'\n');
export const evidenceRolloutSql=`-- PREPARED ONLY. Fresh migration authorization and independent target confirmation required.
-- Isolated staging qgrertkqbwanerqqemph only; the label is not proof of target identity.
BEGIN;
DO $evidence_preflight$
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${evidenceMigrationVersion}') THEN
  RAISE EXCEPTION 'Evidence migration already recorded; stop for review.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261024010000' AND name='remove_implicit_admin_student_access' AND statements=ARRAY[${literal('evidence_prior',prior)}]) THEN
  RAISE EXCEPTION 'Unexpected explicit-access prerequisite ledger; stop for review.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.report_evidence_links_dedupe_idx') AND indrelid='public.report_evidence_links'::regclass AND indisunique AND indisvalid AND indexprs IS NOT NULL AND indpred IS NOT NULL) THEN
  RAISE EXCEPTION 'Expected evidence expression index is unavailable; stop for review.';
 END IF;
END;
$evidence_preflight$;
${body}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
 VALUES('${evidenceMigrationVersion}','${evidenceMigrationName}',ARRAY[${literal('evidence_canonical',evidenceMigrationSource)}]);
COMMIT;
`;
