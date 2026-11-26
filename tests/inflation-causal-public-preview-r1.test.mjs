import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {summarize,previewInflation19,readSupply,readMacroSeries,readPpi} from '../scripts/pc-writer/inflation-causal-public-preview-r1.mjs';

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

test('one invalid private PPI sibling does not hide the other seven saved research rows',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w01-infl19-ppi-independent-'));
 const home=path.join(root,'pc-writer');
 const dir=path.join(home,'inflation-causal-r1');fs.mkdirSync(dir,{recursive:true});
 const ids=['WPU1017','WPU102502','WPU081','WPU061',
  'WPU012','WPU0221','WPU029','WPUID61'];
 const stamp='2026-11-16T10:30:02.905Z';
 const goodRows=()=>[{date:'2026-08-01',value:100},
  {date:'2026-09-01',value:101}];
 const doc={schemaVersion:1,provider:'BLS',
  sourceVersion:'BLS_API_V2_PPI_BATCH8_R1',sourceStoredAt:stamp,
  ids,series:Object.fromEntries(ids.map(id=>[id,goodRows()])),
  seriesSourceStoredAt:Object.fromEntries(ids.map(id=>[id,stamp]))};
 const sourceFile=path.join(dir,'bls-ppi8.json');
 const preview=()=>previewInflation19(home,{now:Date.parse('2026-11-18T11:00:00.000Z'),
  openDb:()=>{throw Error('NO_DB_FIXTURE');}});
 try{
  doc.series.WPU102502[1].value='provider-invalid-string';
  fs.writeFileSync(sourceFile,JSON.stringify(doc));
  assert.throws(()=>readPpi(home),/INFL19_ROW_INVALID/,
   'existing standalone readPpi remains all-eight strict');
  const oneBad=preview();
  assert.equal(oneBad.status,'PASS_READONLY');
  assert.equal(oneBad.ready,7);
  assert.equal(oneBad.payload.status,'PARTIAL');
  assert.equal(oneBad.payload.score,null);
  assert.equal(oneBad.missing['6'],'INFL19_BLS_SOURCE_UNAVAILABLE');
  assert.deepEqual(oneBad.payload.indicators
   .filter(row=>['5','6','7','8','9','10','11','25'].includes(row.id))
   .map(row=>[row.id,row.status,row.value]),[
    ['5','READY',101],['6','PENDING',null],['7','READY',101],
    ['8','READY',101],['9','READY',101],['10','READY',101],
    ['11','READY',101],['25','READY',101]]);
  assert.equal(oneBad.providerCalls,0);
  assert.equal(oneBad.d1Writes,0);
  assert.equal(oneBad.dbWrites,0);
  // A corrupted timestamp is also series-local when the document itself is intact.
  doc.series.WPU102502=goodRows();
  doc.seriesSourceStoredAt.WPU102502='NOT_A_TIMESTAMP';
  fs.writeFileSync(sourceFile,JSON.stringify(doc));
  const badTime=preview();
  assert.equal(badTime.ready,7);
  assert.equal(badTime.missing['6'],'INFL19_BLS_SOURCE_UNAVAILABLE');
  // Bad top-level provider provenance must still reject every PPI sibling.
  doc.provider='UNAPPROVED_SOURCE';
  fs.writeFileSync(sourceFile,JSON.stringify(doc));
  const invalidBatch=preview();
  assert.equal(invalidBatch.status,'PENDING');
  assert.equal(invalidBatch.ready,0);
  assert.equal(invalidBatch.payload,null);
  assert.equal(Object.keys(invalidBatch.missing)
   .filter(id=>['5','6','7','8','9','10','11','25'].includes(id)).length,8);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
