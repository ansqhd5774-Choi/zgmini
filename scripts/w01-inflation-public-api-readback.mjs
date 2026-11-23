import {INFLATION_CANDIDATES_7_PUBLIC_ROUTE,validateInflationCandidates7Public}
 from '../worker/inflation-causal-candidates-public-7-r1.mjs';
import {INFLATION_CAUSAL_PUBLIC_ROUTE,validateInflationCausalPublic}
 from '../worker/inflation-causal-public-r1.mjs';

// One-off production GET verification on the isolated W01 PR. No PC/D1/provider writes.
const SITE='https://zgmini.kr';
const expected={
 seven:{version:'INFL7_PRESENTATION_c46e53726c17d811e62a42865a9f3801c57a72234e843bac85c237e6732276d6',rows:[
 ['2',4.153,'2026-11-02'],['16',5910402249.78,'2026-09-30'],['22',451.337,'2026-10-01'],
 ['23',446.588,'2026-10-01'],['24',159.78,'2026-09-01'],['28',976044,'2026-09-01'],['29',99.4361,'2026-09-01']]},
 nineteen:{version:'INFL19_PRESENTATION_3e5a3fced8b2f6875a5a822ee322064b3d77420f352dac8ddd817d4534f6cd2e',rows:[
 ['1',102.07,'2026-10-01'],['3',3.1,'2026-11-17'],['4',9.64,'2026-08'],
 ['5',388.58,'2026-09-01'],['6',835.342,'2026-09-01'],['7',282.34,'2026-09-01'],
 ['8',338.06,'2026-09-01'],['9',203.861,'2026-09-01'],['10',275.172,'2026-09-01'],
 ['11',246.125,'2026-09-01'],['12',38,'2026-10-01'],['13',178.574,'2026-07-01'],
 ['14',2.4,'2026-07-01'],['18',122.6503,'2026-11-13'],['19',138.5,'2026-10-01'],
 ['21',1.2619111813086497,'2026-10-01'],['25',300.589,'2026-09-01'],
 ['26',127.741,'2026-09-01'],['31',3.902742862701416,'2026-09-01']]}
};
const check=(ok,message)=>{if(!ok)throw Error(message)};
function matchKnownSnapshot(payload,pin){
 if(payload.sourceVersion!==pin.version)return 'NEW_CHECKPOINT_NEEDS_D1_RECHECK';
 const rows=new Map(payload.indicators.map(x=>[x.id,x]));
 for(const [id,value,date] of pin.rows){
  const row=rows.get(id);
  check(row?.status==='READY'&&row.value===value&&row.observationDate===date,
   'PINNED_D1_VALUE_OR_DATE_MISMATCH_'+id);
 }
 return 'PINNED_D1_VALUES_AND_DATES_MATCH';
}
export function checkR2(payload,now=Date.now()){
 check(payload?.status==='READY','R2_NOT_READY');
 check(payload.methodologyVersion==='INFLATION_R2_R29_56_IA','R2_METHOD_MISMATCH');
 check(/^20\d\d-\d\d-\d\d$/.test(payload.asOfDate??''),'R2_ASOF_INVALID');
 check(Date.parse(payload.asOfDate+'T00:00:00Z')<=now,'R2_FUTURE_ASOF');
 check(typeof payload.score==='number'&&Number.isFinite(payload.score),'R2_SCORE_INVALID');
 check(Array.isArray(payload.trend)&&payload.trend.length===12,'R2_TREND_COUNT_INVALID');
 const last=payload.trend.at(-1);
 check(last?.label===payload.asOfDate,'R2_TREND_FUTURE_DATE');
 check(last.value===payload.score,'R2_TREND_SCORE_MISMATCH');
 return {status:'PASS',asOfDate:payload.asOfDate,score:payload.score,trendLast:last.label};
}
async function fetchPublic(path){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(SITE+path,{method:'GET',redirect:'error',cache:'no-store',
   headers:{accept:'application/json'},signal:controller.signal});
  check(response.status===200,'HTTP_'+response.status+'_'+path);
  check(response.headers.get('content-type')?.includes('application/json'),
   'NON_JSON_CONTENT_TYPE_'+path);
  const body=await response.text();
  check(body.length>1&&body.length<120000,'INVALID_RESPONSE_LENGTH_'+path);
  return JSON.parse(body);
 }finally{clearTimeout(timeout)}
}
export async function checkInflationApis({read=fetchPublic,now=Date.now()}={}){
 const [seven,nineteen,r2]=await Promise.all([read(INFLATION_CANDIDATES_7_PUBLIC_ROUTE),
  read(INFLATION_CAUSAL_PUBLIC_ROUTE),read('/api/inflation-detail')]);
 validateInflationCandidates7Public(seven,{now});
 validateInflationCausalPublic(nineteen,{now});
 check(seven.status==='READY'&&seven.indicators.filter(x=>x.status==='READY').length===7,
  'INFL7_NOT_7_READY');
 check(nineteen.status==='READY'&&nineteen.indicators.filter(x=>x.status==='READY').length===19,
  'INFL19_NOT_19_READY');
 return {
  seven:{ready:7,sourceVersion:seven.sourceVersion,pinnedReadback:matchKnownSnapshot(seven,expected.seven)},
  nineteen:{ready:19,sourceVersion:nineteen.sourceVersion,pinnedReadback:matchKnownSnapshot(nineteen,expected.nineteen)},
  r2:checkR2(r2,now)
 };
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
 checkInflationApis().then(result=>console.log('W01_PUBLIC_READBACK_PASS='+JSON.stringify(result)),
  error=>{console.error('W01_PUBLIC_READBACK_FAIL='+String(error.message||error));process.exitCode=1});
}
