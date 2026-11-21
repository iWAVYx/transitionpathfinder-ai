// Dedicated fake-credential CI service only. Run AFTER the unchanged56-stage
// full225+41+admin-retirement installer, never against a hosted target.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENT_PARENT_SCHEMA_SERVICE!=='1'||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||process.env.PGDATABASE!=='postgres'||process.env.PGUSER!=='postgres'||process.env.PGPASSWORD!=='postgres'||!process.env.DOCUMENT_PARENT_PG_MODULE?.startsWith('/'))throw Error('Dedicated credential-free disposable schema service required');
const directory=process.argv[2];if(!directory)throw Error('Result directory required');mkdirSync(directory,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const prior=JSON.parse(readFileSync('/tmp/document-grant-full-chain/full-chain.json'));
assert.equal(prior.native_full_chain_installed,true);assert.equal(prior.canonical_count,225);assert.equal(prior.prior_review_drafts,41);assert.equal(prior.separate_review_drafts,1);assert.equal(prior.executed_stages.length,56);assert.equal(prior.prior_regression_cases_rerun_claimed,false);
const pg=await import(pathToFileURL(process.env.DOCUMENT_PARENT_PG_MODULE).href),Client=(pg.default??pg).Client,db=new Client({host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,password:process.env.PGPASSWORD,database:'postgres',statement_timeout:30000});
const procedureSql="SELECT oid::text,proname,proowner::text,proacl::text,proconfig,prosecdef,provolatile,prolang::text,md5(prosrc) AS body FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY oid";
const policySql="SELECT oid::text,polrelid::text,polname,polroles,polpermissive,polcmd,polqual::text,polwithcheck::text FROM pg_policy ORDER BY oid";
const tableSql="SELECT oid::text,relname,relowner::text,relacl::text,relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('public.documents'::regclass,'public.document_permissions'::regclass,'storage.objects'::regclass) ORDER BY oid";
const dataSql="SELECT (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM public.documents t) AS documents,(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM public.document_permissions t) AS permissions";
try{
 await db.connect();const before={procedures:(await db.query(procedureSql)).rows,policies:(await db.query(policySql)).rows,tables:(await db.query(tableSql)).rows,data:(await db.query(dataSql)).rows};
 const draft='docs/database-proposals/document-permission-parent/bind-document-permission-parent.review.sql';await db.query(readFileSync(draft,'utf8'));
 const after={procedures:(await db.query(procedureSql)).rows,policies:(await db.query(policySql)).rows,tables:(await db.query(tableSql)).rows,data:(await db.query(dataSql)).rows};
 assert.deepEqual(after.policies,before.policies);assert.deepEqual(after.tables,before.tables);assert.deepEqual(after.data,before.data);
 const original=before.procedures.find(row=>row.proname==='can_view_document');assert.equal(original.body,'c983d959c1fae6d3b0311e0e059bdca2');
 const expected=before.procedures.map(row=>row.oid===original.oid?{...row,body:'8aa18840923b32808d48f36d7a141657'}:row);
 assert.deepEqual(after.procedures.filter(row=>row.proname!=='enforce_document_permission_parent'),expected);
 const helper=after.procedures.filter(row=>row.proname==='enforce_document_permission_parent');assert.equal(helper.length,1);assert.equal(helper[0].prosecdef,false);assert.deepEqual(helper[0].proconfig,['search_path=pg_catalog']);
 const grants=(await db.query("SELECT has_function_privilege('anon','public.enforce_document_permission_parent()','EXECUTE') AS anon,has_function_privilege('authenticated','public.enforce_document_permission_parent()','EXECUTE') AS authenticated,has_function_privilege('service_role','public.enforce_document_permission_parent()','EXECUTE') AS service_role")).rows[0];assert.deepEqual(grants,{anon:false,authenticated:false,service_role:false});
 const trigger=(await db.query("SELECT tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='public.document_permissions'::regclass AND tgname='enforce_document_permission_parent' AND NOT tgisinternal")).rows;assert.equal(trigger.length,1);assert.equal(trigger[0].tgenabled,'O');assert.match(trigger[0].definition,/BEFORE INSERT OR UPDATE/);
 const files=[draft,'tests/database/document-permission-parent.test.mjs','tests/database/run-document-permission-parent-schema.mjs','.github/workflows/document-permission-parent-review.yml'];
 writeFileSync(directory+'/full-chain.json',JSON.stringify({schema:'document-permission-parent-full-schema-v1',source_commit:process.env.GITHUB_SHA,canonical_count:225,prior_review_drafts:41,separate_review_drafts:2,prior_schema_stages:56,native_full_chain_installed:true,unrelated_procedures_preserved:true,all_policies_preserved:true,table_permissions_preserved:true,document_and_permission_rows_preserved:true,view_helper_metadata_preserved:true,new_guard_invoker_and_private:true,prior_regression_cases_rerun_claimed:false,before_catalog_sha256:sha(JSON.stringify(before)),after_catalog_sha256:sha(JSON.stringify(after)),prior_schema_proof_sha256:sha(readFileSync('/tmp/document-grant-full-chain/full-chain.json')),source_manifest:files.map(path=>({path,sha256:sha(readFileSync(path))})),hosted_applied:false,ready_for_cutover:false},null,2)+'\n');console.log('Complete225+41+two separate review drafts installed; exact catalog/data boundaries pass.');
}finally{await db.end();}
