// Temporary, PR-only W01 public HTTP readback. No operational writes or provider calls.
// Existing Node.js pull_request CI runs this on a hosted runner; main/push runs skip it.
// Logs only public summary metadata, never full raw payload or credentials.
import assert from 'node:assert/strict';
import test from 'node:test';

const enabled=process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_EVENT_NAME==='pull_request';
const origin='https://zgmini.kr';
const allowed=[
 {name:'inflation7',path:'/api/inflation-candidate-inputs',schema:'inflation-causal-candidates-7-r1-v1',count:7},
 {name:'inflation19',path:'/api/inflation-causal-inputs',schema:'inflation-causal-public-19-r1-v1',count:19},
 {name:'inflationR2',path:'/api/inflation-detail'},
];

async function publicGet(entry){
 const url=origin+entry.path;
 const response=await fetch(url,{method:'GET',cache:'no-store',redirect:'error',
  headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
 const type=response.headers.get('content-type')??'';
 const raw=await response.text();
 const summary={name:entry.name,path:entry.path,httpStatus:response.status,
  contentType:type.split(';')[0],bodyBytes:Buffer.byteLength(raw)};
 assert.equal(response.status,200,'PUBLIC_HTTP_STATUS_INVALID');
 assert.match(type,/application\/json/i,'PUBLIC_CONTENT_TYPE_INVALID');
 assert(raw.length>0&&raw.length<100000,'PUBLIC_RESPONSE_SIZE_INVALID');
 const body=JSON.parse(raw);
 summary.status=body?.status??null;
 if(entry.count){
  summary.schemaVersion=body?.schemaVersion??null;
  summary.sourceVersion=body?.sourceVersion??null;
  summary.sourceStoredAt=body?.sourceStoredAt??null;
  summary.count=Array.isArray(body?.indicators)?body.indicators.length:null;
  summary.ready=Array.isArray(body?.indicators)?body.indicators.filter(x=>x.status==='READY').length:null;
  summary.rows=Array.isArray(body?.indicators)?body.indicators.map(x=>({
   id:x.id,status:x.status,value:x.value,observationDate:x.observationDate,
   sourceStoredAt:x.sourceStoredAt})):null;
  assert.equal(body.schemaVersion,entry.schema,'PUBLIC_SCHEMA_MISMATCH');
  assert.equal(body.status,'READY','PUBLIC_PROJECTION_NOT_READY');
  assert.equal(summary.count,entry.count,'PUBLIC_COVERAGE_MISMATCH');
  assert.equal(summary.ready,entry.count,'PUBLIC_READY_COUNT_MISMATCH');
  assert(body.indicators.every(x=>typeof x.value==='number'&&Number.isFinite(x.value)),
   'PUBLIC_READY_VALUE_INVALID');
 }else{
  summary.methodologyVersion=body?.methodologyVersion??null;
  summary.score=body?.score??null;
  summary.asOfDate=body?.asOfDate??null;
  summary.trendCount=Array.isArray(body?.trend)?body.trend.length:null;
  summary.lastTrendLabel=body?.trend?.at(-1)?.label??null;
  summary.lastTrendValue=body?.trend?.at(-1)?.value??null;
  assert.equal(body.status,'READY','PUBLIC_R2_NOT_READY');
  assert.equal(body.methodologyVersion,'INFLATION_R2_R29_56_IA','PUBLIC_R2_METHOD_MISMATCH');
  assert.equal(summary.lastTrendLabel,summary.asOfDate,'PUBLIC_R2_FUTURE_TREND_DATE');
  assert.equal(summary.lastTrendValue,summary.score,'PUBLIC_R2_TREND_SCORE_MISMATCH');
 }
 return summary;
}

for(const entry of allowed){
 test('W01 public GET readback '+entry.name,{skip:!enabled},async()=>{
  try{
   const summary=await publicGet(entry);
   console.log('W01_PUBLIC_HTTP_READBACK='+JSON.stringify({...summary,verified:true}));
  }catch(error){
   console.log('W01_PUBLIC_HTTP_READBACK='+JSON.stringify({
    name:entry.name,path:entry.path,verified:false,
    errorCode:error instanceof Error?error.message:'UNKNOWN_ERROR',
   }));
   throw error;
  }
 });
}
