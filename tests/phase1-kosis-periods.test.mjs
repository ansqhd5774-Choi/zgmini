import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider,clearDiagnosticCache,kosisPeriods} from '../worker/phase1-korea.mjs';
// Synthetic protocol fixtures only; no official API request or market expected value.
async function check(periods,{emptyFirst=false}={}) {
 clearDiagnosticCache();const calls=[];
 const result=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;calls.push({table:p.get('tblId'),type:p.get('type'),data:u.pathname.includes('Parameter')});
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'A'},{ORG_ID:'O',TBL_ID:'B'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'A',ITM_ID:'V'},{OBJ_ID:'B',ITM_ID:'Z'}]);
  if(p.get('type')==='PRD')return Response.json(periods.map(PRD_SE=>({PRD_SE,PRD_DE:PRD_SE==='Y'?'2025':'202601'})));
  if(emptyFirst&&p.get('tblId')==='A')return Response.json([]);
  const cycle=p.get('prdSe');assert.ok(periods.includes(cycle));assert.equal(p.get('objL2'),'Z');assert.equal(p.get('newEstPrdCnt'),'13');
  return Response.json([1,2].map(i=>({ORG_ID:'O',TBL_ID:p.get('tblId'),ITM_ID:'I',C1:'V',C2:'Z',PRD_SE:cycle,PRD_DE:cycle==='Y'?String(2023+i):cycle==='Q'?`2026Q${i}`:`20260${i}`,UNIT_NM:'test-unit',DT:String(i)})));
 }});clearDiagnosticCache();return {result,calls};
}
for(const periods of [['M'],['Q'],['Y'],['Q','M']])test(`metadata ${periods} reaches DATA and validates history`,async()=>{
 const {result:r,calls}=await check(periods);const chosen=periods.includes('M')?'M':periods[0];
 assert.equal(r.selectedPrdSe,chosen);assert.equal(r.monthlyAvailable,periods.includes('M'));assert.equal(r.historyAvailable,true);assert.equal(r.observationCount,2);assert.equal(r.selectedTableId,'A');assert.equal(r.candidatesTried,1);assert.equal(calls.filter(c=>c.data).length,1);assert.equal(r.technicalValidationSuccess,true);assert.equal(r.latestObservationDate,r.observationDate);
});
test('empty PRD has explicit candidate NO_DATA and no DATA calls',async()=>{
 const {result:r,calls}=await check([]);assert.equal(r.candidateDiagnostics[0].errorType,'KOSIS_PRD_NO_DATA');assert.equal(calls.some(c=>c.data),false);
});
test('quarterly empty DATA advances to next candidate',async()=>{
 const {result:r}=await check(['Q'],{emptyFirst:true});assert.equal(r.selectedTableId,'B');assert.equal(r.candidatesTried,2);assert.equal(r.historyAvailable,true);
});
test('period priorities only select codes present in metadata',()=>{
 assert.equal(kosisPeriods([{PRD_SE:'Y'},{PRD_SE:'D'}]).selectedPrdSe,'D');
 assert.equal(kosisPeriods([{PRD_SE:'Q'},{PRD_SE:'W'}]).selectedPrdSe,'Q');
 assert.equal(kosisPeriods([{PRD_SE:'CUSTOM',PRD_DE:'202601'}]).selectedPrdSe,null);
 assert.equal(kosisPeriods([{other:'M'}]).requestPrdSe,null);
});
