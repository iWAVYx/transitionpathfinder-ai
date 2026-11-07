// Prepared SQL strings only. Importing never connects or reads credentials.
import { readFileSync } from 'node:fs';
export const extractionMigrationVersion='20261029010000';
export const extractionMigrationName='apply_reviewed_document_extraction';
export const extractionMigrationSource=readFileSync(`supabase/migrations/${extractionMigrationVersion}_${extractionMigrationName}.sql`,'utf8').replaceAll('\r\n','\n');
export const extractionPrerequisites=['20261023030000_require_explicit_planning_report_access','20261024010000_remove_implicit_admin_student_access','20261026010000_save_extracted_report_evidence'].map(file=>({version:file.slice(0,14),name:file.slice(15),source:readFileSync(`supabase/migrations/${file}.sql`,'utf8').replaceAll('\r\n','\n')}));
const literal=(tag,value)=>{if(value.includes(`$${tag}$`))throw Error('SQL delimiter collision');return `$${tag}$${value}$${tag}$`;};
const body=extractionMigrationSource.replace(/^BEGIN;\n/m,'').replace(/\nCOMMIT;\s*$/,'\n');
export const extractionRolloutSql=`-- PREPARED ONLY; separate migration authorization and independent target confirmation required.
-- Isolated staging qgrertkqbwanerqqemph label is not proof of actual project identity.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
SELECT pg_advisory_xact_lock(824601,29);
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
DO $extraction_rollout$
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${extractionMigrationVersion}')
   OR to_regprocedure('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)') IS NOT NULL THEN
  RAISE EXCEPTION 'Atomic extraction migration or routine already exists; stop for reconciliation.' USING ERRCODE='55000';
 END IF;
 ${extractionPrerequisites.map((p,i)=>`IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${p.version}' AND name='${p.name}' AND statements=ARRAY[${literal('extraction_prior_'+i,p.source)}]) THEN RAISE EXCEPTION 'Unexpected exact prerequisite ledger; stop for review.' USING ERRCODE='55000'; END IF;`).join('\n ')}
END;
$extraction_rollout$;
${body}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
 VALUES('${extractionMigrationVersion}','${extractionMigrationName}',ARRAY[${literal('extraction_canonical',extractionMigrationSource)}]);
COMMIT;
`;
// CI fixture only: psql replay does not create a Supabase migration ledger.
// This synthetic four-row ledger is not evidence of any hosted installation.
export const extractionPreflightLedgerSql=`CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[]);
${[...extractionPrerequisites,{version:extractionMigrationVersion,name:extractionMigrationName,source:extractionMigrationSource}].map((p,i)=>`INSERT INTO supabase_migrations.schema_migrations VALUES('${p.version}','${p.name}',ARRAY[${literal('preflight_fixture_'+i,p.source)}]);`).join('\n')}
`;
