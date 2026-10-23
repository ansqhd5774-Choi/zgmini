import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ingestQuantum,prepareQuantum,QUANTUM_MODE} from '../scripts/pc-writer/theme-quantum-stage.mjs';

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
