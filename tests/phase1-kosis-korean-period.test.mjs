import test from 'node:test';
import assert from 'node:assert/strict';
import {kosisPeriods,runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
// Protocol fixtures derived from user-supplied labels, not live API verification.
for(const [raw,expected] of [['분기','Q'],['년','Y'],[' 분기 ','Q'],['Q','Q'],['Y','Y'],['A','Y']])
 test(`confirmed period ${raw} maps to ${expected}`,()=>{
  const p=kosisPeriods([{PRD_SE:raw}]);assert.equal(p.selectedPrdSe,expected);assert.equal(p.requestPrdSe,expected);
 });
test('Version 61 label pair preserves raw values and selects quarterly',()=>{
 const p=kosisPeriods([{PRD_SE:'분기'},{PRD_SE:'년'}]);
 assert.deepEqual(p.rawPeriodCodes,['분기','년']);assert.deepEqual(p.normalizedPeriodCodes,['Q','Y']);
 assert.deepEqual(p.supportedPrdSe,['Q','Y']);assert.equal(p.selectedRawPrdSe,'분기');
 assert.equal(p.selectedPrdSe,'Q');assert.equal(p.requestPrdSe,'Q');assert.equal(p.periodNormalizationApplied,true);
});
test('unconfirmed Korean labels remain unrecognized',()=>{
 const labels=['월','일','반기','다년주기','부정기','미확인'];
 const p=kosisPeriods(labels.map(PRD_SE=>({PRD_SE})));
 assert.deepEqual(p.unrecognizedPeriodCodes,labels);assert.equal(p.requestPrdSe,null);
});
test('quarterly label sends canonical Q to DATA',async()=>{
 clearDiagnosticCache();let dataCalls=0;
 const r=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'A',ITM_ID:'V'}]);
  if(p.get('type')==='PRD')return Response.json([{PRD_SE:'분기'},{PRD_SE:'년'}]);
  dataCalls++;assert.equal(p.get('prdSe'),'Q');
  return Response.json([1,2].map(i=>({ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',C1:'V',PRD_SE:'Q',PRD_DE:`2026Q${i}`,UNIT_NM:'test-unit',DT:String(i)})));
 }});clearDiagnosticCache();assert.equal(dataCalls,1);assert.equal(r.historyAvailable,true);assert.equal(r.requestPrdSe,'Q');
});
