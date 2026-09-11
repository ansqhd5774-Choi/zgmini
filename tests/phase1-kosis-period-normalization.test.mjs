import test from 'node:test';
import assert from 'node:assert/strict';
import {kosisPeriods,runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
// Synthetic protocol fixtures, not live API evidence.
for(const raw of ['M','Q','Y','A','S','F','IR'])test(`period normalization ${raw}`,()=>{
 const p=kosisPeriods([{PRD_SE:raw}]);assert.equal(p.requestPrdSe,raw==='A'?'Y':raw);assert.equal(p.selectedRawPrdSe,raw);
});
test('A and Q retained canonically; Q has priority',()=>{
 const p=kosisPeriods([{PRD_SE:'A'},{PRD_SE:'Q'}]);assert.deepEqual(p.normalizedPeriodCodes,['Y','Q']);assert.equal(p.requestPrdSe,'Q');
});
test('unknown X remains visible and is never requested',()=>{
 const p=kosisPeriods([{PRD_SE:'X'}]);assert.deepEqual(p.unrecognizedPeriodCodes,['X']);assert.equal(p.requestPrdSe,null);
});
test('annual metadata sends Y and annual output A reaches unchanged history validation',async()=>{
 clearDiagnosticCache();let requests=0;
 const r=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'A',ITM_ID:'V'}]);
  if(p.get('type')==='PRD')return Response.json([{PRD_SE:'A',PRD_DE:'2024'}]);
  requests++;assert.equal(p.get('prdSe'),'Y');
  return Response.json([1,2].map(i=>({ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',C1:'V',PRD_SE:'A',PRD_DE:String(2023+i),UNIT_NM:'test-unit',DT:String(i)})));
 }});clearDiagnosticCache();assert.equal(requests,1);assert.equal(r.historyAvailable,true);assert.equal(r.requestPrdSe,'Y');assert.equal(r.selectedRawPrdSe,'A');
});
test('trim and uppercase are explicit and deduplicate canonical codes',()=>{
 const p=kosisPeriods([{PRD_SE:' a '},{PRD_SE:'Y'}]);assert.deepEqual(p.normalizedPeriodCodes,['Y']);assert.equal(p.periodNormalizationApplied,true);
});
test('untrusted metadata values cannot become diagnostic secrets',()=>{
 const p=kosisPeriods([{PRD_SE:'https://example.invalid/private'}]);assert.deepEqual(p.unrecognizedPeriodCodes,['[UNRECOGNIZED_VALUE]']);
});
