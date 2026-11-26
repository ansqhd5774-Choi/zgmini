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
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',
   hasTouch:width===390,isMobile:width===390});
  let sourceAt=sourceObservedAt;
  let archiveFailure=false,extraCheck=false,minuteFixture=false;
  const requests=[],pageErrors=[];
  await page.clock.install();
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url());
   requests.push(url.pathname+url.search);
   if(url.pathname==='/api/fear-greed/observations'&&archiveFailure)
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'PENDING'})});
   const data=fixture(url.pathname,url.searchParams.get('period'),sourceAt);
   if(url.pathname==='/api/fear-greed/observations'&&minuteFixture){
    data.points=[...original,{observedAt:'2026-10-30T13:21:00.000Z',score:26.3},{observedAt:'2026-10-30T13:24:00.000Z',score:26.4},{observedAt:'2026-10-30T13:25:00.000Z',score:26.1},{observedAt:'2026-10-30T13:30:00.000Z',score:26.5}];
   }
   if(url.pathname==='/api/fear-greed/observations'&&extraCheck)
    data.checkedPoints.push({checkedAt:'2026-10-30T14:30:00.000Z',sourceObservedAt:sourceAt,score:26.2});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
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
  // Lazy renderer is gated by viewport visibility; scrolling the placeholder
  // first makes this test independent from the initial page fold.
  await chart.scrollIntoViewIfNeeded();
  const curve=chart.locator('path.recharts-area-curve');
  // A real flat 26.2-score SVG path has zero geometric height; Playwright
  // calls that path "hidden" even while the stroked line is present on-screen.
  // Check attachment plus its actual finite multi-point path instead.
  await curve.waitFor({state:'attached',timeout:20000});
  await page.waitForFunction(()=>{
   const path=document.querySelector('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve');
   const d=path?.getAttribute('d')??'';
   return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d);
  },null,{timeout:15000});
  // Actual 390px touchscreen tap on the latest verified PC check must
  // expose its true score and New York check clock, never a hover simulation.
  if(width===390){
   const latest=chart.locator('.cnn-latest-point circle, circle.cnn-latest-point').first();
   await latest.waitFor({state:'attached',timeout:12000});
   const bounds=await latest.boundingBox();
   assert(bounds&&bounds.width>0&&bounds.height>0,'latest real CNN point has touch coordinates');
   await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   const mobileTip=page.getByTestId('w04-r54-latest-touch-tooltip');
   await mobileTip.waitFor({state:'visible',timeout:10000});
   const mobileText=await mobileTip.innerText();
   assert(mobileText.includes('26.2')&&mobileText.includes('10:15'),
    'real latest-point tap displays 26.2 and New York 10:15: '+mobileText);
  }
  const pathD=await curve.getAttribute('d');
  assert.ok(pathD?.length>20,width+'px three actual PC checks draw a continuous same-score line');
  const labels=await chart.locator('.recharts-cartesian-axis-tick-value').allTextContents();
  assert.ok(labels.some(label=>label.includes('10:15')),
   width+'px latest actual successful PC check has a New York 10:15 tick: '+JSON.stringify(labels));
  assert.ok(requests.some(path=>path.includes('/api/fear-greed/observations?period=1D')));
  await chart.scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/cnn-current-session-checks/cnn-three-checks-${width}.png`});
  assert.deepEqual(pageErrors,[],width+'px chart should not trigger client exceptions');

  // The archive reader must poll again without navigation or period changes.
  // An unsuccessful read leaves the previous real curve intact; the next
  // successful read advances its latest actual check and clears the delay.
  archiveFailure=true;
  await page.clock.fastForward(60_000);
  await page.getByText(/이력 갱신 지연/).first().waitFor({state:'visible',timeout:12000});
  assert.equal(await curve.getAttribute('d'),pathD,width+'px transient failure retains the last verified line');
  archiveFailure=false;
  extraCheck=true;
  // Both new archive fields arrive in the same successful poll. The 10:30
  // rendered tick below acknowledges that this response was applied.
  // Do not advance the fake clock again before the asynchronous poll settles.
  minuteFixture=true;
  await page.clock.fastForward(60_000);
  await page.waitForFunction(()=>{
   const labels=[...document.querySelectorAll('.zg-fg-us .cnn-history-chart-hitbox .recharts-cartesian-axis-tick-value')];
   return labels.some(label=>label.textContent?.includes('10:30'));
  },null,{timeout:15000});
  assert.equal(await page.getByText(/이력 갱신 지연/).count(),0);
  assert.equal(await oneDay.getAttribute('aria-pressed'),'true');
  extraCheck=false;
  const minutesGroup=page.getByRole('group',{name:'CNN 원본 관측 간격'});
  assert.equal(await minutesGroup.locator('button[data-cnn-minute]').count(),4);
  for(const [minutes,count] of [[1,5],[5,3],[10,2],[30,2]]){
   const choice=minutesGroup.locator(`button[data-cnn-minute="${minutes}"]`);
   await choice.click();
   assert.equal(await choice.getAttribute('aria-pressed'),'true');
   try{
    await page.waitForFunction(({minutes,count})=>document.querySelector(`[data-cnn-intraday-mode="${minutes}"]`)?.getAttribute('data-cnn-bucket-count')===String(count),{minutes,count});
   }catch(error){
    const actual=await page.locator(`[data-cnn-intraday-mode="${minutes}"]`).getAttribute('data-cnn-bucket-count',{timeout:3000}).catch(()=>null);
    console.error(JSON.stringify({width,minutes,expectedBucketCount:count,actualBucketCount:actual,archiveRequests:requests.filter(path=>path.includes('/api/fear-greed/observations'))}));
    throw error;
   }
  }
  await minutesGroup.getByRole('button',{name:'확인 이력'}).click();
  minuteFixture=false;

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
