import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  normalizeSpGlobalDate,
  normalizePitTicker,
  extractSpGlobalArchiveEntries,
  isSp500MembershipHeadline,
  parseSp500ChangeRows,
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
