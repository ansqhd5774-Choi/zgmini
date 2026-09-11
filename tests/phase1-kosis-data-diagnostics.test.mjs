import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider,clearDiagnosticCache,kosisDataShape,kosisRequestSummary} from '../worker/phase1-korea.mjs';
async function check(payload){
 clearDiagnosticCache();const r=await runProvider('KOSIS','synthetic-private-key',{fetch:async input=>{
  const p=new URL(input).searchParams;
  if(new URL(input).pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I',ITM_NM:'test item',UNIT_NM:'test unit'},...Array.from({length:12},(_,i)=>({OBJ_ID:'D',ITM_ID:`V${i}`,ITM_NM:`value ${i}`,OBJ_NM:'dimension'}))]);
  if(p.get('type')==='PRD')return Response.json([{PRD_SE:'Q'}]);
  return Response.json(payload);
 }});clearDiagnosticCache();return r;
}
test('ITM diagnostics come from metadata',async()=>{const r=await check([]),d=r.candidateDiagnostics[0];assert.equal(d.selectedItemId,'I');assert.equal(d.selectedItemName,'test item');assert.equal(d.selectedItemUnit,'test unit');assert.equal(d.itemCandidateCount,1);});
test('dimension preview capped at ten without changing selected value',async()=>{const r=await check([]),d=r.candidateDiagnostics[0].dimensions[0];assert.equal(d.dimensionValueCount,12);assert.equal(d.dimensionValuesPreview.length,10);assert.equal(d.selectedValueId,'V0');});
test('request summary reflects actual parameters',async()=>{const r=await check([]),s=r.candidateDiagnostics[0].periodAttempts[0].dataRequestSummary;assert.equal(s.orgId,'O');assert.equal(s.objL1,'V0');assert.equal(s.prdSe,'Q');assert.equal(s.newEstPrdCnt,'13');assert.equal(s.startPrdDePresent,false);});
test('API key and full URL omitted from request summary',()=>{const s=kosisRequestSummary(new URL('https://example.invalid/?orgId=O&apiKey=synthetic-private-key'));assert.equal(JSON.stringify(s).includes('synthetic-private-key'),false);assert.equal(JSON.stringify(s).includes('https:'),false);});
test('empty ARRAY is explicit',async()=>{const r=await check([]),a=r.candidateDiagnostics[0].periodAttempts[0];assert.equal(a.dataPayloadType,'ARRAY');assert.equal(a.dataRecordCount,0);assert.equal(a.dataEmptyReason,'EMPTY_ARRAY');});
test('empty OBJECT retains parser failure and object shape',async()=>{const r=await check({}),a=r.candidateDiagnostics[0].periodAttempts[0];assert.equal(a.dataPayloadType,'OBJECT');assert.equal(a.dataRecordCount,null);assert.equal(r.errorType,'KOSIS_DATA_PARSE_ERROR');});
test('first-record and top-level key lists capped at twenty',()=>{const obj=Object.fromEntries(Array.from({length:30},(_,i)=>[`unknown${i}`,'private']));assert.equal(kosisDataShape([obj]).dataFirstRecordKeys.length,20);assert.equal(kosisDataShape(obj).dataTopLevelKeys.length,20);assert.equal(JSON.stringify(kosisDataShape(obj)).includes('private'),false);});
test('API errors expose safe code only and preserve stopping behavior',async()=>{const r=await check({err:'11',errMsg:'synthetic-private-key'}),a=r.candidateDiagnostics[0].periodAttempts[0];assert.equal(a.dataApiErrorCode,'11');assert.equal(a.dataApiErrorType,'KOSIS_DATA_API_ERROR');assert.equal(JSON.stringify(r).includes('synthetic-private-key'),false);});
test('non-numeric DT distinguished without changing EMPTY result',async()=>{const r=await check([{ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',C1:'V0',PRD_SE:'Q',PRD_DE:'2026Q1',UNIT_NM:'test',DT:'NA'}]);assert.equal(r.candidateDiagnostics[0].periodAttempts[0].dataEmptyReason,'NO_NUMERIC_DT');assert.equal(r.observationCount,0);});
test('mismatched rows distinguished without changing selection',async()=>{const r=await check([{ORG_ID:'OTHER',DT:'1'}]);assert.equal(r.candidateDiagnostics[0].periodAttempts[0].dataEmptyReason,'NO_MATCHING_ROWS');assert.equal(r.observationCount,0);});
