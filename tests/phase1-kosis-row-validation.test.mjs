import test from 'node:test';
import assert from 'node:assert/strict';
import {kosisRowDiagnostics,runProvider,clearDiagnosticCache} from '../worker/phase1-korea.mjs';
const s={orgId:'O',tblId:'T',itmId:'I',prdSe:'Q',objL1:'V',objL2:'2'};
const row={ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',PRD_SE:'Q',PRD_DE:'2026Q1',C1:'V',C2:'2',UNIT_NM:'unit',DT:'987654.321'};
const d=(patch={})=>kosisRowDiagnostics([{...row,...patch}],s);
test('13 numeric rows counted with pre-dedup semantics',()=>{const r=kosisRowDiagnostics(Array.from({length:13},()=>({...row})),s);assert.equal(r.rowsReceived,13);assert.equal(r.rowsAccepted,13);assert.equal(r.observationCount,1);assert.equal(r.rowsCollapsedOrConflicting,12);});
test('DT present but invalid date has exact rejection',()=>{const r=d({PRD_DE:'bad'});assert.equal(r.rowsInvalidDate,1);assert.equal(r.rowsNonNumericDt,0);assert.equal(r.rowsRejected,1);});
test('C1 mismatch counted through production attempt without changing failure policy',async()=>{
 clearDiagnosticCache();const r=await runProvider('KOSIS','synthetic-private-key',{fetch:async input=>{
  const u=new URL(input),p=u.searchParams;
  if(u.pathname.endsWith('statisticsSearch.do'))return Response.json([{ORG_ID:'O',TBL_ID:'T'}]);
  if(p.get('type')==='ITM')return Response.json([{OBJ_ID:'ITEM',ITM_ID:'I'},{OBJ_ID:'D',ITM_ID:'V'}]);
  if(p.get('type')==='PRD')return Response.json([{PRD_SE:'Q'}]);
  return Response.json([{...row,C1:'other',C2:undefined}]);
 }});clearDiagnosticCache();const a=r.candidateDiagnostics[0].periodAttempts[0];
 assert.equal(a.rowValidation.rowsC1Mismatch,1);assert.equal(a.dataEmptyReason,'NO_MATCHING_ROWS');assert.equal(r.observationCount,0);
});
test('C2 mismatch counted',()=>assert.equal(d({C2:'other'}).rowsC2Mismatch,1));
test('item mismatch counted',()=>assert.equal(d({ITM_ID:'other'}).rowsItemMismatch,1));
test('Korean quarter uses existing normalizer',()=>{const r=d({PRD_SE:'분기'});assert.equal(r.firstRowMatches.periodMatches,true);assert.deepEqual(r.dataNormalizedPeriodCodes,['Q']);});
test('nonnumeric and missing blank numeric subcategories',()=>{assert.equal(d({DT:'NA'}).rowsNonNumericDt,1);assert.equal(d({DT:null}).rowsMissingDt,1);assert.equal(d({DT:' '}).rowsBlankDt,1);});
test('nonempty zero valid distinguished from empty upstream',()=>{assert.equal(d({C1:'other'}).classification,'NONEMPTY_PAYLOAD_ZERO_VALID_OBSERVATIONS');assert.equal(kosisRowDiagnostics([],s).classification,'UPSTREAM_EMPTY_ARRAY');});
test('DT value omitted and previews bounded',()=>{const r=kosisRowDiagnostics(Array.from({length:10},()=>({...row})),s);assert.equal(JSON.stringify(r).includes(row.DT),false);assert.equal(r.dtDiagnostics.length,3);assert.equal(r.rowMetadataPreview.length,3);});
test('nonmetadata secrets URLs and raw bodies omitted',()=>{const r=kosisRowDiagnostics([{...row,apiKey:'synthetic-private-key',Authorization:'Bearer synthetic-private-key',unknown:'synthetic-private-key',ORG_ID:'https://example.invalid/?apiKey=synthetic-private-key',TBL_ID:'synthetic-private-key',PRD_SE:'synthetic-private-key'}],s,[],['synthetic-private-key']);assert.equal(JSON.stringify(r).includes('synthetic-private-key'),false);assert.equal(JSON.stringify(r).includes('https:'),false);});
