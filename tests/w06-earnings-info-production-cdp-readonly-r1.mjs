import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// #1467 Production readback. No route mocks, sign-in, POST, storage writes,
// supplier calls, backend mutation or Cloudflare deployment. CDP is read-only.
const ORIGIN='https://zgmini.kr';
const ROUTE='/earnings-recession/';
const TARGETS=[
 {path:'/api/earnings-recession-bea-unit-profit',label:'BEA 단위이익'},
 {path:'/api/earnings-recession-census-qfr-margin',label:'Census QFR'},
];
const VIEWPORTS=[{width:390,height:844},{width:1440,height:900}];
const STATES=Object.freeze({
 STORED_PROJECTION_PENDING:'게시 대기',
 PROJECTION_READ_UNAVAILABLE:'조회 불가',
 STORED_PROJECTION_INVALID:'자료 오류',
 SOURCE_RETRIEVAL_EXPIRED:'자료 갱신 지연',
 OBSERVATION_EXPIRED:'자료 갱신 지연',
 FUTURE_SOURCE_OR_PERIOD:'자료 시각 오류',
});
const results=[];
mkdirSync('artifacts/w06-1467-production-cdp',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const viewport of VIEWPORTS){
  const context=await browser.newContext({
   viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
   hasTouch:viewport.width===390,isMobile:viewport.width===390,
   serviceWorkers:'block',acceptDownloads:false,
  });
  const page=await context.newPage();
  const session=await context.newCDPSession(page);
  const requestMap=new Map();
  const settled=new Map();
  const bodyReads=[];
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error.message).slice(0,160)));
  await session.send('Network.enable');
  session.on('Network.requestWillBeSent',event=>{
   if(event.request?.method!=='GET')return;
   let path;
   try{
    const url=new URL(event.request.url);
    if(url.origin!==ORIGIN)return;
    path=url.pathname;
   }catch{return;}
   if(!TARGETS.some(target=>target.path===path))return;
   requestMap.set(event.requestId,{path,method:'GET'});
  });
  session.on('Network.responseReceived',event=>{
   const current=requestMap.get(event.requestId);
   if(!current)return;
   current.status=event.response.status;
   current.mime=event.response.mimeType;
  });
  session.on('Network.loadingFailed',event=>{
   const current=requestMap.get(event.requestId);
   if(!current)return;
   settled.set(current.path,{status:current.status??null,networkError:'NETWORK_LOADING_FAILED',
    reason:null,payloadStatus:null,freshnessStatus:null});
  });
  session.on('Network.loadingFinished',event=>{
   const current=requestMap.get(event.requestId);
   if(!current)return;
   bodyReads.push((async()=>{
    try{
     const raw=await session.send('Network.getResponseBody',{requestId:event.requestId});
     const data=raw.base64Encoded
      ?Buffer.from(raw.body,'base64').toString('utf8'):raw.body;
     const payload=JSON.parse(data);
     // Only bounded public contract fields; never return full body or raw data.
     const reason=typeof payload?.reason==='string'&&Object.hasOwn(STATES,payload.reason)
      ?payload.reason:(typeof payload?.reason==='string'?'OTHER_REASON':null);
     settled.set(current.path,{
      status:current.status??null,
      reason,payloadStatus:typeof payload?.status==='string'?payload.status.slice(0,32):null,
      freshnessStatus:typeof payload?.freshness?.status==='string'
       ?payload.freshness.status.slice(0,32):null,
      schemaVersion:typeof payload?.schemaVersion==='string'
       ?payload.schemaVersion.slice(0,80):null,
      networkError:null,
     });
    }catch{
     settled.set(current.path,{status:current.status??null,reason:null,payloadStatus:null,
      freshnessStatus:null,networkError:'CDP_RESPONSE_BODY_UNREADABLE'});
    }
   })());
  });
  let documentStatus=null,displayText=null,initialText=null,error=null;
  try{
   const document=await page.goto(ORIGIN+ROUTE,{
    waitUntil:'domcontentloaded',timeout:60000,
   });
   documentStatus=document?.status()??null;
   const marker=page.locator('.earnings-r2-cost-status');
   await marker.waitFor({state:'visible',timeout:30000});
   initialText=(await marker.innerText()).slice(0,500);
   // First client-side refresh should complete well before the 60s repeat.
   // If the site's public endpoint is unreachable, record actual evidence,
   // not a fictitious HTTP status or a fabricated UI value.
   for(let i=0;i<40;i++){
    const enough=TARGETS.every(target=>settled.has(target.path));
    const text=await marker.innerText().catch(()=>null);
    const hydrated=text&&TARGETS.every(target=>
     !text.includes(target.label+' 연결 확인 중'));
    if(enough&&hydrated)break;
    await page.waitForTimeout(1000);
   }
   await Promise.allSettled(bodyReads);
   displayText=(await marker.innerText()).slice(0,500);
   await page.screenshot({
    path:'artifacts/w06-1467-production-cdp/earnings-'+viewport.width+'.png',
    fullPage:false,
   });
   assert.equal(documentStatus,200,'Production earnings document must be HTTP 200');
   assert.equal(pageErrors.length,0,'Production page must hydrate without JS exceptions');
   for(const target of TARGETS){
    const observed=settled.get(target.path);
    assert(observed,'CDP must observe actual GET '+target.path);
    assert.equal(observed.networkError,null,'CDP GET must complete '+target.path);
    assert([200,503].includes(observed.status),
     'Production projection returns expected 200 or 503 for '+target.path);
    const expected=observed.status===503
     ?(STATES[observed.reason]??'자료 조회 실패')
     :observed.payloadStatus==='READY'&&observed.freshnessStatus==='FRESH'
      ?'연결 완료':null;
    if(expected)assert(displayText.includes(target.label+' '+expected),
      target.label+' actual status must match its HTTP reason: '+expected);
    assert(!displayText.includes(target.label+' 연결 확인 중'),
     target.label+' must leave loading state');
   }
  }catch(cause){error=String(cause?.message??cause).slice(0,450);}
  const report={
   viewport:viewport.width+'x'+viewport.height,
   checkedAt:new Date().toISOString(),documentStatus,
   endpoints:TARGETS.map(target=>({path:target.path,...(settled.get(target.path)
    ??{status:null,reason:null,networkError:'NO_BROWSER_GET_OBSERVED'})})),
   initialText,displayText,pageErrors,error,
  };
  results.push(report);
  console.log('W06_1467_PRODUCTION_CDP '+JSON.stringify(report));
  await session.detach().catch(()=>{});
  await context.close();
 }
}finally{await browser.close();}
writeFileSync('artifacts/w06-1467-production-cdp/result.json',
 JSON.stringify({schema:'ZGMINI_W06_1467_PRODUCTION_CDP_READONLY_V1',
  checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,2,'mobile+desktop actual Production evidence');
assert(results.every(x=>x.error===null),'Production CDP/UI evidence must pass without substitutions');
console.log('W06_1467_PRODUCTION_CDP_VERIFIED');
