// One-shot, read-only public HTTP contract evidence. Isolated Draft PR only.
// Never add to main: the live website is not a deterministic unit-test fixture.
import test from 'node:test';
import assert from 'node:assert/strict';

const ORIGIN='https://zgmini.kr';
const ENDPOINTS=['/api/asset-bubble-detail','/api/asset-bubble-raw'];
const safeString=(x,max=160)=>typeof x==='string'?x.slice(0,max):null;
const safeNumber=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const summary=(value)=>{
 const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const payload=obj.payload&&typeof obj.payload==='object'?obj.payload:obj;
 return {
  status:safeString(payload.status),
  reason:safeString(payload.reason),
  methodologyVersion:safeString(payload.methodologyVersion),
  sourceVersion:safeString(payload.sourceVersion),
  sourceStoredAt:safeNumber(payload.sourceStoredAt),
  score:safeNumber(payload.score),
  scoreObservationQuarter:safeString(payload.scoreObservationQuarter),
  diagnosticQuarter:safeString(payload.diagnosticQuarter),
  asOfDate:safeString(payload.asOfDate),
  projectionStatus:safeString(obj.projection?.status)
 };
};

test('one-time public R10 HTTP GET readback has bounded, inspectable responses',async()=>{
 const errors=[];
 for(const path of ENDPOINTS){
  const url=ORIGIN+path;
  try{
   const response=await fetch(url,{
    method:'GET',redirect:'manual',
    headers:{accept:'application/json','cache-control':'no-cache',
     'user-agent':'zgmini-r10-readonly-once'},
    signal:AbortSignal.timeout(16000),
   });
   const text=await response.text();
   const contentType=response.headers.get('content-type')??'';
   let value=null,parseError=null;
   if(text.length>65536)parseError='RESPONSE_TOO_LARGE';
   else try{value=JSON.parse(text);}catch{parseError='NOT_JSON';}
   const result={
    path,httpStatus:response.status,
    contentType:safeString(contentType,120),
    cacheControl:safeString(response.headers.get('cache-control')),
    projectionHeader:safeString(response.headers.get('x-public-projection')),
    projectionSourceAt:safeString(response.headers.get('x-projection-source-at')),
    responseDate:safeString(response.headers.get('date')),
    redirectLocation:safeString(response.headers.get('location')),
    jsonParsed:parseError===null,
    parseError,body:summary(value),
   };
   console.log('R10_PUBLIC_READBACK_ONCE '+JSON.stringify(result));
   if(parseError!==null)errors.push(path+':'+parseError);
  }catch(error){
   const code=typeof error?.name==='string'?error.name:'FETCH_ERROR';
   console.log('R10_PUBLIC_READBACK_ONCE '+JSON.stringify({
    path,httpStatus:null,jsonParsed:false,networkError:code,
   }));
   errors.push(path+':'+code);
  }
 }
 assert.deepEqual(errors,[],'Public GET or JSON extraction failed; see bounded diagnostics above');
});
