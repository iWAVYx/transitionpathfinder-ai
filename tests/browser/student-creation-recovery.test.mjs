// Local-only real-browser verification of the actual recovery module. No application,
// external server, credentials, fixtures or provider requests are involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
if(process.env.TF_RECOVERY_BROWSER_LOCAL!=='1')throw Error('Explicit local-only browser verification required');
test('two real tabs serialize creation and retain minimal recovery across refresh',async()=>{
 const output=await build({entryPoints:['src/lib/student-creation-recovery.ts'],bundle:true,format:'esm',platform:'browser',write:false});
 const server=createServer((request,response)=>{if(request.url==='/bundle.js'){response.setHeader('Content-Type','text/javascript');response.end(output.outputFiles[0].text);}else response.end(`<script type="module">import * as recovery from '/bundle.js';window.recovery=recovery;</script>`);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;try{
 const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.TF_RECOVERY_BROWSER_EXECUTABLE});const context=await browser.newContext();
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 const a=await context.newPage(),b=await context.newPage();
 for(const page of [a,b]){await page.goto(origin);await page.waitForFunction(()=>!!window.recovery);}
 const actor='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
 await a.evaluate(({actor,id})=>{window.work=window.recovery.withCreationLock(actor,()=>true,async()=>{window.recovery.saveCreationIntent(localStorage,actor,{version:1,requestId:id,origin:'students',kind:'linked',role:'linked'});window.held=true;await new Promise(resolve=>window.release=resolve);});},{actor,id});
 await a.waitForFunction(()=>window.held===true);
 const blocked=await b.evaluate(async actor=>{try{await window.recovery.withCreationLock(actor,()=>true,async()=>{window.unexpected=true;});return false;}catch{return window.unexpected!==true;}},actor);assert.equal(blocked,true);
 await a.reload();await a.waitForFunction(()=>!!window.recovery);
 const recovered=await b.evaluate(async actor=>window.recovery.withCreationLock(actor,()=>true,async()=>window.recovery.readCreationIntent(localStorage,actor)),actor);
 assert.equal(recovered.requestId,id);assert.deepEqual(Object.keys(recovered).sort(),['kind','origin','requestId','role','version']);
 await assert.rejects(()=>b.evaluate(({actor,id})=>window.recovery.saveCreationIntent(localStorage,actor,{version:1,requestId:crypto.randomUUID(),origin:'onboarding',kind:'linked',role:'parent'}),{actor,id}),/earlier student setup/);
 assert.equal(await b.evaluate(()=>window.recovery.readCreationIntent(localStorage,'other')),null);
 await b.evaluate(({actor,id})=>window.recovery.clearCreationIntent(localStorage,actor,id),{actor,id});
 assert.equal(await a.evaluate(actor=>window.recovery.readCreationIntent(localStorage,actor),actor),null);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
