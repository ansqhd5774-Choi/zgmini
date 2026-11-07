import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium} from "playwright";
import {EMPLOYMENT_R6_FEATURES,EMPLOYMENT_R6_FORMULA_HASH} from "../lib/market-score/employment-r6-formula.mjs";
import {employmentR6OneYearStart,employmentR6RecentQuarterStart} from "../lib/market-score/employment-r6-window.mjs";

const base=process.env.CHAT_PREVIEW_URL??"http://127.0.0.1:5173";
const asOfDate="2026-11-01",asOf=Date.parse(asOfDate+"T00:00:00Z");
const indicators=EMPLOYMENT_R6_FEATURES.map(({id},i)=>({
  id,rawStatus:i===0?"READY":i===1?"STALE":"UNAVAILABLE",
  scoreStatus:i===0?"READY":"PARTIAL_HISTORY",score:i===0?61.25:null,
  chartStatus:i===0?"READY":i===1?"PARTIAL":"UNAVAILABLE",
  value:i===0?4.2:i===1?7.1:null,previousValue:i===0?4.5:i===1?7:null,
  observationDate:i===0?"2026-10-01":i===1?"2026-02-01":null,
  previousObservationDate:i===0?"2026-09-01":i===1?"2025-11-01":null,
  unit:"%",retrievedAt:i<2?"2026-10-29T12:00:00.000Z":null,
  releaseCadence:"월간(ET)",nextReleaseDate:null,
  history:i===0?[{date:"2025-12-01",value:4.5},{date:"2026-10-01",value:4.2}]
    :i===1?[{date:"2025-11-01",value:7},{date:"2026-02-01",value:7.1}]:[],
}));
const published={kind:"EMPLOYMENT_R6_ONE_YEAR_STORED_DISPLAY_R1",status:"PARTIAL",
  formulaHash:EMPLOYMENT_R6_FORMULA_HASH,asOfDate,sourceStoredAt:Date.parse("2026-10-30T00:00:00Z"),
  window:{start:employmentR6OneYearStart(asOf),end:asOfDate,recentQuarterStart:employmentR6RecentQuarterStart(asOf)},
  summary:{sourceFeatures:2,recentlyObservedFeatures:1,chartReadyFeatures:1,chartPartialFeatures:1,scoredFeatures:1,recentlyScoredFeatures:1},
  indicators};

mkdirSync("artifacts/employment-r6-browser",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>sessionStorage.setItem("zgmini-about-intro-dismissed-r1","1"));
    await page.route("**/api/market-score",route=>route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({status:"READY",asOfDate,domains:[{id:"employment",status:"UNAVAILABLE",score:null,indicators:[],trend:[]}]})}));
    await page.route("**/api/employment-r6/observations",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(published)}));
    await page.goto(base+"/economic-indicators/employment/",{waitUntil:"domcontentloaded",timeout:60000});
    const section=page.locator('section.economic-indicators[aria-labelledby="economic-employment-indicators"]');
    await section.waitFor({state:"attached",timeout:30000});
    await page.waitForFunction(()=>document.querySelector('section.economic-indicators[aria-labelledby="economic-employment-indicators"]')?.textContent?.includes("1년 차트 1/29개"),null,{timeout:30000});
    const rows=section.locator("tbody tr");
    assert.equal(await rows.count(),29,"PC table must show all approved R6 indicators");
    assert.equal(await section.locator(".inflation-r2-mobile-list article").count(),29,"Mobile cards must match PC list");
    const ready=rows.nth(0),stale=rows.nth(1),missing=rows.nth(2);
    assert.equal(await ready.locator('[data-value-kind="raw"]').count(),1);
    assert.match(await ready.innerText(),/4\.2%/);
    assert.match(await ready.innerText(),/평가 61\.3점/);
    assert.match(await stale.innerText(),/7\.1%/);
    assert.match(await stale.innerText(),/과거 관측/);
    assert.doesNotMatch(await stale.innerText(),/평가 61\.3점/);
    assert.equal(await missing.getAttribute("data-judgement"),"missing");
    assert.match(await section.innerText(),/최근 분기 자료 없음/);
    assert.match(await section.innerText(),/1년 이력 부족/);
    const mobile=section.locator(".inflation-r2-mobile-list article");
    assert.match(await mobile.nth(0).innerText(),/4\.2%/);
    assert.match(await mobile.nth(1).innerText(),/7\.1%/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"No horizontal overflow");
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({path:`artifacts/employment-r6-browser/preview-${width}.png`,fullPage:false});
    assert.deepEqual(errors,[],"No browser runtime errors");
    await page.close();
    console.log(`PASS employment R6 stored 29/29 raw, stale, score and chart distinctions at ${width}px`);
  }
}finally{await browser.close();}
