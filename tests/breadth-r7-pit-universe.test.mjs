import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {archiveUrl} from "../scripts/pc-writer/build-breadth-r7-pit-universe.mjs";
import {
  normalizeSpGlobalDate,
  normalizePitTicker,
  extractSpGlobalArchiveEntries,
  isSp500MembershipHeadline,
  parseSp500ChangeRows,
  reconcileCurrentMembersWithOfficialEvents,
  reconstructPitUniverses,
} from "../lib/market-score/sp500-pit-universe-r1.mjs";

test("S&P official date and ticker normalization covers press-release variants",()=>{
  assert.equal(normalizeSpGlobalDate("23-Sep-24"),"2024-09-23");
  assert.equal(normalizeSpGlobalDate("Sept 30, 2024"),"2024-09-30");
  assert.equal(normalizeSpGlobalDate("December 23, 2024"),"2024-12-23");
  assert.equal(normalizePitTicker("SATS"),"ECHO");
  assert.equal(normalizePitTicker("MMC"),"MRSH");
  assert.equal(normalizePitTicker("FI"),"FISV");
});

test("S&P press archive parser finds only dated official release links and membership headlines",()=>{
  const html='<a href="/2026-09-04-Bloom-Energy-Set-to-Join-S-P-500">Bloom Energy Set to Join S&P 500</a><a href="/2026-09-03-S-P-500-Buybacks">S&P 500 Buybacks Report</a><a href="https://example.com/2026-09-01-X">Other</a>';
  const entries=extractSpGlobalArchiveEntries(html);
  assert.equal(entries.length,2);
  assert.equal(entries[0].releaseDate,"2026-09-04");
  assert.equal(isSp500MembershipHeadline(entries[0].title),true);
  assert.equal(isSp500MembershipHeadline(entries[1].title),false);
});

test("S&P release table parser handles rowspans and extracts only S&P 500 membership rows",()=>{
  const html='<table><tr><th>Effective Date</th><th>Index Name</th><th>Action</th><th>Company Name</th><th>Ticker</th><th>Sector</th></tr>'+
    '<tr><td rowspan="2">Sept 21, 2026</td><td>S&amp;P 500</td><td>Addition</td><td>Bloom Energy</td><td>BE</td><td>Industrials</td></tr>'+
    '<tr><td>S&amp;P 500</td><td>Deletion</td><td>Old Co</td><td>OLD</td><td>Industrials</td></tr>'+
    '<tr><td>Sept 21, 2026</td><td>S&amp;P MidCap 400</td><td>Addition</td><td>X</td><td>X</td><td>Industrials</td></tr></table>';
  assert.deepEqual(parseSp500ChangeRows(html,{sourceUrl:"https://press.spglobal.com/x",releaseDate:"2026-09-04"}),[
    {effectiveDate:"2026-09-21",action:"Addition",ticker:"BE",sourceUrl:"https://press.spglobal.com/x",releaseDate:"2026-09-04"},
    {effectiveDate:"2026-09-21",action:"Deletion",ticker:"OLD",sourceUrl:"https://press.spglobal.com/x",releaseDate:"2026-09-04"},
  ]);
});

test("PIT reconstruction reverses additions and deletions so past dates do not inherit current members",()=>{
  const out=reconstructPitUniverses({
    currentMembers:["AAA","NEW"],
    currentDate:"2026-10-08",
    targetDates:["2026-09-19","2026-09-21","2026-10-08"],
    events:[
      {effectiveDate:"2026-09-21",action:"Addition",ticker:"NEW"},
      {effectiveDate:"2026-09-21",action:"Deletion",ticker:"OLD"},
    ],
  });
  assert.equal(out.anomalies.length,0);
  const byDate=new Map(out.universes.map(row=>[row.tradeDate,row.members]));
  assert.deepEqual(byDate.get("2026-09-19"),["AAA","OLD"]);
  assert.deepEqual(byDate.get("2026-09-21"),["AAA","NEW"]);
  assert.deepEqual(byDate.get("2026-10-08"),["AAA","NEW"]);
});

