import test from "node:test";
import assert from "node:assert/strict";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_PIT_SOURCE} from "../scripts/pc-writer/collect-sector-fear-greed-r1-pit-shadow.mjs";
import {putStoredRow} from "../scripts/pc-writer/sector-fear-greed-r1-pit-readiness.mjs";

function csv(rows){return ["symbol,cik,name,sector,date_added,date_removed,created_at",...rows].join("\n")+"\n";}

test("PIT GICS parser maps historical sectors and starred dates without current-universe substitution",()=>{
  const filler=[];
  const sectors=["energy","materials","industrials","consumer_discretionary","consumer_staples","health_care","financials","information_technology","communication_services","utilities","real_estate"];
  for(let i=0;i<501;i++)filler.push(`T${i},0000000000,Name ${i},${sectors[i%sectors.length]},2020-01-01,,2020-01-01`);
  filler.push("AAA,0000000001,Alpha,information_technology,2020-01-01*,2025-01-01*,2020-01-01");
  filler.push("AAA,0000000001,Alpha,communication_services,2025-01-01,,2025-01-01");
  const parsed=parsePitSectorHistoryCsv(csv(filler));
  assert.equal(parsed.sourceLicense,"MIT");
  assert.equal(parsed.byTicker.AAA[0].sectorId,"technology");
  assert.equal(parsed.byTicker.AAA[0].dateRemoved,"2025-01-01");
  assert.equal(parsed.byTicker.AAA[1].sectorId,"communication");
});

test("PIT sector inputs assign each stored date to that date's sector and keep research-only isolation",()=>{
  const filler=[];
  const sectors=["energy","materials","industrials","consumer_discretionary","consumer_staples","health_care","financials","information_technology","communication_services","utilities","real_estate"];
  for(let i=0;i<500;i++)filler.push(`T${i},0000000000,Name ${i},${sectors[i%sectors.length]},2020-01-01,,2020-01-01`);
  filler.push("AAA,0000000001,Alpha,information_technology,2020-01-01,2025-01-03,2020-01-01");
  filler.push("AAA,0000000001,Alpha,communication_services,2025-01-03,,2025-01-03");
  const pit=parsePitSectorHistoryCsv(csv(filler));
  const rows=[];for(let i=0;i<260;i++){const date=new Date(Date.UTC(2024,4,1+i)).toISOString().slice(0,10);rows.push({tradeDate:date,ticker:"AAA",currentClose:100+i,currentVolume:1000+i});}
  const out=buildPointInTimeSectorInputs({rows,pitHistory:pit});
  assert.equal(out.pointInTimeSectorHistoryVerified,true);
  assert.equal(out.sourceLicense,"MIT");
  assert.ok(out.snapshotCount>0);
  assert.ok(out.sectors.technology.length>0);
  assert.ok(out.sectors.communication.length>0);
  assert.equal(out.noPublish,true);
});

test("PIT readiness stored-row merge matches existing R7 precedence and records conflicts",()=>{
  const map=new Map(),diagnostics={conflicts:0,overrides:{}};
  putStoredRow(map,{tradeDate:"2026-01-02",ticker:"AAA",currentClose:100,currentVolume:10},"BREADTH_R7_LOCAL",diagnostics);
  putStoredRow(map,{tradeDate:"2026-01-02",ticker:"AAA",currentClose:101,currentVolume:11},"BREADTH_R6_LOCAL",diagnostics);
  putStoredRow(map,{trade_date:"2026-01-02",ticker:"AAA",current_close:102,current_volume:12},"B1_R3_STORED",diagnostics);
  assert.equal(map.size,1);
  assert.deepEqual(map.get("2026-01-02|AAA"),{tradeDate:"2026-01-02",ticker:"AAA",currentClose:102,currentVolume:12,source:"B1_R3_STORED"});
  assert.equal(diagnostics.conflicts,2);
  assert.equal(diagnostics.overrides["BREADTH_R7_LOCAL->BREADTH_R6_LOCAL"],1);
  assert.equal(diagnostics.overrides["BREADTH_R6_LOCAL->B1_R3_STORED"],1);
});

test("PIT collector source is fixed to the reviewed free GitHub dataset",()=>{
  assert.equal(SECTOR_FEAR_GREED_R1_PIT_SOURCE,"https://raw.githubusercontent.com/lawcal/sp500-components-history/main/data/components_history.csv");
});
