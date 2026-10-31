import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Fixture values only. Browser interception isolates the real React chart from production/D1.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const observedAt='2026-10-30T23:59:48.000Z';
const checkTimes=['2026-10-31T13:35:04.658Z','2026-10-31T13:55:04.777Z','2026-10-31T14:15:04.988Z'];
const cnnPoints=[{observedAt,score:26.2}];
const checkedPoints=checkTimes.map(checkedAt=>({checkedAt,sourceObservedAt:observedAt,score:26.2}));
const compositePoints=checkTimes.map((observedAt,i)=>({observedAt,score:[44,44,46][i]}));
const ids=['inflation','employment','rates','credit','growth','consumption','earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];
const trend=Array.from({length:365},(_,i)=>({label:new Date(Date.UTC(2025,10,1)+i*86400000).toISOString().slice(0,10),value:42+i%9}));
const market={status:'SUCCESS',updatedAt:'2026-10-31T14:15:04.988Z',overall:{status:'READY',score:46,trend},domains:ids.map(id=>({id,status:'READY',score:46,trend})),dataQuality:{readyDomains:12,totalDomains:12,coverageWeight:1}};
const cnn={status:'verified',score:26.2,rating:'공포',observedAt,observedHistoryVersion:'CNN_OBSERVED_HISTORY_R1',intradayObservations:cnnPoints,history:[{timestamp:observedAt,score:26.2}],previous:{close:26.2},components:[]};
function fixture(path,period){
 if(path==='/api/fear-greed')return cnn;
 if(path==='/api/fear-greed/observations')return {status:'READY',period:period??'1D',points:cnnPoints,checkedPoints,verifiedCheckCount:3,checkTimeMeaning:'PC_VERIFIED_STORED_AT'};
 if(path==='/api/market-score')return market;
 if(path==='/api/market-score/observations')return {status:'READY',period:period??'1D',points:compositePoints,timeMeaning:'PC_CALCULATED_AT'};
 if(path==='/api/session')return {user:null};
 return {status:'UNAVAILABLE'};
}
mkdirSync('artifacts/cnn-verified-checks',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',r=>r.abort());
  await page.route('**/api/**',r=>{
   const u=new URL(r.request().url());
   requests.push(u.pathname+u.search);
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(u.pathname,u.searchParams.get('period')))});
  });
  await page.goto(base+'/fear-greed/usa/',{waitUntil:'networkidle',timeout:45000});
  const usaBar=page.getByRole('group',{name:'CNN 지수 기간 선택'});
  const usa1d=usaBar.locator('button[data-period-short="1D"]');
  assert.equal(await usa1d.count(),1);
  await usa1d.click();
  const usaChart=page.locator('.zg-fg-us .cnn-history-chart-hitbox');
  await page.waitForFunction(()=>document.querySelector('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve')?.getAttribute('d')?.length>15,null,{timeout:20000});
  const d=await usaChart.locator('path.recharts-area-curve').getAttribute('d');
  assert.ok(d?.startsWith('M')&&d.includes('C'),'Same-score timeline SVG curve rendered');
  const axis=await usaChart.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value').allTextContents();
  assert.ok(axis.some(s=>s.includes('09:35')),'First PC confirmation time visible');
  assert.ok(axis.some(s=>s.includes('10:15')),'Last PC confirmation time visible');
  assert.equal(await usa1d.getAttribute('aria-pressed'),'true');
  const rect=await usaChart.boundingBox();
  assert.ok(rect?.width>100&&rect.height>100);
  assert.ok(requests.some(p=>p.includes('/api/fear-greed/observations?period=1D')));
  await usaChart.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/cnn-verified-checks/cnn-1d-'+width+'.png'});
  await page.goto(base+'/',{waitUntil:'networkidle',timeout:45000});
  const marketBar=page.getByRole('group',{name:'종합 시장 점수 추이 기간'});
  assert.equal(await marketBar.locator('button').count(),6,'No duplicate 1일');
  assert.equal(await marketBar.getByRole('button',{name:'1일',exact:true}).count(),0);
  const summary=page.locator('.zg-r55-summary-chart');
  await summary.scrollIntoViewIfNeeded();
  const curve=summary.locator('path.recharts-area-curve');
  await curve.waitFor({state:'visible',timeout:20000});
  const year=await curve.getAttribute('d');
  await marketBar.getByRole('button',{name:'1D',exact:true}).click();
  await page.waitForFunction(old=>{
   const p=document.querySelector('.zg-r55-summary-chart path.recharts-area-curve');
   return p?.getAttribute('d')&&p.getAttribute('d')!==old;
  },year,{timeout:20000});
  assert.ok((await curve.getAttribute('d'))?.length>15);
  assert.ok(requests.some(p=>p.includes('/api/market-score/observations?period=1D')));
  await page.screenshot({path:'artifacts/cnn-verified-checks/composite-1d-'+width+'.png'});
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log(JSON.stringify({status:'PASS',width,cnn:{sourcePoints:1,checkedPoints:3,unchangedScore:26.2,axis},composite:{control:'1D',chartChanged:true},writes:0}));
  await page.close();
 }
}finally{await browser.close();}
