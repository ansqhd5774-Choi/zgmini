// Synthetic metadata and parser fixtures only, never runtime verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {kosisDimensions,runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
const rows=n=>[{OBJ_ID:'ITEM',ITM_ID:'METRIC'},...Array.from({length:n},(_,i)=>({OBJ_ID:`D${i+1}`,OBJ_NM:`dimension${i+1}`,ITM_ID:`V${i+1}`,ITM_NM:'value',OBJ_ID_SN:1,UP_ITM_ID:''}))];
for(const n of [1,2,4,8])test(`${n} dimensions generate exact obj levels and validate history`,async()=>{
 clearDiagnosticCache();let requested=false;
 const r=await runProvider('KOSIS','synthetic-only',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json(rows(n));
  if(p.get('type')==='PRD')return Response.json([{PRD_SE:'M'}]);
  requested=true;
  for(let i=1;i<=8;i++)assert.equal(p.get(`objL${i}`),i<=n?`V${i}`:null);
  const tuple=Object.fromEntries(Array.from({length:n},(_,i)=>[`C${i+1}`,`V${i+1}`]));
  const observations=[1,2].map(i=>({ORG_ID:'O',TBL_ID:'T',ITM_ID:'METRIC',...tuple,PRD_SE:'M',PRD_DE:`20260${i}`,UNIT_NM:'test-unit',DT:String(i)}));
  return Response.json([...observations,{...observations[0],C1:'OTHER',DT:'999'},{...observations[0],DT:null}]);
 }});
 assert.equal(requested,true);assert.equal(r.historyAvailable,true);assert.equal(r.observationCount,2);assert.equal(r.dimensionCount,n);
 assert.deepEqual(r.generatedObjLevels,Array.from({length:n},(_,i)=>`objL${i+1}`));assert.equal(r.technicalValidationSuccess,true);
 assert.ok(!JSON.stringify(r).includes('synthetic-only'));clearDiagnosticCache();
});
test('9 dimensions rejected explicitly',()=>assert.throws(()=>kosisDimensions(rows(9)),{message:'KOSIS_OBJ_TOO_MANY_DIMENSIONS'}));
test('actual total metadata value is preferred without inventing a code',()=>{
 const r=kosisDimensions([...rows(1),{OBJ_ID:'D1',ITM_ID:'REAL_TOTAL_ID',ITM_NM:'전국',OBJ_ID_SN:2}]);
 assert.equal(r[0].selectedValueId,'REAL_TOTAL_ID');assert.equal(r[0].selectionReason,'EXPLICIT_TOTAL');
});
test('value ordering deterministic using metadata rank then ID',()=>{
 const v=[{OBJ_ID:'D',ITM_ID:'Z',OBJ_ID_SN:2},{OBJ_ID:'D',ITM_ID:'B',OBJ_ID_SN:1},{OBJ_ID:'D',ITM_ID:'A',OBJ_ID_SN:1}];
 assert.equal(kosisDimensions(v)[0].selectedValueId,'A');assert.equal(kosisDimensions(v.reverse())[0].selectedValueId,'A');
 assert.equal(kosisDimensions(v)[0].hierarchyStatus,'UNKNOWN');
});
test('parent node avoided; top-level leaf selected',()=>{
 const v=[{OBJ_ID:'D',ITM_ID:'P',UP_ITM_ID:'',OBJ_ID_SN:1},{OBJ_ID:'D',ITM_ID:'C',UP_ITM_ID:'P',OBJ_ID_SN:2}];
 const d=kosisDimensions(v)[0];assert.equal(d.selectedValueId,'C');assert.equal(d.hierarchyStatus,'LEAF_IN_METADATA');
});
test('cyclic hierarchy rejected safely',()=>assert.throws(()=>kosisDimensions([{OBJ_ID:'D',ITM_ID:'A',UP_ITM_ID:'B'},{OBJ_ID:'D',ITM_ID:'B',UP_ITM_ID:'A'}]),{message:'KOSIS_OBJ_HIERARCHY_UNRESOLVED'}));
test('empty and invalid classification values have specific errors',()=>{
 assert.throws(()=>kosisDimensions(rows(0)),{message:'KOSIS_OBJ_NO_DIMENSIONS'});
 assert.throws(()=>kosisDimensions([{OBJ_ID:'D',ITM_ID:''}]),{message:'KOSIS_OBJ_NO_VALID_VALUE'});
});
