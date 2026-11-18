import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Browser-only fixture: no CNN request, PC job, SQLite, D1, or production writes.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const sourceObservedAt='2026-10-30T13:20:00.000Z'; // 09:20 New York, October 30.
const olderSourceAt='2026-10-29T13:20:00.000Z'; // Different New York session.
const times=[
 '2026-10-30T13:35:04.658Z',
 '2026-10-30T13:55:04.777Z',
 '2026-10-30T14:15:04.988Z',
];
const original=[{observedAt:sourceObservedAt,score:26.2}];
const primary={status:'verified',score:26.2,rating:'공포',
 observedAt:sourceObservedAt,observedHistoryVersion:'CNN_OBSERVED_HISTORY_R1',
 intradayObservations:original,
 history:[{timestamp:sourceObservedAt,score:26.2}],
 previous:{close:26.2},components:[]};

function fixture(path,period,sourceAt){
 if(path==='/api/fear-greed')return primary;
 if(path==='/api/fear-greed/observations')return {
  status:'READY',period:period??'1D',points:original,
  checkedPoints:times.map(checkedAt=>({checkedAt,sourceObservedAt:sourceAt,score:26.2})),
  verifiedCheckCount:3,checkTimeMeaning:'PC_VERIFIED_STORED_AT',
 };
 if(path==='/api/session')return {user:null};
 return {status:'UNAVAILABLE'};
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/cnn-current-session-checks',{recursive:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  let sourceAt=sourceObservedAt;
  const requests=[],pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url());
   requests.push(url.pathname+url.search);
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(fixture(url.pathname,url.searchParams.get('period'),sourceAt))});
  });
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.goto(base+'/fear-greed/usa/',{waitUntil:'networkidle',timeout:45000});

  const toolbar=page.getByRole('group',{name:'CNN 지수 기간 선택'});
  const buttons=toolbar.locator('button[data-period-short]');
  await toolbar.scrollIntoViewIfNeeded();
  assert.equal(await buttons.count(),6,width+'px USA has exactly six period controls');
  const geometry=await buttons.evaluateAll(items=>items.map(button=>{
   const rect=button.getBoundingClientRect();
   const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   return {period:button.getAttribute('data-period-short'),
    hit:hit?.closest('button')?.getAttribute('data-period-short')??null};
  }));
  assert.ok(geometry.every(p=>p.period===p.hit),
   width+'px each USA period must have a real clickable center: '+JSON.stringify(geometry));

  const oneDay=toolbar.locator('button[data-period-short="1D"]');
  await oneDay.click();
  assert.equal(await oneDay.getAttribute('aria-pressed'),'true');

  const chart=page.locator('.zg-fg-us .cnn-history-chart-hitbox');
  const curve=chart.locator('path.recharts-area-curve');
  await curve.waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(()=>{
   const path=document.querySelector('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve');
   const d=path?.getAttribute('d')??'';
   return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d);
  },null,{timeout:15000});
  const pathD=await curve.getAttribute('d');
  assert.ok(pathD?.length>20,width+'px three actual PC checks draw a continuous same-score line');
  const labels=await chart.locator('.recharts-cartesian-axis-tick-value').allTextContents();
  assert.ok(labels.some(label=>label.includes('10:15')),
   width+'px latest actual successful PC check has a New York 10:15 tick: '+JSON.stringify(labels));
  assert.ok(requests.some(path=>path.includes('/api/fear-greed/observations?period=1D')));
  await chart.scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/cnn-current-session-checks/cnn-three-checks-${width}.png`});
  assert.deepEqual(pageErrors,[],width+'px chart should not trigger client exceptions');

  // A check on another New York source session cannot be reinterpreted as a
  // newly published CNN observation or extend the current 1D chart.
  sourceAt=olderSourceAt;
  await page.reload({waitUntil:'networkidle',timeout:45000});
  const staleToolbar=page.getByRole('group',{name:'CNN 지수 기간 선택'});
  await staleToolbar.scrollIntoViewIfNeeded();
  await staleToolbar.locator('button[data-period-short="1D"]').click();
  await page.locator('.zg-fg-us .cnn-chart-empty').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve').count(),0);
  await page.screenshot({path:`artifacts/cnn-current-session-checks/cnn-stale-session-held-${width}.png`});
  assert.deepEqual(pageErrors,[]);
  console.log(JSON.stringify({status:'PASS',width,verifiedCurrentCheckTimes:3,
   score:26.2,nyLatest:'10:15',staleSourceSession:'EXCLUDED',
   clickablePeriodButtons:geometry.length,sourceRequests:0,dbWrites:0}));
  await page.close();
 }
}finally{await browser.close();}
