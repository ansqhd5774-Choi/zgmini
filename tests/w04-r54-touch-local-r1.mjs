import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {EMPLOYMENT_R54_INDICATORS,EMPLOYMENT_R54_METHOD} from '../lib/market-score/employment-r54-candidate.mjs';

// Isolated frontend interaction fixture: no provider, real D1 or Production writes.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const date='2026-11-23',score=63;
const stamp='2026-11-23T02:35:44.189Z';
const domain={id:'employment',status:'READY',score,methodologyVersion:EMPLOYMENT_R54_METHOD,
 asOfDate:date,missingFactors:[],indicators:EMPLOYMENT_R54_INDICATORS.map(({id})=>({
 id,status:'READY',score,observationDate:'2026-11-01'})),
 lastCalculationEvent:{kind:'R54_STORED_CALCULATION_EVENT_R1',calculatedAt:stamp,
 methodologyVersion:EMPLOYMENT_R54_METHOD},
 trend:[{label:'2026-10-01',value:60},{label:date,value:score,
 pointKind:'R54_STORED_CALCULATION_EVENT_R1',calculatedAt:stamp}]};
const market={status:'SUCCESS',asOfDate:date,updatedAt:stamp,domains:[domain]};
const dir='artifacts/w04-r54-touch-local';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},
   hasTouch:width===390,isMobile:width===390,serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.route('**/api/market-score',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(market)}));
   await page.route('**/api/employment-r6/observations',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({status:'UNAVAILABLE',indicators:[],summary:{sourceFeatures:0,recentlyObservedFeatures:0,chartReadyFeatures:0,chartPartialFeatures:0,scoredFeatures:0,recentlyScoredFeatures:0}})}));
   await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
   const res=await page.goto(base+'/economic-indicators/employment/',
    {waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(res?.status(),200);
   const intro=page.locator('#zg-about-intro-dialog');
   if(await intro.isVisible())await intro.getByRole('button',{name:'닫기',exact:true}).click();
   const hero=page.getByTestId('economic-employment-hero');
   await hero.waitFor({state:'visible',timeout:20000});
   await page.waitForTimeout(1500);
   const initial=await page.evaluate(()=>{
    const el=document.querySelector('[data-testid="economic-employment-hero"]');
    return {href:location.href,heroPresent:!!el,
     market:el?.getAttribute('data-market-state')??null,
     history:el?.getAttribute('data-history-alignment')??null,
     svg:!!el?.querySelector('svg.recharts-surface'),
     score:el?.querySelector('.fg-score-slot')?.textContent?.slice(0,110)??null,
     text:document.body?.innerText?.slice(0,600)??null};
   });
   console.log('W04_R54_MOCK_INITIAL '+JSON.stringify({width,initial,errors}));
   if(!initial.heroPresent){
    await page.screenshot({path:`${dir}/hero-disappeared-${width}.png`,fullPage:false});
    throw Error('R54_MOCK_HERO_DISAPPEARED');
   }
   try{
    await page.waitForFunction(()=>document.querySelector('[data-testid="economic-employment-hero"]')
     ?.getAttribute('data-history-alignment')==='matched'&&
     !!document.querySelector('[data-testid="economic-employment-hero"] svg.recharts-surface'),
     null,{timeout:10000});
   }catch(error){
    const final=await hero.evaluate(el=>({
     market:el.getAttribute('data-market-state'),
     history:el.getAttribute('data-history-alignment'),
     svg:!!el.querySelector('svg.recharts-surface'),
     score:el.querySelector('.fg-score-slot')?.textContent?.slice(0,110)??null,
     text:el.textContent?.slice(0,400)??null,
    }));
    console.log('W04_R54_MOCK_NOT_READY '+JSON.stringify({width,final,errors}));
    await page.screenshot({path:`${dir}/not-ready-${width}.png`,fullPage:false});
    throw error;
   }
   const marker=hero.locator('.cnn-latest-point circle, circle.cnn-latest-point').first();
   await marker.waitFor({state:'visible',timeout:20000});
   await marker.scrollIntoViewIfNeeded();
   const box=await marker.boundingBox();
   assert(box&&box.width>0&&box.height>0,'real latest marker geometry');
   const x=box.x+box.width/2,y=box.y+box.height/2;
   const tip=hero.getByTestId('w04-r54-latest-touch-tooltip');
   assert.equal(await tip.count(),0,'no tooltip before genuine latest point tap');
   let text='';
   if(width===390){
    await page.touchscreen.tap(x,y);
    await tip.waitFor({state:'visible',timeout:5000});
    text=await tip.innerText();
    assert(text.includes('63.0')&&text.includes('2026. 11. 23.'),
     'mobile latest point touch shows stored day and exact score');
    // A distinct tap away from the last marker must dismiss this detail.
    await page.touchscreen.tap(x-55,y+24);
    await page.waitForTimeout(250);
    assert.equal(await tip.count(),0,'touch away from latest point closes detail');
    await page.touchscreen.tap(x,y);
    await tip.waitFor({state:'visible',timeout:5000});
   }else{
    assert.equal(await tip.count(),0,'desktop continues using Recharts hover only');
    const positions=[[x-25,y],[x-12,y],[x,y]];
    const hover=hero.locator('.cnn-history-tooltip');
    for(const [px,py] of positions){
     await page.mouse.move(px-6,py);await page.mouse.move(px,py,{steps:4});
     await page.waitForTimeout(250);
     text=await hover.count()?await hover.first().innerText():'';
     if(text.includes('63.0'))break;
    }
    assert(text.includes('63.0'),'existing desktop pointer tooltip remains working');
   }
   const widthActual=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert(widthActual<=width+2,'no document overflow');
   assert.deepEqual(errors,[],'no JS errors');
   results.push({width,status:'PASS',tooltip:text,documentWidth:widthActual});
   await page.screenshot({path:`${dir}/employment-${width}.png`,fullPage:false});
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync(dir+'/results.json',JSON.stringify({type:'LOCAL_MOCKED_API_ONLY',results},null,2)+'\n');
assert.equal(results.length,2);
console.log('W04_R54_TOUCH_LOCAL_PASS '+JSON.stringify(results));
