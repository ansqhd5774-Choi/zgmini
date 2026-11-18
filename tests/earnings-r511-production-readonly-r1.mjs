import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {earningsCostSparkGeometry,earningsCostRetrievalDay} from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';

// Real Production GET+hydrated DOM readback; no mock routes, authentication or writes.
// PR CI runs on an isolated candidate branch; no Production deployment occurs here.
const origin='https://zgmini.kr',apiPath='/api/earnings-recession-indicators';
const viewports=[390,1440],ids=[
 'bls_ppi_final_demand_yoy_sa','bls_ppi_final_demand_index',
 'bls_ppi_goods_yoy_sa','bls_ppi_goods_index','bls_unit_labor_cost_yoy'];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const format=(v,unit)=>finite(v)?
 v.toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2})+
 (unit==='PERCENT'?'%':''):'—';
mkdirSync('artifacts/earnings-r511-production',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const reports=[];
try{
 for(const width of viewports){
  const context=await browser.newContext({
   viewport:{width,height:900},locale:'ko-KR',serviceWorkers:'block',
   reducedMotion:'reduce',extraHTTPHeaders:{'cache-control':'no-cache'}});
  const page=await context.newPage(),errors=[],failedJS=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,220)));
  page.on('requestfailed',req=>{
   const url=req.url();
   if(new URL(url).hostname==='zgmini.kr'&&/\.m?js(?:\?|$)/.test(url))
    failedJS.push(new URL(url).pathname);
  });
  await page.addInitScript(()=>
   sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  const response=await page.goto(origin+'/earnings-recession/',{
   waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response?.status(),200,'Production earnings page document HTTP 200 at '+width);
  const api=await context.request.get(origin+apiPath,{timeout:30000,
   headers:{'cache-control':'no-cache'}});
  const apiStatus=api.status();
  const payload=apiStatus===200?await api.json():null;
  const report={viewport:width,documentStatus:response?.status(),
   apiStatus,apiSnapshotAt:api.headers()['x-data-snapshot-at']??null,
   sourceVersion:payload?.sourceVersion??null,
   sourceStoredAt:payload?.sourceStoredAt??null,
   schemaVersion:payload?.schemaVersion??null,rows:[],browserErrors:errors,
   failedJS};
  reports.push(report);
  // Read real endpoint first; do not substitute fixtures or stale cached values.
  assert.equal(apiStatus,200,'Production BLS C API HTTP 200 at '+width);
  assert.equal(payload?.schemaVersion,'earnings-companion-c-r4-v1');
  assert.equal(payload?.historicalMode,'CURRENT_RETRIEVAL_NOT_PIT');
  assert(Array.isArray(payload?.rows),'stored C rows array');
  await page.waitForFunction(()=>
   /원자료 \d+\/5개 연결|원자료 조회 실패/.test(
    document.querySelector('.earnings-r2-cost-status')?.textContent??''),
   null,{timeout:30000});
  const table=page.locator('.earnings-r2-table tbody tr.earnings-r2-cost-row');
  const cards=page.locator('.earnings-r2-mobile-list article.earnings-r2-cost-mobile-card');
  assert((await table.count())>=5&&((await cards.count())>=5),
   'BLS five visible-in-structure rows at '+width);
  const isDesktop=await table.first().isVisible();
  const target=i=>isDesktop?table.nth(i):cards.nth(i);
  const server=new Map(payload.rows.map(r=>[r.indicatorId,r]));
  let usableCount=0;
  for(let i=0;i<5;i++){
   const row=server.get(ids[i]),element=target(i);
   assert(row,'stored API includes '+ids[i]);
   const ok=row.status==='READY'&&row.freshness?.status==='FRESH'&&finite(row.value);
   if(ok)usableCount++;
   const current=isDesktop?
    element.locator('.earnings-r2-value strong'):
    element.locator('.earnings-r2-mobile-metrics strong').nth(1);
   const shown=(await current.innerText()).trim();
   assert.equal(shown,ok?format(row.value,row.unit):'—',
    ids[i]+' current/0/null parity at '+width);
   const details=await element.innerText();
   assert(details.includes(row.observationPeriod??'—'),
    ids[i]+' observation period must be displayed at '+width);
   const retrieved=earningsCostRetrievalDay(row.retrievedAt);
   assert(details.includes(retrieved),
    ids[i]+' retrieval date must be displayed at '+width);
   const geometry=ok?earningsCostSparkGeometry(row.history):null;
   const spark=element.locator('svg.earnings-r2-cost-spark');
   if(!geometry){
    assert.equal(await spark.count(),0,
     ids[i]+' insufficient/stale history has no chart at '+width);
   }else{
    assert.equal(await spark.count(),1,ids[i]+' chart present at '+width);
    assert.equal(await spark.locator('path').getAttribute('d'),geometry.path,
     ids[i]+' exact gap-safe path at '+width);
    const circles=spark.locator('circle');
    assert.equal(await circles.count(),geometry.marker?1:0,
     ids[i]+' no false latest marker at '+width);
    if(geometry.marker){
     const cx=Number(await circles.first().getAttribute('cx'));
     assert(Math.abs(cx-geometry.marker.cx)<1e-6,
      ids[i]+' final chronological slot marker at '+width);
    }
   }
   report.rows.push({indicatorId:ids[i],status:row.status,
    freshness:row.freshness?.status??null,observationPeriod:row.observationPeriod,
    retrievedAtDay:retrieved,displayedValue:shown,ready:ok,chart:!!geometry,
    marker:!!geometry?.marker});
  }
  report.readyRows=usableCount;
  assert(usableCount>0,'Production API should expose at least one real READY BLS row');
  assert.equal(page.locator('.earnings-r2-cost-status').count?await page.locator('.earnings-r2-cost-status').count():0,1);
  assert.deepEqual(failedJS,[],'Production first-party JS requests loaded '+width);
  assert.deepEqual(errors,[],'Production page hydrated without exceptions '+width);
  await page.screenshot({path:'artifacts/earnings-r511-production/live-'+width+'.png'});
  console.log('W05_R511_LIVE '+JSON.stringify(report));
  await context.close();
 }
}finally{await browser.close();}
writeFileSync('artifacts/earnings-r511-production/live-readonly.json',
 JSON.stringify({schema:'ZGMINI_W05_R511_LIVE_READONLY_V1',
  checkedAt:new Date().toISOString(),reports},null,2)+'\n');
assert.equal(reports.length,2,'live mobile and desktop both checked');
console.log('PASS W05 R5-11 live Production: 390/1440 GET/DOM/chart/source date parity');
