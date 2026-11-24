import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {currentCnnSessionHistory} from '../lib/cnn-current-session-history-r4.mjs';

// #1521: Production public GET + real Chromium events only. No mock routes,
// providers, private data, sign-in, POST, deployment, D1 or SQLite writes.
const BASE='https://zgmini.kr';
const TARGETS=[{width:1440,height:900},{width:390,height:844}];
const OUTPUT='artifacts/cnn1521-production-viewport';
mkdirSync(OUTPUT,{recursive:true});
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const normalized=items=>(Array.isArray(items)?items:[]).flatMap(point=>{
 const date=point?.date??point?.timestamp??point?.observedAt??point?.checkedAt;
 const score=point?.score??point?.value;
 const ms=Date.parse(date??'');
 return Number.isFinite(ms)&&validScore(score)
  ?[{date:new Date(ms).toISOString(),time:ms,score}]:[];
}).sort((a,b)=>a.time-b.time);
const sameTimestamp=(items)=>[...new Map(items.map(p=>[p.date,p])).values()]
 .sort((a,b)=>a.time-b.time);
function chartExpected(period,payload,archive){
 assert.equal(archive?.status,'READY',period+' stored API is READY');
 assert.equal(archive?.period,period,'stored API period matches selected');
 assert(Array.isArray(archive?.points),'stored source points are an array');
 assert(Array.isArray(archive?.checkedPoints),'stored verified checks are an array');
 const sidecar=payload.observedHistoryVersion==='CNN_OBSERVED_HISTORY_R1'
  ?(payload.intradayObservations??[]):[];
 if(period==='1D')return currentCnnSessionHistory(payload.observedAt,{
  checkedPoints:archive.checkedPoints,observedPoints:archive.points,
  intradayObservations:sidecar,
 });
 const daily=normalized(payload.history);
 const checked=archive.checkedPoints.length>=2?normalized(archive.checkedPoints):[];
 const observed=normalized(archive.points);
 const combined=sameTimestamp([...checked,...observed,...normalized(sidecar)]);
 if(combined.length<2)return daily;
 const last=Math.max(daily.at(-1)?.time??-Infinity,combined.at(-1)?.time??-Infinity);
 const begin=last-7*86400000;
 const actual=combined.filter(x=>x.time>=begin&&x.time<=last);
 const sourceDays=new Set(actual.map(x=>x.date.slice(0,10)));
 return daily.filter(x=>x.time>=begin&&x.time<=last&&!sourceDays.has(x.date.slice(0,10)))
  .concat(actual).sort((a,b)=>a.time-b.time);
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const viewport of TARGETS){
  const result={viewport:viewport.width+'x'+viewport.height,checkedAt:new Date().toISOString(),
   status:'UNVERIFIED',periods:[],pageErrors:[],nonGetRequests:[],error:null};
  const context=await browser.newContext({viewport,locale:'ko-KR',
   timezoneId:'Asia/Seoul',hasTouch:viewport.width===390,
   isMobile:viewport.width===390,serviceWorkers:'block',acceptDownloads:false,
   reducedMotion:'reduce'});
  const page=await context.newPage();
  const received=new Map(),pending=[];
  page.on('pageerror',e=>result.pageErrors.push(String(e.message).slice(0,160)));
  // No request may mutate Production. Read-only request interception is not
  // mock data: GETs pass through unchanged to the real deployed service.
  await page.route('https://zgmini.kr/**',route=>{
   const method=route.request().method();
   if(method==='GET'||method==='HEAD')return route.continue();
   result.nonGetRequests.push(method);
   return route.abort();
  });
  page.on('response',response=>{
   let url;
   try{url=new URL(response.url());}catch{return;}
   if(url.origin!==BASE||response.request().method()!=='GET')return;
   const key=url.pathname==='/api/fear-greed'?'index':
    url.pathname==='/api/fear-greed/observations'
     ?url.searchParams.get('period'):null;
   if(key===null)return;
   const read=response.json().then(payload=>{
    received.set(key,{http:response.status(),payload});
   }).catch(()=>received.set(key,{http:response.status(),payload:null}));
   pending.push(read);
  });
  try{
   const document=await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(document?.status(),200,'real Production homepage HTTP 200');
   const intro=page.locator('#zg-about-intro-dialog');
   await page.waitForTimeout(900);
   if(await intro.isVisible()){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:10000});
   }
   const panel=page.getByTestId('cnn-reference-panel').first();
   const toolbar=panel.getByRole('group',{name:'CNN 지수 기간 선택'});
   await toolbar.scrollIntoViewIfNeeded();
   for(let i=0;i<100&&!received.has('index');i++)await page.waitForTimeout(300);
   const index=received.get('index');
   assert.equal(index?.http,200,'browser observed actual CNN index GET HTTP 200');
   assert(validScore(index?.payload?.score),'CNN score is a valid real published score');
   const payload=index.payload;
   const score=payload.score.toFixed(1);
   assert((await panel.innerText()).includes(score),'CNN card displays actual index score '+score);
   for(const period of ['1D','1W']){
    const button=toolbar.locator('button[data-period-short="'+period+'"]');
    await button.scrollIntoViewIfNeeded();
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'),'true',period+' is selected');
    for(let i=0;i<100&&!received.has(period);i++)await page.waitForTimeout(300);
    const response=received.get(period);
    assert.equal(response?.http,200,'browser observed actual '+period+' archive GET HTTP 200');
    const history=chartExpected(period,payload,response.payload);
    assert(history.length>=2,period+' requires two authentic current plotted points (actual '+history.length+')');
    const chart=panel.locator('.cnn-history-chart-hitbox');
    await chart.scrollIntoViewIfNeeded();
    await chart.locator('path.recharts-area-curve').waitFor({state:'attached',timeout:30000});
    const d=await chart.locator('path.recharts-area-curve').first().getAttribute('d');
    assert(/^M/.test(d??'')&&/[CLQ]/.test((d??'').slice(1))&&!/NaN|Infinity/.test(d??''),
     period+' real finite multipoint curve');
    assert.equal(await panel.locator('.cnn-chart-empty').count(),0,
     period+' does not display missing-data placeholder');
    const dot=chart.locator('.cnn-latest-point circle, circle.cnn-latest-point, .recharts-reference-dot circle').first();
    await dot.waitFor({state:'attached',timeout:12000});
    const box=await dot.boundingBox();
    assert(box&&box.width>0&&box.height>0,period+' actual latest-dot geometry');
    const x=box.x+box.width/2,y=box.y+box.height/2;
    if(viewport.width===390)await page.touchscreen.tap(x,y);
    else{
     await page.mouse.move(x-15,y,{steps:2});
     await page.mouse.move(x,y,{steps:5});
    }
    await page.waitForTimeout(700);
    const tips=await chart.locator('.cnn-history-tooltip').allInnerTexts();
    const last=history.at(-1);
    const expected=last.score.toFixed(1);
    const visibleTip=tips.find(t=>t.includes(expected))??null;
    assert(visibleTip,'real '+(viewport.width===390?'touch':'hover')+
     ' tooltip must show last saved point score '+expected+'; actual '+JSON.stringify(tips));
    // In 1D the source session uses New York clock, never KST chart-time substitution.
    if(period==='1D'){
     const nyTime=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
      hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(last.date));
     assert(visibleTip.includes(nyTime),
      'last actual 1D checked/source time agrees with New York clock '+nyTime);
    }
    const layout=await page.evaluate(()=>({
     width:innerWidth,documentWidth:document.documentElement.scrollWidth,
    }));
    assert.equal(layout.width,viewport.width,'actual CSS viewport');
    assert(layout.documentWidth<=viewport.width+2,period+' horizontal overflow');
    await page.screenshot({path:OUTPUT+'/cnn-'+viewport.width+'-'+period+'.png',fullPage:false});
    result.periods.push({period,sourcePoints:response.payload.points.length,
     verifiedChecks:response.payload.checkedPoints.length,chartPoints:history.length,
     latestScore:expected,latestTimestamp:last.date,tooltip:visibleTip.slice(0,160),
     documentWidth:layout.documentWidth});
   }
   assert.deepEqual(result.pageErrors,[],'no client errors');
   result.status='PASS';
  }catch(error){
   result.status='FAIL';
   result.error=String(error?.message??error).slice(0,800);
   await page.screenshot({path:OUTPUT+'/cnn-'+viewport.width+'-failure.png',
    fullPage:false}).catch(()=>{});
  }
  await Promise.allSettled(pending);
  results.push(result);
  console.log('CNN1521_PRODUCTION_UI '+JSON.stringify(result));
  await context.close();
 }
}finally{await browser.close();}
const summary={schema:'CNN1521_PRODUCTION_UI_READONLY_V1',
 executedAt:new Date().toISOString(),results};
writeFileSync(OUTPUT+'/result.json',JSON.stringify(summary,null,2)+'\n');
assert.equal(results.length,2,'both Production viewports attempted');
assert(results.every(x=>x.status==='PASS'),
 'CNN #1521 Production UI acceptance not proven; read real results and screenshots');
console.log('CNN1521_PRODUCTION_UI_VERIFIED');