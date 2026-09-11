import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKosisPrd,kosisPeriods,runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
// Synthetic protocol fixtures; never evidence of live authentication or observations.
for(const singleton of [false,true])test(`PRD ${singleton?'singleton':'array'} extracts official fields`,()=>{
 const row={PRD_SE:'Q',PRD_DE:'2026Q1'};
 const p=parseKosisPrd(singleton?row:[row]);
 assert.equal(p.errorType,null);assert.equal(p.diagnostics.prdRecordCount,1);
 assert.equal(kosisPeriods(p.records).selectedPrdSe,'Q');
 assert.equal(p.diagnostics.prdHasUppercasePrdSe,true);
});
test('multiple PRD rows deduplicate supported periods without changing priority',()=>{
 const p=parseKosisPrd([{PRD_SE:'Q'},{PRD_SE:'M'},{PRD_SE:'Q'}]);
 assert.deepEqual(kosisPeriods(p.records).supportedPrdSe,['Q','M']);
 assert.equal(kosisPeriods(p.records).selectedPrdSe,'M');
});
test('repeated PRD_SE remains one supported period',()=>{
 assert.deepEqual(kosisPeriods(parseKosisPrd([{PRD_SE:'Y'},{PRD_SE:'Y'}]).records).supportedPrdSe,['Y']);
});
test('PRD_DE-only record is recognized but contains no usable period',()=>{
 const p=parseKosisPrd({PRD_DE:'2025'});assert.equal(p.errorType,null);
 assert.equal(p.diagnostics.prdRecordCount,1);
 assert.equal(kosisPeriods(p.records).requestPrdSe,null);
});
test('empty array differs from unknown schema and unverified wrappers',()=>{
 assert.equal(parseKosisPrd([]).errorType,'KOSIS_PRD_NO_DATA');
 for(const p of [{other:'x'},{row:[{PRD_SE:'M'}]},null,[{other:'x'}]])
  assert.equal(parseKosisPrd(p).errorType,'KOSIS_PRD_SCHEMA_UNRECOGNIZED');
});
test('lowercase shape is diagnosed without guessing JSON compatibility',()=>{
 const p=parseKosisPrd({prdSe:'M',prdDe:'202601'});
 assert.equal(p.errorType,'KOSIS_PRD_SCHEMA_UNRECOGNIZED');
 assert.equal(p.diagnostics.prdHasLowercasePrdSe,true);
 assert.equal(p.diagnostics.prdHasUppercasePrdSe,false);
});
async function check(payload){
 clearDiagnosticCache();let dataCalls=0;
 const r=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'A',ITM_ID:'V'}]);
  if(p.get('type')==='PRD')return Response.json(payload);
  dataCalls++;assert.equal(p.get('prdSe'),'Y');
  return Response.json([1,2].map(i=>({ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',C1:'V',PRD_SE:'Y',PRD_DE:String(2023+i),UNIT_NM:'test-unit',DT:String(i)})));
 }});clearDiagnosticCache();return {r,dataCalls};
}
test('API error precedes shape parsing, including code 30',async()=>{
 for(const err of ['30','11']){
  const {r,dataCalls}=await check({err,errMsg:'synthetic error'});
  assert.equal(r.errorType,'KOSIS_PRD_API_ERROR');assert.equal(r.apiErrorCode,err);assert.equal(dataCalls,0);
 }
});
test('singleton metadata reaches unchanged DATA history path',async()=>{
 const {r,dataCalls}=await check({PRD_SE:'Y',PRD_DE:'2025'});
 assert.equal(dataCalls,1);assert.equal(r.historyAvailable,true);assert.equal(r.observationCount,2);
 assert.equal(r.prdPayloadType,'OBJECT');assert.equal(r.prdRecordCount,1);
});
test('shape diagnostics are bounded and never contain arbitrary values or key text',()=>{
 const payload={PRD_SE:'Y',...Object.fromEntries(Array.from({length:30},(_,i)=>[`untrusted-${i}`,'private-value']))};
 const d=parseKosisPrd(payload).diagnostics;
 assert.ok(d.prdTopLevelKeys.length<=20);assert.ok(d.prdFirstRecordKeys.length<=20);
 assert.equal(JSON.stringify(d).includes('private-value'),false);
 assert.equal(JSON.stringify(d).includes('untrusted-'),false);
});
