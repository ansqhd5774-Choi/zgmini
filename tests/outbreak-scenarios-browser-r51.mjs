import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium} from "playwright";
mkdirSync("artifacts/outbreak-scenarios",{recursive:true});
const base=process.env.CHAT_PREVIEW_URL??"http://127.0.0.1:5173";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 for(const width of [390,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:width===390?"reduce":"no-preference"});
  page.on("pageerror",error=>errors.push(width+": "+error.message));
  await page.route("**/api/rate-sentiment",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   status:"READY",score:57.8,version:"R1",observationDate:"2026-10-19",sourceStoredAt:1792368000,
   week:[
    {label:"2026-10-13",value:61.4},{label:"2026-10-14",value:60.3},
    {label:"2026-10-15",value:59.1},{label:"2026-10-16",value:58.2},{label:"2026-10-19",value:57.8}
   ],
   oneMonth:[{label:"2026-10-13",value:61.4},{label:"2026-10-14",value:60.3},
    {label:"2026-10-15",value:59.1},{label:"2026-10-16",value:58.2},{label:"2026-10-19",value:57.8}]
  })}));
  await page.route("**/api/iran-progress",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"PENDING"})}));
  await page.goto(base+"/?view=scenarios",{waitUntil:"domcontentloaded",timeout:45000});
  const root=page.locator(".ob-events");
  await root.waitFor({state:"visible",timeout:45000});
  const cards=root.locator(".ob-card");
  assert.equal(await cards.count(),3,"All three choices survive redesign");
  await page.waitForFunction(()=>document.querySelector(".ob-cards .ob-card .ob-probability strong")?.textContent?.includes("57.8"),null,{timeout:15000});
  assert.equal(await cards.nth(0).getAttribute("aria-pressed"),"true");
  assert.equal(await root.locator(".ob-detail-grid").count(),1,"Stored rate chart panel available");
  assert.equal(await root.locator(".ob-standard-detail .ob-metrics strong").first().textContent(),"57.8 점");
  assert.equal(await root.locator(".ob-live-rate-chart polyline").getAttribute("stroke"),"#94a3b8","Neutral score must render neutral, not green");
  const firstLayout=await root.evaluate(el=>{
   const nav=el.querySelector(".ob-cards").getBoundingClientRect();
   const detail=el.querySelector(".ob-selected-event-panel").getBoundingClientRect();
   const first=el.querySelector(".ob-card").getBoundingClientRect();
   const questions=el.querySelector(".ob-definition-disclosure");
   const summary=questions?.querySelector("summary");
   return {sideBySide:detail.left>nav.right-1,stacked:detail.top>=nav.bottom-1,
    compact:first.height<= (innerWidth>=1100?151:innerWidth<=700?112:180),
    questionCollapsed:questions&&!questions.open&&!!summary};
  });
  assert(firstLayout.compact,"Event selector must not resemble three oversized dashboard cards");
  assert(firstLayout.questionCollapsed,"Secondary explanations start collapsed");
  assert(width>=1100?firstLayout.sideBySide:firstLayout.stacked,"Workspace breaks at 1100px");
  await page.screenshot({path:"artifacts/outbreak-scenarios/analysis-fed-"+width+".png",fullPage:true});

  const disclosure=root.locator("details.ob-method-disclosure");
  assert.equal(await disclosure.getAttribute("open"),null,"Methodology starts collapsed");
  await disclosure.locator("summary").click();
  assert.equal(await disclosure.getAttribute("open"),"","Secondary methodology expands on demand");
  await disclosure.locator("summary").click();
  assert.equal(await disclosure.getAttribute("open"),null);
  const definitions=root.locator("details.ob-definition-disclosure");
  assert.equal(await definitions.getAttribute("open"),null);
  await definitions.locator("summary").click();
  assert.equal(await definitions.getAttribute("open"),"");
  assert.equal(await root.getByText("기존 H.15 국채금리 기반 RSI·금리차·변동성 점수").count(),1);
  await definitions.locator("summary").click();
  assert.equal(await definitions.getAttribute("open"),null);

  await cards.nth(2).click();
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"),"true");
  assert.equal(await root.locator(".ob-standard-detail .ob-chart-empty").count(),1,"Pending event keeps its empty chart state");
  assert.equal(await cards.nth(2).locator(".ob-probability strong").textContent(),"—%","Unknown probability stays missing");
  assert.equal(await disclosure.getAttribute("open"),null,"Event selection resets optional methodology");

  await cards.nth(1).click();
  assert.equal(await cards.nth(1).getAttribute("aria-pressed"),"true");
  await root.locator("#ob-iran-title").waitFor({state:"visible"});
  assert.equal(await root.locator(".ob-iran-timeline").count(),1,"Iran official source evidence remains");

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
