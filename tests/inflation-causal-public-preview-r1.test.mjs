import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {summarize,previewInflation19,readSupply,readMacroSeries} from '../scripts/pc-writer/inflation-causal-public-preview-r1.mjs';

const first=INFLATION_CAUSAL_19[0];
const stored='2026-11-04T09:00:00Z';
test('PC summarizer uses observed values only; zero is not missing',()=>{
 const rows=[{date:'2026-08-01',value:'1.4'},{date:'2026-09-01',value:'0'}];
 const r=summarize(first,rows,stored);
 assert.equal(r.status,'READY');assert.equal(r.value,0);
 assert.equal(r.previousValue,1.4);assert.equal(r.observationDate,'2026-09-01');
 assert.equal(r.sourceStoredAt,new Date(stored).toISOString());assert.equal(r.history.length,2);
});
test('PC summarizer rejects blank values, duplicate dates and absent provenance',()=>{
 const r=[{date:'2026-08-01',value:1},{date:'2026-09-01',value:2}];
 assert.throws(()=>summarize(first,r.map((x,i)=>i?{...x,value:''}:x),stored),/INFL19_ROW_INVALID/);
 assert.throws(()=>summarize(first,[r[0],r[0]],stored),/INFL19_ROW_INVALID/);
 assert.throws(()=>summarize(first,r,'nonsense'),/INFL19_SOURCE_ROWS_INVALID/);
});
test('large daily series produces capped 13-point monthly presentation, not private raw history',()=>{
 const rows=[];
 for(let year=2024;year<=2026;year++)for(let month=1;month<=12;month++){
  if(year===2026&&month>9)break;
  rows.push({date:`${year}-${String(month).padStart(2,'0')}-10`,value:year+month});
 }
 const out=summarize(first,rows,stored);
 assert.equal(out.history.length,13);
 assert.equal(out.history.at(-1).date,'2026-09');
 assert.equal(Object.hasOwn(out,'providerRawData'),false);
});
test('empty research PC storage does not invent sourceStoredAt or publish fake READY',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'infl19-ui-'));
 const home=path.join(temp,'pc-writer');fs.mkdirSync(home);
 try{
  const p=previewInflation19(home,{openDb:()=>{throw Error('NO_DB')}});
  assert.equal(p.status,'PENDING');assert.equal(p.payload,null);
  assert.equal(p.ready,0);assert.equal(p.providerCalls,0);
  assert.equal(p.d1Writes,0);assert.equal(p.dbWrites,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('supply reader respects original parsed GSCPI object and real saved-file mtime',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'infl19-supply-'));
 try{
  const dir=path.join(temp,'supply-r10');fs.mkdirSync(dir);
  const rows=[{observationDate:'2026-08-01',value:0.2},{observationDate:'2026-09-01',value:0.1}];
  fs.writeFileSync(path.join(dir,'gscpi.json'),JSON.stringify({source:'NY_FED_GSCPI',rows}));
  fs.writeFileSync(path.join(dir,'gscpi.xlsx'),'immutable original archive fixture');
  fs.writeFileSync(path.join(dir,'extra-manifest.json'),JSON.stringify([{id:'gscpi',status:'STORED'}]));
  fs.utimesSync(path.join(dir,'gscpi.json'),new Date('2026-10-01T10:00:00Z'),new Date('2026-10-01T10:00:00Z'));
  const r=readSupply(temp,'21');
  assert.equal(r.value,0.1);assert.equal(r.previousValue,0.2);
  assert.equal(r.observationDate,'2026-09-01');
  assert.equal(r.sourceStoredAt,'2026-10-01T10:00:00.000Z');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('real PCE supply archive is a plain parsed array, not a rows property',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'infl19-pce-'));
 try{
  const dir=path.join(temp,'supply-r10');fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir,'DPCERA3M086SBEA.json'),JSON.stringify([
   {observationDate:'2026-08-01',value:100},{observationDate:'2026-09-01',value:101}]));
  fs.writeFileSync(path.join(dir,'DPCERA3M086SBEA.csv'),'DATE,DPCERA3M086SBEA');
  fs.writeFileSync(path.join(dir,'extra-manifest.json'),JSON.stringify([{id:'DPCERA3M086SBEA',status:'STORED'}]));
  const r=readSupply(temp,'26');
  assert.equal(r.value,101);assert.equal(r.previousValue,100);
  fs.unlinkSync(path.join(dir,'DPCERA3M086SBEA.csv'));
  assert.throws(()=>readSupply(temp,'26'));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('macro oil fallback reads only approved MCOILWTICO series and preserves saved timestamp',()=>{
 const t=Date.parse('2026-10-05T00:00:00Z');
 const fixture={series:{MCOILWTICO:[{date:'2026-08-01',value:70},{date:'2026-09-01',value:75}]}};
 const db={prepare:()=>({get:()=>({body:JSON.stringify(fixture),stored_at:t})})};
 const r=readMacroSeries(db,'1','MCOILWTICO');
 assert.equal(r.value,75);assert.equal(r.sourceStoredAt,'2026-10-05T00:00:00.000Z');
 assert.throws(()=>readMacroSeries(db,'1','DTWEXBGS'),/MACRO_SERIES_DENIED/);
});
test('untyped numeric availability stays null instead of a misleading 1970 release date',()=>{
 const r=summarize(first,[
  {date:'2026-08-01',value:10,availableAt:0},
  {date:'2026-09-01',value:11,availableAt:0}],stored);
 assert.equal(r.availableAt,null);
});
