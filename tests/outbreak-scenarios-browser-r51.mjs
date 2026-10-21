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
   oneMonth:[{label:"2026-10-06",value:60.1},{label:"2026-10-07",value:59.9},
    {label:"2026-10-08",value:60.7},{label:"2026-10-09",value:60.4},{label:"2026-10-12",value:59.7},
    {label:"2026-10-13",value:61.4},{label:"2026-10-14",value:60.3},
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
  assert.equal(await root.locator(".ob53-main-grid").count(),1,"Stored rate beginner analysis available");
  assert.equal(await root.locator(".ob53-current strong").textContent(),"57.8점");
  assert.equal(await root.locator("#ob53-chart-title").textContent().then(s=>s?.trim()),"14일 추이");
  assert.equal(await root.locator(".ob53-trend-svg polyline").getAttribute("stroke"),"#94a3b8","Neutral score must render neutral, not green");
  assert.equal(await root.locator(".ob53-trend-svg circle").count(),10,"14-day chart contains only saved observations");
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
