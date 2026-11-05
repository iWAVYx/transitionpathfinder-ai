// Disposable loopback PostgreSQL only. One fresh test database per partition.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {documentPathPartitions,partitionId} from './document-path-test-partitions.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const plan=JSON.parse(readFileSync('tests/database/document-native-test-plan.json','utf8'));
const id=process.env.DOCUMENT_NATIVE_PARTITION;
const group=documentPathPartitions.find(([name])=>partitionId(name)===id);
const expected=plan.partitions.find(item=>item.id===id);
if(process.env.PATHWAY_HISTORY_POSTGRES!=='1'||!process.env.PATHWAY_HISTORY_PG_MODULE||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||!group||!expected)throw Error('Explicit disposable native partition required');
if(sha(readFileSync(plan.test_file))!==plan.test_sha256)throw Error('Test source changed; reconcile complete-case inventory');
const logPath=`/tmp/native-document-boundaries-${id}.log`;
const run=await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['--test',...group[1],plan.test_file],{env:process.env,stdio:['ignore','pipe','pipe']});let log='';
 const append=chunk=>{log+=chunk;if(Buffer.byteLength(log)>64*1024*1024){child.kill();reject(Error('Bounded native log exceeded'));return;}writeFileSync(logPath,log);process.stdout.write(chunk);};
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',append);child.stderr.on('data',append);
 child.on('error',reject);child.on('close',(status,signal)=>resolve({status,signal,log}));
});
const names=[...run.log.matchAll(/^# Subtest: (.*)$/gm)].map(m=>m[1]);
const count=key=>Number([...run.log.matchAll(new RegExp(`^# ${key} (\\d+)$`,'gm'))].at(-1)?.[1]??-1);
const result={schema:'document-native-partition-v1',partition:id,test_sha256:plan.test_sha256,source_commit:process.env.GITHUB_SHA,native:true,status:run.status,signal:run.signal,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),names,log_sha256:sha(run.log)};
writeFileSync(`/tmp/native-document-boundaries-${id}.json`,JSON.stringify(result,null,2)+'\n');
if(run.status!==0||run.signal||result.tests!==expected.tests||result.passed!==expected.tests||result.failed!==0||result.skipped!==0||names.some(n=>!group[2](n))||sha(JSON.stringify([...names].sort()))!==expected.names_sha256)throw Error('Incomplete or failing native partition; retained result is not acceptance');
