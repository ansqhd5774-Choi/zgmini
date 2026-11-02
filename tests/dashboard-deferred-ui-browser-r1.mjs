import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Isolated local browser fixtures. No real account, data write, or analytics.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/dashboard-deferred-ui',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const sampleHistory=Array.from({length:90},(_,i)=>({date:new Date(Date.UTC(2026,7,1)+i*86400000).toISOString().slice(0,10),score:45+Math.sin(i/8)*12}));
const breadthHistory={market:'usa',universe:'SP500',window:'1Y',from:'2025-10-30',to:'2026-10-30',
 records:Array.from({length:366},(_,i)=>({observationDate:new Date(Date.UTC(2025,9,30)+i*86400000).toISOString().slice(0,10),
  eligibleCount:500,counts:{rising:240+(i%12<5?45:-45),unchanged:20,falling:240-(i%12<5?45:-45)}}))};
try{
 for(const width of [390,1440])for(const signedIn of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});
  const modules=[],errors=[];
  let breadthHistoryRequests=0;
  page.on('request',request=>modules.push(new URL(request.url()).pathname));
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const payload=path==='/api/session'?{user:signedIn?{displayName:'UI fixture',email:'fixture@example.invalid'}:null}
    :path==='/api/favorites'?{favorites:[]}
    :path==='/api/market-data'?{status:'fallback',updatedAt:'',indicators:{},summary:[]}
    :path==='/api/fear-greed'?{status:'verified',score:34.5,rating:'공포',observedAt:'2026-10-30T12:00:00Z',history:sampleHistory}
    :path==='/api/market-breadth/history'?(breadthHistoryRequests++,breadthHistory)
    :{status:'UNAVAILABLE'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.zg-dashboard[data-view="dashboard"]').waitFor({state:'visible'});
  const header=await page.locator('.zg-country-section .zg-section-heading').evaluate(el=>{
   const title=el.querySelector('h1').getBoundingClientRect(),guide=el.querySelector('a').getBoundingClientRect();
   return {overlap:title.left<guide.right&&title.right>guide.left&&title.top<guide.bottom&&title.bottom>guide.top,
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(header.overlap,false,'Market title and guide remain separate');
  assert.equal(header.overflow,false,'Dashboard has no horizontal overflow');

  // Regression: the October breadth inline grid override must not override
  // the previously approved mobile dashboard row height (112px).
  const marketLayout=await page.evaluate(()=>['usa','korea'].map(market=>{
   const card=document.querySelector('.'+market+'-target-card.fg-shared-shell');
   if(!card)return {market,missing:true};
   const score=card.querySelector('.fg-score-slot')?.getBoundingClientRect();
   const chart=card.querySelector('.fg-chart-slot')?.getBoundingClientRect();
   const breadth=card.querySelector('.fg-breadth-slot')?.getBoundingClientRect();
   const rows=getComputedStyle(card).gridTemplateRows.trim().split(/\s+/).map(Number.parseFloat);
   return {market,missing:false,inlineGridRows:card.style.gridTemplateRows,
    rows,scoreHeight:score?.height??0,chartHeight:chart?.height??0,
    breadthGap:breadth&&chart?breadth.top-chart.bottom:null};
  }));
  for(const m of marketLayout){
   assert.equal(m.missing,false,m.market+' market card exists');
   assert.equal(m.inlineGridRows,'',m.market+' no obsolete breadth inline row override');
   assert.ok(m.breadthGap!==null&&Math.abs(m.breadthGap)<3,m.market+' breadth touches chart with no empty grid gap');
   if(width===390){
    assert.ok(Math.abs(m.rows[1]-112)<1,m.market+' mobile grid preserves pre-breadth 112px row');
    assert.ok(Math.abs(m.scoreHeight-112)<1,m.market+' mobile score remains 112px');
    assert.ok(Math.abs(m.chartHeight-112)<1,m.market+' mobile chart remains 112px');
   }else{
    assert.ok(Math.abs(m.rows[1]-142)<1,m.market+' desktop content row remains 142px');
   }
  }
  console.log('PASS rollback original rows '+width+'px signedIn='+signedIn+': '+JSON.stringify(marketLayout));
  if(width===390&&!signedIn){
   await page.locator('.usa-target-card path.recharts-area-curve').waitFor({state:'visible',timeout:15000});
   const chart=page.locator('.usa-target-card .recharts-surface').first();
   await chart.waitFor({state:'visible',timeout:15000});
   const box=await chart.boundingBox();
   assert.ok(box&&box.width>100,'USA mobile chart is rendered');
   const x=box.x+box.width*0.5,y=box.y+box.height*0.5;
   const cdp=await page.context().newCDPSession(page);
   const tip=page.locator('.usa-target-card .cnn-history-tooltip');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await page.waitForTimeout(120);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12,y,id:1}]});
   await page.waitForTimeout(120);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24,y,id:1}]});
   await page.waitForTimeout(120);
   await tip.waitFor({state:'visible',timeout:5000});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await tip.waitFor({state:'hidden',timeout:3000});
   console.log('PASS mobile chart tooltip disappears on touch release');

   const breadth=page.locator('.usa-target-card .fg-breadth-slot');
   await breadth.locator('button[aria-expanded="false"]').click();
   const detail=breadth.locator('[role="region"]');
   const breadthSvg=detail.locator('svg[role="img"]');
   await breadthSvg.waitFor({state:'visible',timeout:5000});
   const netBars=detail.locator('rect[class*="historyNetPositiveBar"],rect[class*="historyNetNegativeBar"]');
   assert.ok(await detail.locator('rect[class*="historyNetPositiveBar"]').count()>0,'Green bars show rising dominance');
   assert.ok(await detail.locator('rect[class*="historyNetNegativeBar"]').count()>0,'Red bars show falling dominance');
   assert.match(await detail.locator('[class*="historyNetHeading"]').innerText(),/하락 우세 -18\.0%p/,'Latest net dominance is immediately readable above the chart');
   assert.equal(await detail.locator('line[class*="historyMidline"]').count(),1,'One visible zero baseline separates positive and negative dominance');
   assert.match(await detail.locator('[class*="historyTrendLegend"]').innerText(),/5거래일 평균 · 후행 SMA/,'Five-session trailing SMA is identified');
   assert.ok(await detail.locator('path[class*="historyTrendLine"]').count()>0,'Market breadth bars have a moving-average overlay');
   assert.equal(await detail.locator('path[class*="historyRisingLine"],path[class*="historyFallingLine"]').count(),0,'Old opposing percentage lines are removed');
   const windows=[['3M',93,'3개월'],['1M',31,'1개월'],['1W',7,'1주'],['1D',1,'1일'],['6M',186,'6개월'],['1Y',366,'1년'],['3M',93,'3개월']];
   for(const [period,days,label] of windows){
    await page.locator(`.usa-target-card .cnn-period-button[data-period-short="${period}"]`).click();
    const from=period==='1Y'?breadthHistory.from:new Date(Date.UTC(2026,9,30)-(days-1)*86400000).toISOString().slice(0,10);
    const expected=from.replaceAll('-','.');
    await page.waitForFunction(value=>document.querySelector('.usa-target-card .fg-breadth-slot [role="region"] time')?.textContent===value,
     expected,{timeout:5000});
    const dates=await detail.locator('time').allTextContents();
    assert.deepEqual(dates,[expected,'2026.10.30'],period+' breadth dates follow CNN selection');
    const aria=await breadthSvg.getAttribute('aria-label');
    assert.ok(aria?.includes('상승·하락 우세도')&&aria.includes(`${label} 이력`)&&aria.includes(`저장된 ${days}개 거래일`),period+' net breadth chart window and label');
    assert.equal(await netBars.count(),days,period+' renders one signed net bar per stored daily observation');
    if(period==='1D'){
     assert.equal(await detail.locator('rect[class*="historyNetNegativeBar"]').count(),1,'Latest day is negative even with unchanged issues present');
     assert.equal(await detail.locator('circle[class*="historyTrendDot"]').count(),1,'One-day period shows its five-session average as a dot');
     await breadthSvg.focus();
     const latestFive=breadthHistory.records.slice(-5);
     const expectedMean=latestFive.reduce((sum,record)=>sum+100*(record.counts.rising-record.counts.falling)/record.eligibleCount,0)/5;
     assert.ok((await detail.locator('[class*="historyTooltip"] div').filter({hasText:'5거래일 평균'}).innerText()).includes(`${expectedMean>0?'+':''}${expectedMean.toFixed(1)}%p`),'One-day mean uses five previous sessions');
    }
   }
   assert.equal(breadthHistoryRequests,1,'Period switching filters fetched 1Y history without new API calls');
   await breadthSvg.hover({position:{x:140,y:65}});
   const netTooltip=detail.locator('[role="status"]');
   await netTooltip.waitFor({state:'visible',timeout:4000});
   assert.match(await netTooltip.innerText(),/우세/,'Pointer tooltip announces dominance');
   assert.match(await netTooltip.innerText(),/[+-]?18\.0%p/,'Tooltip calculates net from raw counts with unchanged issues in denominator');
   assert.match(await netTooltip.innerText(),/보합/,'Tooltip retains unchanged issue detail');
   assert.match(await netTooltip.innerText(),/5거래일 평균/,'Pointer tooltip retains the five-session trend');
   console.log('PASS net breadth zero-baseline bars, pointer tooltip and 1D/1W/1M/3M/6M/1Y periods with one history request');
  }

  if(signedIn){
   const trigger=page.getByRole('button',{name:'사용자 설정',exact:true});
   await trigger.waitFor({state:'visible',timeout:15000});
   await trigger.click();
   const dialog=page.getByRole('dialog');
   await dialog.getByRole('heading',{name:'사용자 설정',exact:true}).waitFor({state:'visible'});
   await page.waitForFunction(()=>{
    const box=document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    return box&&box.width>0&&box.left>=-0.5&&box.right<=innerWidth+0.5;
   },null,{timeout:5000});
   assert.equal(await dialog.getByText('내 즐겨찾기 0개',{exact:true}).count(),1);
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/settings-${width}.png`});
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
  }else{
   assert.equal(await page.getByRole('button',{name:'사용자 설정',exact:true}).count(),0);
   assert.deepEqual(modules.filter(path=>/\/components\/ui\/(tabs|select|accordion|sheet)\.tsx$/.test(path)||path.endsWith('/app/core-pce-row.tsx')),[],
    'Anonymous dashboard must not request secondary UI modules');
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/dashboard-${width}.png`});
  }
  assert.deepEqual(errors,[],`No client errors at ${width}px, signedIn=${signedIn}`);
  console.log(`PASS dashboard deferred UI ${width}px signedIn=${signedIn}`);
  await page.close();
 }
}finally{await browser.close();}
