// R2 #23: isolated Firefox/WebKit verification of two core local routes.
// Observations are not Production metrics and are not a new layout threshold gate.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ORIGIN='http://127.0.0.1:5173';
export const FIXTURE='local-vite-api-unavailable-r1';
export const ENGINES=Object.freeze(['firefox','webkit']);
export const ROUTES=Object.freeze(['/','/about/']);
export const VIEWPORTS=Object.freeze([
 {name:'mobile-390',width:390,height:844},
 {name:'desktop-1440',width:1440,height:900}
]);

function key(row){return [row.engine,row.viewport,row.route].join('|');}
export function finalizeCrossBrowser(observations){
 if(!Array.isArray(observations)||observations.length!==
   ENGINES.length*VIEWPORTS.length*ROUTES.length)
  throw Error('CI_CROSS_BROWSER_MATRIX_INCOMPLETE');
 const seen=new Set();
 for(const row of observations){
  if(!row||!ENGINES.includes(row.engine)||
     !VIEWPORTS.some(v=>v.name===row.viewport)||
     !ROUTES.includes(row.route)||seen.has(key(row))||
     row.httpStatus!==200||row.mainPresent!==true||
     typeof row.titlePresent!=='boolean'||
     !Number.isInteger(row.javascriptErrors)||row.javascriptErrors<0||
     !Number.isInteger(row.overflowPx)||row.overflowPx<0)
   throw Error('CI_CROSS_BROWSER_RESULT_INVALID');
  seen.add(key(row));
 }
 return {schemaVersion:1,scope:'LOCAL_CORE_ROUTES_OBSERVATION_ONLY',
  fixture:FIXTURE,engines:[...ENGINES],routes:[...ROUTES],
  baselineStatus:'NOT_APPROVED',productionVerified:false,
  observations};
}

export async function runCrossBrowser(browsers){
 const rows=[];
 for(const engine of ENGINES){
  if(!browsers?.[engine]||typeof browsers[engine].launch!=='function')
   throw Error('CI_CROSS_BROWSER_ENGINE_MISSING_'+engine);
  const browser=await browsers[engine].launch({headless:true});
  try{
   for(const viewport of VIEWPORTS){
    const context=await browser.newContext({
     viewport:{width:viewport.width,height:viewport.height},
     locale:'ko-KR',reducedMotion:'reduce',serviceWorkers:'block'
    });
    try{
     await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==ORIGIN)return route.abort('blockedbyclient');
      if(url.pathname.startsWith('/api/'))
       return route.fulfill({status:503,contentType:'application/json',
        body:'{"status":"UNAVAILABLE"}'});
      return route.continue();
     });
     for(const route of ROUTES){
      const page=await context.newPage();
      let javascriptErrors=0;
      page.on('pageerror',()=>{javascriptErrors++;});
      try{
       const response=await page.goto(ORIGIN+route,{
        waitUntil:'domcontentloaded',timeout:45000
       });
       if(response?.status()!==200||new URL(page.url()).origin!==ORIGIN||
          !['/','/about','/about/'].includes(new URL(page.url()).pathname))
        throw Error('CI_CROSS_BROWSER_DOCUMENT_NOT_READY');
       await page.locator('main').first().waitFor({state:'attached',timeout:20000});
       await page.waitForTimeout(400);
       const data=await page.evaluate(()=>({
        mainPresent:document.querySelector('main')!==null,
        titlePresent:document.title.trim().length>0,
        overflowPx:Math.max(0,Math.ceil(
         document.documentElement.scrollWidth-document.documentElement.clientWidth))
       }));
       rows.push({engine,viewport:viewport.name,route,
        httpStatus:response.status(),...data,javascriptErrors});
      }finally{await page.close();}
     }
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
 return finalizeCrossBrowser(rows);
}

export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')
  throw Error('CI_CROSS_BROWSER_CI_ONLY');
 const {firefox,webkit}=await import('playwright');
 const report=await runCrossBrowser({firefox,webkit});
 const dir=resolve('artifacts/ci-cross-browser');
 await mkdir(dir,{recursive:true});
 await writeFile(resolve(dir,'report.json'),
  JSON.stringify({...report,observedAt:new Date().toISOString()},null,2)+'\n');
 console.log('CI_CROSS_BROWSER_OBSERVED '+JSON.stringify(
  report.observations.map(x=>({engine:x.engine,viewport:x.viewport,
   route:x.route,overflowPx:x.overflowPx,javascriptErrors:x.javascriptErrors}))));
 console.log('CI_CROSS_BROWSER_BASELINE=NOT_APPROVED (no invented gate)');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
