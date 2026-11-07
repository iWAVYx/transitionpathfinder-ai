// Synthetic harness data only; these are not native database acceptance records.
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {validateNativeResults} from './database/document-native-result-validation.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');const digest=names=>sha(JSON.stringify([...names].sort()));
const commit='a'.repeat(40),source='b'.repeat(64);
function fixture(){const groups=[['first',['Synthetic duplicate','Synthetic duplicate']],['second',['Synthetic remaining case']]];
 const inputs=groups.map(([partition,names])=>{const log=Buffer.from('Synthetic harness log: '+partition);return{log,record:{schema:'document-native-partition-v1',partition,native:true,test_sha256:source,source_commit:commit,status:0,signal:null,tests:names.length,passed:names.length,failed:0,skipped:0,names,log_sha256:sha(log)}};});
 const plan={test_sha256:source,tests:3,names_sha256:digest(groups.flatMap(g=>g[1])),partitions:groups.map(([id,names])=>({id,tests:names.length,names_sha256:digest(names)}))};return{plan,inputs};}
test('native aggregate accepts every synthetic case including original label multiplicity',()=>{const f=fixture();const r=validateNativeResults(f.plan,f.inputs,commit);assert.equal(r.tests,3);assert.equal(r.skipped,0);assert.equal(r.ready_for_cutover,false);});
for(const fault of ['missing','duplicate','skipped','failed','source','case','log','exit'])test('native aggregate rejects '+fault+' evidence',()=>{const f=fixture();
 if(fault==='missing')f.inputs.pop();if(fault==='duplicate')f.inputs[1]=f.inputs[0];if(fault==='skipped')f.inputs[0].record.skipped=1;if(fault==='failed')f.inputs[0].record.failed=1;if(fault==='source')f.inputs[0].record.source_commit='c'.repeat(40);if(fault==='case')f.inputs[0].record.names[0]='Synthetic replaced case';if(fault==='log')f.inputs[0].log=Buffer.from('Synthetic altered log');if(fault==='exit')f.inputs[0].record.status=1;
 assert.throws(()=>validateNativeResults(f.plan,f.inputs,commit));});
