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
  eligibleCount:500,counts:{rising:250+i%20,unchanged:0,falling:250-i%20}}))};
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
   await detail.locator('svg[role="img"]').waitFor({state:'visible',timeout:5000});
   const windows=[['3M',93,'3개월'],['1M',31,'1개월'],['1W',7,'1주'],['1D',1,'1일'],['6M',186,'6개월'],['1Y',366,'1년'],['3M',93,'3개월']];
   for(const [period,days,label] of windows){
    await page.locator(`.usa-target-card .cnn-period-button[data-period-short="${period}"]`).click();
    const from=period==='1Y'?breadthHistory.from:new Date(Date.UTC(2026,9,30)-(days-1)*86400000).toISOString().slice(0,10);
    const expected=from.replaceAll('-','.');
    await page.waitForFunction(value=>document.querySelector('.usa-target-card .fg-breadth-slot [role="region"] time')?.textContent===value,
     expected,{timeout:5000});
    const dates=await detail.locator('time').allTextContents();
    assert.deepEqual(dates,[expected,'2026.10.30'],period+' breadth dates follow CNN selection');
    const aria=await detail.locator('svg[role="img"]').getAttribute('aria-label');
    assert.ok(aria?.includes(`${label} 이력`)&&aria.includes(`${days}개 거래일`),period+' breadth record window');
   }
   assert.equal(breadthHistoryRequests,1,'Period switching filters fetched 1Y history without new API calls');
   console.log('PASS breadth chart matches 1D/1W/1M/3M/6M/1Y market period with one history request');
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
