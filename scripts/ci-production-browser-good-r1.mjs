// R2 #8: real production first-party read-only Chromium speed observations.
// NOT CrUX real-user P75, Lighthouse scoring, or full third-party visitor loading.
// This only reuses the existing GitHub Actions Playwright Chromium job.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeRawMetrics} from './ci-performance-lab.mjs';
import {WEB_SPEED_GOOD} from './ci-web-speed-good-r2.mjs';

export const PROD_ORIGIN='https://zgmini.kr';
export const PROD_ROUTES=Object.freeze(['/','/economic-indicators/']);
export const PROD_VIEWPORTS=Object.freeze([
 {width:390,height:844},{width:1440,height:900}
]);
export const PROD_FIXTURE='production-first-party-readonly-v1';
export const PROD_SCHEMA=1;
const error=msg=>{throw Error(msg);};
const IS_OBSERVED='PRODUCTION_HEADLESS_FIRST_PARTY_ONLY';
const keys=['lcpMs','fcpMs','cls'];

export function classifyProductionPage(sample){
 if(!sample||sample.schemaVersion!==PROD_SCHEMA||
    sample.fixture!==PROD_FIXTURE||
    !PROD_ROUTES.includes(sample.route)||
    sample.url!==PROD_ORIGIN+sample.route||
    !PROD_VIEWPORTS.some(v=>v.width===sample.viewport?.width&&
      v.height===sample.viewport?.height)||
    typeof sample.blockedWriteRequests!=='number'||
    !Number.isSafeInteger(sample.blockedWriteRequests)||
    sample.blockedWriteRequests<0||
    !Array.isArray(sample.pageErrors)||
    sample.pageErrors.some(e=>typeof e!=='string')||
    typeof sample.documentStatus!=='number'&&sample.documentStatus!==null)
  error('CI_PRODUCTION_SPEED_SAMPLE_INVALID');
 const metrics=normalizeRawMetrics(sample.metrics??{});
 const results=Object.fromEntries(keys.map(k=>{
  const value=metrics[k],limit=WEB_SPEED_GOOD[k];
  return [k,{observed:value,limit,state:value===null?
   'UNVERIFIED':value<=limit?'AT_OR_BELOW_GOOD_TARGET':'EXCEEDS_GOOD_TARGET'}];
 }));
 const states=Object.values(results).map(x=>x.state);
 const status=sample.error||sample.documentStatus!==200||!sample.mainFound?
  'PRODUCTION_LOAD_UNVERIFIED':
  states.includes('EXCEEDS_GOOD_TARGET')?'PRODUCTION_LAB_GOOD_EXCEEDED':
  sample.pageErrors.length>0||sample.blockedWriteRequests>0?
   'PRODUCTION_LAB_RUNTIME_UNVERIFIED':
  states.includes('UNVERIFIED')?'PRODUCTION_LAB_METRICS_UNVERIFIED':
  'PRODUCTION_LAB_MEASURED_TARGETS_MET';
 return {route:sample.route,url:sample.url,viewport:sample.viewport,
  browserVersion:sample.browserVersion??null,documentStatus:sample.documentStatus,
  mainFound:sample.mainFound??false,blockedWriteRequests:sample.blockedWriteRequests,
  blockedThirdPartyRequests:sample.blockedThirdPartyRequests??0,
  pageErrors:sample.pageErrors??[],error:sample.error??null,
  state:status,metrics:results};
}

export function summarizeProductionLab(rows){
 if(!Array.isArray(rows)||rows.length!==PROD_ROUTES.length*PROD_VIEWPORTS.length)
  error('CI_PRODUCTION_SPEED_INCOMPLETE_SAMPLES');
 const seen=new Set();
 const classified=rows.map(sample=>{
  const key=sample?.route+'|'+sample?.viewport?.width+'x'+sample?.viewport?.height;
  if(seen.has(key))error('CI_PRODUCTION_SPEED_DUPLICATE_VIEWPORT');
  seen.add(key);
  return classifyProductionPage(sample);
 });
 return {schemaVersion:PROD_SCHEMA,fixture:PROD_FIXTURE,
  observedAt:new Date().toISOString(),source:PROD_ORIGIN,
  scope:IS_OBSERVED,thirdPartyResources:'BLOCKED',
  coreWebVitalsFieldP75:'UNVERIFIED',inpFieldP75:'NOT_MEASURED',
  lighthousePerformanceScore:'NOT_MEASURED',siteGoodVerified:false,
  mergeBlocking:false,automaticReleaseGate:false,
  officialGoodTargets:WEB_SPEED_GOOD,observations:classified};
}

