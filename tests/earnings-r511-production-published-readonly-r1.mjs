import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {earningsCostPublicationKst} from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';

// W05 R5-11: live Production GET/HEAD + hydrated page, read-only.
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
 for(const width of [390,1440]){
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
  assert.deepEqual(pageErrors,[],'no Production JS exception '+width);
  assert.deepEqual(failedScripts,[],'no failed first-party JS '+width);
  const report={viewport:width,documentStatus:response.status(),apiStatus:api.status(),
   headStatus:head.status(),sourceVersion:data.sourceVersion,sourceStoredAt:data.sourceStoredAt,
   observedThroughBySeries:data.observedThroughBySeries,
   publicationAt:published,sourceAt:source,rendered:shown,
   readyRows:data.rows?.filter(row=>row.status==='READY').length??null,
   pageErrors,failedScripts};
  reports.push(report);
  await page.screenshot({path:output+'/published-'+width+'.png'});
  console.log('W05_R511_PUBLICATION_LIVE '+JSON.stringify(report));
  await context.close();
 }
}finally{await browser.close();}
assert.equal(reports.length,2);
assert.equal(reports[0].publicationAt,reports[1].publicationAt,
 'both viewports saw the same D1 publication version');
assert.equal(reports[0].sourceVersion,reports[1].sourceVersion,
 'no mixed PC source lineage across screen sizes');
writeFileSync(output+'/live.json',JSON.stringify({
 schema:'ZGMINI_W05_R511_PUBLICATION_READONLY_V1',
 checkedAt:new Date().toISOString(),reports},null,2)+'\n');
console.log('PASS W05 R5-11 live D1 published-at GET/HEAD and 390/1440 UI');
