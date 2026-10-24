// Reviewed batch generator only. Importing this module never connects to a database.
import { readFileSync } from 'node:fs';
export const linkedStudentMigrationVersion='20261024020000';
export const linkedStudentMigrationName='require_linked_student_report_save';
export const linkedStudentMigrationSource=readFileSync(`supabase/migrations/${linkedStudentMigrationVersion}_${linkedStudentMigrationName}.sql`,'utf8').replaceAll('\r\n','\n');
const prerequisite=readFileSync('supabase/migrations/20261023020000_enforce_pathway_report_content_history.sql','utf8').replaceAll('\r\n','\n');
const literal=(tag,text)=>{if(text.includes(`$${tag}$`))throw new Error('SQL delimiter collision');return `$${tag}$${text}$${tag}$`;};
const priorData=literal('linked_prior_data',prerequisite), canonicalData=literal('linked_canonical_data',linkedStudentMigrationSource);
const transactionBody=linkedStudentMigrationSource.replace(/^BEGIN;\n/m,'').replace(/\nCOMMIT;\s*$/,'\n');
// The full canonical file is stored as DATA; only its wrapper-free body is run.
// DDL, old grant retirement and the exact new ledger row commit or roll back together.
export const linkedStudentRolloutSql=`-- PREPARED ONLY: specific staging migration authorization required before use.
-- Target identity must first be independently confirmed as qgrertkqbwanerqqemph.
BEGIN;
DO $linked_ledger_preflight$
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${linkedStudentMigrationVersion}') THEN
  RAISE EXCEPTION 'Linked-student migration already recorded; stop for review.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version='20261023020000' AND name='enforce_pathway_report_content_history' AND statements=ARRAY[${priorData}]) THEN
  RAISE EXCEPTION 'Unexpected report-history prerequisite ledger; stop for review.';
 END IF;
END;
$linked_ledger_preflight$;
${transactionBody}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
 VALUES('${linkedStudentMigrationVersion}','${linkedStudentMigrationName}',ARRAY[${canonicalData}]);
DO $linked_ledger_verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version='${linkedStudentMigrationVersion}' AND name='${linkedStudentMigrationName}' AND statements=ARRAY[${canonicalData}]) THEN
  RAISE EXCEPTION 'Exact linked-student ledger record missing; stop for review.';
 END IF;
END;
$linked_ledger_verify$;
COMMIT;
`;