export async function runProductionLab({chromium,origin=PROD_ORIGIN,delayMs=1600}={}){
 if(origin!==PROD_ORIGIN||!chromium||
    !Number.isSafeInteger(delayMs)||delayMs<1000||delayMs>3500)
  error('CI_PRODUCTION_SPEED_SCOPE_INVALID');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const all=[];
 try{
  for(const route of PROD_ROUTES){
   for(const viewport of PROD_VIEWPORTS){
    const context=await browser.newContext({
     viewport,serviceWorkers:'block',reducedMotion:'reduce',locale:'ko-KR',
     timezoneId:'Asia/Seoul'
    });
    try{
     const page=await context.newPage();
     let blockedWriteRequests=0,blockedThirdPartyRequests=0;
     const pageErrors=[];
     page.on('pageerror',e=>pageErrors.push(String(e.message).slice(0,180)));
     await page.addInitScript(()=>{
      const active=PerformanceObserver?.supportedEntryTypes??[];
      const state={lcpMs:null,cls:active.includes('layout-shift')?0:null,
       longTaskTotalMs:active.includes('longtask')?0:null};
      for(const [name,handler] of [
       ['largest-contentful-paint',e=>{state.lcpMs=e.startTime;}],
       ['layout-shift',e=>{if(!e.hadRecentInput)state.cls+=e.value;}],
       ['longtask',e=>{state.longTaskTotalMs+=e.duration;}]])
      {if(!active.includes(name))continue;
       try{new PerformanceObserver(list=>{
        for(const entry of list.getEntries())handler(entry);
       }).observe({type:name,buffered:true});}catch{
        if(name==='layout-shift')state.cls=null;
        if(name==='longtask')state.longTaskTotalMs=null;
       }
      }
      window.__zgProductionSpeed=state;
     });
     // An ordinary visitor may fetch stored public GETs, but a diagnostic
     // browser must not write to any service or contact third-party providers.
     await page.route('**/*',async network=>{
      const request=network.request();
      let sameOrigin=false;
      try{sameOrigin=new URL(request.url()).origin===PROD_ORIGIN;}catch{}
      if(!sameOrigin){
       blockedThirdPartyRequests++;
       return network.abort('blockedbyclient');
      }
      if(!['GET','HEAD'].includes(request.method())){
       blockedWriteRequests++;
       return network.abort('blockedbyclient');
      }
      return network.continue();
     });
     let documentStatus=null,mainFound=false,raw=null,navigationError=null;
     try{
      const response=await page.goto(PROD_ORIGIN+route,{
       waitUntil:'domcontentloaded',timeout:45000
      });
      documentStatus=response?.status()??null;
      if(documentStatus!==200)throw Error('HTTP_'+documentStatus);
      await page.locator('main').first().waitFor({
       state:'attached',timeout:15000
      });
      mainFound=true;
      await page.waitForTimeout(delayMs);
      raw=await page.evaluate(()=>{
       const nav=performance.getEntriesByType('navigation')[0];
       const fcp=performance.getEntriesByName('first-contentful-paint')[0];
       const r=window.__zgProductionSpeed??{};
       return {responseEndMs:nav?.responseEnd,
        domContentLoadedMs:nav?.domContentLoadedEventEnd,
        fcpMs:fcp?.startTime,lcpMs:r.lcpMs,
        cls:r.cls,longTaskTotalMs:r.longTaskTotalMs};
      });
     }catch(e){navigationError=String(e.message).slice(0,240);}
     all.push({schemaVersion:PROD_SCHEMA,fixture:PROD_FIXTURE,
      route,url:PROD_ORIGIN+route,viewport,browserVersion:browser.version(),
      documentStatus,mainFound,blockedWriteRequests,
      blockedThirdPartyRequests,pageErrors,
      error:navigationError,metrics:normalizeRawMetrics(raw??{})});
    }finally{await context.close();}
   }
  }
 }finally{await browser.close();}
 return summarizeProductionLab(all);
}

export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')
  error('CI_PRODUCTION_SPEED_CI_ONLY');
 const {chromium}=await import('playwright');
 const report=await runProductionLab({chromium});
 const out=resolve('artifacts/performance-lab/production-browser-good.json');
 await mkdir(resolve('artifacts/performance-lab'),{recursive:true});
 await writeFile(out,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('CI_PRODUCTION_BROWSER_GOOD '+JSON.stringify({
  scope:report.scope,fieldP75:report.coreWebVitalsFieldP75,
  results:report.observations.map(x=>({
   route:x.route,viewport:x.viewport,state:x.state,
   documentStatus:x.documentStatus,error:x.error,
   lcpMs:x.metrics.lcpMs.observed,cls:x.metrics.cls.observed,
   fcpMs:x.metrics.fcpMs.observed,blockedWriteRequests:x.blockedWriteRequests
  })),mergeBlocking:false}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
