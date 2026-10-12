import test from "node:test";
import assert from "node:assert/strict";
import {CFTC_SECTOR_CODES,normalizeCftcPositionRows,summarizeCftcPositionCoverage} from "../scripts/pc-writer/sector-fear-greed-r1-cftc-positioning-diagnostic.mjs";

function row(code,date,{oi=1000,levLong=300,levShort=200,assetLong=400,assetShort=100}={}){
  return {report_date_as_yyyy_mm_dd:`${date}T00:00:00.000`,cftc_contract_market_code:code,contract_market_name:"TEST",open_interest_all:String(oi),lev_money_positions_long:String(levLong),lev_money_positions_short:String(levShort),asset_mgr_positions_long:String(assetLong),asset_mgr_positions_short:String(assetShort)};
}

test("CFTC positioning parser preserves valid zero and exact sector codes",()=>{
  const code=CFTC_SECTOR_CODES.technology;
  const rows=normalizeCftcPositionRows([row(code,"2026-10-06",{levShort:0})]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].code,code);
  assert.equal(rows[0].levShort,0);
});

test("CFTC positioning parser fails closed on conflicting same-date duplicate",()=>{
  const code=CFTC_SECTOR_CODES.energy;
  assert.throws(()=>normalizeCftcPositionRows([row(code,"2026-10-06"),row(code,"2026-10-06",{levLong:301})]),/CFTC_POSITIONING_DUPLICATE_CONFLICT/);
});

test("156 weekly observations in trailing three years satisfy candidate coverage without changing formula",()=>{
  const rows=[];
  for(const code of Object.values(CFTC_SECTOR_CODES)){
    for(let i=0;i<156;i++){
      const d=new Date(Date.UTC(2023,9,17+i*7)).toISOString().slice(0,10);
      rows.push(...normalizeCftcPositionRows([row(code,d)]));
    }
  }
  const summary=summarizeCftcPositionCoverage(rows,{asOfDate:"2026-10-12"});
  assert.equal(summary.status,"CANDIDATE_HISTORY_READY");
  assert.equal(summary.requiredWeeklyReferenceObservations,156);
  assert.equal(summary.sectors.length,11);
  assert.ok(summary.sectors.every(x=>x.has156Weeks));
});

test("insufficient weekly history remains partial and is never fabricated",()=>{
  const rows=[];
  const code=CFTC_SECTOR_CODES.communication;
  for(let i=0;i<100;i++){
    const d=new Date(Date.UTC(2024,0,2+i*7)).toISOString().slice(0,10);
    rows.push(...normalizeCftcPositionRows([row(code,d)]));
  }
  const summary=summarizeCftcPositionCoverage(rows,{asOfDate:"2026-10-12"});
  assert.equal(summary.status,"CANDIDATE_HISTORY_PARTIAL");
  assert.equal(summary.sectors.find(x=>x.sector==="communication").has156Weeks,false);
});
