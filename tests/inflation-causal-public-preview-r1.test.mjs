import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {summarize,previewInflation19} from '../scripts/pc-writer/inflation-causal-public-preview-r1.mjs';

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
