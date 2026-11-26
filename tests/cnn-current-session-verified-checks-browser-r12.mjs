import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Mock stored API only. A PC verification is not an observed CNN minute candle.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const sourceObservedAt='2026-10-30T13:21:00.000Z';
const olderSourceAt='2026-10-29T13:20:00.000Z';
const original=[
 {observedAt:'2026-10-30T13:20:00.000Z',score:26.2},
 {observedAt:sourceObservedAt,score:26.3},
];
const newer={observedAt:'2026-10-30T13:22:00.000Z',score:26.4};
const weekly=[
 ...['13:00','13:30','14:00','14:30'].map((clock,i)=>({observedAt:'2026-10-27T'+clock+':00.000Z',score:20+i})),
 ...['13:00','13:30','14:00'].map((clock,i)=>({observedAt:'2026-10-28T'+clock+':00.000Z',score:24+i})),
 ...['13:00','13:30','14:00'].map((clock,i)=>({observedAt:'2026-10-29T'+clock+':00.000Z',score:27+i})),
];
const monthly=[
 {observedAt:'2026-10-09T13:00:00.000Z',score:21},
 {observedAt:'2026-10-09T18:30:00.000Z',score:22},
];
const checkTimes=[
 '2026-10-30T13:35:04.658Z',
 '2026-10-30T13:55:04.777Z',
 '2026-10-30T14:15:04.988Z',
];
const primary={status:'verified',score:26.3,rating:'공포',
 observedAt:sourceObservedAt,observedHistoryVersion:'CNN_OBSERVED_HISTORY_R1',
 intradayObservations:original,history:[{timestamp:sourceObservedAt,score:26.3}],
 previous:{close:26.2},components:[]};
