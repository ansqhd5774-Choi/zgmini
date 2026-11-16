// Read-only live Production evidence. No mocks, writes, secrets or data publication.
import {chromium} from "playwright";
import {mkdirSync,writeFileSync} from "node:fs";
const origin="https://zgmini.kr",dir="artifacts/w06-production-live-r1";
const pages=[["inflation","/economic-indicators/inflation/","물가","inflation"],["employment","/economic-indicators/employment/","고용","employment"],["market-calendar","/market-calendar/","시장 캘린더",null],["theme-fear-greed","/theme-fear-greed/","테마",null]];
const apis=["/api/market-score","/api/inflation-causal-inputs","/api/employment-r6/observations","/api/release-calendar","/api/theme-fear-greed","/api/theme-configured"];
const result={kind:"W06_PRODUCTION_LIVE_8VIEW_R1",sourceExpected:"7bf75fd77123e012bffd3538d472ac5910e64dd3",time:new Date().toISOString(),mocked:false,apis:[],views:[],findings:[]};
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const str=x=>typeof x==="string"?x.slice(0,100):null;
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 const requestContext=await browser.newContext({ignoreHTTPSErrors:false});
 for(const path of apis){
  try{
   const r=await requestContext.request.get(origin+path,{timeout:30000,headers:{"cache-control":"no-cache"}});
   let j=null;try{j=await r.json();}catch{}
   const x={path,http:r.status(),status:str(j?.status),asOfDate:str(j?.asOfDate),observationDate:str(j?.observationDate),sourceStoredAt:j?.sourceStoredAt??null};
   if(path==="/api/market-score")x.domains=(Array.isArray(j?.domains)?j.domains:[]).filter(d=>d?.id==="inflation"||d?.id==="employment").map(d=>({id:d.id,status:str(d.status),score:finite(d.score)?d.score:null,observationDate:str(d.observationDate),sourceStoredAt:str(d.sourceStoredAt)}));
   if(path==="/api/employment-r6/observations"||path==="/api/inflation-causal-inputs")x.indicators=Array.isArray(j?.indicators)?j.indicators.length:null;
   if(path==="/api/release-calendar")x.events=Array.isArray(j?.events)?j.events.length:null;
   if(path.startsWith("/api/theme-"))x.themes=Array.isArray(j?.themes)?j.themes.length:null;
   result.apis.push(x);console.log("W06_API "+JSON.stringify(x));
   if(r.status()!==200||!j||typeof j!=="object")result.findings.push({scope:path,type:"API_NOT_READY",http:r.status()});
  }catch(e){
   const x={path,http:null,error:str(e?.name)||"RequestError"};
   result.apis.push(x);result.findings.push({scope:path,type:"API_ACCESS_FAILED",error:x.error});
   console.log("W06_API "+JSON.stringify(x));
  }
 }
 await requestContext.close();
 const market=result.apis.find(x=>x.path==="/api/market-score");
 for(const [name,path,heading,domain] of pages)for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:"ko-KR",deviceScaleFactor:1,isMobile:width===390,hasTouch:width===390,ignoreHTTPSErrors:false});
  const page=await ctx.newPage();
  const seenApis=[],pageErrors=[];
  page.on("response",r=>{try{const u=new URL(r.url());if(u.origin===origin&&u.pathname.startsWith("/api/"))seenApis.push({path:u.pathname,http:r.status()});}catch{}});
  page.on("pageerror",e=>pageErrors.push(str(e?.name)||"PageError"));
  const v={name,path,width,status:null,heading:null,overflow:null,screenshot:name+"-"+width+".png",apis:[],checks:{},pageErrors:[]};
  try{
   const nav=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
   v.status=nav?.status()??null;
   await page.waitForLoadState("networkidle",{timeout:20000}).catch(()=>null);
   await page.evaluate(()=>document.fonts?.ready).catch(()=>null);
   await page.waitForTimeout(750);
   v.ui=await page.evaluate(domain=>{
    const text=q=>document.querySelector(q)?.textContent?.trim()??null;
    const hero=domain?document.querySelector('[data-testid="economic-'+domain+'-hero"]'):null;
    return {
     title:document.title,heading:text("h1"),bodySample:(document.body?.innerText??"").slice(0,300),
     viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
     heroScore:hero?.querySelector(".fg-score-slot")?.textContent?.trim().slice(0,160)??null,
     heroAsOf:hero?.querySelector(".cnn-panel-note")?.textContent?.trim().slice(0,160)??null,
     heroState:hero?.getAttribute("data-market-state")??null,
     themeAsOf:text(".zg-tfg-content .zg-sfg-as-of"),themeRanks:document.querySelectorAll(".zg-sfg-rank-row").length,
     calendarState:text(".mc-data-state"),economicRows:document.querySelectorAll("section.economic-indicators tbody tr").length,
     economicCards:document.querySelectorAll("section.economic-indicators article.inflation-r2-mobile-card").length
    };
   },domain);
   v.heading=v.ui.heading;v.overflow=v.ui.scrollWidth>v.ui.viewport+1;
   v.checks.html200=v.status===200;
   v.checks.heading=Boolean(v.heading?.includes(heading));
   v.checks.noHorizontalOverflow=!v.overflow;
   if(domain){
    const stored=market?.domains?.find(x=>x.id===domain);
    v.apiDomain=stored??null;
    if(stored?.status==="READY"&&finite(stored.score))v.checks.scoreMatchesPublicApi=Boolean(v.ui.heroScore?.includes(stored.score.toFixed(1)));
    else v.checks.scoreMatchesPublicApi=null;
   }
   if(name==="market-calendar")v.checks.calendarReadError=Boolean(v.ui.calendarState?.includes("조회 실패"));
   if(name==="theme-fear-greed")v.checks.themeHeaderPresent=Boolean(v.ui.themeAsOf);
   await page.screenshot({path:dir+"/"+v.screenshot,fullPage:true,animations:"disabled",timeout:50000});
   console.log("W06_SCREENSHOT "+dir+"/"+v.screenshot);
   for(const [check,passed] of Object.entries(v.checks)){
    if((typeof passed==="boolean"&&check!=="calendarReadError"&&!passed)||(check==="calendarReadError"&&passed)){
     result.findings.push({scope:name,width,type:"UI_CHECK_FAILED",check});
    }
   }
  }catch(e){
   v.error={name:str(e?.name),detail:str(e?.message)};
   result.findings.push({scope:name,width,type:"LIVE_BROWSER_FAILED",error:v.error});
  }finally{
   v.apis=seenApis;v.pageErrors=pageErrors.slice(0,10);
   result.views.push(v);
   console.log("W06_VIEW "+JSON.stringify(v));
   await ctx.close();
  }
 }
}finally{
 await browser.close();
 const summary={captured:result.views.filter(x=>x.status===200&&x.ui).length,views:result.views.length,api200:result.apis.filter(x=>x.http===200).length,apiTotal:apis.length,overflow:result.views.filter(x=>x.overflow===true).length,findings:result.findings.length};
 result.summary=summary;
 writeFileSync(dir+"/result.json",JSON.stringify(result,null,2));
 console.log("W06_LIVE_RESULT "+JSON.stringify(summary));
}
if(result.summary.captured!==8||result.findings.some(x=>x.type==="UI_CHECK_FAILED"||x.type==="LIVE_BROWSER_FAILED")){
 console.error("W06_PRODUCTION_UI_NOT_VERIFIED: inspect JSON/PNG artifact; no production change.");
 process.exitCode=1;
}
if(result.summary.api200<apis.length)console.log("W06_API_PARTIAL: do not claim complete end-to-end API verification.");