test("Breadth R7 PIT builder is research-only and cannot mutate production",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/build-breadth-r7-pit-universe.mjs",import.meta.url),"utf8");
  assert.match(src,/S&P Dow Jones Indices \/ S&P Global Press Releases/);
  assert.match(src,/membershipLookAheadSafe:true/);
  assert.match(src,/currentUniverseSurvivorshipBiasRemoved:true/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/noPublish:true/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM|CREATE TABLE|ALTER TABLE/);
});


test("Breadth R7 uses unfiltered official archive pagination deep enough for the 520-session window",()=>{
  assert.equal(archiveUrl(0),"https://press.spglobal.com/index.php?l=100&o=0&s=2429");
  assert.equal(archiveUrl(500),"https://press.spglobal.com/index.php?l=100&o=500&s=2429");
});

test("S&P prose parser handles official off-cycle replace wording",()=>{
  const html='<p>Reddit Inc. (NYSE: RDDT) will replace Juniper Networks Inc. (NYSE: JNPR) in the S&P 500 effective prior to the opening of trading on Monday, August 24.</p>';
  assert.deepEqual(parseSp500ChangeRows(html,{sourceUrl:"https://press.spglobal.com/x",releaseDate:"2026-08-13"}),[
    {effectiveDate:"2026-08-24",action:"Addition",ticker:"RDDT",sourceUrl:"https://press.spglobal.com/x",releaseDate:"2026-08-13"},
    {effectiveDate:"2026-08-24",action:"Deletion",ticker:"JNPR",sourceUrl:"https://press.spglobal.com/x",releaseDate:"2026-08-13"},
  ]);
});


test("Breadth R7 persists exact event-consistency evidence before failing closed",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/build-breadth-r7-pit-universe.mjs",import.meta.url),"utf8");
  assert.match(src,/report\.anomalyCount=reconstructed\.anomalies\.length/);
  assert.match(src,/report\.anomalies=reconstructed\.anomalies\.slice\(0,25\)/);
  assert.match(src,/report\.anomalyEvents=report\.anomalies\.map/);
  assert.match(src,/matchingEvents:relevantEvents\.filter/);
  assert.match(src,/currentMember:currentMembers\.includes/);
  assert.match(src,/SP500_PIT_EVENT_CONSISTENCY_FAILED/);
});


test("S&P table rows take precedence so mixed-index prose cannot leak SmallCap tickers into S&P 500",()=>{
  const html='<p>Interactive Brokers Group Inc. (NASD: IBKR) will replace Walgreens Boots Alliance Inc. (NASD: WBA) in the S&P 500 effective prior to the opening of trading on Thursday, August 28.</p>'+
    '<p>Kinetik Holdings Inc. (NYSE: KNTK) will replace Pacific Premier Bancorp Inc. (NASD: PPBI) in the S&P SmallCap 600 effective prior to the opening of trading on Tuesday, September 2.</p>'+
    '<table><tr><th>Effective Date</th><th>Index Name</th><th>Action</th><th>Company Name</th><th>Ticker</th><th>GICS Sector</th></tr>'+
    '<tr><td>Aug 28, 2025</td><td>S&P 500</td><td>Addition</td><td>Interactive Brokers Group</td><td>IBKR</td><td>Financials</td></tr>'+
    '<tr><td>Aug 28, 2025</td><td>S&P 500</td><td>Deletion</td><td>Walgreens Boots Alliance</td><td>WBA</td><td>Consumer Staples</td></tr>'+
    '<tr><td>Sept 2, 2025</td><td>S&P SmallCap 600</td><td>Addition</td><td>Kinetik Holdings</td><td>KNTK</td><td>Energy</td></tr>'+
    '<tr><td>Sept 2, 2025</td><td>S&P SmallCap 600</td><td>Deletion</td><td>Pacific Premier Bancorp</td><td>PPBI</td><td>Financials</td></tr></table>';
  const out=parseSp500ChangeRows(html,{sourceUrl:"https://press.spglobal.com/mixed",releaseDate:"2025-08-25"});
  assert.deepEqual(out.map(x=>[x.effectiveDate,x.action,x.ticker]),[
    ["2025-08-28","Addition","IBKR"],
    ["2025-08-28","Deletion","WBA"],
  ]);
  assert.equal(out.some(x=>x.ticker==="KNTK"||x.ticker==="PPBI"),false);
});

