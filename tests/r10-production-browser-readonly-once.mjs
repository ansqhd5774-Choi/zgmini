// One-shot public UI probe in an unmerged Draft PR. Browser GETs only.
// This test is not suitable for main: its live website input is nondeterministic.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const URL='https://zgmini.kr/asset-bubble/';
const EXPECTED_DISPLAY='22.6'; // Production API score 22.57324252737245, 1 decimal.
mkdirSync('artifacts/r10-production-browser',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.name??'PAGE_ERROR'));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  const mainStatus=response?.status()??null;
  let readyState=false;
  try{
   await page.waitForFunction(()=>document.querySelector('[data-testid="asset-bubble-detail-hero"]')?.getAttribute('data-market-state')==='ready',{timeout:35000});
   readyState=true;
  }catch{}
  // The valid raw-sidecar join happens after the scored GET and may take longer.
  let rawReady=false;
  try{
   await page.waitForFunction(()=>{
    const rows=[...document.querySelectorAll('.asset-indicator-table-r2 tbody tr')].slice(0,6);
    return rows.length===6&&rows.every(row=>{
     const strong=[...row.querySelectorAll('.asset-r2-value strong')];
     return strong.length===2&&strong[1].textContent?.trim()!=='—';
    });
   },{timeout:20000});
   rawReady=true;
  }catch{}
  const snapshot=await page.evaluate(()=>{
   const hero=document.querySelector('[data-testid="asset-bubble-detail-hero"]');
   const firstSix=[...document.querySelectorAll('.asset-indicator-table-r2 tbody tr')].slice(0,6);
   const cells=firstSix.map(row=>{
    const strong=[...row.querySelectorAll('.asset-r2-value strong')];
    return {current:strong[1]?.textContent?.trim()??null,previous:strong[0]?.textContent?.trim()??null};
   });
   return {
    heroState:hero?.getAttribute('data-market-state')??null,
    heroScore:hero?.querySelector('.fg-score-slot')?.textContent?.trim().slice(0,160)??null,
    heroHeading:hero?.querySelector('.fg-header-slot')?.textContent?.trim().slice(0,160)??null,
    metaStatus:document.querySelector('.asset-r2-candidate-status')?.textContent?.trim().slice(0,180)??null,
    rows:document.querySelectorAll('.asset-indicator-table-r2 tbody tr').length,
    mobileCards:document.querySelectorAll('.asset-r2-mobile-list article').length,
    firstSixCurrents:cells.map(x=>x.current),
    firstSixPrevious:cells.map(x=>x.previous),
    overflow:document.documentElement.scrollWidth>innerWidth+1,
   };
  });
  console.log('R10_PUBLIC_BROWSER_ONCE '+JSON.stringify({
   width,httpStatus:mainStatus,heroReady:readyState,rawReady,...snapshot,
   pageErrorCount:pageErrors.length,pageErrorNames:pageErrors.slice(0,4)
  }));
  await page.screenshot({path:'artifacts/r10-production-browser/'+width+'.png',fullPage:false});
  assert.equal(mainStatus,200,'Production HTML must be reachable');
  assert.equal(readyState,true,'Hydrated production score must become ready');
  assert.ok(snapshot.heroScore?.includes(EXPECTED_DISPLAY),'Visible score must reflect public API rounding');
  assert.ok(snapshot.heroHeading?.includes('R10'),'Hydrated header should identify actual R10 methodology');
  assert.equal(snapshot.rows,10,'Six verified plus four development rows');
  assert.equal(snapshot.mobileCards,10,'Mobile card parity with ten table rows');
  assert.equal(rawReady,true,'All six public R10 raw current values must hydrate');
  assert.equal(pageErrors.length,0,'No browser runtime errors');
  await page.close();
 }
}finally{await browser.close();}
