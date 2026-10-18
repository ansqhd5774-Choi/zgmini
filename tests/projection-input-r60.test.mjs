import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
import {PROJECTION_MACRO_SERIES,sliceProjectionMacro} from '../worker/projection-input-manifest-r60.mjs';
import {marketOperationalStore,mergeStoredMacro,readStoredMarketInputsSelected} from '../worker/candidate-market-operational-store.mjs';
import {writeProjectionMacroSlices} from '../worker/projection-input-writer-r60.mjs';
const now=Date.parse('2026-10-02T12:00:00Z');
async function builder(id){const url=new URL(`../worker/projection-builders/${id}.ts`,import.meta.url);const code=ts.transpileModule(fs.readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from\s+["']([^"']+)["']/g,(_,p)=>`from ${JSON.stringify(new URL(p,url).href)}`);return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).buildProjection;}
test('manifest exactly covers direct macro series references in every builder',()=>{
 for(const [id,keys] of Object.entries(PROJECTION_MACRO_SERIES)){
  const code=fs.readFileSync(new URL(`../worker/projection-builders/${id}.ts`,import.meta.url),'utf8');
  assert(!/series\s*\[/.test(code),'dynamic series keys require explicit manifest review');
  assert.deepEqual([...new Set([...code.matchAll(/\bseries\.([A-Z][A-Z0-9]+)/g)].map(x=>x[1]))].sort(),[...keys].sort(),id);
 }
});
test('slices preserve absence, zero, null, row metadata and matching timestamps',()=>{
 const body={series:{PAYEMS:[{observationDate:'2026-01-01',value:0},{observationDate:'2026-02-01',value:null}],GDPC1:null,UNUSED:[1]},seriesStoredAt:{PAYEMS:now,UNUSED:now},external:{x:0}};
 const out=sliceProjectionMacro('recession',body);assert.deepEqual(out.series.PAYEMS,body.series.PAYEMS);assert.equal(out.series.GDPC1,null);assert(!Object.hasOwn(out.series,'UNRATE'));assert(!Object.hasOwn(out.series,'UNUSED'));assert.deepEqual(out.seriesStoredAt,{PAYEMS:now});assert.deepEqual(out.external,body.external);
});
test('all six builders produce exactly equal output for full and sliced fixtures',async()=>{
 const ids=[...new Set(Object.values(PROJECTION_MACRO_SERIES).flat())];
 for(const n of [0,1,13,61,180]){
  const r57Quarterly=new Set(['BOGZ1FA153064475Q','BOGZ1FL153064475Q']);
  const makeRows=(id,j)=>Array.from({length:n},(_,i)=>({observationDate:r57Quarterly.has(id)?new Date(Date.UTC(2010+Math.floor(i/4),(i%4)*3,1)).toISOString().slice(0,10):new Date(Date.UTC(2010+Math.floor(i/12),i%12,1)).toISOString().slice(0,10),value:i%19===0?null:i%17===0?0:1000+j*10+i+(i%7)*3}));
  const series=Object.fromEntries(ids.map((id,j)=>[id,makeRows(id,j)]));
  if(n>1)for(const rows of Object.values(series))rows.push({...rows[1],value:33});
  const body={series,seriesStoredAt:Object.fromEntries(ids.map(k=>[k,now])),external:{},providerSummary:{}};
  const snapshot={body:{asOfDate:'2026-10-02',domains:[],diagnostics8:{}}};
  for(const id of Object.keys(PROJECTION_MACRO_SERIES)){
   const build=await builder(id),base={snapshot,publicSnapshot:snapshot,nowIso:new Date(now).toISOString()};
   const full=mergeStoredMacro(null,{body,storedAt:now},now),slice=mergeStoredMacro(null,{body:sliceProjectionMacro(id,body),storedAt:now},now);
   const evaluate=inputs=>{try{return {output:build({...base,inputs})}}catch(error){return {error:error.message}}};
   assert.deepEqual(evaluate(slice),evaluate(full),`${id}/${n}`);
   if(n>1){for(const rows of Object.values(series))rows[rows.length-1]={...rows[1]};const clean=mergeStoredMacro(null,{body,storedAt:now},now);const cleanSlice=mergeStoredMacro(null,{body:sliceProjectionMacro(id,body),storedAt:now},now);assert.deepEqual(build({...base,inputs:cleanSlice}),build({...base,inputs:clean}),`${id}/${n}/duplicate-identical`);}
  }
 }
});
function fakeDb({slice=true,changed=false,oldShape=false}={}){
 const trace=[];
 return {trace,prepare(sql){return {bind(...args){
  trace.push({sql,args});
  return {async first(){
   if(sql.startsWith('SELECT stored_at'))return {stored_at:changed?now+1:now};
   if(args[0].startsWith('projection-macro:'))return slice?{body:JSON.stringify({series:{PAYEMS:[{value:0}],...(oldShape?{}:{NFCICREDIT:[]})}}),stored_at:now}:null;
   if(sql.includes('stored_at <'))return null;
   return {body:JSON.stringify({series:{PAYEMS:[{value:0}]}}),stored_at:now};
  }};
 }}}};
}
test('slice read never reads full macro body; absent/mismatched slice has one legacy read path',async()=>{
 for(const options of [{slice:true},{slice:false},{slice:true,changed:true},{slice:true,oldShape:true}]){const db=fakeDb(options),metadata=[];await readStoredMarketInputsSelected(marketOperationalStore(db),['macro'],now,{projectionId:'recession',onMetadata:x=>metadata.push(x)});const fullReads=db.trace.filter(x=>x.sql.startsWith('SELECT body')&&x.args[0]==='macro:%');const usesSlice=options.slice&&!options.changed&&!options.oldShape;assert.equal(fullReads.length,usesSlice?0:2);assert.equal(metadata[0].sourcePath,usesSlice?'SLICE':'LEGACY_FULL_MACRO');assert(db.trace.every(x=>x.sql.startsWith('SELECT')));}
});
test('writer derives six slices from read-back and rejects changed authority',async()=>{
 const db=fakeDb(),writes=[];await writeProjectionMacroSlices({db,store:{writeInput:async(...args)=>writes.push(args)},storedAt:now});assert.equal(writes.length,6);assert(writes.every(([key,,at])=>key.startsWith('projection-macro:')&&at===now));
 await assert.rejects(()=>writeProjectionMacroSlices({db,store:{writeInput:()=>assert.fail()},storedAt:now+1}),/MACRO_READBACK_CHANGED/);
});
