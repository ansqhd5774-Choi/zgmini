import {readFileSync} from 'node:fs';

const sourcePath=process.argv[2];
const targetPath=process.argv[3];
if(!sourcePath||!targetPath)throw Error('Usage: node scripts/verify-d1-import-r4.mjs <source-manifest.json> <target-integrity.json>');

const source=JSON.parse(readFileSync(sourcePath,'utf8'));
const target=JSON.parse(readFileSync(targetPath,'utf8'));

const problems=[];
const sourceTables=new Map((source.tables??[]).map(t=>[t.table,t]));
const targetTables=new Map((target.tables??[]).map(t=>[t.table,t]));

for(const [name,s] of sourceTables){
  if(!targetTables.has(name)){problems.push(`missing target table: ${name}`);continue;}
  const t=targetTables.get(name);
  if(Number(s.source_row_count)!==Number(t.row_count))problems.push(`${name}: row_count source=${s.source_row_count} target=${t.row_count}`);
  if(s.schema_sha256&&t.schema_sha256&&s.schema_sha256!==t.schema_sha256)problems.push(`${name}: schema hash mismatch`);
  if(s.freshness&&t.freshness&&JSON.stringify(s.freshness)!==JSON.stringify(t.freshness))problems.push(`${name}: freshness mismatch`);
}
for(const name of targetTables.keys())if(!sourceTables.has(name)&&!name.startsWith('sqlite_')&&name!=='_cf_KV')problems.push(`unexpected target table: ${name}`);

if(source.schema_sha256&&target.schema_sha256&&source.schema_sha256!==target.schema_sha256)problems.push('global schema hash mismatch');
if(Number.isFinite(source.row_total)&&Number.isFinite(target.row_total)&&Number(source.row_total)!==Number(target.row_total))problems.push(`row total mismatch source=${source.row_total} target=${target.row_total}`);

const out={
 status:problems.length?'FAIL':'PASS',
 source_table_count:sourceTables.size,
 target_table_count:targetTables.size,
 source_row_total:source.row_total??null,
 target_row_total:target.row_total??null,
 problems
};
console.log(JSON.stringify(out,null,2));
if(problems.length)process.exitCode=1;
