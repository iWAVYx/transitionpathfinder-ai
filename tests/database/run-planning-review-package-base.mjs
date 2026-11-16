// Reuse every existing bootstrap/install/catalog stage verbatim. Earlier
// unchanged regression suites stay in their original workflow and are not
// represented here as rerun. This job is a fresh schema integration proof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import{catalog,assertDisposable}from'./planning-review-package-catalog.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const WORKFLOW='f4fb30fb9ed25ab3e63213edee428dff8d9898bf951da0609736f75651659423';
export function schemaStages(source){
 if(sha(source)!==WORKFLOW)throw Error('Reviewed schema workflow changed; re-review every stage.');
 const first=source.indexOf('      - name: Bootstrap Supabase-like roles and schemas'),last=source.indexOf('      - name: Upload replay log',first);if(first<0||last<first)throw Error('Complete schema stage boundaries required');
 const blocks=source.slice(first,last).split(/^      - name: /m).slice(1);if(blocks.length!==56)throw Error('Every56 bootstrap/install/catalog stage is required');
 return blocks.map(block=>{const name=block.split('\n')[0],match=/^        run: (.*)\n/m.exec(block);if(!match)throw Error('Missing run stage');const prefix=block.slice(name.length+1,match.index).trim();let env={};if(prefix){if(prefix!=='env:\n          DOCUMENT_RLS_POLICY_ONLY: "1"')throw Error('Unreviewed stage configuration');env={DOCUMENT_RLS_POLICY_ONLY:'1'};}
 const tail=block.slice(match.index+match[0].length);let run;if(match[1]==='|'||match[1]==='>-'){const lines=tail.trimEnd().split('\n');if(lines.some(line=>line.trim()&&!line.startsWith('          ')))throw Error('Unreviewed run indentation');run=lines.map(line=>line.slice(10)).join(match[1]==='|'?'\n':' ');}else{if(tail.trim())throw Error('Unreviewed inline run');run=match[1];}if(run.includes('${{'))throw Error('Unresolved workflow expression');return{name,env,run,sha256:sha(run)};});
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
 assertDisposable();
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENT_GRANT_SCHEMA_SERVICE!=='1'||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||process.env.PGDATABASE!=='postgres'||process.env.PGUSER!=='postgres'||process.env.PGPASSWORD!=='postgres')throw Error('Dedicated credential-free disposable schema service required');
 const snapshotDirectory='/tmp/planning-review-package';mkdirSync(snapshotDirectory,{recursive:true});
 const directory=process.argv[2];if(!directory)throw Error('Result directory required');mkdirSync(directory,{recursive:true});const source=readFileSync('.github/workflows/migration-replay.yml','utf8'),stages=schemaStages(source),records=[];
 for(const[index,stage]of stages.entries()){if(index===55)writeFileSync(snapshotDirectory+'/before.json',JSON.stringify(await catalog(),null,2)+'\n');const script=directory+'/'+String(index+1).padStart(2,'0')+'.sh';writeFileSync(script,stage.run+'\n');const result=spawnSync('bash',['--noprofile','--norc','-e','-o','pipefail',script],{env:{...process.env,...stage.env},encoding:'utf8',timeout:180000,maxBuffer:40e6});const log=String(result.stdout??'')+String(result.stderr??'');writeFileSync(directory+'/'+String(index+1).padStart(2,'0')+'.log',log);if(result.status!==0||result.signal)throw Error('Schema stage failed: '+stage.name+'; inspect retained log');records.push({name:stage.name,script_sha256:stage.sha256,log_sha256:sha(log),passed:true});console.log('Passed '+(index+1)+'/'+stages.length+': '+stage.name);}
 const proof=JSON.parse(readFileSync('/tmp/document-grant-retirement-full-chain.json'));if(proof.native_full_chain_installed!==true||proof.reviewed_storage_predicate_updated!==true||proof.canonical_count!==225||proof.prior_review_drafts!==41||proof.separate_review_drafts!==1||proof.hosted_applied!==false||proof.ready_for_cutover!==false)throw Error('Complete schema proof required');proof.execution_mode='fresh-disposable-schema-install-and-catalog';proof.prior_regression_cases_rerun_claimed=false;proof.executed_stages=records;proof.workflow_sha256=sha(source);proof.reference_runner_sha256=sha(readFileSync('tests/database/run-document-grant-full-schema.mjs'));proof.runner_sha256=sha(readFileSync('tests/database/run-planning-review-package-base.mjs'));proof.read_only_catalog_snapshot_before_stage56=true;writeFileSync(directory+'/full-chain.json',JSON.stringify(proof,null,2));
}
