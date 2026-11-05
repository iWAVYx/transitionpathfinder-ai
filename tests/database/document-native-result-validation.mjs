import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
export function validateNativeResults(plan,inputs,sourceCommit){
 if(!/^[a-f0-9]{40}$/.test(sourceCommit??'')||inputs.length!==plan.partitions.length)throw Error('Every source-matched native partition is required');
 const names=[],seen=new Set(),partitions=[];
 for(const {record:r,log} of inputs){const p=plan.partitions.find(p=>p.id===r.partition);if(!p||seen.has(r.partition))throw Error('Unknown or duplicate native partition');seen.add(r.partition);
  if(r.schema!=='document-native-partition-v1'||r.native!==true||r.test_sha256!==plan.test_sha256||r.source_commit!==sourceCommit||r.status!==0||r.signal!==null||r.tests!==p.tests||r.passed!==p.tests||r.failed!==0||r.skipped!==0||!Array.isArray(r.names)||r.names.length!==p.tests||sha(JSON.stringify([...r.names].sort()))!==p.names_sha256)throw Error('Incomplete native coverage or mismatched source');
  if(sha(log)!==r.log_sha256)throw Error('Native log differs from result');
  names.push(...r.names);partitions.push({partition:r.partition,tests:r.tests,log_sha256:r.log_sha256});
 }
 if(names.length!==plan.tests||sha(JSON.stringify([...names].sort()))!==plan.names_sha256)throw Error('Missing, duplicate or changed native cases');
 return {schema:'document-native-complete-proof-v1',source_commit:sourceCommit,test_sha256:plan.test_sha256,tests:plan.tests,passed:plan.tests,failed:0,skipped:0,partitions,scope:'All cases and assertions retained; fresh disposable database per exhaustive partition; cross-session races remain within their original tests.',hosted_actions:false,ready_for_cutover:false};
}
