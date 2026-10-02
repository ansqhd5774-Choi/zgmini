// Read-only static recovery from the immutable Production baseline. Never imports application modules.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const baseline='de0504f191ab2ba5e0bdbdebd312f162f25f035e';
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n').filter(f=>/^(app|worker|lib|db|drizzle|scripts)\//.test(f)&&/\.(?:ts|tsx|mjs|js|sql)$/.test(f)&&!/(?:test|fixture|example)/i.test(f));
const sources=files.map(file=>({file,text:execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'})}));
const constants=new Map(),objects=new Map();
for(const {text} of sources){
 for(const m of text.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*(["'])([a-zA-Z_][\w]*)\2/g)) constants.set(m[1],m[3]);
 for(const m of text.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/g)) {
  const props={};for(const p of m[2].matchAll(/(\w+)\s*:\s*(["'])([a-zA-Z_][\w]*)\2/g))props[p[1]]=p[3];objects.set(m[1],props);
 }
}
const ddl=[];
for(const {file,text} of sources){
 const matches=file.endsWith('.sql')?[...text.matchAll(/CREATE\s+(?:(?:UNIQUE|VIRTUAL)\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)\b[^;]*;/gi)].map(m=>({sql:m[0],index:m.index})):[...text.matchAll(/([`"'])\s*(CREATE\s+(?:(?:UNIQUE|VIRTUAL)\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)\b[\s\S]*?)\1/gi)].map(m=>({sql:m[2],index:m.index+1}));
 const alias=text.match(/const\s+T\s*=\s*(\w+)\s*;/)?.[1];
 for(const m of matches){
  const sql=m.sql.replace(/\$\{(\w+)(?:\.(\w+))?\}/g,(whole,k,prop)=>prop?(objects.get(k==='T'?alias:k)?.[prop]??whole):(constants.get(k)??whole));
  const target=sql.match(/^CREATE\s+(?:(UNIQUE|VIRTUAL)\s+)?(TABLE|INDEX|TRIGGER|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[]?)([\w]+)\3/i);
  ddl.push({file,line:text.slice(0,m.index).split('\n').length,kind:target?.[2]?.toUpperCase()??'UNKNOWN',name:target?.[4]??null,sql,unresolved_template:sql.includes('${'),has_fk:/\bREFERENCES\b/i.test(sql),virtual:/^CREATE\s+VIRTUAL/i.test(sql),generated:/\bGENERATED\s+ALWAYS\b/i.test(sql)});
 }
}
const live=JSON.parse(readFileSync('docs/migration/r3/live-db-inventory.json','utf8'));
const sourceNames=new Set(ddl.filter(d=>d.kind==='TABLE'&&d.name&&!d.unresolved_template).map(d=>d.name));
const liveNames=new Set(live.tables.map(t=>t.table));
const tables=[...new Set([...sourceNames,...liveNames])].sort().map(table=>({table,classification:liveNames.has(table)?(sourceNames.has(table)?'LIVE_CONFIRMED':'LIVE_VISIBLE_NOT_SOURCE_DECLARED'):'SOURCE_REFERENCED_NOT_VISIBLE',source_declared:sourceNames.has(table),live_visible:liveNames.has(table),live_columns:live.tables.find(t=>t.table===table)?.columns??null,exact_rows:live.tables.find(t=>t.table===table)?.row_count??null,ddl:ddl.filter(d=>d.kind==='TABLE'&&d.name===table).map(d=>({file:d.file,line:d.line}))}));
const result={baseline,method:'Static extraction only; source DDL is not live sqlite_master evidence. Missing live table cannot be assumed absent.',scanned_files:files.length,counts:Object.fromEntries(['LIVE_CONFIRMED','SOURCE_REFERENCED_NOT_VISIBLE','LIVE_VISIBLE_NOT_SOURCE_DECLARED'].map(c=>[c,tables.filter(t=>t.classification===c).length])),tables,unknown:ddl.filter(d=>d.unresolved_template||!d.name),source_ddl:ddl,live_schema_complete:false,live_indexes_fk_triggers_views_virtual_generated:'UNKNOWN'};
writeFileSync('docs/migration/r4/schema-reconciliation.json',JSON.stringify(result,null,2)+'\n');
writeFileSync('docs/migration/r4/source-ddl-review.sql',ddl.map(d=>`-- SOURCE ONLY ${d.file}:${d.line}; live definition NOT_PROVEN\n${d.sql.replace(/;?\s*$/,';')}`).join('\n\n')+'\n');
console.log(JSON.stringify({scanned_files:files.length,ddl:ddl.length,counts:result.counts,unknown:result.unknown.length}));
