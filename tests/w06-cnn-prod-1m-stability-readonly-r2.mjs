import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Production read-only: delayed first 1M archive GET, genuine response, and cached revisit.
// No source-provider requests, DB writes, deployment, or invented observations.
const base='https://zgmini.kr';
const dir='artifacts/w06-cnn-production-stability';
mkdirSync(dir,{recursive:true});
const results=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
function snapshot(page){
 return page.evaluate(()=>{
  const root=document.querySelector('[data-testid="cnn-reference-panel"]');
  const chart=root?.querySelector('.cnn-history-chart-hitbox');
  const d=chart?.querySelector('path.recharts-area-curve')?.getAttribute('d')??'';
  const mode=root?.querySelector('[data-cnn-intraday-mode]');
  return {
   archiveState:root?.querySelector('[data-cnn-archive-state]')?.getAttribute('data-cnn-archive-state')??null,
   chartPaths:chart?.querySelectorAll('path.recharts-area-curve').length??0,
   svgCount:chart?.querySelectorAll('svg.recharts-surface').length??0,
   pointCount:Number(mode?.getAttribute('data-cnn-period-point-count')??0),
   path:d,documentWidth:document.documentElement.scrollWidth,
   width:window.innerWidth
  };
 });
}
function digest(d){return createHash('sha256').update(d).digest('hex');}
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({
   viewport:{width,height:width===390?844:900},locale:'ko-KR',
   timezoneId:'Asia/Seoul',serviceWorkers:'block',reducedMotion:'reduce',
   hasTouch:width===390,isMobile:width===390
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  let release=()=>{};
  const gate=new Promise(resolve=>{release=resolve;});
  let heldCount=0;
  const output={width,status:'START',http:null,sourcePoints:null,states:{},errors};
  results.push(output);
  try{
   // Independent stored API readback; page interception only delays a real GET.
   const stored=await context.request.get(base+'/api/fear-greed/observations?period=1M',{
    timeout:45000,headers:{accept:'application/json','cache-control':'no-cache'}
   });
   output.http=stored.status();
   assert.equal(output.http,200,'actual Production 1M stored API');
   const archive=await stored.json();
   assert.equal(archive.status,'READY','genuine 1M archive READY');
   assert.equal(archive.period,'1M');
   assert(Array.isArray(archive.points)&&archive.points.length>=3,'genuine multi-point archive');
   output.sourcePoints=archive.points.length;

   await page.route('**/api/fear-greed/observations?period=1M',async route=>{
    if(heldCount++===0)await gate;
    await route.continue();
   });
   await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
   const loaded=await page.goto(base+'/fear-greed/usa/',{
    waitUntil:'domcontentloaded',timeout:60000
   });
   assert.equal(loaded?.status(),200);
   const root=page.getByTestId('cnn-reference-panel');
   await root.waitFor({state:'visible',timeout:35000});
   await page.waitForFunction(()=>{
    const root=document.querySelector('[data-testid="cnn-reference-panel"]');
    return root?.querySelector('[aria-label="CNN 지수 기간 선택"] button[data-period-short="1D"]')
     && !root.querySelector('[data-cnn-archive-state]');
   },null,{timeout:45000});

   const toolbar=root.getByRole('group',{name:'CNN 지수 기간 선택'});
   const oneMonth=toolbar.locator('button[data-period-short="1M"]');
   const oneDay=toolbar.locator('button[data-period-short="1D"]');
   await oneMonth.scrollIntoViewIfNeeded();
   const request=page.waitForRequest(r=>{
    const url=new URL(r.url());
    return url.pathname==='/api/fear-greed/observations'&&url.searchParams.get('period')==='1M';
   },{timeout:20000});
   await oneMonth.click();
   await request;
   await page.waitForTimeout(250);
   const pending=await snapshot(page);
   output.states.whileHeld={archiveState:pending.archiveState,
    chartPaths:pending.chartPaths,pointCount:pending.pointCount};
   assert.equal(await oneMonth.getAttribute('aria-pressed'),'true');
   assert.equal(pending.archiveState,'loading','first selection explicitly waits for detailed archive');
   assert.equal(pending.chartPaths,0,'no provisional sparse curve while genuine 1M GET is held');
   // The panel may precompute an internal fallback count while rendering zero paths;
   // visible SVG/loader, not this unrendered diagnostic attribute, is the acceptance.
   assert.equal(pending.svgCount,0,'no interim chart SVG while 1M archive is held');
   release();
   await page.waitForFunction(()=>{
    const root=document.querySelector('[data-testid="cnn-reference-panel"]');
    const mode=root?.querySelector('[data-cnn-intraday-mode="period"]');
    const path=root?.querySelector('.cnn-history-chart-hitbox path.recharts-area-curve');
    return !root?.querySelector('[data-cnn-archive-state]') &&
     Number(mode?.getAttribute('data-cnn-period-point-count'))>=3 && !!path?.getAttribute('d');
   },null,{timeout:45000});
   await page.waitForTimeout(1200);
   const finished=await snapshot(page);
   assert.equal(finished.archiveState,null);
   assert(finished.chartPaths>=1&&finished.pointCount>=3,'detailed multi-point curve');
   assert(!/NaN|Infinity/.test(finished.path),'finite Production line coordinates');
   assert(finished.documentWidth<=width+2,'no horizontal overflow');
   output.states.ready={pointCount:finished.pointCount,
    chartPaths:finished.chartPaths,pathSha256:digest(finished.path)};

   await oneDay.click();
   await page.waitForFunction(()=>{
    return document.querySelector('[aria-label="CNN 지수 기간 선택"] button[data-period-short="1D"]')
     ?.getAttribute('aria-pressed')==='true';
   },null,{timeout:12000});
   await oneMonth.click();
   await page.waitForTimeout(250);
   const revisit=await snapshot(page);
   assert.equal(revisit.archiveState,null,'cached 1M returns without loading placeholder');
   assert(revisit.pointCount>=3&&revisit.chartPaths>=1,'cached detailed curve is immediately present');
   await page.waitForTimeout(1200);
   const stable=await snapshot(page);
   output.states.cached={pointCount:stable.pointCount,
    chartPaths:stable.chartPaths,pathSha256:digest(stable.path)};
   assert.equal(stable.pointCount,finished.pointCount,'genuine 1M point count does not become sparse');
   assert.equal(output.states.cached.pathSha256,output.states.ready.pathSha256,
    '1M revisit has identical detailed line geometry');
   assert.equal(stable.width,width,'correct viewport');
   assert.deepEqual(errors,[],'no browser page errors');
   await page.screenshot({path:dir+'/cnn-1m-'+width+'.png',fullPage:false});
   output.status='PASS';
  }catch(error){
   release();
   output.status='FAIL';output.error=String(error?.message??error).slice(0,1000);
   await page.screenshot({path:dir+'/cnn-1m-fail-'+width+'.png',fullPage:false}).catch(()=>{});
  }finally{
   release();
   console.log('W06_PRODUCTION_1M_STABILITY '+JSON.stringify(output));
   await context.close();
  }
 }
}finally{
 await browser.close();
 writeFileSync(dir+'/results.json',JSON.stringify({
  checkedAt:new Date().toISOString(),scope:'PRODUCTION_1M_REAL_GET_DELAY_AND_CACHE_READONLY',
  results
 },null,2)+'\n');
}
assert(results.length===2&&results.every(r=>r.status==='PASS'),
 'W06 Production 1M stability incomplete; inspect JSON/screenshots');
console.log('W06_PRODUCTION_1M_STABILITY_FINISHED');
