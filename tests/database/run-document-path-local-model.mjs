// Keep every original assertion; fresh bounded WASM process per batch.
import{readFileSync}from'node:fs';import{documentPathPartitions,partitionId}from'./document-path-test-partitions.mjs';
import{validateExecutionInventory,runCaseBatches}from'./document-case-batches.mjs';
if(process.env.PATHWAY_HISTORY_POSTGRES==='1'||!process.env.PATHWAY_HISTORY_PGLITE_MODULE)throw Error('Credential-free local model required');
const plan=JSON.parse(readFileSync('tests/database/document-native-test-plan.json')),inventory=validateExecutionInventory(plan,JSON.parse(readFileSync('tests/database/document-case-execution-inventory.json')),readFileSync(plan.test_file));
const totals={tests:0,pass:0,fail:0,skipped:0};
for(const[name,,belongs]of documentPathPartitions){const names=inventory.partitions.find(p=>p.id===partitionId(name)).names;if(names.some(n=>!belongs(n)))throw Error('Unexpected local-model case');process.stdout.write('# Fresh local-model partition: '+name+'\n');const run=await runCaseBatches({testFile:plan.test_file,names,allowSkips:true,onChunk:chunk=>process.stdout.write(chunk)});for(const key of Object.keys(totals))totals[key]+=run[key];}
if(totals.tests!==plan.tests||totals.tests!==totals.pass+totals.fail+totals.skipped)throw Error('Incomplete local-model coverage');
for(const[key,count]of Object.entries(totals))process.stdout.write('# local_model_'+key+' '+count+'\n');
