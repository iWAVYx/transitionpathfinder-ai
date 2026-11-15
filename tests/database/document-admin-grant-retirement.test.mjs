// Targeted in-memory PostgreSQL/WASM proof, NOT full-schema or native concurrency.
// No connection string, hosted client, Storage API or provider is used.
import test,{before,beforeEach,afterEach,after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
const modulePath=process.env.DOCUMENT_GRANT_PGLITE_MODULE;
if(!modulePath || !modulePath.startsWith("/") || process.env.PATHWAY_HISTORY_POSTGRES==="1") throw Error("Explicit local in-memory PGlite module is required; hosted/native connections are not supported.");
const {PGlite}=await import(pathToFileURL(modulePath).href);
const read=path=>readFileSync(path,"utf8"),uid=n=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const old=read("supabase/migrations/20260624032049_03e91336-dff5-4bda-b5ff-94294f60d6ef.sql");
const draft=read("docs/database-proposals/document-admin-grant-retirement/retire-admin-document-grants.review.sql");
// Statements execute inside each case's disposable rollback transaction.
const proposal=draft.replace(/^BEGIN;\s*$/m,"").replace(/^COMMIT;\s*$/m,"");
function fn(source,name){const start=source.indexOf("CREATE OR REPLACE FUNCTION public."+name+"(");assert.ok(start>=0,name);const end=source.indexOf("$$;",start);assert.ok(end>start,name);return source.slice(start,end+3);}
const actors={family:uid(1),guardian:uid(2),student:uid(3),educator:uid(4),school:uid(5),district:uid(6),partner:uid(7),owner:uid(8),platform_admin:uid(9),unrelated:uid(10)};
const student=uid(40),otherStudent=uid(41),docs={active:uid(61),archived:uid(62),deleted:uid(63),infected:uid(64)};
const path=kind=>student+"/"+kind+".txt";let db;
async function as(actor,role="authenticated"){assert.ok(["authenticated","anon","service_role"].includes(role));await db.exec("RESET ROLE");await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actor??""]);await db.exec("SET ROLE "+role);}
async function apply(){await db.exec("RESET ROLE");await db.exec(proposal);}
async function visible(kind="active"){return{documents:Number((await db.query("SELECT count(*) AS n FROM public.documents WHERE id=$1",[docs[kind]])).rows[0].n),objects:Number((await db.query("SELECT count(*) AS n FROM storage.objects WHERE bucket_id='student-documents' AND name=$1",[path(kind)])).rows[0].n)};}
async function grant(actor,document=docs.active){return db.query("INSERT INTO public.admin_doc_access_grants(actor_id,document_id,reason) VALUES($1,$2,'Fictional support reason')",[actor,document]);}
async function refused(work){await db.exec("SAVEPOINT expected_denial");try{await assert.rejects(work,e=>e.code==="42501"||e.code==="55000");}finally{await db.exec("ROLLBACK TO SAVEPOINT expected_denial; RELEASE SAVEPOINT expected_denial");}}
before(async()=>{
 db=new PGlite();await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$SELECT (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1]$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE public.students(id uuid PRIMARY KEY,owner_id uuid,student_user_id uuid);
 CREATE TABLE public.student_collaborators(student_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.student_relationships(student_id uuid,related_user_id uuid,consent_status text,permission_level text);
 CREATE TYPE public.app_role AS ENUM('student','parent','guardian','educator','teacher','case_manager','school_admin','district_admin','partner','admin');
 CREATE TABLE public.user_roles(user_id uuid,role public.app_role);CREATE TABLE public.admin_roles(user_id uuid,role text);
 CREATE TABLE public.documents(id uuid PRIMARY KEY,student_id uuid,uploaded_by uuid,title text,storage_path text UNIQUE,archived_at timestamptz,deleted_at timestamptz,scan_status text,scan_verdict jsonb);
 CREATE TABLE public.document_permissions(document_id uuid,user_id uuid,role_type text,permission_level text);
 CREATE FUNCTION public.has_audience(actor uuid,audience text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
 GRANT SELECT,INSERT,UPDATE,DELETE ON public.documents,storage.objects TO authenticated;
 ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`);
 await db.exec(fn(read("supabase/migrations/20260603221955_27d34c77-a00d-4a08-bef6-b3ad40b8c48d.sql"),"is_platform_admin"));
 const explicit=read("supabase/migrations/20261024010000_remove_implicit_admin_student_access.sql");await db.exec(explicit.slice(0,explicit.indexOf("-- Editing a profile"))+"COMMIT;");
 await db.exec(fn(read("supabase/migrations/20260611232723_f4eac771-7183-4a69-887e-49ea6b7c4f75.sql"),"can_view_document"));
 const grantStart=old.indexOf("CREATE TABLE IF NOT EXISTS public.admin_doc_access_grants"),grantEnd=old.indexOf("CREATE OR REPLACE FUNCTION public.is_partner_only");await db.exec(old.slice(grantStart,grantEnd));
 await db.exec(fn(read("supabase/migrations/20260907190000_security_finding_alignment.sql"),"is_partner_only"));
 await db.exec(fn(old,"has_recent_admin_doc_access"));await db.exec(fn(old,"storage_can_read_student_doc"));
 const policies=old.indexOf('DROP POLICY IF EXISTS "Access docs via student"');await db.exec(old.slice(policies));
 // Preserve the existing client no-replacement/deletion restriction; install
 // the real canonical SQL. Quarantine predicate/policy use their actual bodies,
 // with full-chain prerequisite installation left to final native replay.
 await db.exec(read("supabase/migrations/20261029020200_document_storage_write_boundary.sql"));
 const quarantine=read("supabase/migrations/20261029020800_document_quarantine_read_boundary.sql");await db.exec("BEGIN;"+quarantine.slice(quarantine.indexOf("-- Denial-only predicate")));
 const roles={family:"parent",guardian:"guardian",student:"student",educator:"educator",school:"school_admin",district:"district_admin",partner:"partner",owner:"admin",platform_admin:"admin",unrelated:"parent"};
 for(const [name,actor]of Object.entries(actors)){await db.query("INSERT INTO auth.users VALUES($1)",[actor]);await db.query("INSERT INTO public.user_roles VALUES($1,$2)",[actor,roles[name]]);}
 await db.query("INSERT INTO public.students VALUES($1,$2,$3),($4,$5,NULL)",[student,actors.family,actors.student,otherStudent,actors.unrelated]);
 for(const name of ["guardian","educator","school","district"])await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[name]]);
 await db.query("INSERT INTO public.admin_roles VALUES($1,'platform_owner'),($2,'platform_admin')",[actors.owner,actors.platform_admin]);
 for(const [kind,id]of Object.entries(docs)){await db.query("INSERT INTO public.documents VALUES($1,$2,$3,'Fictional file',$4,$5,$6,$7,$8)",[id,student,actors.family,path(kind),kind==="archived"?"2026-11-01T00:00:00Z":null,kind==="deleted"?"2026-11-01T00:00:00Z":null,kind==="infected"?"infected":"clean",{code:kind==="infected"?"infected":"clean"}]);await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('student-documents',$1)",[path(kind)]);}
 await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('student-documents',$1)",[student+"/pending-registration.txt"]);
 for(const kind of Object.keys(docs))await grant(actors.owner,docs[kind]);
});
beforeEach(async()=>{await db.exec("BEGIN");});afterEach(async()=>{await db.exec("ROLLBACK;RESET ROLE");});after(async()=>{await db?.close();});
test("baseline: platform admin can self-grant unrelated active document metadata and Storage access",async()=>{await as(actors.platform_admin);assert.deepEqual(await visible(),{documents:0,objects:0});await grant(actors.platform_admin);assert.deepEqual(await visible(),{documents:1,objects:1});});
test("baseline: an unexpired Owner grant works without any student relationship",async()=>{await as(actors.owner);assert.equal((await db.query("SELECT public.can_access_student($1,$2) AS yes",[actors.owner,student])).rows[0].yes,false);assert.deepEqual(await visible(),{documents:1,objects:1});});
for(const kind of ["active","archived","deleted"])test("retirement: pre-existing unexpired "+kind+" grant no longer reads metadata or Storage",async()=>{await apply();await as(actors.owner);assert.deepEqual(await visible(kind),{documents:0,objects:0});});
for(const name of ["owner","platform_admin"])test("retirement: cached authenticated "+name+" grant INSERT is refused",async()=>{await apply();await as(actors[name]);await refused(()=>grant(actors[name]));});
test("retirement: accidental future permissive INSERT policy/privilege cannot reopen grants",async()=>{await apply();await db.exec("GRANT INSERT ON public.admin_doc_access_grants TO authenticated;CREATE POLICY accidental_allow ON public.admin_doc_access_grants FOR INSERT TO authenticated WITH CHECK(true)");await as(actors.owner);await refused(()=>grant(actors.owner));});
for(const name of ["family","guardian","student","educator","school","district"])test("retirement preserves explicit active document/Storage access for "+name,async()=>{await apply();await as(actors[name]);assert.deepEqual(await visible(),{documents:1,objects:1});});
for(const name of ["owner","platform_admin"])test("retirement preserves genuine student collaboration for "+name,async()=>{await apply();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[name]]);await as(actors[name]);assert.deepEqual(await visible(),{documents:1,objects:1});});
test("retirement preserves a directly assigned document permission without an admin-role shortcut",async()=>{await apply();await db.query("INSERT INTO public.document_permissions VALUES($1,$2,NULL,'view_document')",[docs.active,actors.unrelated]);await as(actors.unrelated);assert.deepEqual(await visible(),{documents:1,objects:1});});
test("partner-only membership cannot use a student collaboration to read documents",async()=>{await apply();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors.partner]);await as(actors.partner);assert.deepEqual(await visible(),{documents:0,objects:0});});
test("unrelated and removed collaborators stay denied after retirement",async()=>{await apply();await db.query("DELETE FROM public.student_collaborators WHERE user_id=$1",[actors.educator]);for(const actor of [actors.educator,actors.unrelated]){await as(actor);assert.deepEqual(await visible(),{documents:0,objects:0});}});
test("legitimate pre-registration Storage reads for the editing uploader are preserved",async()=>{await apply();await as(actors.family);assert.equal(Number((await db.query("SELECT count(*) AS n FROM storage.objects WHERE name=$1",[student+"/pending-registration.txt"])).rows[0].n),1);});
test("existing quarantine and no-client-overwrite/delete fences remain installed",async()=>{await apply();await as(actors.family);assert.equal((await visible("infected")).objects,0);assert.equal((await db.query("UPDATE storage.objects SET name=name WHERE name=$1 RETURNING id",[path("active")])).rows.length,0);assert.equal((await db.query("DELETE FROM storage.objects WHERE name=$1 RETURNING id",[path("active")])).rows.length,0);});
test("retirement preserves every historical grant row and existing Storage helper body",async()=>{const before=(await db.query("SELECT * FROM public.admin_doc_access_grants ORDER BY id")).rows,body=(await db.query("SELECT prosrc FROM pg_proc WHERE oid='public.storage_can_read_student_doc(uuid,text)'::regprocedure")).rows;await apply();assert.deepEqual((await db.query("SELECT * FROM public.admin_doc_access_grants ORDER BY id")).rows,before);assert.deepEqual((await db.query("SELECT prosrc FROM pg_proc WHERE oid='public.storage_can_read_student_doc(uuid,text)'::regprocedure")).rows,body);});
test("retired helper preserves its OID/ACL, uses invoker mode and never treats service-written grants as access",async()=>{const before=(await db.query("SELECT oid,proacl FROM pg_proc WHERE oid='public.has_recent_admin_doc_access(uuid,uuid)'::regprocedure")).rows[0];await apply();const after=(await db.query("SELECT oid,proacl,prosecdef,proconfig FROM pg_proc WHERE oid='public.has_recent_admin_doc_access(uuid,uuid)'::regprocedure")).rows[0];assert.equal(after.oid,before.oid);assert.deepEqual(after.proacl,before.proacl);assert.equal(after.prosecdef,false);assert.deepEqual(after.proconfig,["search_path=pg_catalog"]);await as(actors.owner,"service_role");await grant(actors.owner);await as(actors.owner);assert.equal((await db.query("SELECT public.has_recent_admin_doc_access($1,$2) AS yes",[actors.owner,docs.active])).rows[0].yes,false);});
test("changed legacy function body refuses installation without partial retirement",async()=>{await db.exec("CREATE OR REPLACE FUNCTION public.has_recent_admin_doc_access(_user_id uuid,_document_id uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$");await refused(()=>db.exec(proposal));assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_policy WHERE polname='documents_select_admin_override'")).rows[0].n,1);});
test("repeat installation refuses the unreviewed state instead of blindly rerunning",async()=>{await apply();await refused(()=>db.exec(proposal));});

test("retirement preserves archived editor access and denies an archived viewer",async()=>{await apply();await as(actors.educator);assert.deepEqual(await visible("archived"),{documents:1,objects:1});await db.exec("RESET ROLE");await db.query("UPDATE public.student_collaborators SET role='viewer' WHERE user_id=$1",[actors.educator]);await as(actors.educator);assert.deepEqual(await visible("active"),{documents:1,objects:1});assert.deepEqual(await visible("archived"),{documents:0,objects:0});});
test("retirement rollback restores the original policy/privilege/helper atomically",async()=>{await db.exec("SAVEPOINT retirement_attempt");await apply();await db.exec("ROLLBACK TO SAVEPOINT retirement_attempt;RELEASE SAVEPOINT retirement_attempt");await as(actors.platform_admin);await grant(actors.platform_admin);assert.deepEqual(await visible(),{documents:1,objects:1});});
