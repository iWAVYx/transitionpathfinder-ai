import { readFileSync } from "node:fs";
export const historyMigrationSource = readFileSync("supabase/migrations/20261012190000_atomic_pathway_report_content.sql", "utf8").replaceAll("\r\n", "\n");
export const wrapperFreeHistorySource = historyMigrationSource.replace("BEGIN;\n", "").replace(/\nCOMMIT;\s*$/, "\n");
const body = historyMigrationSource.match(/AS \$function\$([\s\S]*?)\$function\$;/)?.[1];
if (!body) throw new Error("Reviewed history function body not found.");
const literal = (tag, value) => {
  if (value.includes(`$${tag}$`)) throw new Error("SQL literal delimiter collision.");
  return `$${tag}$${value}$${tag}$`;
};

// This statement updates ledger DATA only. The embedded canonical text is never
// executed. No function, grant or table-policy DDL is run by this correction.
export const historyLedgerReconciliationSql = `DO $history_ledger_reconcile$
DECLARE
 canonical_source text := ${literal("history_canonical_data", historyMigrationSource)};
 prior_source text := ${literal("history_prior_data", wrapperFreeHistorySource)};
 expected_body text := ${literal("history_body_data", body)};
 ledger record;
 installed record;
BEGIN
 SELECT version, name, statements INTO ledger
 FROM supabase_migrations.schema_migrations
 WHERE version='20261012190000' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Expected staging history ledger entry is missing.'; END IF;
 IF ledger.name IS DISTINCT FROM 'atomic_pathway_report_content'
    OR (ledger.statements IS DISTINCT FROM ARRAY[prior_source] AND ledger.statements IS DISTINCT FROM ARRAY[canonical_source]) THEN
  RAISE EXCEPTION 'Unexpected history ledger representation; stop for review.';
 END IF;
 SELECT oid, prosrc, prosecdef, proconfig, proacl, proowner INTO installed
 FROM pg_proc WHERE oid=to_regprocedure('public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)');
 IF NOT FOUND THEN RAISE EXCEPTION 'Expected history function is missing.'; END IF;
 IF installed.prosrc IS DISTINCT FROM expected_body OR installed.prosecdef
    OR installed.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']
    OR NOT has_function_privilege('authenticated',installed.oid,'EXECUTE')
    OR has_function_privilege('anon',installed.oid,'EXECUTE')
    OR has_function_privilege('service_role',installed.oid,'EXECUTE')
    OR EXISTS(SELECT 1 FROM aclexplode(COALESCE(installed.proacl,acldefault('f',installed.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') THEN
  RAISE EXCEPTION 'Installed history function differs from reviewed source or grants.';
 END IF;
 IF ledger.statements IS DISTINCT FROM ARRAY[canonical_source] THEN
  UPDATE supabase_migrations.schema_migrations SET statements=ARRAY[canonical_source]
  WHERE version='20261012190000' AND name='atomic_pathway_report_content' AND statements=ARRAY[prior_source];
  IF NOT FOUND THEN RAISE EXCEPTION 'History ledger changed during reconciliation.'; END IF;
 END IF;
END;
$history_ledger_reconcile$;
`;
