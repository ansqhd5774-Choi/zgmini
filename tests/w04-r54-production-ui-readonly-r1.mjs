import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// W04 R54 final acceptance: real Production GET + real JS browser, no mock,
// no login, no mutations, and no assumption that yesterday's score is current.
const base='https://zgmini.kr';
const viewports=[{width:1440,height:900},{width:390,height:844}];
const folder='artifacts/w04-r54-production-ui';
mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const summary=[];
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const day=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s);
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,locale:'ko-KR',
   timezoneId:'Asia/Seoul',serviceWorkers:'block',hasTouch:viewport.width===390,
   isMobile:viewport.width===390,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const result={width:viewport.width,height:viewport.height,phase:'START',
   apiStatus:null,asOfDate:null,score:null,visibleScore:null,visibleDate:null,
   latestMarker:false,tooltipText:null,documentWidth:null,errors};
  summary.push(result);
  try{
   const api=await context.request.get(base+'/api/market-score',{timeout:35000,
    headers:{'accept':'application/json','cache-control':'no-cache'}});
   result.apiStatus=api.status();
   assert.equal(api.status(),200,'Production score GET must return 200');
   const body=await api.json();
   const employment=body.domains?.find(d=>d?.id==='employment');
   assert(day(body.asOfDate),'published asOfDate must be real day');
   assert.equal(employment?.id,'employment');
   assert.equal(employment.status,'READY','published R54 must be READY');
   assert.equal(employment.methodologyVersion,'EMPLOYMENT_R54_STORED_4FACTOR_R1');
   assert(finite(employment.score),'published R54 score must be finite');
   assert.equal(employment.asOfDate,body.asOfDate);
   assert.equal(employment.lastCalculationEvent?.kind,'R54_STORED_CALCULATION_EVENT_R1');
   assert(Array.isArray(employment.trend)&&employment.trend.length>=2,
    'Production must have >=2 real stored employment history points');
   const last=employment.trend.at(-1);
   assert.equal(last.label??last.date,body.asOfDate,'last stored trend date');
   assert.equal(last.score??last.value,employment.score,'last stored trend score');
   assert.equal(last.pointKind,'R54_STORED_CALCULATION_EVENT_R1');
   result.asOfDate=body.asOfDate;result.score=employment.score;
   const response=await page.goto(base+'/economic-indicators/employment/',
    {waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(response?.status(),200,'Production employment page HTTP 200');
   const hero=page.getByTestId('economic-employment-hero');
   await hero.waitFor({state:'visible',timeout:40000});
   await page.waitForFunction(()=>{
    const el=document.querySelector('[data-testid="economic-employment-hero"]');
    return el?.getAttribute('data-market-state')==='ready'&&
      !!el.querySelector('.recharts-surface');
   },null,{timeout:45000});
   // The real first-visit introduction intentionally overlays chart input.
   // Dismiss using the site's standard close button, as the existing W06
   // Production test does; this changes no server data or user account.
   const intro=page.locator('#zg-about-intro-dialog');
   await page.waitForTimeout(1200);
   result.introDismissed=false;
   if(await intro.isVisible()){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    result.introDismissed=true;
    await intro.waitFor({state:'hidden',timeout:10000});
   }
   result.phase='HYDRATED';
   assert.equal(await hero.getAttribute('data-market-state'),'ready');
   assert.equal(await hero.getAttribute('data-history-alignment'),'matched',
    'UI source/last history score must match');
   const display=employment.score.toFixed(1);
   const orb=hero.locator('.fg-score-slot');
   result.visibleScore=(await orb.innerText()).trim().slice(0,300);
   assert(result.visibleScore.replace(/\s+/g,'').includes(display),
    'visible R54 score must equal current Production score rounded to 1 decimal');
   const header=hero.locator('.fg-header-slot');
   result.visibleDate=(await header.innerText()).trim().slice(0,400);
   // The published date uses localized formatting; match y/m/d fields.
   const [y,m,d]=body.asOfDate.split('-');
   assert(result.visibleDate.includes(y)&&result.visibleDate.includes(String(Number(m)))&&
    result.visibleDate.includes(String(Number(d))),
    'visible header must reference published evaluation date');
   const svg=hero.locator('svg.recharts-surface');
   assert(await svg.count()>0,'actual Recharts SVG must render');
   const marker=hero.locator('.cnn-latest-point circle, circle.cnn-latest-point');
   await marker.first().waitFor({state:'visible',timeout:20000});
   result.latestMarker=true;
   await marker.first().scrollIntoViewIfNeeded();
   const box=await marker.first().boundingBox();
   assert(box&&box.width>0&&box.height>0,'latest point must have visible bounds');
   const center={x:box.x+box.width/2,y:box.y+box.height/2};
   const tip=hero.locator('.cnn-history-tooltip');
   const inspect=async(x,y)=>{
    const hit=await page.evaluate(({x,y})=>{
     const el=document.elementFromPoint(x,y);
     return {tag:el?.tagName??null,cls:el?.getAttribute('class')??null};
    },{x,y});
    const content=await tip.count()?await tip.first().innerText():'';
    return {x,y,hit,content};
   };
   result.hoverSamples=[];
   if(viewport.width===390){
    await page.touchscreen.tap(center.x,center.y);
    const mobileTip=hero.getByTestId('w04-r54-latest-touch-tooltip');
    await mobileTip.waitFor({state:'visible',timeout:5000});
    result.tooltipText=await mobileTip.innerText();
    assert(result.tooltipText.includes(display),
     'real mobile touch must display latest published R54 score');
    const [year,month,day]=body.asOfDate.split('-');
    assert(result.tooltipText.includes(year)&&result.tooltipText.includes(String(Number(month)))&&
     result.tooltipText.includes(String(Number(day))),
     'real mobile touch must display latest published evaluation date');
    result.hoverSamples.push(await inspect(center.x,center.y));
   }else{
    // ReferenceDot is not necessarily the AreaChart pointer receiver.
    // Probe inside the last X-axis category and require exact latest date
    // AND current score, never a tooltip for an earlier stored observation.
    const positions=[
     [center.x-30,center.y],[center.x-10,center.y],
     [center.x,center.y],[center.x-5,center.y-15],
     [center.x-5,center.y+15],[center.x-45,center.y-20]
    ];
    for(const [px,py] of positions){
     await page.mouse.move(px-8,py);
     await page.mouse.move(px,py,{steps:5});
     await page.waitForTimeout(220);
     const sample=await inspect(px,py);
     result.hoverSamples.push(sample);
     if(sample.content.includes(display)&&
      sample.content.includes(String(Number(body.asOfDate.slice(8,10))))) {
       result.tooltipText=sample.content;break;
     }
    }
   }
   if(viewport.width===1440){
    assert(result.tooltipText?.includes(display),
     'desktop tooltip must show exact current score after multi-position hover');
   }
   result.documentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert(result.documentWidth<=viewport.width+2,'no horizontal overflow');
   assert.deepEqual(errors,[],'no browser JavaScript runtime errors');
   result.phase='PASS';
   console.log('W04_R54_PRODUCTION_UI '+JSON.stringify(result));
  }catch(error){
   result.phase='FAIL';
   result.failure=String(error?.message??error).slice(0,700);
   console.log('W04_R54_PRODUCTION_UI_FAIL '+JSON.stringify(result));
   // Keep the second viewport running after a first-viewport failure;
   // the final assertion preserves the CI failure status.
  }finally{
   await page.screenshot({path:`${folder}/employment-${viewport.width}.png`,fullPage:false})
    .catch(()=>{});
   await context.close();
  }
 }
}finally{
 await browser.close();
 writeFileSync(folder+'/results.json',JSON.stringify({checkedAt:new Date().toISOString(),summary},null,2)+'\n');
}
assert.equal(summary.length,2);
assert(summary.every(item=>item.phase==='PASS'),
 'Production W04 desktop/mobile acceptance failed; inspect JSON and screenshots');
console.log('W04_R54_REAL_PRODUCTION_UI_FINISHED '+JSON.stringify(summary));
