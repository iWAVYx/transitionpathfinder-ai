import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { discoverDocumentStorageCandidates, verifyDocumentStorageInventory, SCAN_ROOTS, INVENTORY_PATH } from "../scripts/document-storage-writer-inventory.mjs";
const root = resolve(import.meta.dirname, "..");
test("current checked-in lexical inventory is exact, classified and source-only", () => {
 const inventory=JSON.parse(readFileSync(resolve(root,INVENTORY_PATH),"utf8"));
 assert.equal(verifyDocumentStorageInventory(root,inventory).checked_files,41);
 assert.equal(inventory.entries.length,41);
 for(const path of ["src/lib/cms/cms.functions.ts","src/lib/channel-messages.functions.ts","supabase/config.toml","wrangler.staging.toml",".github/workflows/release-readiness.yml"])assert.ok(inventory.entries.some(v=>v.path===path));
 assert.ok(inventory.known_followups.some(v=>v.item==="Deployed inventory"));
});
function fixture(fn) {
 const directory=mkdtempSync(join(tmpdir(),"tf-storage-inventory-"));
 const put=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};
 for(const path of SCAN_ROOTS)mkdirSync(join(directory,path),{recursive:true});
 put("supabase/config.toml","project_id = 'fictional'\n");
 put("src/lib/upload.ts",'client.storage.from(bucket).upload(path, file)');
 put("supabase/migrations/schedule.sql","SELECT cron.schedule('fictional','* * * * *','SELECT 1');");
 const plan={schema:"transitionforward-checked-in-storage-inventory-v1",scan_roots:SCAN_ROOTS,hosted_verified:false,ready_for_cutover:false,whole_workstream_complete:false,entries:discoverDocumentStorageCandidates(directory).map(v=>({...v,classification:"fictional",finding:"reviewed fixture",remaining_boundary:"not hosted"}))};
 try {fn({directory,put,plan});}finally{rmSync(directory,{recursive:true,force:true});}
}
test("a new computed-bucket upload is refused until reviewed",()=>fixture(({directory,put,plan})=>{put("src/lib/new-writer.ts","service.storage.from(selectedBucket).upload(path, bytes)");assert.throws(()=>verifyDocumentStorageInventory(directory,plan),/count changed/);}));
test("new worker invocation in an operational script is refused",()=>fixture(({directory,put,plan})=>{put("scripts/new-worker.mjs",'fetch(base + "/functions/v1/ai-job-processor")');assert.throws(()=>verifyDocumentStorageInventory(directory,plan),/count changed/);}));
test("a changed reviewed upload or schedule cannot retain its old proof",()=>fixture(({directory,put,plan})=>{put("src/lib/upload.ts","client.storage.from(bucket).remove([path])");assert.throws(()=>verifyDocumentStorageInventory(directory,plan),/requires review/);}));
test("replacing a removed candidate at an equal file count is detected",()=>fixture(({directory,put,plan})=>{rmSync(join(directory,"src/lib/upload.ts"));put("src/lib/elsewhere.ts","client.storage.from(bucket).remove([path])");assert.throws(()=>verifyDocumentStorageInventory(directory,plan),/requires review/);}));
test("new nightly workflow and new Worker configuration enter discovery",()=>fixture(({directory,put,plan})=>{put(".github/workflows/new.yml","on:\n  schedule:\n    - cron: '0 7 * * *'\n");put("wrangler.preview.jsonc",'{"name":"fictional"}');assert.equal(discoverDocumentStorageCandidates(directory).length,plan.entries.length+2);assert.throws(()=>verifyDocumentStorageInventory(directory,plan),/count changed/);}));
test("missing review text, duplicate paths and upgraded acceptance flags fail closed",()=>fixture(({directory,plan})=>{for(const mutate of [p=>{p.entries[0].finding="";},p=>{p.entries.push(p.entries[0]);},p=>{p.hosted_verified=true;},p=>{p.ready_for_cutover=true;},p=>{p.whole_workstream_complete=true;},p=>{p.scan_roots=[];}]){const copy=structuredClone(plan);mutate(copy);assert.throws(()=>verifyDocumentStorageInventory(directory,copy));}}));
test("missing discovery roots and symlink sources are refused",()=>fixture(({directory,put,plan})=>{symlinkSync(join(directory,"src/lib/upload.ts"),join(directory,"scripts/linked.mjs"));assert.throws(()=>verifyDocumentStorageInventory(directory,plan),/symbolic-link/);rmSync(join(directory,"scripts/linked.mjs"));rmSync(join(directory,"supabase/functions"),{recursive:true});assert.throws(()=>verifyDocumentStorageInventory(directory,plan));}));
test("read-only verification does not rewrite reviewed inventory or source",()=>fixture(({directory,plan})=>{const before=JSON.stringify(plan),source=readFileSync(join(directory,"src/lib/upload.ts"),"utf8");assert.equal(verifyDocumentStorageInventory(directory,plan).hosted_verified,false);assert.equal(JSON.stringify(plan),before);assert.equal(readFileSync(join(directory,"src/lib/upload.ts"),"utf8"),source);}));
