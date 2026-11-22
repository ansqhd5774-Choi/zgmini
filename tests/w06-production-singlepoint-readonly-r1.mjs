import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// W06 production read-only acceptance. Uses only stored public GETs and UI clicks.
const base='https://zgmini.kr';
const viewports=[{width:390,height:844},{width:1440,height:900}];
const periods=['1D','1W','1M','3M','6M','1Y'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
mkdirSync('artifacts/w06-production-readonly',{recursive:true});
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   const response=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(response?.status(),200,'production homepage HTTP 200');
   // Dismiss the site's real introductory dialog via its normal UI control.
   // Without this, the dialog correctly intercepts chart clicks on fresh sessions.
   const intro=page.locator('#zg-about-intro-dialog');
   await page.waitForTimeout(1200);
   if(await intro.isVisible())await intro.getByRole('button',{name:'닫기',exact:true}).click();
   const controls=page.locator('.zg-r55-period');
   await controls.getByRole('button',{name:'1D',exact:true}).waitFor({timeout:35000});
   const api=await context.request.get(base+'/api/market-score/observations?period=1D',{timeout:30000});
   assert.equal(api.status(),200,'1D stored observation API HTTP 200');
   const body=await api.json();
   assert.equal(body.period,'1D');
   assert.equal(body.status,'READY');
   assert(Array.isArray(body.points),'published points must be array');
   for(const period of periods){
    await controls.getByRole('button',{name:period,exact:true}).click();
    await assert.doesNotReject(()=>controls.getByRole('button',{name:period,exact:true}).waitFor({state:'visible',timeout:10000}));
    const selected=controls.getByRole('button',{name:period,exact:true});
    await page.waitForFunction(label=>Array.from(document.querySelectorAll('.zg-r55-period button')).some(b=>b.textContent?.trim()===label&&b.getAttribute('aria-pressed')==='true'),period,{timeout:10000});
    await page.waitForTimeout(1800);
    const chart=page.locator('.zg-r55-summary-chart');
    const svg=chart.locator('svg.recharts-surface');
    const empty=chart.getByText('추이 데이터 준비 중');
    if(period==='1D'&&body.points.length===1){
     await page.getByText('실제 관측점 1개',{exact:false}).waitFor({timeout:20000});
     assert.equal(await empty.count(),0,'one actual point must not be hidden as empty');
     assert((await svg.count())>0,'single point actual SVG must mount');
     const marker=chart.locator('.recharts-reference-dot circle');
     assert((await marker.count())>0,'single point reference dot must render');
     const current=body.points[0];
     const displayed=Math.max(0,Math.min(100,50+(current.score-50)*3.5)).toFixed(1);
     const statusText=await chart.locator('[role=status]').innerText();
     assert(statusText.includes(displayed+'점'),'display sensitivity matches published raw point');
     const kst=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(current.observedAt));
     assert(statusText.includes(kst),'actual KST calculated time is shown');
     await marker.first().hover({force:true});
     await page.waitForTimeout(400);
     const tip=page.locator('.zg-r55-summary-chart .recharts-tooltip-wrapper');
     assert((await tip.count())>0,'tooltip exists');
     const tooltipText=await tip.innerText();
     assert(tooltipText.includes(displayed),'hover shows true score');
    }
    assert.equal(await selected.getAttribute('aria-pressed'),'true',period+' selected');
    const dimension=await page.evaluate(()=>({innerWidth:window.innerWidth,documentWidth:document.documentElement.scrollWidth}));
    assert.equal(dimension.innerWidth,viewport.width,'real tested viewport width');
    assert(dimension.documentWidth<=dimension.innerWidth+2,period+' no document horizontal overflow');
    results.push({viewport:viewport.width,period,svgCount:await svg.count(),emptyCount:await empty.count(),points1D:body.points.length,documentWidth:dimension.documentWidth});
   }
   await controls.getByRole('button',{name:'1D',exact:true}).click();
   await page.waitForTimeout(1100);
   await page.screenshot({path:'artifacts/w06-production-readonly/home-'+viewport.width+'-1D.png',fullPage:false});
   assert.deepEqual(errors,[],'no page errors at '+viewport.width);
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync('artifacts/w06-production-readonly/results.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,12,'six periods across two production viewports');
console.log('W06_PRODUCTION_READONLY_PASS '+JSON.stringify(results));
