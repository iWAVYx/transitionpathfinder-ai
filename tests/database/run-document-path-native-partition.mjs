// Disposable loopback PostgreSQL only; original cases, fresh DB per batch.
import{readFileSync,writeFileSync,appendFileSync}from'node:fs';import{createHash}from'node:crypto';
import{documentPathPartitions,partitionId}from'./document-path-test-partitions.mjs';
import{validateExecutionInventory,runCaseBatches,namesDigest}from'./document-case-batches.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),plan=JSON.parse(readFileSync('tests/database/document-native-test-plan.json')),inventoryBytes=readFileSync('tests/database/document-case-execution-inventory.json');
const inventory=validateExecutionInventory(plan,JSON.parse(inventoryBytes),readFileSync(plan.test_file));
const id=process.env.DOCUMENT_NATIVE_PARTITION,preflight=id==='preflight-boundaries',group=documentPathPartitions.find(([name])=>partitionId(name)===id),expected=plan.partitions.find(p=>p.id===id);
if(process.env.PATHWAY_HISTORY_POSTGRES!=='1'||!process.env.PATHWAY_HISTORY_PG_MODULE||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||(!preflight&&(!group||!expected)))throw Error('Explicit disposable native partition required');
const preflightMatch=/^(?:rescan service boundary|rescan auto release|registration auto|capacity bound Apply|capacity Apply no-save|capacity private admission|capacity legacy summary claim|capacity queue entry)/;
const names=preflight?inventory.partitions.flatMap(p=>p.names).filter(n=>preflightMatch.test(n)):inventory.partitions.find(p=>p.id===id).names;
if(!preflight&&names.some(n=>!group[2](n)))throw Error('Unexpected partition case');
const logPath='/tmp/native-document-boundaries-'+id+'.log';writeFileSync(logPath,'');
const append=chunk=>{appendFileSync(logPath,chunk);process.stdout.write(chunk);};
let run;try{run=await runCaseBatches({testFile:plan.test_file,names,onChunk:append});}catch(error){writeFileSync('/tmp/native-document-boundaries-'+id+'.json',JSON.stringify({schema:'document-native-partition-incomplete-v1',partition:id,test_sha256:plan.test_sha256,source_commit:process.env.GITHUB_SHA,native:true,status:1,complete:false,log_sha256:sha(readFileSync(logPath)),reason:'Batch execution did not finish; raw log retained'},null,2)+'\n');throw error;}
for(const key of['tests','pass','fail','skipped'])append('# '+key+' '+run[key]+'\n');
const log=readFileSync(logPath),result={schema:'document-native-partition-v1',partition:id,test_sha256:plan.test_sha256,source_commit:process.env.GITHUB_SHA,native:true,status:0,signal:null,tests:run.tests,passed:run.pass,failed:run.fail,skipped:run.skipped,names:run.names,log_sha256:sha(log),execution_inventory_sha256:sha(inventoryBytes),batches:run.batches};
writeFileSync('/tmp/native-document-boundaries-'+id+'.json',JSON.stringify(result,null,2)+'\n');
if(!preflight&&(result.tests!==expected.tests||namesDigest(run.names)!==expected.names_sha256))throw Error('Incomplete original partition; not acceptance');
