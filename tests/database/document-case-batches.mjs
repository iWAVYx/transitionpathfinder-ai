// Execute the unchanged test source in bounded fresh processes/databases.
// A duplicate label stays in one batch so Node never runs it twice.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
export const batchLimit=32;
export const namesDigest=names=>createHash('sha256').update(JSON.stringify([...names].sort())).digest('hex');
export function validateExecutionInventory(plan,inventory,testBytes){
 if(inventory.schema!=='document-case-execution-inventory-v1'||inventory.test_file!==plan.test_file||inventory.test_sha256!==plan.test_sha256||createHash('sha256').update(testBytes).digest('hex')!==plan.test_sha256||inventory.tests!==plan.tests||inventory.names_sha256!==plan.names_sha256||inventory.partitions.length!==plan.partitions.length)throw Error('Source-matched complete execution inventory required');
 const all=[],seen=new Set();
 for(const part of inventory.partitions){const expected=plan.partitions.find(p=>p.id===part.id);if(!expected||seen.has(part.id)||!Array.isArray(part.names)||part.names.some(n=>typeof n!=='string'||n.includes('\n'))||part.names.length!==expected.tests||namesDigest(part.names)!==expected.names_sha256)throw Error('Missing, duplicate or changed execution cases');seen.add(part.id);all.push(...part.names);}
 if(all.length!==plan.tests||namesDigest(all)!==plan.names_sha256)throw Error('Complete original case multiplicity required');
 return inventory;
}
export function caseBatches(names,limit=batchLimit){
 if(!Number.isSafeInteger(limit)||limit<1||limit>batchLimit||!names.length)throw Error('Bounded nonempty execution required');
 const counts=new Map();for(const name of names)counts.set(name,(counts.get(name)??0)+1);
 const batches=[];let batch=[];
 for(const[name,count]of [...counts].sort(([a],[b])=>a<b?-1:a>b?1:0)){if(count>limit)throw Error('A duplicate label cannot be split');if(batch.length+count>limit){batches.push(batch);batch=[];}batch.push(...Array(count).fill(name));}if(batch.length)batches.push(batch);
 return batches;
}
const literal=name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const casePattern=names=>'^(?:'+[...new Set(names)].map(name=>literal(name.replace(/\\#/g,'#'))).join('|')+')$';
export function checkBatch(log,expected,{allowSkips=false}={}){
 const names=[...log.matchAll(/^# Subtest: (.*)$/gm)].map(m=>m[1]);
 const count=key=>{const values=[...log.matchAll(new RegExp('^# '+key+' ([0-9]+)$','gm'))];if(values.length!==1)throw Error('Exactly one complete child result required');return Number(values[0][1]);};
 const result={tests:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped')};
 if(namesDigest(names)!==namesDigest(expected)||names.length!==expected.length||result.tests!==expected.length||result.fail!==0||result.pass+result.skipped!==result.tests||(!allowSkips&&result.skipped!==0))throw Error('Incomplete, skipped or changed batch coverage');
 return{...result,names};
}
export async function runCaseBatches({testFile,names,env=process.env,allowSkips=false,onChunk=()=>{},execute,limit=batchLimit}){
 const batches=caseBatches(names,limit),totals={tests:0,pass:0,fail:0,skipped:0},records=[];let bytes=0;
 for(let index=0;index<batches.length;index++){
  const expected=batches[index],pattern=casePattern(expected);onChunk('# Fresh document batch '+(index+1)+'/'+batches.length+'\n');
  const result=execute?await execute(pattern,index):await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['--test','--test-name-pattern='+pattern,testFile],{env,stdio:['ignore','pipe','pipe']});let log='';
   const append=chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>64*1024*1024){child.kill();reject(Error('Bounded partition log exceeded'));return;}log+=chunk;onChunk(chunk);};
   child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',append);child.stderr.on('data',append);child.on('error',reject);child.on('close',(status,signal)=>resolve({status,signal,log}));
  });
  if(result.status!==0||result.signal)throw Error('Failed or interrupted child; no complete acceptance');
  const checked=checkBatch(result.log,expected,{allowSkips});for(const key of Object.keys(totals))totals[key]+=checked[key];records.push({...checked,log_bytes:Buffer.byteLength(result.log),log_sha256:createHash('sha256').update(result.log).digest('hex')});
 }
 if(totals.tests!==names.length||(!allowSkips&&totals.skipped!==0))throw Error('Complete native coverage required');
 return{...totals,names:records.flatMap(r=>r.names),batches:records};
}
