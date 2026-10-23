import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ingestQuantum,prepareQuantum,QUANTUM_MODE} from '../scripts/pc-writer/theme-quantum-stage.mjs';
import {r158ScorePrices} from '../lib/market-score/theme-etf-provisional-score.mjs';

function fixture(t){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'quantum-stage-test-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const dataRoot=path.join(tmp,'data');fs.mkdirSync(dataRoot);
 const sourceFile=path.join(tmp,'qtum.jsonl');
 const lines=['2026-10-20T19:00:00Z','2026-10-21T19:00:00Z'].map((timestamp,i)=>JSON.stringify({symbol:'QTUM',timestamp,close:100+i,is_gap:false}));
 fs.writeFileSync(sourceFile,lines.join('\n')+'\n');
 return {dataRoot,inputFile:sourceFile};
}
test('quantum ingestion writes verifiable immutable raw and metadata under data root',t=>{
 const f=fixture(t),opts={...f,symbol:'QTUM',source:'https://getmarkethistory.com',collectedAt:'2026-10-23T01:00:00Z'};
 const result=ingestQuantum(opts);
 assert.equal(result.status,'PRIVATE_RAW_STORED');
 assert.equal(result.entry.priceMode,QUANTUM_MODE);
 assert.equal(result.entry.observationThrough,'2026-10-21');
 assert.match(result.entry.sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual([result.providerCalls,result.d1Writes,result.schedulerWrites],[0,0,0]);
 const home=path.join(f.dataRoot,'themes','quantum-computing');
 const manifest=JSON.parse(fs.readFileSync(path.join(home,'raw-manifest.json')));
 assert.equal(manifest.files.length,1);
 assert.deepEqual(manifest.files[0],result.entry);
 assert.equal(fs.readFileSync(path.join(home,result.entry.path),'utf8'),fs.readFileSync(f.inputFile,'utf8'));
 assert.equal(ingestQuantum(opts).entry.sha256,result.entry.sha256);
 assert.equal(JSON.parse(fs.readFileSync(path.join(home,'raw-manifest.json'))).files.length,1);
});
test('quantum stage does not guess price mode, source license or missing second asset',async t=>{
 const f=fixture(t);
 assert.throws(()=>ingestQuantum({...f,symbol:'QTUM',source:'http://unverified.example',collectedAt:'2026-10-23T01:00:00Z'}),/INGEST_PROVENANCE/);
 assert.throws(()=>ingestQuantum({...f,symbol:'QTUM',source:'https://getmarkethistory.com',collectedAt:'2026-10-23T01:00:00Z',priceMode:'OFFICIAL_CLOSE'}),/INGEST_PROVENANCE/);
 ingestQuantum({...f,symbol:'QTUM',source:'https://getmarkethistory.com',collectedAt:'2026-10-23T01:00:00Z'});
 await assert.rejects(prepareQuantum({dataRoot:f.dataRoot,selector:()=>[]}),/RAW_SYMBOL_MISSING_SPY/);
});
test('private calculator preserves 252 dates, checks R158 tail and cannot authorize public writes',async t=>{
 const f=fixture(t);let example=[];
 for(const symbol of ['QTUM','SPY']){
  const inputFile=path.join(path.dirname(f.inputFile),symbol+'.jsonl');const records=[];
  for(let i=0;i<630;i++){
   const d=new Date(Date.UTC(2024,0,1+i,19));
   records.push({symbol,timestamp:d.toISOString(),close:100+(symbol==='QTUM'?1.5:1)*i+Math.sin(i/7)*2,is_gap:false});
  }
  if(symbol==='QTUM')example=records;
  fs.writeFileSync(inputFile,records.map(r=>JSON.stringify(r)).join('\n')+'\n');
  ingestQuantum({dataRoot:f.dataRoot,symbol,inputFile,source:'https://getmarkethistory.com',collectedAt:'2026-10-23T01:00:00Z'});
 }
 const selector=rows=>rows.map(r=>({date:r.timestamp.slice(0,10),close:r.close}));
 const scorer=(own,spy)=>{const tail=r158ScorePrices(own,spy);return Array(249).fill(50).concat([tail[625],tail[626],tail[627]])};
 const result=await prepareQuantum({dataRoot:f.dataRoot,selector,scorer});
 assert.match(result.status,/PRIVATE_CANDIDATE/);
 const candidate=JSON.parse(fs.readFileSync(path.join(f.dataRoot,result.output)));
 assert.equal(candidate.history.length,252);assert.equal(candidate.publicationAuthorized,false);
 assert.equal(candidate.sourceCommercialRightsVerified,false);assert.equal(candidate.sourcePriceReconciled,false);
 assert.deepEqual([candidate.providerCalls,candidate.d1Writes,candidate.schedulerWrites],[0,0,0]);
 await assert.rejects(prepareQuantum({dataRoot:f.dataRoot,selector,scorer:()=>Array(252).fill(0)}),/R158_TAIL_PARITY/);
 assert.equal(example.length,630);
});
