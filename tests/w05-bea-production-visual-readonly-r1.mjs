import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {earningsCostSparkGeometry,earningsCostPublicationKst}
 from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';

// W05 isolated Production acceptance: existing public GET and hydrated DOM only.
// No provider requests, D1 writes, app deploy or account/session changes.
const base='https://zgmini.kr',views=[{width:390,height:844},{width:1440,height:900}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/w05-bea-production-readonly',{recursive:true});
try{
 for(const viewport of views){
  const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
    hasTouch:viewport.width===390,isMobile:viewport.width===390,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const result=await context.request.get(base+'/api/earnings-recession-bea-unit-profit',
    {timeout:30000,headers:{'cache-control':'no-cache'}});
   assert.equal(result.status(),200,'BEA native stored-only Production GET must be READY');
   const api=await result.json(),row=api.indicator;
   assert.equal(api.status,'READY');
   assert.equal(api.freshness?.status,'FRESH');
   assert.equal(row.transport,'BEA_API_JSON');
   assert.equal(row.seriesId,'A463RD');
   assert.equal(row.sourceURL,'https://apps.bea.gov/api/data');
   assert.equal(row.unit,'USD_PER_REAL_GVA_UNIT');
   assert.match(api.sourceVersion,/^[a-f0-9]{64}$/);
   assert(Number.isSafeInteger(api.sourceStoredAt)&&api.sourceStoredAt>0);
   assert.equal(api.retrievedAt,new Date(api.sourceStoredAt).toISOString());
   assert(typeof api.publishedAt==='string'&&Date.parse(api.publishedAt)>=api.sourceStoredAt,
    'publishedAt must be the separately proven D1 stored_at, never sourceStoredAt');
   assert(Array.isArray(row.history)&&row.history.length===5);
   assert.equal(row.history.at(-1).value,row.value);
   assert.equal(row.history.at(-1).date,row.observationPeriodEnd);
   assert.equal(row.history.at(-2).value,row.previousValue);
   assert.equal(row.history.at(-2).date,row.previousPeriodEnd);
   const shape=earningsCostSparkGeometry(row.history);
   assert(shape?.marker,'validated 5-point series must have a latest SVG marker');
   const response=await page.goto(base+'/earnings-recession/',{
    waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(response?.status(),200);
   const intro=page.locator('#zg-about-intro-dialog');
   await page.waitForTimeout(1200);
   if(await intro.isVisible()){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:10000});
   }
   await page.waitForFunction(()=>document.querySelector('.earnings-r2-cost-status')
    ?.textContent?.includes('BEA 단위이익 연결 완료'),null,{timeout:40000});
   const indicator=page.locator(viewport.width===390
    ?'article.earnings-r2-mobile-card[data-source="bea-unit-profit"]'
    :'tr.earnings-r2-cost-row[data-source="bea-unit-profit"]');
   await indicator.scrollIntoViewIfNeeded();
   await indicator.waitFor({state:'visible'});
   const visible=await indicator.innerText();
   assert(visible.includes('$'+row.value.toFixed(3)),'current public unit value in actual DOM');
   assert(visible.includes(row.observationPeriodEnd),'latest BEA quarter in actual DOM');
   const spark=indicator.locator('svg.earnings-r2-cost-spark');
   await spark.waitFor({state:'visible',timeout:12000});
   const drawn=await spark.locator('path').getAttribute('d');
   assert.equal(drawn,shape.path,'rendered 5-quarter first/last polyline matches public data');
   const marker=spark.locator('circle');
   await marker.waitFor({state:'visible'});
   assert.equal(Number(await marker.getAttribute('cx')),shape.marker.cx);
   assert.equal(Number(await marker.getAttribute('cy')),shape.marker.cy);
   const button=indicator.getByRole('button',{name:'비금융기업 단위이익 도움말'});
   if(viewport.width===390)await button.tap();else await button.click();
   const tooltip=page.getByRole('tooltip');
   await tooltip.waitFor({state:'visible',timeout:12000});
   const displayed=await tooltip.innerText();
   const pcSaved=earningsCostPublicationKst(new Date(api.sourceStoredAt).toISOString());
   const d1Published=earningsCostPublicationKst(api.publishedAt);
   assert.notEqual(pcSaved,'—');assert.notEqual(d1Published,'—');
   assert(displayed.includes('PC 원자료 저장: '+pcSaved),'verified source storage KST label');
   assert(displayed.includes('D1 공개 게시: '+d1Published),'verified D1 publication KST label');
   assert.equal(await tooltip.getByRole('link',{name:'BEA 공식 API 원자료'}).getAttribute('href'),
    row.sourceURL,'native BEA provenance link');
   await page.screenshot({path:'artifacts/w05-bea-production-readonly/earnings-'+viewport.width+'.png',
    fullPage:false});
   assert.deepEqual(errors,[],'no browser page errors');
   console.log('W05_BEA_PRODUCTION_VISUAL_PASS '+JSON.stringify({
    width:viewport.width,sourceVersion:api.sourceVersion,
    period:row.observationPeriodEnd,first:row.history[0],latest:row.history.at(-1),
    marker:shape.marker,pcSaved,d1Published,sourceURL:row.sourceURL
   }));
  }finally{await context.close();}
 }
}finally{await browser.close();}
