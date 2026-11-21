// Compose only with the exact previously verified SQL. A SQL change requires
// fresh complete-schema/native verification, never an edited baseline claim.
import fs from'node:fs';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const baseline='6efba7d8b941a8472a006c155b9e97a5fbbdb5e4';
const evidencePath='docs/production-readiness/evidence/document-owner-text-work-verified-2026-11-13.json';
const proof=JSON.parse(fs.readFileSync(evidencePath));assert.equal(proof.workflow,'success');assert.equal(proof.native_full_schema_verified,true);assert.equal(proof.canonical_migrations,225);assert.equal(proof.review_drafts,41);assert.equal(proof.total_native_cases,2405);assert.equal(proof.native_failed,0);assert.equal(proof.native_skipped,0);
const sha=b=>createHash('sha256').update(b).digest('hex');const git=(...args)=>execFileSync('git',args,{maxBuffer:20_000_000});
const directories=['supabase/migrations','docs/production-readiness/proposals'];const actual=directories.flatMap(dir=>fs.readdirSync(dir).filter(name=>name.endsWith('.sql')).map(name=>dir+'/'+name)).sort();
const expected=git('ls-tree','-r','--name-only',baseline,'--',...directories).toString().trim().split('\n').filter(path=>path.endsWith('.sql')).sort();assert.deepEqual(actual,expected,'SQL source inventory changed; full replay required');
const records=actual.map(path=>{const current=fs.readFileSync(path),prior=git('show',baseline+':'+path),verified=git('show',proof.checkout_commit+':'+path);assert.ok(current.equals(prior)&&prior.equals(verified),path+' differs from verified SQL; full replay required');return{path,sha256:sha(current)};});
const core='tests/database/document-path-exclusivity.test.mjs';assert.ok(fs.readFileSync(core).equals(git('show',proof.checkout_commit+':'+core)),'Original native test source changed');
const result={schema:'owner-apply-recovery-unchanged-sql-v1',baseline_commit:baseline,verified_sql_commit:proof.checkout_commit,prior_evidence:evidencePath,prior_evidence_sha256:sha(fs.readFileSync(evidencePath)),canonical_count:225,review_drafts:41,retained_native_sql_cases:2405,all_sql_files_unchanged:true,original_native_test_source_unchanged:true,sql_sources:records,hosted_actions:false,ready_for_cutover:false};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({validated:true,canonical:225,drafts:41,sql_files:records.length,prior_native:2405,new_schema_verification_claimed:false}));
