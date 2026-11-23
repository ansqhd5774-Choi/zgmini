// PR-only W01 actual Production Chromium verification. No mocks or page writes.
// This file is run only in the isolated diagnostic PR's existing browser workflow.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin='https://zgmini.kr';
const viewports=[{width:1440,height:900},{width:390,height:844}];
mkdirSync('artifacts/w01-public-ui-readonly',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,locale:'ko-KR',
   serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[],apiStatuses={};
  page.on('pageerror',error=>errors.push(error.message.slice(0,250)));
  page.on('response',response=>{
   const u=new URL(response.url());
   if(u.hostname==='zgmini.kr'&&[
     '/api/inflation-causal-inputs','/api/inflation-candidate-inputs','/api/inflation-detail'
    ].includes(u.pathname))apiStatuses[u.pathname]=response.status();
  });
  try{
   const documentResponse=await page.goto(origin+'/economic-indicators/inflation/',
    {waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(documentResponse?.status(),200,'W01_UI_DOCUMENT_HTTP_STATUS');
   await page.waitForFunction(()=>{
    const root19=document.querySelector('section[aria-labelledby="economic-inflation-indicators"]');
    const root7=document.querySelector('section[aria-labelledby="economic-inflation-candidate-7"]');
    const rows19=[...(root19?.querySelectorAll('tbody tr[data-research-input]')??[])];
    const rows7=[...(root7?.querySelectorAll('tbody tr[data-research-candidate]')??[])];
    return rows19.length===19&&rows7.length===7&&
     rows19.every(row=>row.querySelector('[data-value-kind="raw"]'))&&
     rows7.every(row=>row.querySelector('[data-value-kind="raw"]'));
   },null,{timeout:40000});
   const display=await page.evaluate(()=>{
    const a=document.querySelector('section[aria-labelledby="economic-inflation-indicators"]');
    const b=document.querySelector('section[aria-labelledby="economic-inflation-candidate-7"]');
    const rows=(root,attr)=>[...(root?.querySelectorAll('tbody tr['+attr+']')??[])];
    const aRows=rows(a,'data-research-input'),bRows=rows(b,'data-research-candidate');
    const aMobile=[...(a?.querySelectorAll('.inflation-r2-mobile-list article[data-research-input]')??[])];
    const bMobile=[...(b?.querySelectorAll('.inflation-r2-mobile-list article[data-research-candidate]')??[])];
    return {research19:aRows.length,research19Raw:aRows.filter(r=>r.querySelector('[data-value-kind="raw"]')).length,
     candidate7:bRows.length,candidate7Raw:bRows.filter(r=>r.querySelector('[data-value-kind="raw"]')).length,
     research19Mobile:aMobile.length,candidate7Mobile:bMobile.length,
     census28:bRows.find(r=>r.getAttribute('data-research-candidate')==='28')
      ?.querySelector('[data-value-kind="raw"]')?.textContent?.trim().slice(0,110)??null,
     documentScrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth};
   });
   assert.equal(display.research19,19);
   assert.equal(display.research19Raw,19);
   assert.equal(display.candidate7,7);
   assert.equal(display.candidate7Raw,7);
   assert.equal(display.research19Mobile,19);
   assert.equal(display.candidate7Mobile,7);
   assert.match(display.census28??'',/976,?044/,'W01_CENSUS28_RENDER_VALUE');
   assert.equal(apiStatuses['/api/inflation-causal-inputs'],200,'W01_19_NETWORK_STATUS');
   assert.equal(apiStatuses['/api/inflation-candidate-inputs'],200,'W01_7_NETWORK_STATUS');
   await page.screenshot({path:'artifacts/w01-public-ui-readonly/inflation-'+viewport.width+'.png'});
   console.log('W01_PRODUCTION_UI_READBACK='+JSON.stringify({
    viewport:viewport.width+'x'+viewport.height,route:'/economic-indicators/inflation/',
    documentStatus:documentResponse?.status(),apiStatuses,display,
    pageErrors:errors,verified:errors.length===0}));
   assert.deepEqual(errors,[],'W01_UI_JS_ERRORS');
   const r2ResponsePromise=page.waitForResponse(response=>
    new URL(response.url()).pathname==='/api/inflation-detail'&&
    response.request().method()==='GET',{timeout:40000});
   await page.goto(origin+'/inflation/',{waitUntil:'domcontentloaded',timeout:60000});
   const r2Response=await r2ResponsePromise;
   assert.equal(r2Response.status(),200,'W01_R2_BROWSER_NETWORK_STATUS');
   const r2=await r2Response.json();
   const r2Report={viewport:viewport.width+'x'+viewport.height,
    status:r2.status,score:r2.score,asOfDate:r2.asOfDate,
    lastTrendLabel:r2.trend?.at(-1)?.label,
    lastTrendValue:r2.trend?.at(-1)?.value,jsErrors:errors};
   console.log('W01_PRODUCTION_R2_BROWSER='+JSON.stringify(r2Report));
   assert.equal(r2.status,'READY','W01_R2_BROWSER_READY');
   assert.equal(r2Report.lastTrendLabel,r2Report.asOfDate,'W01_R2_BROWSER_DATE');
   assert.equal(r2Report.lastTrendValue,r2Report.score,'W01_R2_BROWSER_SCORE');
  }finally{await context.close();}
 }
}finally{await browser.close();}
