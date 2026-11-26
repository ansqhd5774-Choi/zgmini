import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// W06 R2-05: actual CNN USA detail page, not /api/market-score.
// Only existing public stored GETs and page controls; no supplier/write API.
// New observedAt / no-reload change is a separate conditional acceptance.
const base='https://zgmini.kr',periods=['1D','1W','1M','3M','6M','1Y'];
const viewports=[{width:1440,height:900},{width:390,height:844}];
const folder='artifacts/w06-cnn-usa-production';
mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
   serviceWorkers:'block',hasTouch:viewport.width===390,isMobile:viewport.width===390,
   reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const result={width:viewport.width,status:'START',score:null,observedAt:null,
   http:{},periods:[],errors};
  results.push(result);
  try{
   const current=await context.request.get(base+'/api/fear-greed',
    {timeout:40000,headers:{accept:'application/json','cache-control':'no-cache'}});
   result.http.current=current.status();
   assert.equal(current.status(),200,'CNN stored current API');
   const body=await current.json();
   assert.equal(body.status,'verified');
   assert(typeof body.score==='number'&&Number.isFinite(body.score)&&body.score>=0&&body.score<=100);
   assert(Number.isFinite(Date.parse(body.observedAt??'')),'authentic source observedAt');
   result.score=body.score;result.observedAt=body.observedAt;
   const archives={};
   for(const period of ['1D','1W']){
    const response=await context.request.get(
     base+'/api/fear-greed/observations?period='+period,{timeout:40000,
      headers:{accept:'application/json','cache-control':'no-cache'}});
    result.http[period]=response.status();
    assert.equal(response.status(),200,'CNN stored '+period+' archive');
    archives[period]=await response.json();
    assert.equal(archives[period].period,period);
    assert(['READY','PENDING'].includes(archives[period].status));
    assert(Array.isArray(archives[period].points));
   }
   await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
   const response=await page.goto(base+'/fear-greed/usa/',
    {waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(response?.status(),200,'actual CNN USA document');
   const hero=page.getByTestId('cnn-reference-panel');
   await hero.waitFor({state:'visible',timeout:30000});
   await page.waitForFunction(expected=>{
    const el=document.querySelector('[data-testid="cnn-reference-panel"] .fg-score-slot');
    return !!el?.textContent?.replace(/\s+/g,'').includes(expected);
   },body.score.toFixed(1),{timeout:45000});
   result.visibleScore=(await hero.locator('.fg-score-slot').innerText()).trim();
   result.visibleHeader=(await hero.locator('.fg-header-slot').innerText()).trim().slice(0,400);
   assert.equal(await hero.getAttribute('aria-busy'),'false');
   const toolbar=hero.getByRole('group',{name:'CNN 지수 기간 선택'});
   const buttons=toolbar.locator('button[data-period-short]');
   assert.deepEqual(await buttons.evaluateAll(items=>
    items.map(item=>item.getAttribute('data-period-short'))),periods);
   for(const period of periods){
    const selected=toolbar.locator('button[data-period-short="'+period+'"]');
    await selected.scrollIntoViewIfNeeded();
    await selected.click();
    await page.waitForFunction(p=>{
     const el=document.querySelector('[aria-label="CNN 지수 기간 선택"] button[data-period-short="'+p+'"]');
     return el?.getAttribute('aria-pressed')==='true';
    },period,{timeout:12000});
    const mode=hero.locator('[data-cnn-intraday-mode]');
    await mode.waitFor({state:'attached',timeout:12000});
    await page.waitForTimeout(1100);
    const chart=hero.locator('.cnn-history-chart-hitbox');
    const svgCount=await chart.locator('svg.recharts-surface').count();
    const row={period,svgCount,pointCount:period==='1D'
     ?await mode.getAttribute('data-cnn-bucket-count')
     :await mode.getAttribute('data-cnn-period-point-count')};
    if(period==='1D'&&archives['1D'].status==='READY'&&archives['1D'].points.length){
     assert.notEqual(row.pointCount,'0','genuine 1D source must not disappear');
    }
    if(svgCount){
     const paths=await chart.locator('path.recharts-area-curve').evaluateAll(items=>
      items.map(x=>x.getAttribute('d')??''));
     assert(paths.every(d=>!d.includes('NaN')&&!d.includes('Infinity')),
      'only finite chart coordinates');
     row.pathCount=paths.length;
    }
    const measure=await page.evaluate(()=>({width:innerWidth,
     scrollWidth:document.documentElement.scrollWidth}));
    row.scrollWidth=measure.scrollWidth;
    assert.equal(measure.width,viewport.width,'exact real viewport');
    assert(measure.scrollWidth<=viewport.width+2,'CNN '+period+' horizontal overflow');
    result.periods.push(row);
   }
   await toolbar.locator('button[data-period-short="1D"]').click();
   await page.waitForTimeout(900);
   await hero.scrollIntoViewIfNeeded();
   await page.screenshot({path:folder+'/cnn-usa-'+viewport.width+'.png',fullPage:false});
   assert.deepEqual(errors,[],'CNN browser runtime errors');
   result.status='PASS';
  }catch(error){
   result.status='FAIL';result.failure=String(error?.message??error).slice(0,800);
   await page.screenshot({path:folder+'/cnn-usa-fail-'+viewport.width+'.png',
    fullPage:false}).catch(()=>{});
  }finally{
   console.log('W06_CNN_USA_PRODUCTION_VIEWPORT '+JSON.stringify(result));
   await context.close();
  }
 }
}finally{
 await browser.close();
 writeFileSync(folder+'/results.json',JSON.stringify({checkedAt:new Date().toISOString(),
  scope:'REAL_PRODUCTION_CNN_STORED_GET_NO_PROVIDER_CALL',results},null,2)+'\n');
}
assert(results.length===2&&results.every(x=>x.status==='PASS'),
 'CNN Production 1440/390 acceptance incomplete; inspect results and screenshots');
console.log('W06_CNN_USA_PRODUCTION_READONLY_FINISHED '+JSON.stringify(results));
