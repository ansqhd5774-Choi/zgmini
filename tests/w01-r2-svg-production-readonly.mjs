// W01 R2 Production SVG last-point verification on approved public GETs only.
// This is an ephemeral diagnostic PR test; no mocks, provider reads or writes.
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromium} from 'playwright';

const origin='https://zgmini.kr';
const widths=[1440,390];

test('W01 actual R2 SVG last-point at PC/mobile widths',async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of widths){
   const context=await browser.newContext({
    viewport:{width,height:width===390?844:900},locale:'ko-KR',
    timezoneId:'Asia/Seoul',reducedMotion:'reduce',serviceWorkers:'block'
   });
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    const api=await context.request.get(origin+'/api/inflation-detail',{timeout:30000});
    assert.equal(api.status(),200,'R2 public GET 200');
    const body=await api.json();
    assert.equal(body.status,'READY');
    assert(Array.isArray(body.trend)&&body.trend.length>=2);
    const last=body.trend.at(-1);
    assert.equal(last.label,body.asOfDate,'no future last observation');
    assert.equal(last.value,body.score,'last actual score must match published');
    const doc=await page.goto(origin+'/inflation/',{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(doc?.status(),200);
    const hero=page.locator('[data-testid="inflation-detail-hero"]');
    await hero.waitFor({state:'visible',timeout:30000});
    await page.waitForFunction(()=>document.querySelector('[data-testid="inflation-detail-hero"]')?.getAttribute('data-market-state')==='ready',null,{timeout:30000});
    const marker=hero.locator('circle.cnn-latest-point, .cnn-latest-point circle').first();
    await marker.waitFor({state:'visible',timeout:30000});
    await marker.scrollIntoViewIfNeeded();
    const bounds=await marker.boundingBox();
    assert(bounds&&bounds.width>0&&bounds.height>0,'actual latest SVG dot must have real dimensions');
    const meta=await marker.evaluate(el=>({cx:el.getAttribute('cx'),cy:el.getAttribute('cy'),r:el.getAttribute('r'),tag:el.tagName,stroke:getComputedStyle(el).stroke}));
    const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
    assert(Number.isFinite(center.x)&&Number.isFinite(center.y),'marker coordinates finite');
    const svgCount=await hero.locator('.recharts-surface').count();
    assert(svgCount>0,'real SVG chart rendered');
    const actualDocumentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert(actualDocumentWidth<=width+2,'no viewport horizontal overflow');
    // The score orb counts up from zero; wait for its visible final value.
    await page.waitForFunction(expected=>
      [...document.querySelectorAll('[data-testid="inflation-detail-hero"] .cnn-score-value')]
        .some(el=>el.textContent?.replace(/\s/g,'').trim()===expected),
      body.score.toFixed(1),{timeout:12000});
    const displayedOrb=await hero.locator('.cnn-score-value').first().innerText();
    assert.equal(displayedOrb.replace(/\s/g,''),body.score.toFixed(1),'final orb equals public score');
    await page.screenshot({path:'/tmp/w01-inflation-r2-'+width+'.png',fullPage:false});
    const summary={viewport:width+'px',document:doc?.status(),score:body.score,asOfDate:body.asOfDate,
     lastTrendLabel:last.label,lastTrendValue:last.value,svgCount,marker:meta,center,
     documentWidth:actualDocumentWidth,pageErrors:errors,verified:true};
    console.log('W01_R2_SVG_PRODUCTION='+JSON.stringify(summary));
    assert.deepEqual(errors,[],'no client JS errors');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
});
