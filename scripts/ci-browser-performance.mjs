// R2 CI performance lab: reuse existing Playwright Chromium and Vite build.
// No Lighthouse/SaaS dependency, remote API call, threshold or new runner.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ORIGIN='http://127.0.0.1:3000';
export const SCOPE='LOCAL_PRODUCTION_PREVIEW_ABOUT';
export const PROFILES=Object.freeze([
 {name:'mobile-390',width:390,height:844},
 {name:'desktop-1440',width:1440,height:900}
]);
const METRIC_KEYS=new Set(['ttfbMs','fcpMs','lcpMs','cls']);

const observedValue=value=>{
 if(value===null||value===undefined)return null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)
  throw Error('CI_PERFORMANCE_METRIC_INVALID');
 return Math.round(value*1000)/1000;
};

export function normalizeObservation(observation,profile){
 if(!PROFILES.some(x=>x.name===profile)||
    !observation||observation.origin!==ORIGIN||
    !['/about','/about/'].includes(observation.path)||
    observation.httpStatus!==200||
    observation.mainPresent!==true||
    typeof observation.title!=='string'||
    !observation.title.includes('ZGMINI'))
  throw Error('CI_PERFORMANCE_PAGE_UNVERIFIED');
 if(!observation.metrics||typeof observation.metrics!=='object')
  throw Error('CI_PERFORMANCE_METRICS_MISSING');
 const metrics={};
 for(const key of METRIC_KEYS)metrics[key]=observedValue(observation.metrics[key]);
 if(metrics.ttfbMs===null)throw Error('CI_PERFORMANCE_TTFB_MISSING');
 return {profile,metrics,
  unavailable:Object.keys(metrics).filter(k=>metrics[k]===null)};
}

export function evaluatePerformanceBudget(observation,budget=null){
 if(!observation||typeof observation.profile!=='string'||!observation.metrics)
  throw Error('CI_PERFORMANCE_OBSERVATION_UNVERIFIED');
 if(budget===null)return {status:'UNSET',violations:[],unverified:[],blocking:false};
 if(!budget||typeof budget!=='object'||Array.isArray(budget)||
    !Object.keys(budget).length||
    Object.keys(budget).some(k=>!METRIC_KEYS.has(k)))
  throw Error('CI_PERFORMANCE_BUDGET_INVALID');
 const violations=[],unverified=[];
 for(const [key,threshold] of Object.entries(budget)){
  if(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<0)
   throw Error('CI_PERFORMANCE_BUDGET_INVALID');
  const value=observation.metrics[key];
  if(value===null||value===undefined)unverified.push(key);
  else if(value>threshold)violations.push(key);
 }
 return {status:unverified.length?'UNVERIFIED':violations.length?'EXCEEDED':'WITHIN',
  violations,unverified,blocking:false};
}

const trackerScript=()=>{
 const result={lcpMs:null,cls:null};
 Object.defineProperty(window,'__zgminiCiPerformance',{value:result});
 if(typeof PerformanceObserver!=='function')return;
 const supported=PerformanceObserver.supportedEntryTypes||[];
 if(supported.includes('largest-contentful-paint')){
  try{
   new PerformanceObserver(entries=>{
    for(const entry of entries.getEntries())result.lcpMs=entry.startTime;
   }).observe({type:'largest-contentful-paint',buffered:true});
  }catch{/* missing measurement stays null */}
 }
 if(supported.includes('layout-shift')){
  result.cls=0;
  try{
   new PerformanceObserver(entries=>{
    for(const entry of entries.getEntries())
     if(!entry.hadRecentInput)result.cls+=entry.value;
   }).observe({type:'layout-shift',buffered:true});
  }catch{result.cls=null;}
 }
};

export async function collectBrowserPerformance(chromium){
 if(!chromium||typeof chromium.launch!=='function')
  throw Error('CI_PERFORMANCE_BROWSER_REQUIRED');
 const browser=await chromium.launch({headless:true});
 try{
  const observations=[];
  for(const profile of PROFILES){
   const context=await browser.newContext({
    viewport:{width:profile.width,height:profile.height},
    deviceScaleFactor:1
   });
   try{
    const page=await context.newPage();
    await page.addInitScript(trackerScript);
    const response=await page.goto(ORIGIN+'/about',
     {waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForTimeout(1500);
    const observation=await page.evaluate(()=>{
     const nav=performance.getEntriesByType('navigation')[0];
     const fcp=performance.getEntriesByName('first-contentful-paint')[0];
     const tracker=window.__zgminiCiPerformance;
     return {
      origin:location.origin,path:location.pathname,
      httpStatus:null,title:document.title,
      mainPresent:!!document.querySelector('main'),
      metrics:{
       ttfbMs:nav?nav.responseStart-nav.requestStart:null,
       fcpMs:fcp?.startTime??null,
       lcpMs:tracker?.lcpMs??null,
       cls:tracker?.cls??null
      }
     };
    });
    observation.httpStatus=response?.status()??null;
    observations.push(normalizeObservation(observation,profile.name));
   }finally{await context.close();}
  }
  return {schemaVersion:1,scope:SCOPE,
   source:'Playwright 1.56.1 Chromium Performance API, local Workers production preview',
   labOnly:true,notProductionRUM:true,
   budgetStatus:'UNSET_NO_GATING',profiles:observations};
 }finally{await browser.close();}
}

async function main(){
 if(process.argv.length!==2)throw Error('CI_PERFORMANCE_NO_ARGUMENTS');
 const {chromium}=await import('playwright');
 const report=await collectBrowserPerformance(chromium);
 const out=resolve('artifacts/ci-performance-browser/summary.json');
 await mkdir(resolve('artifacts/ci-performance-browser'),{recursive:true});
 await writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log('CI_PERFORMANCE_LAB '+JSON.stringify(report));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
