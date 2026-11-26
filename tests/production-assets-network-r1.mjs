import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Read-only Production acceptance for #1324. No page routing, POST, auth,
// browser storage sharing, provider collection, database or deployment writes.
const ORIGIN='https://zgmini.kr';
const ROUTES=['/debt-risk/','/supply-shock/','/inflation/','/economic-indicators/inflation/'];
const VIEWPORTS=[{width:390,height:844},{width:1440,height:900}];
const RETIRED_VIRTUAL_JS=[
 'shared-risk-indicator-width-r1-BPME5l_j.js',
 'risk-last3-hero-parity-r2-CDVIG9AY.js',
];
const isFirstParty=url=>{try{return new URL(url).hostname==='zgmini.kr';}catch{return false;}};
const pathname=url=>{try{return new URL(url).pathname;}catch{return '';}}
const isJavaScript=url=>/\.m?js$/i.test(pathname(url));
const isRetired=url=>RETIRED_VIRTUAL_JS.some(name=>pathname(url).endsWith('/'+name));
const concise=url=>pathname(url);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const reports=[];
try{
 for(const route of ROUTES)for(const viewport of VIEWPORTS){
  const context=await browser.newContext({viewport,locale:'ko-KR',serviceWorkers:'block'});
  const page=await context.newPage();
  const requestedRetired=[],js404=[],jsFailed=[],pageErrors=[],requestedJS=[];
  page.on('request',request=>{
   if(!isFirstParty(request.url()))return;
   if(isRetired(request.url()))requestedRetired.push(concise(request.url()));
   if(isJavaScript(request.url()))requestedJS.push(concise(request.url()));
  });
  page.on('response',response=>{
   if(isFirstParty(response.url())&&isJavaScript(response.url())&&response.status()===404)
    js404.push({path:concise(response.url()),status:404});
  });
  page.on('requestfailed',request=>{
   if(isFirstParty(request.url())&&isJavaScript(request.url()))
    jsFailed.push({path:concise(request.url()),error:request.failure()?.errorText??'UNKNOWN'});
  });
  page.on('pageerror',error=>pageErrors.push(String(error.message).slice(0,200)));
  let documentStatus=null,mainCount=0,scriptCount=0,stylesheetCount=0,error=null;
  try{
   const response=await page.goto(ORIGIN+route,{waitUntil:'domcontentloaded',timeout:60000});
   documentStatus=response?.status()??null;
   try{await page.waitForLoadState('networkidle',{timeout:12000});}
   catch{await page.waitForTimeout(1500);}
   mainCount=await page.locator('main').count();
   scriptCount=await page.locator('script[src]').count();
   stylesheetCount=await page.locator('link[rel=stylesheet]').count();
  }catch(e){error=String(e.message).slice(0,240);}
  const report={route,viewport:viewport.width+'x'+viewport.height,
   documentStatus,mainCount,scriptCount,stylesheetCount,
   firstPartyJsRequested:requestedJS.length,retiredJsRequested:requestedRetired,
   firstPartyJs404:js404,firstPartyJsFailed:jsFailed,pageErrors,error};
  reports.push(report);
  console.log('PRODUCTION_JS_NETWORK '+JSON.stringify(report));
  await context.close();
 }
}finally{await browser.close();}
mkdirSync('artifacts/production-assets-network',{recursive:true});
writeFileSync('artifacts/production-assets-network/issue-1324-readonly.json',
 JSON.stringify({schema:'ZGMINI_ISSUE_1324_PRODUCTION_READONLY_R1',
  checkedAt:new Date().toISOString(),reports},null,2)+'\n');
assert.equal(reports.length,ROUTES.length*VIEWPORTS.length,'all 8 route/viewport checks executed');
for(const r of reports){
 assert.equal(r.documentStatus,200,r.route+' document HTTP status '+r.viewport);
 assert.equal(r.error,null,r.route+' browser navigation '+r.viewport);
 assert(r.mainCount>0,r.route+' missing main '+r.viewport);
 assert(r.scriptCount>0,r.route+' missing execution scripts '+r.viewport);
 assert(r.stylesheetCount>0,r.route+' missing stylesheets '+r.viewport);
 assert.deepEqual(r.retiredJsRequested,[],r.route+' obsolete JS requested '+r.viewport);
 assert.deepEqual(r.firstPartyJs404,[],r.route+' first-party JS 404 '+r.viewport);
 assert.deepEqual(r.firstPartyJsFailed,[],r.route+' first-party JS failed '+r.viewport);
 assert.deepEqual(r.pageErrors,[],r.route+' JavaScript exceptions '+r.viewport);
}
console.log('PASS Issue #1324 first-party JS Network: 4 routes x 2 viewport, no retired JS requests or JS 404');
