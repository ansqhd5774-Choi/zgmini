import {readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';

const analysisPath=process.argv[2];
if(!analysisPath)throw Error('Usage: node scripts/analyze-d1-table-deps-r41.mjs <shard-analysis.json>');
const analysis=JSON.parse(readFileSync(analysisPath,'utf8'));
const tables=new Set((analysis.tables??[]).map(x=>x.table));
const roots=['app','worker','lib','db','drizzle','scripts','tests'].filter(p=>{try{return statSync(p).isDirectory()}catch{return false}});

const files=[];
function walk(dir){
 for(const ent of readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,ent.name);
  if(ent.isDirectory())walk(p);
  else if(/\.(?:mjs|js|ts|tsx|sql)$/.test(ent.name))files.push(p);
 }
}
for(const r of roots)walk(r);

const refs=new Map([...tables].map(t=>[t,new Set()]));
const co=new Map();
const addEdge=(a,b,file)=>{
 if(a===b)return;
 const k=[a,b].sort().join('\0');
 if(!co.has(k))co.set(k,new Set());
 co.get(k).add(file);
};

for(const file of files){
 let text;try{text=readFileSync(file,'utf8')}catch{continue}
 const hit=[];
 for(const t of tables){
  if(text.includes(t)){refs.get(t).add(file);hit.push(t)}
 }
 for(let i=0;i<hit.length;i++)for(let j=i+1;j<hit.length;j++)addEdge(hit[i],hit[j],file);
}

const foreignEdges=[];
for(const t of analysis.tables??[]){
 for(const fk of t.foreign_keys??[]){
  if(fk.table && tables.has(fk.table))foreignEdges.push({from:t.table,to:fk.table,kind:'FOREIGN_KEY'});
 }
}

const sourceEdges=[...co.entries()].map(([k,v])=>{
 const [a,b]=k.split('\0');return {from:a,to:b,kind:'SOURCE_COREFERENCE',files:[...v].sort()};
});

const result={
 tableCount:tables.size,
 referencedTables:[...refs.entries()].map(([table,set])=>({table,files:[...set].sort(),referenceCount:set.size})).sort((a,b)=>b.referenceCount-a.referenceCount||a.table.localeCompare(b.table)),
 foreignKeyEdges:foreignEdges,
 sourceCoReferenceEdges:sourceEdges,
 note:'SOURCE_COREFERENCE is conservative evidence only: two table names appearing in one file does not prove a cross-database transaction or JOIN. Manual review is required before sharding.'
};
console.log(JSON.stringify(result,null,2));
