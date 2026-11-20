// Prepared strings only; importing never connects or reads credentials.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {extractionRolloutSql,extractionMigrationVersion,extractionMigrationName,extractionMigrationSource} from './atomic-extraction-rollout-sql.mjs';
const plan=JSON.parse(readFileSync('docs/production-readiness/proposals/document-upload-canonical-preparation.json','utf8'));
const atomicPlan=JSON.parse(readFileSync('docs/production-readiness/proposals/atomic-extraction-release-plan.json','utf8'));
if(createHash('sha256').update(extractionMigrationSource).digest('hex')!==atomicPlan.migration_sha256)throw Error('Atomic extraction source changed; review its release plan.');
export const uploadChainMigrations=plan.sequence.map(item=>{
 const source=readFileSync(item.canonical_file,'utf8').replaceAll('\r\n','\n');
 if(createHash('sha256').update(source).digest('hex')!==item.canonical_sha256)throw Error('Canonical upload source changed; review the manifest.');
 const file=item.canonical_file.split('/').at(-1);
 return {version:file.slice(0,14),name:file.slice(15,-4),source};
});
if(uploadChainMigrations.length!==14||uploadChainMigrations.some((m,i)=>m.version<=(i?uploadChainMigrations[i-1].version:extractionMigrationVersion)))throw Error('Unexpected upload migration order.');
const literal=(tag,value)=>{if(value.includes('$'+tag+'$'))throw Error('SQL delimiter collision');return '$'+tag+'$'+value+'$'+tag+'$';};
const versions=[extractionMigrationVersion,...uploadChainMigrations.map(m=>m.version)];
const names=[extractionMigrationName,...uploadChainMigrations.map(m=>m.name)];
const guard=`DO $upload_chain_guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version>='20261029010000' OR version IN (${versions.map(v=>"'"+v+"'").join(',')}) OR name IN (${names.map(v=>"'"+v+"'").join(',')})) THEN
  RAISE EXCEPTION 'A prepared document migration already exists; stop for reconciliation.' USING ERRCODE='55000';
 END IF;
END; $upload_chain_guard$;`;
const base=extractionRolloutSql.replace('DO $extraction_rollout$',guard+'\nDO $extraction_rollout$').replace(/\nCOMMIT;\s*$/,'\n');
export const uploadChainRolloutSql=base+uploadChainMigrations.map((m,i)=>{
 const body=m.source.replace(/^BEGIN;\n/m,'').replace(/\nCOMMIT;\s*$/,'\n');
 return body+`INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES('${m.version}','${m.name}',ARRAY[${literal('upload_chain_'+i,m.source)}]);\n`;
}).join('\n')+'COMMIT;\n';
