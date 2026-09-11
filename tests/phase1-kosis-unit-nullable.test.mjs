import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider,clearDiagnosticCache,summarize} from '../worker/phase1-korea.mjs';
const rows=Array.from({length:13},(_,i)=>({ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',C1:'V',PRD_SE:'Q',PRD_DE:`${2020+Math.floor(i/4)}Q${i%4+1}`,DT:String(i+1)}));
async function check(payload){
 clearDiagnosticCache();const r=await runProvider('KOSIS','synthetic-private-key',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'D',ITM_ID:'V'}]);
  if(p.get('type')==='PRD')return Response.json([{PRD_SE:'Q'}]);
  return Response.json(payload);
 }});clearDiagnosticCache();return r;
}
const diagnostics=r=>r.candidateDiagnostics[0].periodAttempts[0].rowValidation;
test('A missing unit accepts numeric valid observation',async()=>{const r=await check(rows.slice(0,1));assert.equal(diagnostics(r).rowsAccepted,1);assert.equal(diagnostics(r).observationCount,1);});
test('B all 13 missing units remain accepted',async()=>{const r=await check(rows);assert.equal(diagnostics(r).rowsAccepted,13);assert.equal(diagnostics(r).rowsMissingUnit,13);assert.equal(r.observationCount,13);});
test('C response unit preserved',async()=>{const r=await check(rows.map(r=>({...r,UNIT_NM:'test unit'})));assert.equal(r.unit,'test unit');assert.equal(r.unitSource,'api-response');});
test('D absent unit is null metadata',async()=>{const r=await check(rows);assert.equal(r.unit,null);assert.equal(r.unitSource,null);});
test('E nonnumeric DT still rejected without unit',async()=>{const r=await check(rows.map(r=>({...r,DT:'NA'})));assert.equal(diagnostics(r).rowsAccepted,0);assert.equal(diagnostics(r).rowsNonNumericDt,13);});
test('F dimension mismatch still rejected without unit',async()=>{const r=await check(rows.map(r=>({...r,C1:'other'})));assert.equal(diagnostics(r).rowsAccepted,0);assert.equal(diagnostics(r).rowsC1Mismatch,13);});
test('G invalid date still rejected without unit',async()=>{const r=await check(rows.map(r=>({...r,PRD_DE:'invalid'})));assert.equal(diagnostics(r).rowsAccepted,0);assert.equal(diagnostics(r).rowsInvalidDate,13);});
test('H null unit permits full technical history success',async()=>{const r=await check(rows.slice(0,2));assert.equal(r.historyAvailable,true);assert.equal(r.parserSuccess,true);assert.equal(r.errorType,null);assert.equal(diagnostics(r).classification,'VALID_OBSERVATIONS_FOUND');});
test('I no inferred unit and existing conflict/default policies preserved',async()=>{
 const r=await check(rows);assert.equal(r.unit,null);
 const same=[{PRD_DE:'2020',DT:'1',UNIT_NM:'u'},{PRD_DE:'2020',DT:'1'}];
 assert.equal(summarize(same,'PRD_DE','DT','Y','UNIT_NM',false).observationCount,1);
 assert.equal(summarize([...same,{...same[0],UNIT_NM:'other'}],'PRD_DE','DT','Y','UNIT_NM',false).observationCount,0);
 assert.equal(summarize([{PRD_DE:'2020',DT:'1'}],'PRD_DE','DT','Y','UNIT_NM').observationCount,0);
 assert.equal(summarize([...same,{...same[0],DT:'2'}],'PRD_DE','DT','Y','UNIT_NM',false).observationCount,0);
});
