import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildCurrentBreadthR7Signal,evaluateBreadthProspectiveLedger} from "../scripts/pc-writer/breadth-r7-prospective-r1.mjs";

function sessions(n,ticker,start=100){
  return Array.from({length:n},(_,i)=>({
    trade_date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
    ticker,current_close:start+i,current_volume:10,previous_close:i?start+i-1:start,
  }));
}
test("Breadth R7 prospective score uses the PIT member set and unchanged R6 formula",()=>{
  const members=Array.from({length:490},(_,i)=>"T"+String(i).padStart(3,"0"));
  const rows=members.flatMap((ticker,i)=>sessions(252,ticker,100+i));
  const date=rows.filter(row=>row.ticker===members[0]).at(-1).trade_date;
  const pit={
    status:"READY",currentDate:date,membershipLookAheadSafe:true,currentUniverseSurvivorshipBiasRemoved:true,
    methodologyVersion:"SP500_OFFICIAL_CHANGE_HISTORY_PIT_R1",eventDigest:"abc",
    universes:[{tradeDate:date,members}],
  };
  const out=buildCurrentBreadthR7Signal({pit,rows});
  assert.equal(out.status,"READY");
  assert.equal(out.memberCount,490);
  assert.equal(out.methodologyVersion,"BREADTH_R6_COMPONENTS_SHADOW_R1");
  assert.ok(out.score>=0&&out.score<=100);
});

test("Breadth prospective evaluation matures 1M/3M only after future benchmark observations exist",()=>{
  const benchmark=Array.from({length:140},(_,i)=>({observationDate:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),value:100+i}));
  const signal={signalDate:"2026-01-10",score:55,components:{shortTerm:50,twentyDay:50,ma50:50,ma200:50,highLow52w:50},benchmarkDate:"2026-01-10",benchmarkPrice:109};
  const short=evaluateBreadthProspectiveLedger([signal],benchmark.slice(0,20));
  assert.equal(short.maturity.eligible1m,0);assert.equal(short.maturity.eligible3m,0);
  const mature=evaluateBreadthProspectiveLedger([signal],benchmark);
  assert.equal(mature.maturity.eligible1m,1);assert.equal(mature.maturity.eligible3m,1);
});

test("Breadth prospective path forbids historical backfill, formula changes and publication",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/breadth-r7-prospective-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/PROSPECTIVE_BREADTH_R7_PIT_SCORE_ONLY/);
  assert.match(src,/historicalBackfillAllowed:false/);
  assert.match(src,/scoreFormulaChanged:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/already-known current PIT score; that score is not counted as a forward signal/);
  assert.doesNotMatch(src,/publishMarket|--publish|INSERT INTO|UPDATE |DELETE FROM|CREATE TABLE|ALTER TABLE/);
});
