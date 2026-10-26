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
 for(const width of [390,430,620,768,1024,1349,1350,1440,1920]){
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
  await page.goto(base+"/outbreak/",{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'hidden'});
  const root=page.locator(".ob-events");
  await root.waitFor({state:"visible",timeout:45000});
  const cards=root.locator(".ob-card");
  assert.equal(await cards.count(),3,"All three choices survive redesign");
  await page.waitForFunction(()=>document.querySelector(".ob-cards .ob-card .ob-probability strong")?.textContent?.includes("57.8"),null,{timeout:15000});
  assert.equal(await cards.nth(0).getAttribute("aria-pressed"),"true");
  assert.equal(await root.locator(".ob53-main-grid").count(),1,"Stored rate beginner analysis available");
  assert.equal(await root.locator(".ob53-current strong").textContent(),"57.8점");
  assert.equal(await root.locator("#ob53-chart-title").textContent().then(s=>s?.trim()),"14일 추이");
  const rateChart=root.locator(".ob53-market-chart");
  await rateChart.locator(".recharts-surface").waitFor({state:"visible",timeout:20000});
  assert.equal(await rateChart.locator(".recharts-area-curve").getAttribute("stroke"),"#94a3b8","Neutral score keeps its band color in the shared chart");
  assert.equal(await rateChart.locator(".recharts-reference-area").count(),5,"Shared chart shows five rate-score bands");
  assert.equal(await rateChart.getAttribute("data-observed-days"),"10","Only the 10 stored observations are counted");
  assert.equal(await rateChart.getAttribute("data-missing-days"),"4","Missing days remain missing instead of receiving generated values");
  assert.equal(await rateChart.locator(".cnn-latest-point").count(),1,"Shared chart marks only the latest observed point");
  if(width<=600){
   const mobileChart=await root.evaluate(el=>{
    const chart=el.querySelector(".ob53-market-chart"),news=el.querySelector(".ob57-news"),panel=el.querySelector(".ob53-beginner-stack");
    return {chartFits:!!chart&&chart.getBoundingClientRect().width<=innerWidth,
     newsFits:!!news&&news.getBoundingClientRect().right<=innerWidth+1,extraHidden:getComputedStyle(panel).display==="none"};
   });
   assert(mobileChart.chartFits,"Shared 14-day chart fits the mobile viewport");
   assert(mobileChart.newsFits&&mobileChart.extraHidden,"News fits mobile and redundant beginner cards remain hidden");
  }
  assert((await rateChart.textContent())?.includes("10.19"),"Last calendar tick retains its observed date");
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
   return {navHorizontal:[...el.querySelectorAll(".ob-card")].every(card=>Math.abs(card.getBoundingClientRect().top-first.top)<2),stacked:detail.top>=nav.bottom-1,
    compact:first.height<= (innerWidth>=1100?151:innerWidth<=700?112:180),
    questionCollapsed:questions&&!questions.open&&!!summary};
  });
  assert(firstLayout.compact,"Event selector must not resemble three oversized dashboard cards");
   assert.equal(await root.locator(".ob57-news-item").count(),0,"No sample or invented news is published while feed data is not connected");
   assert.equal(await root.locator(".ob57-news-count").textContent(),"0건");
   assert.equal(await root.locator(".ob57-news-filters button").count(),3,"All / positive / negative filters are present");
   await root.locator(".ob57-news-filters button").nth(2).click();
   assert.equal(await root.locator(".ob57-news-filters button").nth(2).getAttribute("aria-pressed"),"true");
   await root.locator(".ob57-news-filters button").first().click();
   assert.equal(await root.locator(".ob57-news-filters button").first().getAttribute("aria-pressed"),"true");
   const newsColumns=await root.locator(".ob57-news-list").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length);
   assert.equal(newsColumns,width>=1350?2:1,"Wide screens prepare a two-column news layout; other widths use a compact list");

  assert(firstLayout.questionCollapsed,"Secondary explanations start collapsed");
  assert(firstLayout.stacked&&firstLayout.navHorizontal,"Option 5 keeps three horizontal tabs above the detail at every width");
  const fedGeometry=await root.evaluate(el=>{
   const intro=el.querySelector(".ob53-intro-grid");
   const main=el.querySelector(".ob53-main-grid");
   return {introColumns:getComputedStyle(intro).gridTemplateColumns.split(" ").length,
    mainColumns:getComputedStyle(main).gridTemplateColumns.split(" ").length};
  });
  const fedVisual=await root.evaluate(el=>{
   const intro=el.querySelector(".ob53-intro-grid").getBoundingClientRect();
   const score=el.querySelector(".ob53-score-card").getBoundingClientRect();
   const main=el.querySelector(".ob53-main-grid").getBoundingClientRect();
   const chart=el.querySelector(".ob53-chart").getBoundingClientRect();
   const news=el.querySelector(".ob57-news").getBoundingClientRect();
   return {scoreWidthFraction:score.width/intro.width,
    chartWidthFraction:chart.width/(chart.width+news.width),
    newsWidthFraction:news.width/(chart.width+news.width),
    chartBeforeNews:chart.right<=news.left+1 || news.top>=chart.bottom-1,
    introFills:Math.abs(intro.width-main.width)<2};
  });
  assert(fedVisual.scoreWidthFraction>.96&&fedVisual.introFills,
   "R58: score strip must fill entire page width without a hidden right column");
  if(width>=851){
   assert(fedVisual.chartWidthFraction>.29&&fedVisual.chartWidthFraction<.39,
    "R58: desktop chart must occupy approximately 34% of the two-column content");
   assert(fedVisual.newsWidthFraction>.61&&fedVisual.newsWidthFraction<.71,
    "R58: desktop news must occupy approximately 66% of the two-column content");
  }
  assert(fedVisual.chartBeforeNews,"R58: news must appear beside or below chart");
  await page.screenshot({path:"artifacts/outbreak-scenarios/analysis-fed-"+width+".png",fullPage:true});

  const disclosures=root.locator("details.ob53-details");
  assert.equal(await disclosures.count(),2);
  if(width<=700){
   const guide=root.locator("details.obm-search-guide");
   assert.equal(await guide.isVisible(),true,"Mobile SEO guide is visible in collapsed form");
   assert.equal(await guide.getAttribute("open"),null);
   await guide.locator("summary").click();
   assert.equal(await guide.getAttribute("open"),"","Mobile guide opens on demand");
   await guide.locator("summary").click();
   assert.equal(await guide.getAttribute("open"),null);
   assert.equal(await root.locator(".ob57-news").isVisible(),true,"Approved news panel is visible under the mobile chart");
   assert.equal(await root.locator(".ob53-beginner-stack").isVisible(),false,"Mobile hides redundant beginner and asset cards");
   assert.equal(await root.locator(".ob53-title").isVisible(),false,"Mobile uses compact tab title instead of duplicate detail header");
   const chartBottom=await root.locator(".ob53-chart").boundingBox();
   const logTop=await root.locator(".ob57-news").boundingBox();
   assert(chartBottom&&logTop&&logTop.y>=chartBottom.y+chartBottom.height-1,"Major news follows the 14-day chart");
  }else{
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
  }

  await cards.nth(2).click();
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"),"true");
  assert.equal(await root.locator(".ob-standard-detail .ob-chart-empty").count(),1,"Pending event keeps its empty chart state");
  assert.equal(await cards.nth(2).locator(".ob-probability strong").textContent(),"—%","Unknown probability stays missing");
  assert.equal(await root.locator("details.ob-method-disclosure").getAttribute("open"),null,"Event selection retains a collapsed optional methodology");

  await cards.nth(1).click();
  assert.equal(await cards.nth(1).getAttribute("aria-pressed"),"true");
  await root.locator("#ob-iran-title").waitFor({state:"attached"});
   assert.equal(await root.locator(".ob57-news").isVisible(),true,"Iran news panel is visible; duplicate detail title is hidden in Option 5");
  assert.equal(await root.locator(".ob55-iran-parity .ob53-intro-grid").count(),1,"Iran uses R53 intro-grid");
  assert.equal(await root.locator(".ob55-iran-parity .ob53-main-grid").count(),1,"Iran uses R53 main-grid");
  assert.equal(await root.locator(".ob55-score-card .ob54-kpis > div").count(),3,"Iran metrics share R53 integrated score panel");
  assert.equal(await root.locator(".ob55-score-card .ob54-scale").count(),1,"The score scale must be inside integrated panel");
  assert.equal(await root.locator(".ob55-score-card .ob57-scale-summary").count(),1,"Iran uses the approved full-width score and scale strip");
  assert.equal(await root.locator(".ob55-main .ob54-trend").count(),1,"Iran 14-day chart occupies the left analysis panel");
  assert.equal(await root.locator(".ob55-main .ob57-news").count(),1,"Iran chart and major-news panel share the approved grid");
  await page.waitForFunction(()=>document.querySelector(".ob54-kpis strong")?.textContent?.includes("13.0"),null,{timeout:12000});
  assert.equal(await root.locator(".ob54-state").textContent(),"진전 매우 낮음");
  assert.equal(await root.locator("#ob54-chart-title").textContent()," 14일 추이");
  const iranChart=root.locator(".ob54-market-chart");
  await iranChart.locator(".recharts-surface").waitFor({state:"visible",timeout:20000});
  assert.equal(await iranChart.locator(".recharts-reference-area").count(),5,"Iran reuses five score bands");
  assert.equal(await iranChart.getAttribute("data-observed-days"),"14","All 14 stored provisional dates remain visible");
  assert.equal(await iranChart.getAttribute("data-carried-days"),"5","Five carried provisional dates retain their identity");
  assert.equal(await iranChart.locator(".recharts-reference-line-line[stroke-dasharray='5 5']").count(),5,"Five carried intervals stay dashed");
  assert.equal(await iranChart.locator(".cnn-latest-point").count(),1,"Latest provisional observation gets one marker");
  assert.equal(await root.locator(".ob54-scale-track [data-band]").count(),5);
  const iranGeometry=await root.evaluate(el=>{
   const intro=el.querySelector(".ob55-intro"),main=el.querySelector(".ob55-main");
   return {introColumns:getComputedStyle(intro).gridTemplateColumns.split(" ").length,
    mainColumns:getComputedStyle(main).gridTemplateColumns.split(" ").length,
    scoreHasScale:!!intro.querySelector(".ob55-score-card .ob54-scale")};
  });
  assert.deepEqual(iranGeometry,{...fedGeometry,scoreHasScale:true},"Iran uses the same grid breakpoints as the approved rate detail");
  const iranVisual=await root.evaluate(el=>{
   const intro=el.querySelector(".ob55-intro").getBoundingClientRect();
   const score=el.querySelector(".ob55-score-card").getBoundingClientRect();
   const chart=el.querySelector(".ob55-main .ob54-trend").getBoundingClientRect();
   const news=el.querySelector(".ob55-main .ob57-news").getBoundingClientRect();
   return {scoreWidthFraction:score.width/intro.width,
    chartWidthFraction:chart.width/(chart.width+news.width),
    newsWidthFraction:news.width/(chart.width+news.width)};
  });
  assert(iranVisual.scoreWidthFraction>.96,
   "R58: Iran score and scale must fill the entire header width");
  if(width>=851){
   assert(iranVisual.chartWidthFraction>.29&&iranVisual.chartWidthFraction<.39,
    "R58: Iran chart must occupy approximately 34% of desktop width");
   assert(iranVisual.newsWidthFraction>.61&&iranVisual.newsWidthFraction<.71,
    "R58: Iran news must occupy approximately 66% of desktop width");
  }
  assert.equal(await root.locator(".ob54-relations strong").count(),3);
  assert.equal(await root.locator(".ob54-relations strong").first().textContent(),"미확인");
  assert.equal(await root.locator(".ob54-disclosure").count(),2);
  const evidence=root.locator(".ob54-disclosure").nth(1);
  assert.equal(await evidence.getAttribute("open"),null);
  if(width>700){
   await evidence.locator("summary").click();
   assert.equal(await evidence.getAttribute("open"),"","Evidence source summary can expand on PC");
   assert.equal(await evidence.getByText("최근 14일 확인된 공식 발표").count(),1);
   await evidence.locator("summary").click();
   assert.equal(await evidence.getAttribute("open"),null);
  }else{
   assert.equal(await root.locator(".ob57-news").isVisible(),true,"Iran mobile news follows the chart");
  }
  const iranChartFits=await iranChart.evaluate(el=>el.getBoundingClientRect().width<=innerWidth);
  assert(iranChartFits,"Shared Iran chart fits the viewport without horizontal clipping");
  await page.screenshot({path:"artifacts/outbreak-scenarios/analysis-iran-"+width+".png",fullPage:true});

  const geometry=await root.evaluate(el=>{
   const wrap=el.getBoundingClientRect();
   const choices=[...el.querySelectorAll(".ob-card")].map(card=>card.getBoundingClientRect());
   const panel=el.querySelector(".ob-selected-event-panel")?.getBoundingClientRect();
   return {rootFits:wrap.left>=-1&&wrap.right<=innerWidth+1,
    cardsFit:choices.every(box=>box.left>=wrap.left-1&&box.right<=wrap.right+1),
    detailFits:!!panel&&panel.left>=wrap.left-1&&panel.right<=wrap.right+1,
    responsiveSelectors:innerWidth>700||choices.every((box,i)=>i===0||Math.abs(box.top-choices[0].top)<2)};
  });
  assert.deepEqual(geometry,{rootFits:true,cardsFit:true,detailFits:true,responsiveSelectors:true},"Responsive event panels fit viewport");
  await page.screenshot({path:"artifacts/outbreak-scenarios/scenarios-"+width+".png",fullPage:true});
  console.log("PASS: scenario page responsive width="+width);
  await page.close();
 }
 assert.equal(errors.length,0,errors.join("\n"));
}finally{await browser.close();}
