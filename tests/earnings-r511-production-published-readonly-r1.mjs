import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {earningsCostPublicationKst} from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';

// W05 R5-11/R5-12: live Production GET/HEAD, 4 responsive widths, sources, a11y and errors; read-only.
// No mock route, POST, auth, D1 access, provider invocation or deployment write.
const origin='https://zgmini.kr',endpoint='/api/earnings-recession-indicators';
const output='artifacts/earnings-r511-published-live';
mkdirSync(output,{recursive:true});
const isIso=value=>typeof value==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&
 Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString()===value;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const reports=[];
try{
 for(const width of [390,768,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:900},
   locale:'ko-KR',serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage(),pageErrors=[],failedScripts=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message).slice(0,180)));
  page.on('requestfailed',req=>{
   const u=new URL(req.url());if(u.hostname==='zgmini.kr'&&/\.m?js$/i.test(u.pathname))
    failedScripts.push(u.pathname);
  });
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  const response=await page.goto(origin+'/earnings-recession/',{
   waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response?.status(),200,'published earnings document HTTP 200 '+width);
  const api=await context.request.get(origin+endpoint,{timeout:30000,
   headers:{'cache-control':'no-cache'}});
  assert.equal(api.status(),200,'published stored C GET status '+width);
  const data=await api.json();
  assert.equal(data?.schemaVersion,'earnings-companion-c-r4-v1');
  const published=api.headers()['x-projection-published-at'];
  const source=api.headers()['x-projection-source-at'];
  assert(isIso(published),'published-at is canonical ISO from validated D1 '+width);
  assert(isIso(source),'source-at is canonical ISO '+width);
  assert.equal(Date.parse(source),data.sourceStoredAt,
   'source-at equals PC sourceStoredAt, not D1 publication '+width);
  assert(Date.parse(published)>=Date.parse(source),
   'D1 publish cannot predate its original source '+width);
  assert(Date.parse(published)<=Date.now(),
   'published-at cannot invent a future publication '+width);
  const expected=earningsCostPublicationKst(published);
  assert.notEqual(expected,'—');
  await page.waitForFunction(value=>
   document.querySelector('.earnings-r2-published-at')?.textContent?.includes(value),
   expected,{timeout:30000});
  const shown=(await page.locator('.earnings-r2-published-at').innerText()).trim();
  assert.equal(shown,'BLS 게시 '+expected,'real hydrated UI uses D1 publication '+width);
  const head=await context.request.head(origin+endpoint,{timeout:30000,
   headers:{'cache-control':'no-cache'}});
  assert.equal(head.status(),200,'HEAD read-only status '+width);
  assert.equal(head.headers()['x-projection-published-at'],published,
   'HEAD and GET D1 publication instant parity '+width);
  assert.equal(head.headers()['x-projection-source-at'],source,
   'HEAD and GET original retrieval instant parity '+width);
  // R5-12 real-layout/source/accessibility: audit whichever view is actually visible.
  await page.waitForFunction(()=>
   document.querySelector('.earnings-r2-cost-status')?.textContent?.includes('원자료 5/5개 연결'),
   null,{timeout:30000});
  const table=page.locator('.earnings-r2-table tbody tr.earnings-r2-cost-row');
  const cards=page.locator('.earnings-r2-mobile-list article.earnings-r2-cost-mobile-card');
  assert((await table.count())>=5,'desktop BLS table structure at '+width);
  assert((await cards.count())>=5,'mobile BLS card structure at '+width);
  const desktopVisible=await table.first().isVisible();
  const mobileVisible=await cards.first().isVisible();
  assert.notEqual(desktopVisible,mobileVisible,
   'exactly one responsive BLS presentation visible at '+width);
  const item=i=>desktopVisible?table.nth(i):cards.nth(i);
  const ids=['bls_ppi_final_demand_yoy_sa','bls_ppi_final_demand_index',
   'bls_ppi_goods_yoy_sa','bls_ppi_goods_index','bls_unit_labor_cost_yoy'];
  const byId=new Map(data.rows.map(row=>[row.indicatorId,row]));
  for(let i=0;i<ids.length;i++){
   const row=byId.get(ids[i]);
   assert(row&&row.status==='READY','BLS row READY '+ids[i]+' '+width);
   const text=(await item(i).innerText());
   const shownValue=row.value.toLocaleString('ko-KR',{
    minimumFractionDigits:2,maximumFractionDigits:2})+(row.unit==='PERCENT'?'%':'');
   assert(text.includes(shownValue),'same stored BLS amount '+ids[i]+' '+width);
   assert(text.includes(row.observationPeriod),'observation period '+ids[i]+' '+width);
   assert(text.includes(row.retrievedAt.slice(0,10)),'retrieval day '+ids[i]+' '+width);
   const chart=item(i).locator('svg.earnings-r2-cost-spark[role="img"]');
   assert.equal(await chart.count(),1,'accessible stored chart '+ids[i]+' '+width);
   assert((await chart.getAttribute('aria-label'))?.includes('결측 구간은 연결하지 않음'),
    'screen-reader gap label '+ids[i]+' '+width);
  }
  const help=item(0).locator('button.zg-help-trigger');
  assert.equal(await help.count(),1,'BLS source help button exists '+width);
  assert.match(await help.getAttribute('aria-label'),/최종수요 생산자물가 상승률 도움말/);
  await help.click();
  const tip=page.getByRole('tooltip');
  await tip.waitFor({timeout:5000});
  const original=tip.getByRole('link',{name:'BLS 원자료'});
  assert.equal(await original.getAttribute('href'),'https://data.bls.gov/timeseries/WPSFD4');
  assert.equal(await original.getAttribute('target'),'_blank');
  assert((await original.getAttribute('rel'))?.includes('noopener'),
   'BLS external link security '+width);
  await page.keyboard.press('Escape');
  assert.equal(await tip.count(),0,'keyboard Escape closes the accessible source tooltip '+width);
  const sourcesPage=await context.request.get(origin+'/data-sources/',{timeout:30000});
  assert.equal(sourcesPage.status(),200,'official source-explainer page '+width);
  assert.match(await sourcesPage.text(),/BLS|미국 노동통계국/,
   'source-explainer lists original BLS institution '+width);
  const layout=await page.evaluate(()=>({viewportWidth:innerWidth,
   scrollWidth:document.documentElement.scrollWidth,
   clientWidth:document.documentElement.clientWidth}));
  assert(layout.scrollWidth<=layout.clientWidth+2,
   'horizontal viewport overflow '+width+': '+JSON.stringify(layout));
  assert.deepEqual(pageErrors,[],'no Production JS exception '+width);
  assert.deepEqual(failedScripts,[],'no failed first-party JS '+width);
  const report={viewport:width,documentStatus:response.status(),apiStatus:api.status(),
   headStatus:head.status(),sourceVersion:data.sourceVersion,sourceStoredAt:data.sourceStoredAt,
   observedThroughBySeries:data.observedThroughBySeries,
   publicationAt:published,sourceAt:source,rendered:shown,
   readyRows:data.rows?.filter(row=>row.status==='READY').length??null,
   layout:desktopVisible?'desktop-table':'responsive-cards',
   viewportScrollWidth:layout.scrollWidth,
   sourceHelpHref:'https://data.bls.gov/timeseries/WPSFD4',
   sourcesPageStatus:sourcesPage.status(),
   pageErrors,failedScripts};
  reports.push(report);
  await page.screenshot({path:output+'/published-'+width+'.png'});
  console.log('W05_R512_LIVE '+JSON.stringify(report));
  await context.close();
 }
}finally{await browser.close();}
assert.equal(reports.length,4);
assert(reports.every(r=>r.publicationAt===reports[0].publicationAt),
 'all four viewport publications reference the same stored D1 version');
assert(reports.every(r=>r.sourceVersion===reports[0].sourceVersion),
 'no mixed PC source lineage across four screen sizes');
writeFileSync(output+'/live.json',JSON.stringify({
 schema:'ZGMINI_W05_R511_PUBLICATION_READONLY_V1',
 checkedAt:new Date().toISOString(),reports},null,2)+'\n');
console.log('PASS W05 R5-12 live 390/768/1440/1920 responsive BLS source/help/a11y/errors');