test("S&P table effective dates override prose dates on spin-off pages",()=>{
  const html='<p>Solstice Advance Materials Inc. (NASD: SOLS) will replace CarMax Inc. (NYSE: KMX) in the S&P 500 effective prior to the opening of trading on Friday, October 31.</p>'+
    '<table><tr><th>Effective Date</th><th>Index Name</th><th>Action</th><th>Company Name</th><th>Ticker</th><th>GICS Sector</th></tr>'+
    '<tr><td>Oct 30, 2025</td><td>S&P 500</td><td>Addition</td><td>Solstice Advance Materials</td><td>SOLS</td><td>Materials</td></tr>'+
    '<tr><td>Oct 31, 2025</td><td>S&P 500</td><td>Deletion</td><td>CarMax</td><td>KMX</td><td>Consumer Discretionary</td></tr></table>';
  const out=parseSp500ChangeRows(html,{sourceUrl:"https://press.spglobal.com/spinoff",releaseDate:"2025-10-27"});
  assert.deepEqual(out.map(x=>[x.effectiveDate,x.action,x.ticker]),[
    ["2025-10-30","Addition","SOLS"],
    ["2025-10-31","Deletion","KMX"],
  ]);
});


test("official latest event repairs a lagging current universe before reverse PIT reconstruction",()=>{
  const events=[
    {effectiveDate:"2026-10-01",action:"Addition",ticker:"VYLR",releaseDate:"2026-10-01",sourceUrl:"https://press.spglobal.com/vylor"},
    {effectiveDate:"2026-10-06",action:"Deletion",ticker:"CTVA",releaseDate:"2026-10-01",sourceUrl:"https://press.spglobal.com/vylor"},
    {effectiveDate:"2026-10-06",action:"Addition",ticker:"TWLO",releaseDate:"2026-10-01",sourceUrl:"https://press.spglobal.com/vylor"},
  ];
  const anchor=reconcileCurrentMembersWithOfficialEvents({
    currentMembers:["AAA","CTVA"],
    currentDate:"2026-10-05",
    events,
  });
  assert.deepEqual(anchor.members,["AAA","CTVA","VYLR"]);
  assert.deepEqual(anchor.repairs.map(x=>[x.ticker,x.action,x.effectiveDate]),[["VYLR","ADD","2026-10-01"]]);
  const out=reconstructPitUniverses({
    currentMembers:anchor.members,
    currentDate:"2026-10-05",
    targetDates:["2026-09-30","2026-10-01","2026-10-05"],
    events,
  });
  assert.equal(out.anomalies.length,0);
  const byDate=new Map(out.universes.map(row=>[row.tradeDate,row.members]));
  assert.deepEqual(byDate.get("2026-09-30"),["AAA","CTVA"]);
  assert.deepEqual(byDate.get("2026-10-01"),["AAA","CTVA","VYLR"]);
  assert.deepEqual(byDate.get("2026-10-05"),["AAA","CTVA","VYLR"]);
});

test("official latest deletion removes a stale ticker from the current anchor",()=>{
  const anchor=reconcileCurrentMembersWithOfficialEvents({
    currentMembers:["AAA","OLD"],
    currentDate:"2026-10-08",
    events:[{effectiveDate:"2026-10-06",action:"Deletion",ticker:"OLD"}],
  });
  assert.deepEqual(anchor.members,["AAA"]);
  assert.deepEqual(anchor.repairs.map(x=>[x.ticker,x.action]),[["OLD","REMOVE"]]);
});
