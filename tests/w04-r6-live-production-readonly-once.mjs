// One-off W04 actual-Production observation. Read-only public HTTP; never mock the API.
// This is an evidence probe on a separate PR branch, not a new permanent release gate.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {EMPLOYMENT_R6_FEATURES} from '../lib/market-score/employment-r6-formula.mjs';

const base='https://zgmini.kr',folder='artifacts/employment-r6-browser/live-production';
const viewports=[{width:1440,height:900},{width:390,height:844}];
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const textValue=(v,unit)=>finite(v)?String(Number(v.toFixed(Math.abs(v)>=100?1:2)))+(unit??''):'—';
const summary={kind:'W04_R6_PRODUCTION_OBSERVATION_V1',checkedAt:new Date().toISOString(),
 checks:[],source:'LIVE_PUBLIC_HTTP_NO_MOCK',providerCalls:0,d1Writes:0};
mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const viewport of viewports){
  const check={width:viewport.width,status:'UNVERIFIED',apiStatus:null,pageStatus:null,
   indicators:null,asOfDate:null,chartReady:null,matchedRaw:0,matchedScore:0,readyCharts:0,
   visibleDates:0,pageErrors:[]};
  summary.checks.push(check);
  const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
   serviceWorkers:'block',isMobile:viewport.width===390,hasTouch:viewport.width===390,
   reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>check.pageErrors.push(String(e.message).slice(0,220)));
  try{
   const api=await context.request.get(base+'/api/employment-r6/observations',
    {timeout:30000,headers:{accept:'application/json','cache-control':'no-cache'}});
   check.apiStatus=api.status();
   assert.equal(check.apiStatus,200,'Production stored-only R6 API must return HTTP 200');
   const data=await api.json();
   assert(Array.isArray(data.indicators)&&data.indicators.length===29,'29 approved R6 IDs');
   assert.deepEqual(data.indicators.map(v=>v.id),EMPLOYMENT_R6_FEATURES.map(v=>v.id),'R6 ID ordering');
   assert(/^20\d\d-\d\d-\d\d$/.test(data.asOfDate),'real asOfDate');
   assert(Number.isSafeInteger(data.sourceStoredAt)&&data.sourceStoredAt>0,'sourceStorage timestamp');
   check.indicators=data.indicators.length;check.asOfDate=data.asOfDate;
   check.chartReady=data.summary.chartReadyFeatures;
   await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
   const response=await page.goto(base+'/economic-indicators/employment/',
    {waitUntil:'domcontentloaded',timeout:60000});
   check.pageStatus=response?.status()??null;
   assert.equal(check.pageStatus,200,'Production employment HTML 200');
   const section=page.locator('section.economic-indicators[aria-labelledby="economic-employment-indicators"]');
   await section.waitFor({state:'attached',timeout:30000});
   const expectedHeader='1년 차트 '+data.summary.chartReadyFeatures+'/29개';
   await page.waitForFunction(expected=>document.querySelector(
     'section.economic-indicators[aria-labelledby="economic-employment-indicators"]')
     ?.textContent?.includes(expected)===true,expectedHeader,{timeout:35000});
   const rows=section.locator('tbody tr');
   const mobile=section.locator('.inflation-r2-mobile-list article');
   assert.equal(await rows.count(),29,'desktop 29 rows');
   assert.equal(await mobile.count(),29,'mobile 29 cards');
   for(let i=0;i<29;i++){
    const item=data.indicators[i],row=rows.nth(i),card=mobile.nth(i);
    const raw=(item.rawStatus==='READY'||item.rawStatus==='STALE')&&finite(item.value);
    const expected=raw?textValue(item.value,item.unit):'—';
    const actual=(await row.locator('td[data-value-kind] strong').innerText()).trim();
    const mobileActual=(await card.locator('.inflation-r2-mobile-metrics > div').nth(1).locator('strong').innerText()).trim();
    assert.equal(actual,expected,'desktop raw value '+item.id);
    assert.equal(mobileActual,expected,'mobile raw value '+item.id);
    check.matchedRaw++;
    const detail=(await row.locator('td[data-value-kind] small').first().innerText()).trim();
    if(raw&&item.observationDate){
     const [yyyy,mm,dd]=item.observationDate.split('-');
     assert(detail.includes(yyyy)&&detail.includes(String(Number(mm)))&&
      detail.includes(String(Number(dd))),'observation date visible '+item.id);
     check.visibleDates++;
    }
    if(item.rawStatus==='READY'&&item.scoreStatus==='READY'&&finite(item.score)){
     assert(detail.includes('평가 '+item.score.toFixed(1)+'점'),'scored visible '+item.id);
     check.matchedScore++;
    } else assert(!/평가 \d+(?:\\.\d+)?점/.test(detail),'no unapproved score '+item.id);
    if(item.chartStatus==='READY'){
     const spark=row.locator('svg.inflation-mini-chart');
     assert.equal(await spark.count(),1,'ready 1Y chart '+item.id);
     const dates=await spark.getAttribute('aria-label');
     const latest=item.history?.at(-1)?.date;
     assert(typeof latest==='string'&&dates?.includes(latest),'last chart date '+item.id);
     check.readyCharts++;
    }
   }
   assert.equal(check.readyCharts,data.summary.chartReadyFeatures,'ready chart count');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,
    'no viewport horizontal overflow');
   assert.deepEqual(check.pageErrors,[],'client runtime errors');
   check.status='PASS';
  }catch(error){check.status='FAIL';check.firstFail=String(error?.message??error).slice(0,450);}
  finally {
   await page.screenshot({path:folder+'/employment-'+viewport.width+'.png',fullPage:false}).catch(()=>{});
   await context.close();
  }
  console.log('W04_R6_LIVE_PRODUCTION '+JSON.stringify(check));
 }
}finally{
 await browser.close();
 summary.result=summary.checks.every(v=>v.status==='PASS')?'PASS':'UNVERIFIED';
 writeFileSync(folder+'/summary.json',JSON.stringify(summary,null,2)+'\n');
}
console.log('W04_R6_LIVE_PRODUCTION_FINAL '+JSON.stringify({result:summary.result,
 checks:summary.checks.map(x=>({width:x.width,status:x.status,firstFail:x.firstFail??null}))}));
assert.equal(summary.result,'PASS','real Production UI verification did not pass; see read-only evidence');
