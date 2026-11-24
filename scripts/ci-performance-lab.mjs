// R2 #8/#24: bounded Chromium lab measurements using the existing Playwright.
// Local dev only; data APIs are explicitly unavailable, never manufactured.
// Not Lighthouse scores, Core Web Vitals field data, or real production latency.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const LAB_SCHEMA=2; // CLS precision changed; v1 rounded 0.101 to 0.10
export const LAB_FIXTURE='localhost-vite-api-unavailable-v1';
export const VIEWPORTS=Object.freeze([{width:390,height:844},{width:1440,height:900}]);
export const METRIC_NAMES=Object.freeze([
 'responseEndMs','domContentLoadedMs','fcpMs','lcpMs','cls','longTaskTotalMs'
]);
export const BASE='http://127.0.0.1:5173';

const round=(value,digits=2)=>typeof value==='number'&&Number.isFinite(value)&&value>=0
 ?Math.round(value*10**digits)/10**digits:null;

export function normalizeRawMetrics(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))
  throw Error('CI_PERFORMANCE_METRICS_UNVERIFIED');
 const measured={};
 // Keep enough CLS precision to distinguish 0.10001 from the 0.1 Good limit.
 for(const name of METRIC_NAMES)measured[name]=round(raw[name],name==='cls'?5:2);
 return measured;
}

export function comparePerformanceLab(baseline,current){
 if(!baseline||!current||baseline.schemaVersion!==LAB_SCHEMA||
   current.schemaVersion!==LAB_SCHEMA||
   baseline.fixture!==current.fixture||
   baseline.browserVersion!==current.browserVersion||
   baseline.url!==current.url||
   baseline.viewport?.width!==current.viewport?.width||
   baseline.viewport?.height!==current.viewport?.height)
  throw Error('CI_PERFORMANCE_BASELINE_INCOMPARABLE');
 const old=normalizeRawMetrics(baseline.metrics);
 const now=normalizeRawMetrics(current.metrics);
 const deltas={};
 let comparable=0;
 for(const metric of METRIC_NAMES){
  deltas[metric]=old[metric]===null||now[metric]===null?
   null:round(Math.abs(now[metric]-old[metric]),metric==='cls'?5:2)*
    (now[metric]<old[metric]?-1:1);
  if(deltas[metric]!==null)comparable++;
 }
 return {comparableMetrics:comparable,deltas};
}

// A budget needs an explicit reviewed policy. The CI job does NOT call this
// until a comparable baseline and approved thresholds exist.
export function evaluateApprovedBudget(sample,policy){
 if(!policy||policy.status!=='APPROVED'||
   !/^[a-f0-9]{40}$/.test(policy.approvedSourceSha??'')||
   policy.fixture!==sample?.fixture||
   policy.url!==sample?.url||
   policy.browserVersion!==sample?.browserVersion||
   policy.viewport?.width!==sample?.viewport?.width||
   policy.viewport?.height!==sample?.viewport?.height)
  throw Error('CI_PERFORMANCE_BUDGET_NOT_APPROVED_OR_INCOMPARABLE');
 if(!policy.limits||typeof policy.limits!=='object'||
   !Object.keys(policy.limits).length)
  throw Error('CI_PERFORMANCE_BUDGET_MISSING');
 const measured=normalizeRawMetrics(sample.metrics);
 const results={};
 for(const [name,limit] of Object.entries(policy.limits)){
  if(!METRIC_NAMES.includes(name)||typeof limit!=='number'||
    !Number.isFinite(limit)||limit<0)
   throw Error('CI_PERFORMANCE_BUDGET_INVALID_LIMIT');
  const value=measured[name];
  results[name]={measured:value,limit,state:value===null?'UNVERIFIED':
    value<=limit?'PASS':'EXCEEDED'};
 }
 return results;
}

export async function runLab({chromium,base=BASE,delayMs=1800}){
 if(base!==BASE||!chromium||!Number.isInteger(delayMs)||delayMs<1000||delayMs>5000)
  throw Error('CI_PERFORMANCE_LAB_SCOPE_INVALID');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const reports=[];
 try{
  for(const viewport of VIEWPORTS){
   const context=await browser.newContext({
    viewport,serviceWorkers:'block',reducedMotion:'reduce',locale:'ko-KR'
   });
   try{
    const page=await context.newPage();
    // Observer starts before navigation; buffered entries preserve early paints.
    await page.addInitScript(()=>{
     window.__zgPerfLab={lcpMs:null,cls:0,longTaskTotalMs:0};
     for(const [type,callback] of [
      ['largest-contentful-paint',e=>{window.__zgPerfLab.lcpMs=e.startTime;}],
      ['layout-shift',e=>{if(!e.hadRecentInput)window.__zgPerfLab.cls+=e.value;}],
      ['longtask',e=>{window.__zgPerfLab.longTaskTotalMs+=e.duration;}]
     ]){
      try{
       const obs=new PerformanceObserver(list=>{
        for(const entry of list.getEntries())callback(entry);
       });
       obs.observe({type,buffered:true});
      }catch{}
     }
    });
    await page.route('**/*',async route=>{
     const url=new URL(route.request().url());
     if(url.origin!==BASE)return route.abort('blockedbyclient');
     if(url.pathname.startsWith('/api/'))
      return route.fulfill({status:503,contentType:'application/json',
       body:'{"status":"UNAVAILABLE"}'});
     return route.continue();
    });
    const response=await page.goto(BASE+'/',{
     waitUntil:'domcontentloaded',timeout:45000
    });
    if(response?.status()!==200)throw Error('CI_PERFORMANCE_DOCUMENT_NOT_READY');
    await page.locator('main').first().waitFor({state:'attached',timeout:15000});
    await page.waitForTimeout(delayMs);
    const raw=await page.evaluate(()=>{
     const nav=performance.getEntriesByType('navigation')[0];
     const paint=performance.getEntriesByName('first-contentful-paint')[0];
     const lab=window.__zgPerfLab??{};
     return {responseEndMs:nav?.responseEnd,
      domContentLoadedMs:nav?.domContentLoadedEventEnd,
      fcpMs:paint?.startTime,lcpMs:lab.lcpMs,
      cls:lab.cls,longTaskTotalMs:lab.longTaskTotalMs};
    });
    reports.push({schemaVersion:LAB_SCHEMA,fixture:LAB_FIXTURE,
     url:BASE+'/',browserVersion:browser.version(),viewport,
     metrics:normalizeRawMetrics(raw)});
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 if(reports.length!==VIEWPORTS.length)throw Error('CI_PERFORMANCE_INCOMPLETE_VIEWPORTS');
 return {schemaVersion:LAB_SCHEMA,scope:'local mock browser laboratory only',
  fixture:LAB_FIXTURE,observedAt:new Date().toISOString(),reports,
  budgetStatus:'NOT_CONFIGURED',performanceImprovement:'UNVERIFIED'};
}

export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')
  throw Error('CI_PERFORMANCE_LAB_CI_ONLY');
 const {chromium}=await import('playwright');
 const result=await runLab({chromium});
 const output=resolve('artifacts/performance-lab/report.json');
 await mkdir(resolve('artifacts/performance-lab'),{recursive:true});
 await writeFile(output,JSON.stringify(result,null,2)+'\n','utf8');
 console.log('CI_PERFORMANCE_LAB '+JSON.stringify(result.reports.map(
  r=>({viewport:r.viewport,metrics:r.metrics}))));
 console.log('CI_PERFORMANCE_BUDGET=NOT_CONFIGURED (no invented thresholds)');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
