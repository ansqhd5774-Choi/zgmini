// Synthetic structural fixtures only. These tests are NOT upstream API evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {numeric,period,parseFsc,parseBok,searchableTables,usableItems,recentRange,runProvider,clearDiagnosticCache,success,phase1KoreaDataCheck} from '../worker/phase1-korea.mjs';
const key='synthetic-test-credential';
const now=()=>new Date('2026-09-10T00:00:00Z');
const response=x=>Response.json(x);
const fsc=rows=>({response:{header:{resultCode:'00'},body:{totalCount:rows.length,items:{item:rows}}}});
const rows=[{basDt:'20260103',crdTrFingWhl:'3'},{basDt:'20260101',crdTrFingWhl:'0'}];
test('FSC validates, deduplicates and selects greatest date rather than last row',()=>{
 const s=parseFsc(fsc([...rows,rows[0],{basDt:'20260230',crdTrFingWhl:'1'},{basDt:'20260104',crdTrFingWhl:null},{basDt:'20260105',crdTrFingWhl:'NA'},{basDt:'20260106',crdTrFingWhl:''},{basDt:'20260107',other:99}]));
 assert.equal(s.recordCount,2);assert.equal(s.observationDate,'20260103');assert.equal(s.historyAvailable,true);assert.equal(s.nullOrMissing,true);assert.equal(s.unit,null);
 assert.deepEqual(parseFsc(fsc(rows)),parseFsc(fsc([...rows].reverse())));
});
test('conflicting duplicates excluded; duplicate-only history is false',()=>{
 assert.equal(parseFsc(fsc([rows[0],rows[0]])).historyAvailable,false);
 const s=parseFsc(fsc([...rows,{...rows[0],crdTrFingWhl:'4'}]));assert.equal(s.recordCount,1);assert.equal(s.conflictingDateCount,1);
});
test('strict numeric and calendar validation preserves genuine zero',()=>{
 for(const v of [null,undefined,'',' ','.','NA',true,'1,2',Infinity]) assert.equal(numeric(v),null);
 assert.equal(numeric('0'),0);assert.equal(numeric('1,234.5'),1234.5);
 assert.equal(period('20240229','D'),'20240229');assert.equal(period('20230229','D'),null);
 for(const [v,c,result] of [['2026','A','2026'],['2026','Y','2026'],['202602','Q','2026Q2'],['2026Q3','Q','2026Q3'],['202613','M',null],['202601','W',null]])assert.equal(period(v,c),result);
});
test('BOK wrappers never count metadata as observations',()=>{
 assert.equal(parseBok({StatisticTableList:{row:[{STAT_CODE:'S'}]}},'M'),null);
 assert.equal(parseBok({StatisticSearch:{row:{TIME:'202601'}}},'M'),null);
 assert.equal(searchableTables({}),null);
 assert.equal(searchableTables({StatisticTableList:{row:[{STAT_CODE:'S',SRCH_YN:'Y',CYCLE:'M'},{STAT_CODE:'G',SRCH_YN:'N',CYCLE:'M'},{STAT_CODE:'X',SRCH_YN:'Y'}]}}).length,1);
 assert.equal(usableItems({StatisticItemList:{row:[{ITEM_CODE:'I',CYCLE:'M',START_TIME:'202501',END_TIME:'202608',DATA_CNT:'2'},{ITEM_CODE:'X',CYCLE:'M',DATA_CNT:0}]}}).length,1);
});
test('BOK observations require date, number, unit; sort and deduplicate',()=>{
 const r={TIME:'202602',DATA_VALUE:'2',UNIT_NAME:'test-unit'};
 const s=parseBok({StatisticSearch:{row:[r,{...r,TIME:'202601',DATA_VALUE:'0'},r,{...r,TIME:'202603',DATA_VALUE:null},{...r,TIME:'202604',UNIT_NAME:''}]}},'M');
 assert.equal(s.observationCount,2);assert.equal(s.observationDate,'202602');assert.equal(s.historyAvailable,true);assert.equal(s.unitSource,'api-response');
});
test('BOK cycle ranges cap future metadata and reject unsupported cycles',()=>{
 for(const [CYCLE,START_TIME,END_TIME,cap] of [['A','2020','2030','2026'],['Y','2020','2030','2026'],['Q','2020Q1','2030Q4','2026Q3'],['M','202001','203012','202609'],['D','20200101','20301231','20260910']])assert.equal(recentRange({CYCLE,START_TIME,END_TIME},now()).end,cap);
 assert.equal(recentRange({CYCLE:'W',START_TIME:'202001',END_TIME:'202609'},now()),null);
});
const kosisResponses=[[{ORG_ID:'O',TBL_ID:'T',TBL_NM:'synthetic'}],[{OBJ_ID:'ITEM',ITM_ID:'I'}],[{OBJ_ID:'A',ITM_ID:'C'}],[{PRD_SE:'M'}],[1,2].map(n=>({ORG_ID:'O',TBL_ID:'T',ITM_ID:'I',C1:'C',PRD_SE:'M',PRD_DE:`20260${n}`,DT:String(n),UNIT_NM:'test-unit'}))];
test('KOSIS chain reports IDs and caches only metadata after valid history',async()=>{
 clearDiagnosticCache();let i=0;const urls=[];
 const a=await runProvider('KOSIS',key,{now,fetch:async u=>{urls.push(new URL(u));return response(kosisResponses[i++]);}});
 assert.equal(a.technicalValidationSuccess,true);assert.equal(a.selectedObjectId,'C');assert.equal(a.observationCount,2);
 assert.deepEqual(a.stages.map(s=>s.stage),['KOSIS_SEARCH','KOSIS_ITM','KOSIS_OBJ','KOSIS_PRD','KOSIS_DATA']);
 assert.equal(urls[2].searchParams.get('type'),'ITM');assert.equal(urls[4].searchParams.get('objL1'),'C');
 const b=await runProvider('KOSIS',key,{now,fetch:async()=>response(kosisResponses[4])});assert.deepEqual(b.stages.map(s=>s.stage),['KOSIS_DATA']);
 assert.ok(!JSON.stringify(b).includes(key));assert.ok(!JSON.stringify(b).includes('"DT"'));clearDiagnosticCache();
});
for(const [stage,index] of [['SEARCH',0],['ITM',1],['OBJ',2],['DATA',4]])for(const kind of ['HTTP_ERROR','PARSE_ERROR','TIMEOUT'])test(`KOSIS ${stage} distinguishes ${kind}`,async()=>{
 clearDiagnosticCache();let i=0;
 const r=await runProvider('KOSIS',key,{now,timeoutMs:5,fetch:async(_u,options)=>{
  if(i++!==index)return response(kosisResponses[i-1]);
  if(kind==='HTTP_ERROR')return new Response('denied',{status:403});
  if(kind==='PARSE_ERROR')return new Response('{invalid');
  return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('synthetic abort'))));
 }});
 assert.equal(r.errorType,`KOSIS_${stage}_${kind}`);assert.equal(r.stages.at(-1).errorType,r.errorType);assert.equal(r.technicalValidationSuccess,false);assert.equal(r.stages.at(-1).attempted,true);
});
test('KOSIS empty observations not successful or cached',async()=>{
 clearDiagnosticCache();let i=0;const r=await runProvider('KOSIS',key,{fetch:async()=>response(i++===4?[]:kosisResponses[i-1])});
 assert.equal(r.errorType,'KOSIS_DATA_EMPTY');assert.equal(r.stages.at(-1).errorType,r.errorType);
 const again=await runProvider('KOSIS',key,{fetch:async()=>new Response('{}')});assert.equal(again.stage,'KOSIS_SEARCH');
});
test('BOK advances invalid candidate then searches real wrapper',async()=>{
 let i=0;const replies=[{StatisticTableList:{row:['S1','S2'].map(STAT_CODE=>({STAT_CODE,SRCH_YN:'Y',CYCLE:'M'}))}},{StatisticItemList:{row:[]}},{StatisticItemList:{row:[{ITEM_CODE:'I',CYCLE:'M',START_TIME:'202501',END_TIME:'202608',DATA_CNT:2}]}},{StatisticSearch:{row:[1,2].map(n=>({TIME:`20260${n}`,DATA_VALUE:String(n),UNIT_NAME:'test-unit'}))}}];
 const r=await runProvider('BOK',key,{now,fetch:async u=>{assert.equal(new URL(u).hostname,'ecos.bok.or.kr');return response(replies[i++]);}});
 assert.equal(r.technicalValidationSuccess,true);assert.equal(r.metadataCount,3);assert.equal(r.observationCount,2);assert.equal(r.selectedStatCode,'S2');assert.equal(r.candidateFailures[0].errorType,'BOK_ITEM_NOT_FOUND');
});
test('BOK search is bounded to ten candidates',async()=>{
 let calls=0;const r=await runProvider('BOK',key,{fetch:async()=>response(calls++===0?{StatisticTableList:{row:Array.from({length:12},(_,i)=>({STAT_CODE:`S${i}`,SRCH_YN:'Y',CYCLE:'M'}))}}:{StatisticItemList:{row:[]}})});
 assert.equal(calls,11);assert.equal(r.candidateFailures.length,10);assert.equal(r.observationCount,0);assert.equal(r.technicalValidationSuccess,false);
});
test('FSC URL encodes credential once; output contains summaries only',async()=>{
 const r=await runProvider('FSC','synthetic%2Btoken%3D',{now,fetch:async u=>{const x=new URL(u);assert.equal(x.searchParams.get('serviceKey'),'synthetic+token=');assert.ok(x.pathname.endsWith('/getGrantingOfCreditBalanceInfo'));return response(fsc(rows));}});
 assert.equal(r.technicalValidationSuccess,true);assert.ok(!JSON.stringify(r).includes('synthetic'));assert.ok(!JSON.stringify(r).includes('crdTrFingWhl'));
});
test('uniform success gates and missing-secret no request',async()=>{
 const ok={requestAttempted:true,secretPresent:true,authSuccess:true,httpStatus:200,parserSuccess:true,observationCount:2,historyAvailable:true};assert.equal(success(ok),true);
 for(const field of ['requestAttempted','secretPresent','authSuccess','parserSuccess','historyAvailable'])assert.equal(success({...ok,[field]:false}),false);
 assert.equal(success({...ok,observationCount:1}),false);assert.equal(success({...ok,httpStatus:403}),false);
 const r=await runProvider('FSC',undefined,{fetch:()=>{throw Error('must not call');}});assert.equal(r.requestAttempted,false);
});
test('route isolates provider failure and limits repeat calls without exposing errors',async()=>{
 const original=globalThis.fetch;
 try{clearDiagnosticCache();globalThis.fetch=async u=>new URL(u).hostname==='apis.data.go.kr'?response(fsc(rows)):Promise.reject(new Error(key));
 const r=await phase1KoreaDataCheck(new Request('https://example.test/api/internal/phase1-korea-data-check'),{FSC_API_KEY:key,KOSIS_API_KEY:key,BOK_API_KEY:key});const data=await r.json();
 assert.equal(r.status,200);assert.equal(data.fsc.technicalValidationSuccess,true);assert.equal(data.kosis.technicalValidationSuccess,false);assert.equal(data.bok.technicalValidationSuccess,false);assert.ok(!JSON.stringify(data).includes(key));
 assert.equal((await phase1KoreaDataCheck(new Request('https://example.test/'),{})).status,429);
 }finally{globalThis.fetch=original;clearDiagnosticCache();}
});
