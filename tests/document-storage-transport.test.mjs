// Exercise the installed SDK against intercepted HTTP responses only.
// This proves transport/result semantics, never hosted Storage or byte atomicity.
import test, { before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageClient } from '@supabase/storage-js';
const base='https://storage-contract.invalid/storage/v1';
const bucket='student-documents';
const path='00000000-0000-4000-8000-000000000010/00000000-0000-4000-8000-000000000301-privacy-safe-document.txt';
const fullPath=bucket+'/'+path;
const objectId='00000000-0000-4000-8000-000000000501';
let originalFetch;
let fixtures;
beforeEach(()=>{fixtures=[];});
afterEach(()=>{
  // Outside SDK error handling: swallowed fetch assertions cannot pass an
  // error-expected test or conceal a wrong endpoint, method or extra request.
  for(const f of fixtures){assert.equal(f.requests.length,1);for(const r of f.requests){assert.equal(r.url,f.url);assert.equal(r.method,f.method);}}
});
before(()=>{originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unintercepted network is forbidden in the Storage contract');};});
after(()=>{globalThis.fetch=originalFetch;});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function fixture(method,endpoint,respond){
  const requests=[];
  fixtures.push({requests,method,url:base+endpoint});
  const client=new StorageClient(base,{},async(input,init)=>{
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    const request={url,method:init?.method??'GET',headers:new Headers(init?.headers),body:init?.body};
    requests.push(request);
    assert.equal(url,base+endpoint);assert.equal(request.method,method);
    return respond(request);
  }).from(bucket);
  return {client,requests};
}
function upload(client){return client.upload(path,new Blob(['Fictional reviewed text'],{type:'text/plain'}),{contentType:'text/plain',upsert:false});}
test('actual SDK sends the exact reserved upload with upsert disabled and no replacement request',async()=>{
  const {client,requests}=fixture('POST','/object/'+fullPath,()=>json({Id:objectId,Key:fullPath}));
  const result=await upload(client);assert.equal(result.error,null);assert.deepEqual(result.data,{id:objectId,path,fullPath});
  assert.equal(requests.length,1);assert.equal(requests[0].headers.get('x-upsert'),'false');assert.ok(requests[0].body instanceof FormData);
  assert.equal(await requests[0].body.get('').text(),'Fictional reviewed text');
});
for(const response of [{},{Id:objectId},{Id:'foreign-id',Key:'other-bucket/foreign-path'}])test('successful upload HTTP status does not validate exact managed identity '+JSON.stringify(response),async()=>{
  const {client,requests}=fixture('POST','/object/'+fullPath,()=>json(response));const result=await upload(client);
  assert.equal(result.error,null);assert.equal(result.data.id,response.Id);assert.equal(result.data.fullPath,response.Key);assert.equal(requests.length,1);
});
for(const status of [403,409,500])test('upload HTTP '+status+' is not silently retried or turned into cleanup',async()=>{
  const {client,requests}=fixture('POST','/object/'+fullPath,()=>json({message:'Fictional upload failure',statusCode:String(status)},status));
  const result=await upload(client);assert.ok(result.error);assert.equal(result.data,null);assert.equal(requests.length,1);
});
test('an interrupted response can leave a modeled upload present while the SDK reports an error',async()=>{
  let modeledObjectPresent=false;const {client,requests}=fixture('POST','/object/'+fullPath,()=>{modeledObjectPresent=true;throw new TypeError('Fictional response lost after modeled write');});
  const result=await upload(client);assert.ok(result.error);assert.equal(result.data,null);assert.equal(modeledObjectPresent,true);assert.equal(requests.length,1);
});
for(const status of [400,404])test('exists false for HTTP '+status+' retains an error and is not an absence receipt',async()=>{
  const {client,requests}=fixture('HEAD','/object/'+fullPath,()=>new Response(null,{status}));
  const result=await client.exists(path);assert.equal(result.data,false);assert.ok(result.error);assert.equal(result.error.status,status);assert.equal(requests.length,1);
});
for(const status of [403,500])test('exists HTTP '+status+' throws rather than establishing absence',async()=>{
  const {client,requests}=fixture('HEAD','/object/'+fullPath,()=>new Response(null,{status}));
  await assert.rejects(client.exists(path),error=>error.status===status);assert.equal(requests.length,1);
});
test('metadata response success accepts unverified server-supplied owner and version fields',async()=>{
  const supplied={id:'foreign-object',owner_id:'foreign-owner',version:'foreign-version',name:'different-path'};
  const {client,requests}=fixture('GET','/object/info/'+fullPath,()=>json(supplied));const result=await client.info(path);
  assert.equal(result.error,null);assert.deepEqual(result.data,{id:'foreign-object',ownerId:'foreign-owner',version:'foreign-version',name:'different-path'});assert.equal(requests.length,1);
});
test('download success delivers bytes but does not attest the reviewed hash or metadata version',async()=>{
  const {client,requests}=fixture('GET','/object/'+fullPath,()=>new Response('Fictional changed bytes',{headers:{'content-type':'text/plain'}}));
  const result=await client.download(path);assert.equal(result.error,null);assert.equal(await result.data.text(),'Fictional changed bytes');assert.equal(requests.length,1);
  assert.equal(requests[0].headers.has('if-match'),false);
});
for(const response of [[],[{id:'foreign-object',name:'foreign-path'}],{unexpected:'body'}])test('remove success does not validate an exact removal receipt '+JSON.stringify(response),async()=>{
  const {client,requests}=fixture('DELETE','/object/'+bucket,request=>{assert.deepEqual(JSON.parse(request.body),{prefixes:[path]});return json(response);});
  const result=await client.remove([path]);assert.equal(result.error,null);assert.deepEqual(result.data,response);assert.equal(requests.length,1);
});
test('a modeled successful delete with a lost response remains uncertain and is not retried',async()=>{
  let modeledObjectPresent=true;const {client,requests}=fixture('DELETE','/object/'+bucket,()=>{modeledObjectPresent=false;throw new TypeError('Fictional response lost after modeled delete');});
  const result=await client.remove([path]);assert.ok(result.error);assert.equal(result.data,null);assert.equal(modeledObjectPresent,false);assert.equal(requests.length,1);
});
