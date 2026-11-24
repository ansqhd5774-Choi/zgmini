import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {earningsCostPublicationKst,earningsCostSparkGeometry}
 from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';

// W05 Production acceptance: public GET and browser UI only.
// Never invokes a provider, submits a form, writes D1, or changes deployment.
const base='https://zgmini.kr';
const apiPath='/api/earnings-recession-bea-unit-profit';
const views=[{width:390,height:844},{width:1440,height:900}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/w05-bea-production-readonly',{recursive:true});
const verified=[];
try{
 for(const viewport of views){
  const context=await browser.newContext({
   viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
   serviceWorkers:'block',hasTouch:viewport.width===390,isMobile:viewport.width===390
  });
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  try{
   const api=await context.request.get(base+apiPath,{
    timeout:30000,headers:{'cache-control':'no-cache'}
   });
   assert.equal(api.status(),200,'BEA stored-only Production GET must be READY');
   const data=await api.json();
   assert.equal(data.status,'READY');
   assert.equal(data.freshness?.status,'FRESH');
   assert.equal(data.indicator?.transport,'BEA_API_JSON');
   assert.equal(data.indicator?.seriesId,'A463RD');
   assert.equal(data.indicator?.sourceURL,'https://apps.bea.gov/api/data');
   assert.match(data.sourceVersion,/^[0-9a-f]{64}$/);
   assert(Number.isSafeInteger(data.sourceStoredAt)&&data.sourceStoredAt>0);
   assert.equal(new Date(data.publishedAt).toISOString(),data.publishedAt,
    'public response must expose validated D1 publication ISO time');
   assert(Date.parse(data.publishedAt)>=data.sourceStoredAt,
    'D1 publication must not predate PC source storage');
   assert(Array.isArray(data.indicator.history)&&data.indicator.history.length===5);
   assert.equal(data.indicator.history.at(-1).value,data.indicator.value);
   if(data.indicator.observationPeriodEnd==='2026-06-30'){
    assert.equal(data.indicator.history[0].value,0.216);
    assert.equal(data.indicator.value,0.250);
   }

   await page.addInitScript(()=>{
    sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1');
   });
   const response=await page.goto(base+'/earnings-recession/',{
    waitUntil:'domcontentloaded',timeout:60000
   });
   assert.equal(response?.status(),200,'Production earnings page HTTP 200');
   const intro=page.locator('#zg-about-intro-dialog');
   if(await intro.isVisible()){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:10000});
   }
   const selector=viewport.width===390
    ?'article.earnings-r2-mobile-card[data-source="bea-unit-profit"]'
    :'tr.earnings-r2-cost-row[data-source="bea-unit-profit"]';
   const indicator=page.locator(selector);
   const value='$'+data.indicator.value.toFixed(3);
   await page.waitForFunction(({selector,value})=>
    document.querySelector(selector)?.textContent?.includes(value)===true,
    {selector,value},{timeout:35000});
   const displayed=await indicator.innerText();
   assert(displayed.includes(data.indicator.observationPeriodEnd),
    'observation quarter in hydrated UI');
   const status=await page.locator('.earnings-r2-cost-status').innerText();
   assert(status.includes('BEA 단위이익 연결 완료'),'hydrated API/UI status');

   const svg=indicator.locator('svg.earnings-r2-cost-spark');
   await svg.waitFor({state:'visible',timeout:12000});
   const geometry=earningsCostSparkGeometry(data.indicator.history);
   assert(geometry,'actual five-quarter history must yield a chart');
   assert.equal(await svg.locator('path').getAttribute('d'),geometry.path,
    'production spark curve must match actual stored history');
   const marker=svg.locator('circle');
   assert.equal(await marker.count(),geometry.marker?1:0);
   if(geometry.marker){
    assert.equal(Number(await marker.getAttribute('cx')),geometry.marker.cx);
    assert.equal(Number(await marker.getAttribute('cy')),geometry.marker.cy);
   }

   const button=indicator.getByRole('button',{name:'비금융기업 단위이익 도움말'});
   if(viewport.width===390)await button.tap();
   else await button.click();
   const tooltip=page.getByRole('tooltip');
   await tooltip.waitFor({state:'visible',timeout:12000});
   const help=await tooltip.innerText();
   const sourceKst=earningsCostPublicationKst(new Date(data.sourceStoredAt).toISOString());
   const publishedKst=earningsCostPublicationKst(data.publishedAt);
   assert(help.includes('PC 원자료 저장: '+sourceKst),'source KST label');
   assert(help.includes('D1 공개 게시: '+publishedKst),'D1 publish KST label');
   assert(help.includes('관측 분기와는 다른 시각입니다.'),'distinct dates');
   const link=tooltip.getByRole('link',{name:'BEA 공식 API 원자료'});
   assert.equal(await link.getAttribute('href'),data.indicator.sourceURL);
   await page.screenshot({
    path:'artifacts/w05-bea-production-readonly/earnings-'+viewport.width+'.png',
    fullPage:false
   });
   assert.deepEqual(pageErrors,[],'no JS page exception');
   const evidence={
    width:viewport.width,http:api.status(),observationEnd:data.indicator.observationPeriodEnd,
    first:data.indicator.history[0].value,last:data.indicator.value,
    sourceVersion:data.sourceVersion,sourceStoredAt:data.sourceStoredAt,
    publishedAt:data.publishedAt,sourceKst,publishedKst,
    marker:geometry.marker
   };
   verified.push(evidence);
   console.log('W05_BEA_PRODUCTION_READONLY_PASS '+JSON.stringify(evidence));
  }finally{await context.close();}
 }
 const context=await browser.newContext({locale:'ko-KR'});
 try{
  const page=await context.newPage();
  const response=await page.goto(base+'/data-sources/',{
   waitUntil:'domcontentloaded',timeout:60000
  });
  assert.equal(response?.status(),200,'official data source page');
  await page.getByText(
   'This product uses the Bureau of Economic Analysis (BEA) Data API but is not endorsed or certified by BEA.',
   {exact:false}).waitFor({state:'visible',timeout:12000});
  assert.equal(await page.getByRole('link',{name:'BEA Data API Terms of Use'}).getAttribute('href'),
   'https://apps.bea.gov/api/_pdf/bea_api_tos.pdf');
 }finally{await context.close();}
 // W05 optional BLS service extension: a separate D1 checkpoint must
 // produce exactly two verified WPSFD42 rows, visible in both live layouts.
 // This test performs only public GET and screenshot reads.
 for(const viewport of views){
  const context=await browser.newContext({
   viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
   serviceWorkers:'block',hasTouch:viewport.width===390,isMobile:viewport.width===390
  });
  try{
   const api=await context.request.get(base+'/api/earnings-recession-indicators',{
    timeout:30000,headers:{'cache-control':'no-cache'}
   });
   assert.equal(api.status(),200,'WPSFD42 actual Production GET');
   assert.equal(api.headers()['x-earnings-c-service'],'READY',
    'separate WPSFD42 D1 checkpoint must be valid and fresh');
   const data=await api.json();
   assert.equal(data.status,'READY','merged BLS service+base actual payload');
   assert.match(data.sourceVersion,/^[a-f0-9]{64}$/);
   assert(Number.isSafeInteger(data.sourceStoredAt)&&data.sourceStoredAt>0);
   const service=data.rows.filter(row=>row.seriesId==='WPSFD42');
   assert.deepEqual(service.map(row=>row.indicatorId).sort(),[
    'bls_ppi_services_index','bls_ppi_services_yoy_sa'
   ]);
   assert.equal(data.coverage.configured,7);
   for(const row of service){
    assert.equal(row.provider,'BLS');
    assert.equal(row.status,'READY');
    assert.equal(row.freshness?.status,'FRESH');
    assert.equal(row.sourceURL,'https://data.bls.gov/timeseries/WPSFD42');
    assert(Array.isArray(row.history)&&row.history.length>0);
    assert.equal(row.history.at(-1).value,row.value);
   }
   const page=await context.newPage();
   await page.addInitScript(()=>{
    sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1');
   });
   const response=await page.goto(base+'/earnings-recession/',{
    waitUntil:'domcontentloaded',timeout:60000
   });
   assert.equal(response?.status(),200);
   const rowSelector=viewport.width===390
    ?'.earnings-r2-mobile-list article.earnings-r2-cost-mobile-card'
    :'.earnings-r2-table tbody tr.earnings-r2-cost-row';
   await page.waitForFunction(selector=>{
    const rows=Array.from(document.querySelectorAll(selector),node=>node.textContent||'');
    return rows.length>=7
     &&rows.some(text=>text.includes('서비스 생산자물가 상승률'))
     &&rows.some(text=>text.includes('서비스 생산자물가 지수'));
   },rowSelector,{timeout:35000});
   const visibleRows=await page.locator(rowSelector).allTextContents();
   assert(visibleRows.some(text=>text.includes('서비스 생산자물가 상승률')));
   assert(visibleRows.some(text=>text.includes('서비스 생산자물가 지수')));
   await page.screenshot({
    path:'artifacts/w05-bea-production-readonly/wpsfd42-'+viewport.width+'.png',
    fullPage:false
   });
   console.log('W05_WPSFD42_PRODUCTION_READONLY_PASS '+JSON.stringify({
    width:viewport.width,http:api.status(),serviceState:api.headers()['x-earnings-c-service'],
    sourceVersion:data.sourceVersion,sourceStoredAt:data.sourceStoredAt,
    count:service.length,visibleRows:visibleRows.length,
    period:service[0].observationPeriod
   }));
  }finally{await context.close();}
 }
}finally{await browser.close();}
assert.equal(verified.length,2,'BEA 390px and 1440px both measured');
console.log('W05_BEA_PRODUCTION_READONLY_FINISHED '+JSON.stringify(verified));