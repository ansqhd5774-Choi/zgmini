import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium} from "playwright";
import {R5_REFERENCE} from "../lib/iran-progress/daily-anchored-shadow-r5.mjs";
import {CLASSIFIER_VERSION} from "../lib/iran-progress/reference-flow-r3.mjs";
import {kstCalendarDate} from "../lib/iran-progress/chart-history.mjs";
mkdirSync("artifacts/outbreak-scenarios",{recursive:true});
const base=process.env.CHAT_PREVIEW_URL??"http://127.0.0.1:5173";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 for(const width of [390,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:width===390?"reduce":"no-preference"});
  page.on("pageerror",error=>errors.push(width+": "+error.message));
  await page.addInitScript(()=>{
   window.__introTrace=[];
   for(const method of ['showModal','close']){
    const original=HTMLDialogElement.prototype[method];
    HTMLDialogElement.prototype[method]=function(...args){
     window.__introTrace.push({method,args,at:performance.now(),stack:new Error().stack});
     return original.apply(this,args);
    };
   }
   document.addEventListener('click',event=>{
    if(event.target.closest?.('#zg-about-intro-dialog'))window.__introTrace.push({method:'click',target:event.target.outerHTML,at:performance.now()});
   },true);
  });
  await page.route("**/api/rate-sentiment",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   status:"READY",score:57.8,version:"R1",observationDate:"2026-10-19",sourceStoredAt:1792368000,
   week:[
    {label:"2026-10-13",value:61.4},{label:"2026-10-14",value:60.3},
    {label:"2026-10-15",value:59.1},{label:"2026-10-16",value:58.2},{label:"2026-10-19",value:57.8}
   ],
   oneMonth:[{label:"2026-10-06",value:60.1},{label:"2026-10-07",value:59.9},
    {label:"2026-10-08",value:60.7},{label:"2026-10-09",value:60.4},{label:"2026-10-12",value:59.7},
    {label:"2026-10-13",value:61.4},{label:"2026-10-14",value:60.3},
    {label:"2026-10-15",value:59.1},{label:"2026-10-16",value:58.2},{label:"2026-10-19",value:57.8}]
  })}));
  // A contract-valid R5 *fixture*. It is not a live war observation or production score.
  const now=Date.now(),asOfDate=kstCalendarDate(now);
  const dateStart=Date.parse(asOfDate+"T00:00:00Z")-13*86400000;
  const r5Fixture={
   version:"IRAN_DAILY_PROVISIONAL_R5_1",status:"PROVISIONAL",
   sourceMethod:"R5_21_OCT_13_K21",anchorDate:R5_REFERENCE.date,
   anchorScore:R5_REFERENCE.score,anchorAssessedAt:R5_REFERENCE.assessedAt,
   asOfDate,score:13,
   history:Array.from({length:14},(_,i)=>{
    const carried=[2,5,9,11,13].includes(i);
    return {date:new Date(dateStart+i*86400000).toISOString().slice(0,10),
     value:i===13?13:Number((35-i*1.65).toFixed(2)),
     carried,reportedEvents:carried?0:1,verifiedEvents:carried?0:1};
   }),
   classifierVersion:CLASSIFIER_VERSION,sourceVersion:"IRAN_R5_K21_R3_4",
   sourceStoredAt:now-15000,sensitivityScale:21,
   acceptedEventCount:9,possibleDuplicateCount:0,
   collectionCheckedAt:now-14000,publishedAt:now-1000,
   probability:false,calibrated:false,verifiedWarState:false,completeEventCoverage:false
  };
  await page.route("**/api/iran-progress",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(r5Fixture)}));
  await page.goto(base+"/?view=scenarios",{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  try{
   await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'hidden'});
  }catch(error){
   console.log('INTRO_CLOSE_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({trace:window.__introTrace,
    dialog:document.getElementById('zg-about-intro-dialog')?.outerHTML,
    returnValue:document.getElementById('zg-about-intro-dialog')?.returnValue,
    dismissed:sessionStorage.getItem('zgmini-about-intro-dismissed-r1')}))));
   throw error;
  }
  const root=page.locator(".ob-events");
  await root.waitFor({state:"visible",timeout:45000});
  const cards=root.locator(".ob-card");
  assert.equal(await cards.count(),3,"All three choices survive redesign");
  await page.waitForFunction(()=>document.querySelector(".ob-cards .ob-card .ob-probability strong")?.textContent?.includes("57.8"),null,{timeout:15000});
  assert.equal(await cards.nth(0).getAttribute("aria-pressed"),"true");
  assert.equal(await root.locator(".ob53-main-grid").count(),1,"Stored rate beginner analysis available");
  assert.equal(await root.locator(".ob53-current strong").textContent(),"57.8점");
  assert.equal(await root.locator("#ob53-chart-title").textContent().then(s=>s?.trim()),"14일 추이");
  assert.equal(await root.locator(".ob53-trend-svg polyline").getAttribute("stroke"),"#94a3b8","Neutral score must render neutral, not green");
  assert.equal(await root.locator(".ob53-trend-svg circle").count(),10,"14-day chart contains only saved observations");
  await page.waitForFunction(expected=>document.querySelector(".ob53-trend-svg")?.getAttribute("viewBox")===expected,width<=600?"0 0 350 240":"0 0 700 240",{timeout:5000});
  if(width<=600){
   const mobileChart=await root.evaluate(el=>{
    const svg=el.querySelector(".ob53-trend-svg"),assets=el.querySelector(".ob53-assets"),panel=el.querySelector(".ob53-beginner-stack");
    return {viewBox:svg?.getAttribute("viewBox"),assetsFullWidth:Math.abs(assets.getBoundingClientRect().width-panel.getBoundingClientRect().width)<3};
   });
   assert.equal(mobileChart.viewBox,"0 0 350 240","Mobile chart uses legible axis geometry");
   assert(mobileChart.assetsFullWidth,"Related assets are full width on narrow screens");
  }
  assert.equal(await root.locator(".ob53-trend-svg text").last().textContent(),"10.19");
  assert.equal(await root.locator(".ob53-chart-heading>span").textContent(),"관측 10일 / 14일");
  assert.equal(await root.locator(".ob53-tone-pill").textContent(),"중립");
  assert.equal(await root.locator(".ob53-scale-colors [data-band]").count(),5);
  assert.equal(await root.locator(".ob53-week strong").getAttribute("data-change"),"down");
  assert.equal(await root.locator(".ob53-explain").getByText("이 숫자는 무슨 뜻인가요?").count(),1);
  assert.equal(await root.locator(".ob53-guide").getByText("금리 인하 확률이 아닙니다").count(),1);
  const firstLayout=await root.evaluate(el=>{
   const nav=el.querySelector(".ob-cards").getBoundingClientRect();
   const detail=el.querySelector(".ob-selected-event-panel").getBoundingClientRect();
   const first=el.querySelector(".ob-card").getBoundingClientRect();
   const questions=el.querySelector(".ob53-details");
   const summary=questions?.querySelector("summary");
   return {sideBySide:detail.left>nav.right-1,stacked:detail.top>=nav.bottom-1,
    compact:first.height<= (innerWidth>=1100?151:innerWidth<=700?112:180),
    questionCollapsed:questions&&!questions.open&&!!summary};
  });
  assert(firstLayout.compact,"Event selector must not resemble three oversized dashboard cards");
  assert(firstLayout.questionCollapsed,"Secondary explanations start collapsed");
  assert(width>=1100?firstLayout.sideBySide:firstLayout.stacked,"Workspace breaks at 1100px");
  const fedGeometry=await root.evaluate(el=>{
   const intro=el.querySelector(".ob53-intro-grid");
   const main=el.querySelector(".ob53-main-grid");
   return {introColumns:getComputedStyle(intro).gridTemplateColumns.split(" ").length,
    mainColumns:getComputedStyle(main).gridTemplateColumns.split(" ").length};
  });
  await page.screenshot({path:"artifacts/outbreak-scenarios/analysis-fed-"+width+".png",fullPage:true});

  const disclosures=root.locator("details.ob53-details");
  assert.equal(await disclosures.count(),2);
  const definition=disclosures.nth(0),method=disclosures.nth(1);
  assert.equal(await definition.getAttribute("open"),null);
  await definition.locator("summary").click();
  assert.equal(await definition.getAttribute("open"),"");
  assert.equal(await root.getByText(/기존 미국 연준 H\.15 국채금리 기반/).count(),1);
  await definition.locator("summary").click();
  await method.locator("summary").click();
  assert.equal(await method.getAttribute("open"),"","Approved methodology expands on demand");
  await method.locator("summary").click();
  assert.equal(await method.getAttribute("open"),null);

  await cards.nth(2).click();
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"),"true");
  assert.equal(await root.locator(".ob-standard-detail .ob-chart-empty").count(),1,"Pending event keeps its empty chart state");
  assert.equal(await cards.nth(2).locator(".ob-probability strong").textContent(),"—%","Unknown probability stays missing");
  assert.equal(await root.locator("details.ob-method-disclosure").getAttribute("open"),null,"Event selection retains a collapsed optional methodology");

  await cards.nth(1).click();
  assert.equal(await cards.nth(1).getAttribute("aria-pressed"),"true");
  await root.locator("#ob-iran-title").waitFor({state:"visible"});
  assert.equal(await root.locator(".ob55-iran-parity .ob53-intro-grid").count(),1,"Iran uses R53 intro-grid");
  assert.equal(await root.locator(".ob55-iran-parity .ob53-main-grid").count(),1,"Iran uses R53 main-grid");
  assert.equal(await root.locator(".ob55-score-card .ob54-kpis > div").count(),3,"Iran metrics share R53 integrated score panel");
  assert.equal(await root.locator(".ob55-score-card .ob54-scale").count(),1,"The score scale must be inside integrated panel");
  assert.equal(await root.locator(".ob55-intro > .ob54-meaning").count(),1,"The beginner meaning card is on the top right");
  assert.equal(await root.locator(".ob55-main .ob54-trend").count(),1,"Iran 14-day chart occupies the left analysis panel");
  assert.equal(await root.locator(".ob55-main .ob54-guide").count(),1,"Beginner interpretations align with R53 layout");
  await page.waitForFunction(()=>document.querySelector(".ob54-kpis strong")?.textContent?.includes("13.0"),null,{timeout:12000});
  assert.equal(await root.locator(".ob54-state").textContent(),"진전 매우 낮음");
  assert.equal(await root.locator("#ob54-chart-title").textContent()," 14일 추이");
  assert.equal(await root.locator(".ob54-trend-svg line[stroke-dasharray='5 5']").count()>0,true,"Carried days remain dashed");
  assert.equal(await root.locator(".ob54-scale-track [data-band]").count(),5);
  const iranGeometry=await root.evaluate(el=>{
   const intro=el.querySelector(".ob55-intro"),main=el.querySelector(".ob55-main");
   return {introColumns:getComputedStyle(intro).gridTemplateColumns.split(" ").length,
    mainColumns:getComputedStyle(main).gridTemplateColumns.split(" ").length,
    scoreHasScale:!!intro.querySelector(".ob55-score-card .ob54-scale")};
  });
  assert.deepEqual(iranGeometry,{...fedGeometry,scoreHasScale:true},"Iran uses the same grid breakpoints as the approved rate detail");
  assert.equal(await root.locator(".ob54-relations strong").count(),3);
  assert.equal(await root.locator(".ob54-relations strong").first().textContent(),"미확인");
  assert.equal(await root.locator(".ob54-disclosure").count(),2);
  const evidence=root.locator(".ob54-disclosure").nth(1);
  assert.equal(await evidence.getAttribute("open"),null);
  await evidence.locator("summary").click();
  assert.equal(await evidence.getAttribute("open"),"","Evidence source summary can expand");
  assert.equal(await evidence.getByText("최근 14일 확인된 공식 발표").count(),1);
  await evidence.locator("summary").click();
  assert.equal(await evidence.getAttribute("open"),null);
  const expectedBox=width<=600?"0 0 350 232":"0 0 700 232";
  await page.waitForFunction(expected=>document.querySelector(".ob54-trend-svg")?.getAttribute("viewBox")===expected,expectedBox,{timeout:5000});
  assert.equal(await root.locator(".ob54-trend-svg circle").count(),1,"No fictitious point added to chart");
  await page.screenshot({path:"artifacts/outbreak-scenarios/analysis-iran-"+width+".png",fullPage:true});

  const geometry=await root.evaluate(el=>{
   const wrap=el.getBoundingClientRect();
   const choices=[...el.querySelectorAll(".ob-card")].map(card=>card.getBoundingClientRect());
   const panel=el.querySelector(".ob-selected-event-panel")?.getBoundingClientRect();
   return {rootFits:wrap.left>=-1&&wrap.right<=innerWidth+1,
    cardsFit:choices.every(box=>box.left>=wrap.left-1&&box.right<=wrap.right+1),
    detailFits:!!panel&&panel.left>=wrap.left-1&&panel.right<=wrap.right+1,
    singleColumn:innerWidth>700||choices.every((box,i)=>i===0||box.top>=choices[i-1].bottom-1)};
  });
  assert.deepEqual(geometry,{rootFits:true,cardsFit:true,detailFits:true,singleColumn:true},"Responsive event panels fit viewport");
  await page.screenshot({path:"artifacts/outbreak-scenarios/scenarios-"+width+".png",fullPage:true});
  console.log("PASS: scenario page responsive width="+width);
  await page.close();
 }
 assert.equal(errors.length,0,errors.join("\n"));
}finally{await browser.close();}
