import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
async function check(plan,periods=['Q','Y']) {
 clearDiagnosticCache();const calls=[];
 const r=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'A'},{ORG_ID:'O',TBL_ID:'B'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'A',ITM_ID:'V'}]);
  if(p.get('type')==='PRD')return Response.json(periods.map(PRD_SE=>({PRD_SE})));
  const t=p.get('tblId'),c=p.get('prdSe');calls.push(t+c);const n=plan[t+c]??2;
  if(typeof n==='string')return Response.json({err:n});
  return Response.json(Array.from({length:n},(_,i)=>({ORG_ID:'O',TBL_ID:t,ITM_ID:'I',C1:'V',PRD_SE:c,PRD_DE:c==='Q'?`2026Q${i+1}`:String(2024+i),UNIT_NM:'test-unit',DT:String(i+1)})));
 }});clearDiagnosticCache();return {r,calls};
}
test('Q success skips Y',async()=>{const {r,calls}=await check({});assert.deepEqual(calls,['AQ']);assert.equal(r.historyAvailable,true);});
test('Q empty tries Y',async()=>{const {r,calls}=await check({AQ:0});assert.deepEqual(calls,['AQ','AY']);assert.equal(r.candidateDiagnostics[0].periodAttempts[0].errorType,'KOSIS_DATA_EMPTY');});
test('Y success updates selected period and history',async()=>{const {r}=await check({AQ:0});assert.equal(r.selectedPrdSe,'Y');assert.equal(r.requestPrdSe,'Y');assert.equal(r.historyAvailable,true);});
test('all periods empty advance to next candidate',async()=>{const {r,calls}=await check({AQ:0,AY:0});assert.deepEqual(calls,['AQ','AY','BQ']);assert.equal(r.selectedTableId,'B');});
test('first candidate Y success stops candidate traversal',async()=>{const {r,calls}=await check({AQ:0});assert.equal(r.candidatesTried,1);assert.equal(calls.some(c=>c.startsWith('B')),false);});
test('Y-only metadata does not invent Q',async()=>{const {calls}=await check({},['Y']);assert.deepEqual(calls,['AY']);});
test('API authentication errors stop; code 30 follows NO_DATA policy',async()=>{
 const denied=await check({AQ:'11'});assert.deepEqual(denied.calls,['AQ']);assert.equal(denied.r.historyAvailable,false);
 const absent=await check({AQ:'30'});assert.deepEqual(absent.calls,['AQ','AY']);assert.equal(absent.r.historyAvailable,true);
});
test('one observation tries next supported period',async()=>{const {r,calls}=await check({AQ:1});assert.deepEqual(calls,['AQ','AY']);assert.equal(r.candidateDiagnostics[0].periodAttempts[0].errorType,'KOSIS_DATA_HISTORY_INSUFFICIENT');assert.equal(r.historyAvailable,true);});