function fixture(path,period,checkSourceAt,includeNew){
 if(path==='/api/fear-greed')return primary;
 if(path==='/api/fear-greed/observations')return {
  status:'READY',period:period??'1D',
  points:period==='1D'?(includeNew?[...original,newer]:original):
   period==='1W'?[...weekly,...original]:[...monthly,...weekly,...original],
  checkedPoints:checkTimes.map(checkedAt=>({checkedAt,sourceObservedAt:checkSourceAt,score:26.3})),
  verifiedCheckCount:3,checkTimeMeaning:'PC_VERIFIED_STORED_AT',
 };
 if(path==='/api/session')return {user:null};
 return {status:'UNAVAILABLE'};
}
// Both the first plotted source point and first continuous-axis tick must be
// at the same left plot coordinate; do not insert a fake calendar-start point.
async function assertRealLineStartsAtLeft(page,period,width){
 const line=page.locator('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve');
 await line.first().waitFor({state:'attached',timeout:15000});
 const geometry=await page.locator('.zg-fg-us .cnn-history-chart-hitbox').evaluate(root=>{
  const path=root.querySelector('path.recharts-area-curve');
  const tick=root.querySelector('.recharts-xAxis .recharts-cartesian-axis-tick text');
  const d=path?.getAttribute('d')??'';
  const start=d.match(/^M\s*([-\d.]+)/);
  return {firstX:start?Number(start[1]):null,
    leftTickX:tick?Number(tick.getAttribute('x')):null};
 });
 assert(Number.isFinite(geometry.firstX)&&Number.isFinite(geometry.leftTickX),
  period+' '+width+'px must expose first line point and left axis tick: '+JSON.stringify(geometry));
 assert(Math.abs(geometry.firstX-geometry.leftTickX)<=3,
  period+' '+width+'px first real point must touch left plot edge: '+JSON.stringify(geometry));
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/cnn-current-session-checks',{recursive:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',
   hasTouch:width===390,isMobile:width===390});
  const errors=[],requests=[];
  let archiveFailure=false,includeNew=false,checkSourceAt=sourceObservedAt;
  await page.clock.install();
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url());
   requests.push(url.pathname+url.search);
   if(url.pathname==='/api/fear-greed/observations'&&archiveFailure)
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'PENDING'})});
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(fixture(url.pathname,url.searchParams.get('period'),checkSourceAt,includeNew))});
  });
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.goto(base+'/fear-greed/usa/',{waitUntil:'networkidle',timeout:45000});
  const toolbar=page.getByRole('group',{name:'CNN 지수 기간 선택'});
  const buttons=toolbar.locator('button[data-period-short]');
  await toolbar.scrollIntoViewIfNeeded();
  assert.equal(await buttons.count(),6,width+'px retains six period controls');
  const geometry=await buttons.evaluateAll(items=>items.map(button=>{
   const rect=button.getBoundingClientRect();
   const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   return {period:button.getAttribute('data-period-short'),
    hit:hit?.closest('button')?.getAttribute('data-period-short')??null};
  }));
  assert.ok(geometry.every(p=>p.period===p.hit),width+'px six period buttons clickable');

  const oneDay=toolbar.locator('button[data-period-short="1D"]');
  await oneDay.click();
  assert.equal(await oneDay.getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('group',{name:'CNN 원본 관측 간격'}).count(),0);
  assert.equal(await page.locator('button[data-cnn-minute]').count(),0);

  const chart=page.locator('.zg-fg-us .cnn-history-chart-hitbox');
  await chart.scrollIntoViewIfNeeded();
  const minute=page.locator('[data-cnn-intraday-mode="1"]');
  await minute.waitFor({state:'attached',timeout:20000});
  await page.waitForFunction(()=>{
   const holder=document.querySelector('[data-cnn-intraday-mode="1"]');
   const path=document.querySelector('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve');
   const d=path?.getAttribute('d')??'';
   return holder?.getAttribute('data-cnn-bucket-count')==='2'
    &&/^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d);
  },null,{timeout:20000});
  const curve=chart.locator('path.recharts-area-curve');
  const before=await curve.getAttribute('d');
  assert.ok(before?.length>20,width+'px two real 1-minute points draw a curve');
  await assertRealLineStartsAtLeft(page,'1D',width);

  if(width===390){
   const latest=chart.locator('.cnn-latest-point circle, circle.cnn-latest-point').first();
   await latest.waitFor({state:'attached',timeout:12000});
   const b=await latest.boundingBox();
   assert(b&&b.width>0&&b.height>0,'touch target exists for latest genuine point');
   await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
   const tip=page.getByTestId('w04-r54-latest-touch-tooltip');
   await tip.waitFor({state:'visible',timeout:10000});
   const text=await tip.innerText();
   assert(text.includes('26.3')&&text.includes('09:21'),
    'touch tooltip shows actual score and NY observation clock: '+text);
   assert.doesNotMatch(text,/미국 동부시간|구간 마감|진행 중/,'1D tooltip is only real date/time and score');
  }
  assert.ok(requests.some(p=>p.includes('/api/fear-greed/observations?period=1D')));

  archiveFailure=true;
  await page.clock.fastForward(60_000);
  await page.getByText(/이력 갱신 지연/).first().waitFor({state:'visible',timeout:12000});
  assert.equal(await curve.getAttribute('d'),before);
  archiveFailure=false;
  includeNew=true;
  await page.clock.fastForward(60_000);
  await page.waitForFunction(()=>document.querySelector('[data-cnn-intraday-mode="1"]')
   ?.getAttribute('data-cnn-bucket-count')==='3',null,{timeout:15000});
  assert.equal(await page.getByText(/이력 갱신 지연/).count(),0);
  assert.equal(await oneDay.getAttribute('aria-pressed'),'true');
  await page.screenshot({path:'artifacts/cnn-current-session-checks/cnn-1d-minute-'+width+'.png'});

  // Mismatched verification source sessions cannot extend the genuine 1D series.
  includeNew=false;
  checkSourceAt=olderSourceAt;
  await page.reload({waitUntil:'networkidle',timeout:45000});
  const toolbarReload=page.getByRole('group',{name:'CNN 지수 기간 선택'});
  await toolbarReload.scrollIntoViewIfNeeded();
  await toolbarReload.locator('button[data-period-short="1D"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-cnn-intraday-mode="1"]')
   ?.getAttribute('data-cnn-bucket-count')==='2',null,{timeout:15000});
  assert.equal(await page.locator('button[data-cnn-minute]').count(),0);
  for(const [period,minimum]of [['1W',11],['1M',6],['3M',5],['6M',5],['1Y',5]]){
   const button=toolbarReload.locator('button[data-period-short="'+period+'"]');
   await button.click();
   assert.equal(await button.getAttribute('aria-pressed'),'true');
   await page.waitForFunction(({min})=>Number(document.querySelector('[data-cnn-period-point-count]')
    ?.getAttribute('data-cnn-period-point-count'))>=min,{min:minimum},{timeout:20000});
   assert.equal(await page.locator('button[data-cnn-minute]').count(),0);
   assert.ok(await page.locator('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve').count()>0);
   await assertRealLineStartsAtLeft(page,period,width);
  }
  assert.ok(requests.some(path=>path.includes('/api/fear-greed/observations?period=1W')));
  assert.ok(requests.some(path=>path.includes('/api/fear-greed/observations?period=1M')));
  await toolbarReload.locator('button[data-period-short="1D"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-cnn-intraday-mode="1"]')
   ?.getAttribute('data-cnn-bucket-count')==='2',null,{timeout:15000});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,initialBuckets:2,afterRefresh:3,
   oldChecksExcluded:true,periodCount:6,providerCalls:0,dbWrites:0}));
  await page.close();
 }
}finally{await browser.close();}
