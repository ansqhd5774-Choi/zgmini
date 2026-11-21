import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// R5-11 browser fixture only. It never reads or changes Production, PC, D1 or provider data.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const observed='2026-09';
const retrievedAt='2026-10-26T17:02:53.996Z';
const months=Array.from({length:13},(_,i)=>
  new Date(Date.UTC(2025,8+i,1)).toISOString().slice(0,7));
function monthHistory(last,previous,{gap=false}={}){
  return months.map((period,i)=>({period,value:
    gap&&i===4?null:i===12?last:i===11?previous:Number((i*.47-2).toFixed(2))}));
}
function bls(id,seriesId,unit,value,previous,{status='READY',freshness='FRESH',gap=false}={}){
  const frequency=seriesId==='PRS85006111'?'QUARTERLY':'MONTHLY';
  const history=frequency==='MONTHLY'?monthHistory(value,previous,{gap}):
    ['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2']
      .map((period,i)=>({period,value:i===4?value:i===3?previous:1+i*.1}));
  return {indicatorId:id,status,frequency,seriesId,unit,value,
    previousValue:previous,change:value===null||previous===null?null:value-previous,
    observationPeriod:frequency==='MONTHLY'?observed:'2026-Q2',
    previousPeriod:frequency==='MONTHLY'?'2026-08':'2026-Q1',
    retrievedAt,history,freshness:{status:freshness,reason:freshness==='STALE'?'SOURCE_RETRIEVAL_EXPIRED':null}};
}
const rows=[
 bls('bls_ppi_final_demand_yoy_sa','WPSFD4','PERCENT',6.34,6.10,{gap:true}),
 bls('bls_ppi_final_demand_index','WPSFD4','INDEX',159.78,158.50),
 bls('bls_ppi_goods_yoy_sa','WPSFD41','PERCENT',0,-1),
 bls('bls_ppi_goods_index','WPSFD41','INDEX',162.34,160.80,{status:'STALE',freshness:'STALE'}),
 bls('bls_unit_labor_cost_yoy','PRS85006111','PERCENT',null,1.50,{status:'PARTIAL'})
];
const mock={schemaVersion:'earnings-companion-c-r4-v1',
 status:'PARTIAL',historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',sourceVersion:'a'.repeat(64),
 sourceStoredAt:Date.parse(retrievedAt),rows};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/earnings-r511-browser',{recursive:true});
try{
 for(const width of [390,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',locale:'ko-KR'});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url());
   const isBls=url.pathname==='/api/earnings-recession-indicators';
   return route.fulfill({status:isBls?200:503,contentType:'application/json',
     headers:isBls?{'x-projection-published-at':'2026-10-27T03:00:00.000Z',
       'x-projection-source-at':retrievedAt}:{},
     body:JSON.stringify(isBls?mock:{status:'unavailable',reason:'STORED_PROJECTION_PENDING'})});
  });
  await page.goto(base+'/earnings-recession/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>
    document.querySelector('.earnings-r2-table tbody tr.earnings-r2-cost-row')?.textContent?.includes('6.34%'),
    null,{timeout:30000});
  assert.equal((await page.locator('.earnings-r2-published-at').innerText()).trim(),
    'BLS 게시 2026-10-27 12:00:00 KST',width+'px: D1 publication is not retrieval');
  const table=page.locator('.earnings-r2-table tbody tr.earnings-r2-cost-row');
  const cards=page.locator('.earnings-r2-mobile-list article.earnings-r2-cost-mobile-card');
  assert((await table.count())>=5,width+'px: five BLS desktop rows');
  assert((await cards.count())>=5,width+'px: five BLS mobile rows');
  const visibleTable=await table.nth(0).isVisible();
  const item=i=>visibleTable?table.nth(i):cards.nth(i);
  const first=item(0),zero=item(2),stale=item(3),partial=item(4);
  assert.match(await first.innerText(),/6\.34%/,width+'px: stored raw BLS value');
  assert.match(await first.innerText(),/수집 2026-10-26/,width+'px: retrieval date is labeled');
  assert.match(await first.innerText(),/2026-09/,width+'px: observation month is distinct');
  const svg=first.locator('svg.earnings-r2-cost-spark');
  assert.equal(await svg.count(),1,width+'px: real BLS history draws chart');
  const pathD=await svg.locator('path').getAttribute('d');
  assert(pathD&&pathD.startsWith('M'),width+'px: actual line path');
  assert.equal((pathD.match(/M/g)||[]).length,2,width+'px: null observation breaks the line');
  assert(pathD.includes(' L'),width+'px: adjacent observed points connect as lines');
  assert.equal(await svg.locator('circle').count(),1,width+'px: final real observation has marker');
  assert.equal(Number(await svg.locator('circle').getAttribute('cx')),115,
    width+'px: final observed slot is rightmost marker');
  assert.match(await zero.innerText(),/0\.00%/,width+'px: actual zero preserved');
  assert.equal(await zero.locator('svg.earnings-r2-cost-spark circle').count(),1,
    width+'px: actual zero receives marker');
  assert.match(await stale.innerText(),/갱신 지연/,width+'px: stale status is visible');
  assert.equal(await stale.locator('svg.earnings-r2-cost-spark').count(),0,
    width+'px: stale snapshot does not draw a current chart');
  assert.match(await partial.innerText(),/확인 대기/,width+'px: partial remains unavailable');
  assert.equal(await partial.locator('svg.earnings-r2-cost-spark').count(),0,
    width+'px: missing last observation never masquerades as latest');
  assert.deepEqual(pageErrors,[],width+'px: no client exceptions');
  await page.screenshot({path:'artifacts/earnings-r511-browser/mock-'+width+'.png',fullPage:false});
  console.log('PASS W05 R5-11 mocked Chromium '+width+'px: line gaps, zero, stale, last marker and dates');
  await page.close();
 }
}finally{await browser.close();}
