// Synthetic structure tests, never official API success evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
async function check(mode){
 clearDiagnosticCache();let objCalls={};const calls=[];
 const result=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
 const u=new URL(input),p=u.searchParams,table=p.get('tblId');calls.push({path:u.pathname,table});
 if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([1,2].map(n=>({ORG_ID:'O',TBL_ID:`T${n}`,TBL_NM:'test',STAT_ID:'S',STRT_PRD_DE:'202501',END_PRD_DE:'202602',REC_TBL_SE:'test'})));
 if(p.get('type')==='ITM'){
  assert.equal(p.has('objId'),false);assert.equal(p.has('itmId'),false);
  const count=objCalls[table]=(objCalls[table]??0)+1;
  if(mode==='ALL30'||table==='T1'&&(mode==='ITM30'&&count===1||mode==='OBJ30'&&count===2))return Response.json({err:'30'});
  return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'A',ITM_ID:'C'}]);
 }
 if(p.get('type')==='PRD')return Response.json([{PRD_SE:mode==='ANNUAL'&&table==='T1'?'Y':'M'}]);
 if(table==='T1'&&mode==='DATA30')return Response.json({err:'30'});
 const count=mode==='ONE'?1:table==='T1'&&mode==='EMPTY'?0:2;
 return Response.json(Array.from({length:count},(_,i)=>({ORG_ID:'O',TBL_ID:table,ITM_ID:'I',C1:'C',PRD_SE:'M',PRD_DE:`20260${i+1}`,UNIT_NM:'test-unit',DT:String(i)})));
 }});return {result,calls};
}
for(const mode of ['ITM30','OBJ30','EMPTY','DATA30','ANNUAL'])test(`candidate fallback ${mode} selects only validated second table`,async()=>{
 const {result:r}=await check(mode);assert.equal(r.selectedTableId,'T2');assert.equal(r.selectedCandidateIndex,1);assert.equal(r.candidatesTried,2);assert.equal(r.candidateCount,2);assert.equal(r.observationCount,2);assert.equal(r.historyAvailable,true);assert.equal(r.technicalValidationSuccess,true);
 if(mode.endsWith('30'))assert.equal(r.candidateDiagnostics[0].apiErrorCode,'30');
 assert.ok(!JSON.stringify(r).includes('synthetic-only'));clearDiagnosticCache();
});
test('all code30 candidates terminate with no selected IDs',async()=>{
 const {result:r,calls}=await check('ALL30');assert.equal(r.errorType,'KOSIS_NO_USABLE_CANDIDATE');assert.equal(r.candidatesTried,2);assert.equal(calls.length,3);assert.equal(r.selectedOrgId,undefined);assert.equal(r.observationCount,0);assert.equal(r.historyAvailable,false);assert.equal(r.candidateDiagnostics[0].errorType,'KOSIS_ITM_NO_DATA');
});
test('one numeric observation cannot select candidate or claim history',async()=>{
 const {result:r}=await check('ONE');assert.equal(r.errorType,'KOSIS_NO_USABLE_CANDIDATE');assert.equal(r.historyAvailable,false);assert.equal(r.selectedTableId,undefined);assert.equal(r.candidateDiagnostics[0].errorType,'KOSIS_DATA_HISTORY_INSUFFICIENT');
});
