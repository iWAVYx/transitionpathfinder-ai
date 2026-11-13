import {createHash} from 'node:crypto';
import {checkBatch,namesDigest} from './document-case-batches.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
export function validateNativeResults(plan,inputs,sourceCommit){
 if(!/^[a-f0-9]{40}$/.test(sourceCommit??'')||inputs.length!==plan.partitions.length)throw Error('Every source-matched native partition is required');
 const names=[],seen=new Set(),partitions=[];
 for(const {record:r,log} of inputs){const p=plan.partitions.find(p=>p.id===r.partition);if(!p||seen.has(r.partition))throw Error('Unknown or duplicate native partition');seen.add(r.partition);
  if(r.schema!=='document-native-partition-v1'||r.native!==true||r.test_sha256!==plan.test_sha256||r.source_commit!==sourceCommit||r.status!==0||r.signal!==null||r.tests!==p.tests||r.passed!==p.tests||r.failed!==0||r.skipped!==0||!Array.isArray(r.names)||r.names.length!==p.tests||sha(JSON.stringify([...r.names].sort()))!==p.names_sha256)throw Error('Incomplete native coverage or mismatched source');
  if(sha(log)!==r.log_sha256)throw Error('Native log differs from result');
  const observed=[...log.toString().matchAll(/^# Subtest: (.*)$/gm)].map(m=>m[1]);
  if(observed.length!==r.tests||namesDigest(observed)!==namesDigest(r.names))throw Error('Raw native case inventory differs from record');
  if(r.batches){
   if(!Array.isArray(r.batches)||!r.batches.length)throw Error('Complete bounded batch proof required');let offset=0;const batched=[];
   for(let i=0;i<r.batches.length;i++){
    const b=r.batches[i],header=Buffer.from('# Fresh document batch '+(i+1)+'/'+r.batches.length+'\n');
    if(!Number.isSafeInteger(b.log_bytes)||b.log_bytes<1||!log.subarray(offset,offset+header.length).equals(header))throw Error('Missing native batch boundary');offset+=header.length;
    const raw=log.subarray(offset,offset+b.log_bytes);offset+=b.log_bytes;if(raw.length!==b.log_bytes||sha(raw)!==b.log_sha256)throw Error('Native batch raw log mismatch');
    const checked=checkBatch(raw.toString(),b.names);for(const key of['tests','pass','fail','skipped'])if(checked[key]!==b[key])throw Error('Native batch counters differ from raw result');batched.push(...checked.names);
   }
   const summary=Buffer.from('# tests '+r.tests+'\n# pass '+r.passed+'\n# fail 0\n# skipped 0\n');
   if(!log.subarray(offset).equals(summary)||namesDigest(batched)!==p.names_sha256)throw Error('Incomplete final native batch summary');
  }else checkBatch(log.toString(),r.names);
  names.push(...r.names);partitions.push({partition:r.partition,tests:r.tests,log_sha256:r.log_sha256});
 }
 if(names.length!==plan.tests||sha(JSON.stringify([...names].sort()))!==plan.names_sha256)throw Error('Missing, duplicate or changed native cases');
 return {schema:'document-native-complete-proof-v1',source_commit:sourceCommit,test_sha256:plan.test_sha256,tests:plan.tests,passed:plan.tests,failed:0,skipped:0,partitions,scope:'All original cases and assertions retained; exact raw coverage validated per partition and bounded fresh batch when present; competing sessions remain inside their original test.',hosted_actions:false,ready_for_cutover:false};
}
