import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {chromium} from "playwright";
import {EMPLOYMENT_R6_FEATURES,EMPLOYMENT_R6_FORMULA_HASH} from "../lib/market-score/employment-r6-formula.mjs";

// Production-only readback. No API fixtures, D1 writes, provider calls or deployments.
// Run on an existing Playwright-equipped host: node tests/w04-r6-production-ui-readonly-r1.mjs
const base="https://zgmini.kr";
const output="artifacts/w04-r6-production-ui";
mkdirSync(output,{recursive:true});
const viewports=[{width:1440,height:900},{width:390,height:844}];
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const fmt=(value,unit)=>finite(value)?String(Number(value.toFixed(Math.abs(value)>=100?1:2)))+(unit??""):"—";
const dateLabel=date=>typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)
  ?date.replaceAll("-",". ")+".":"—";
const expectedValue=item=>item.rawStatus!=="UNAVAILABLE"?fmt(item.value,item.unit):"—";
function checkData(body,headers){
 assert.equal(body.kind,"EMPLOYMENT_R6_ONE_YEAR_STORED_DISPLAY_R1");
 assert(["PARTIAL","READY"].includes(body.status),"Production R6 status");
 assert.equal(body.formulaHash,EMPLOYMENT_R6_FORMULA_HASH,"Deployed formula contract must match source");
 assert.equal(body.indicators?.length,29,"Production must include 29 source indicators");
 assert.deepEqual(body.indicators.map(item=>item.id),EMPLOYMENT_R6_FEATURES.map(item=>item.id),"Exact approved ID order");
 assert.equal(headers["x-employment-r6-source"],"STORED_D1","GET must read stored D1 projection");
 assert(finite(body.sourceStoredAt)&&body.sourceStoredAt>0,"Stored source time must be present");
 const publishedAt=Date.parse(headers["x-data-snapshot-at"]??"");
 assert(Number.isFinite(publishedAt)&&publishedAt>=body.sourceStoredAt,"D1 publish time must follow source time");
 const summary=body.summary;
 const expectedCounts={
  sourceFeatures:body.indicators.filter(x=>x.rawStatus!=="UNAVAILABLE").length,
  recentlyObservedFeatures:body.indicators.filter(x=>x.rawStatus==="READY").length,
  chartReadyFeatures:body.indicators.filter(x=>x.chartStatus==="READY").length,
  chartPartialFeatures:body.indicators.filter(x=>x.chartStatus==="PARTIAL").length,
  scoredFeatures:body.indicators.filter(x=>x.scoreStatus==="READY").length,
  recentlyScoredFeatures:body.indicators.filter(x=>x.scoreStatus==="READY"&&x.rawStatus==="READY").length
 };
 for(const [key,value] of Object.entries(expectedCounts))assert.equal(summary[key],value,"R6 summary "+key);
 return {publishedAt,sourceStoredAt:body.sourceStoredAt,asOfDate:body.asOfDate,counts:expectedCounts};
}
function expectedChartEndpoint(history){
 const points=history.filter(p=>typeof p.date==="string"&&finite(p.value)).slice()
  .sort((a,b)=>a.date.localeCompare(b.date));
 if(points.length<2)return null;
 const times=points.map((p,i)=>{
  const stamp=Date.parse((p.date.length===7?p.date+"-01":p.date)+"T00:00:00Z");
  return Number.isFinite(stamp)?stamp:i;
 });
 const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values);
 const pad=max>min?(max-min)*.12:Math.max(Math.abs(max),1)*.02;
 const low=min-pad,high=max+pad;
 const x=3+106*(times.at(-1)-Math.min(...times))/(Math.max(...times)-Math.min(...times)||1);
 const y=3+26*(1-(points.at(-1).value-low)/(high-low||1));
 return {x:Number(x.toFixed(2)),y:Number(y.toFixed(2)),lastDate:points.at(-1).date};
}
async function verifyRows(section,body){
 const rows=section.locator("tbody tr");
 const cards=section.locator(".inflation-r2-mobile-list article");
 assert.equal(await rows.count(),29,"29 desktop table rows");
 assert.equal(await cards.count(),29,"29 mobile cards");
 for(let i=0;i<29;i++){
  const item=body.indicators[i],row=rows.nth(i),card=cards.nth(i);
  const actual=(await row.locator("td[data-value-kind] strong").innerText()).trim();
  const mobile=(await card.locator(".inflation-r2-mobile-metrics > div").nth(1).locator("strong").innerText()).trim();
  const expected=expectedValue(item);
  assert.equal(actual,expected,"Desktop raw value and unit: "+item.id);
  assert.equal(mobile,expected,"Mobile raw value and unit: "+item.id);
  const kind=await row.locator("td[data-value-kind]").getAttribute("data-value-kind");
  assert.equal(kind,item.rawStatus==="UNAVAILABLE"?"missing":"raw","Raw/missing classification: "+item.id);
  const details=await row.locator("td[data-value-kind] small").first().innerText();
  const mobileDetails=await card.locator(".inflation-r2-mobile-metrics > div").nth(1).locator("small").first().innerText();
  if(item.rawStatus!=="UNAVAILABLE"){
   const observed=dateLabel(item.observationDate);
   assert(details.includes(observed)&&mobileDetails.includes(observed),"Observation date: "+item.id);
   if(item.rawStatus==="STALE")assert(details.includes("과거 관측"),"Stale label: "+item.id);
   if(item.rawStatus==="READY"&&item.scoreStatus==="READY"){
    const score="평가 "+item.score.toFixed(1)+"점";
    assert(details.includes(score)&&mobileDetails.includes(score),"R6 score: "+item.id);
   }else{
    assert(!details.includes("평가 "),"Missing/stale score must not be shown: "+item.id);
   }
  }else{
   assert(details.includes("미제공")&&mobileDetails.includes("미제공"),"Missing reason: "+item.id);
  }
  const prev=(await row.locator("td.inflation-r2-value").first().locator("strong").innerText()).trim();
  const expectedPrev=item.rawStatus!=="UNAVAILABLE"?fmt(item.previousValue,item.unit):"—";
  assert.equal(prev,expectedPrev,"Previous raw value: "+item.id);
  const last=expectedChartEndpoint(item.history??[]);
  const chart=row.locator(".inflation-r2-spark-cell svg.inflation-mini-chart");
  if(!last){
   assert.equal(await chart.count(),0,"No fabricated line for sparse history: "+item.id);
  }else{
   assert.equal(await chart.count(),1,"Real historical line: "+item.id);
   const label=await chart.getAttribute("aria-label");
   assert(label.includes(last.lastDate),"Actual last observation date: "+item.id);
   const d=await chart.locator("path").getAttribute("d");
   const endpoint=d?.trim().match(/[ML](-?[\d.]+)\s+(-?[\d.]+)$/);
   assert(endpoint,"Chart final point exists: "+item.id);
   assert.equal(Number(endpoint[1]),last.x,"Chart last X: "+item.id);
   assert.equal(Number(endpoint[2]),last.y,"Chart last value Y: "+item.id);
  }
  if(item.chartStatus==="PARTIAL")assert((await row.innerText()).includes("최근 분기 자료 없음"),"Partial history: "+item.id);
  if(item.chartStatus==="UNAVAILABLE")assert((await row.innerText()).includes("1년 이력 부족"),"Missing history: "+item.id);
 }
}
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,locale:"ko-KR",timezoneId:"Asia/Seoul",
   isMobile:viewport.width===390,hasTouch:viewport.width===390,reducedMotion:"reduce",serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const result={width:viewport.width,phase:"START",apiStatus:null,sourceStoredAt:null,asOfDate:null,errors};
  results.push(result);
  try{
   const api=await context.request.get(base+"/api/employment-r6/observations",{
    timeout:35000,headers:{"accept":"application/json","cache-control":"no-cache"}});
   result.apiStatus=api.status();
   assert.equal(api.status(),200,"Production R6 GET is not ready");
   const body=await api.json(),readback=checkData(body,await api.allHeaders());
   Object.assign(result,readback);
   const pageResponse=await page.goto(base+"/economic-indicators/employment/",
    {waitUntil:"domcontentloaded",timeout:60000});
   assert.equal(pageResponse?.status(),200,"Production employment page GET");
   const section=page.locator('section.economic-indicators[aria-labelledby="economic-employment-indicators"]');
   await section.waitFor({state:"attached",timeout:30000});
   await page.waitForFunction(count=>{
    const text=document.querySelector('section.economic-indicators[aria-labelledby="economic-employment-indicators"] header p')?.textContent??"";
    return text.includes("R6 저장 원자료")&&text.includes("1년 차트 "+count+"/29개");
   },body.summary.chartReadyFeatures,{timeout:45000});
   await verifyRows(section,body);
   const pageWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert(pageWidth<=viewport.width+2,"Horizontal overflow");
   assert.deepEqual(errors,[],"Browser JavaScript errors");
   result.phase="PASS";
  }catch(e){
   result.phase="FAIL";
   result.failure=String(e?.message??e).slice(0,600);
  }finally{
   await sectionScreenshot(page,output+"/employment-"+viewport.width+".png");
   await context.close();
  }
  console.log("W04_R6_PRODUCTION_UI "+JSON.stringify(result));
 }
}finally{
 await browser.close();
 writeFileSync(output+"/results.json",JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+"\n");
}
assert(results.every(x=>x.phase==="PASS"),"Production R6 UI failed; inspect per-viewport result and screenshots");
console.log("W04_R6_PRODUCTION_UI_READONLY_PASS");
async function sectionScreenshot(page,path){
 try{await page.screenshot({path,fullPage:false,timeout:10000});}catch{}
}
