import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';

const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/inflation-criterion-review',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
const sourceRows=INFLATION_CAUSAL_19.map(meta=>({
 id:meta.id,series:meta.series,unit:meta.unit,status:'READY',
 value:124.8,previousValue:120.4,observationDate:'2026-09',
 previousObservationDate:'2026-08',availableAt:'2026-10-10T00:00:00Z',
 sourceStoredAt:'2026-11-04T00:00:00Z',
 history:[{date:'2026-08',value:120.4},{date:'2026-09',value:124.8}]
}));
const research={schemaVersion:'inflation-causal-public-19-r1-v1',status:'READY',score:null,
 sourceVersion:'BROWSER_FIXTURE_NOT_PRODUCTION',sourceStoredAt:Date.parse('2026-11-04T00:00:00Z'),
 indicators:sourceRows};
const four=['근원 PCE','근원 CPI','소비자물가','기대 인플레이션'].map((name,i)=>({
 id:'r2-'+i,name,status:'READY',score:50,source:'STORED_PIT_HISTORY'
}));
const market={status:'READY',asOfDate:'2026-10-31',
 domains:[{id:'inflation',status:'READY',score:50,indicators:four,trend:[]}]};
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(width+': '+error.message));
  await page.route('**/api/market-score',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(market)}));
  await page.route('**/api/inflation-causal-inputs',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(research)}));
  await page.goto(base+'/economic-indicators/inflation/',{waitUntil:'domcontentloaded',timeout:60000});
  const section=page.locator('.economic-indicators[aria-labelledby="economic-inflation-indicators"]');
  await section.waitFor({state:'attached',timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('tbody tr[data-research-input]').length===19&&
   document.querySelectorAll('tbody tr[data-judgement]:not([data-research-input])').length===4,null,{timeout:30000});
  assert.equal(await section.locator('tbody tr[data-research-input]').count(),19);
  assert.equal(await section.locator('tbody tr[data-judgement]:not([data-research-input])').count(),4);
  assert.match(await section.locator('h2').first().innerText(),/원자료 19개/);
  const table=section.locator('table').first();
  for(const label of ['기준','이전','현재']){
   assert(await table.locator('thead th').allTextContents().then(xs=>xs.includes(label)),
    'desktop column '+label);
  }
  const first=section.locator('tbody tr[data-research-input="research-1"]');
  assert.match(await first.locator('td').nth(2).innerText(),/에너지 원가 압력/);
  assert.match(await first.locator('td').nth(3).innerText(),/120\.4.*USD\/배럴/);
  const current=await first.locator('td').nth(4).innerText();
  assert.match(current,/124\.8.*USD\/배럴/);
  assert.match(current,/2026/);
  assert.match(current,/FRED\/EIA/);
  assert.equal(await section.locator('.inflation-r2-mobile-list article[data-research-input]').count(),19);
  const firstMobile=section.locator('.inflation-r2-mobile-list article[data-research-input="research-1"]');
  assert.match(await firstMobile.locator('.inflation-r2-mobile-criterion').innerText(),/에너지 원가 압력/);
  assert.match(await firstMobile.locator('.inflation-r2-mobile-metrics').innerText(),/120\.4/);
  assert.match(await firstMobile.locator('.inflation-r2-mobile-metrics').innerText(),/124\.8/);
  assert.match(await firstMobile.locator('.inflation-r2-mobile-metrics').innerText(),/FRED\/EIA/);
  const dialog=page.locator('dialog[aria-labelledby="zg-about-popup-title"]');
  if(await dialog.isVisible()){
   const close=dialog.getByRole('button',{name:'닫기',exact:true});
   if(await close.count())await close.click();
  }
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/inflation-criterion-review/inflation-'+width+'.png',fullPage:false});
  console.log('PASS inflation criterion previous current date source at '+width+'px');
  await page.close();
 }
 assert.deepEqual(errors,[],'No browser runtime errors');
}finally{await browser.close();}
