import test from "node:test";
import assert from "node:assert/strict";
import {buildEarningsE1R1,E1_R1_LIMITS} from "../lib/market-score/earnings-e1-r1.mjs";

const observationDate="2026-09-18";
const now="2026-09-18T20:00:00.000Z";
const retrievedAt="2026-09-18T19:00:00.000Z";

function member(ticker,weight=1,isLinked=true){return {ticker,weight,isLinked};}
function snapshot(n=10){
  return {
    asOfDate:observationDate,isDaily:true,constituentCount:n,unlinkedCount:0,source:"fixture",
    members:Array.from({length:n},(_,i)=>member(`T${i}`,1,true)),
  };
}
function rows(n=10){
  return Array.from({length:n},(_,i)=>({
    ticker:`T${i}`,marketcap:100+i,epsgrowth:-9+i*2,opmargin:10+i,revgrowth:-4+i,
  }));
}

test("E1-R1 limits are frozen",()=>{
  assert.equal(E1_R1_LIMITS.countCoverage,0.80);
  assert.equal(E1_R1_LIMITS.marketCapCoverage,0.95);
  assert.equal(E1_R1_LIMITS.linkedWeightCoverage,0.99);
  assert.equal(E1_R1_LIMITS.maxStaleTradingSessions,2);
  assert.equal(E1_R1_LIMITS.maxCacheAgeDays,7);
});

test("E1-R1 exact 35/25/20/20 domain formula is READY when all gates pass",()=>{
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:rows(),retrievedAt,now});
  assert.equal(out.status,"READY");
  const c=out.components;
  const expected=.35*c.epsGrowth.score+.25*c.margin.score+.20*c.revenueGrowth.score+.20*c.earningsGrowthBreadth.score;
  assert.ok(Math.abs(out.score-expected)<1e-12);
});

test("E1-R1 EPS absolute transform maps -25/0/+25 to 0/50/100",()=>{
  for(const [raw,expected] of [[-25,0],[0,50],[25,100]]){
    const r=rows().map(x=>({...x,epsgrowth:raw}));
    const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
    assert.equal(out.status,"READY");
    assert.equal(out.components.epsGrowth.score,expected);
  }
});

test("E1-R1 margin absolute transform maps 0/10/20 to 0/50/100",()=>{
  for(const [raw,expected] of [[0,0],[10,50],[20,100]]){
    const r=rows().map(x=>({...x,opmargin:raw}));
    const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
    assert.equal(out.status,"READY");
    assert.equal(out.components.margin.score,expected);
  }
});

test("E1-R1 revenue absolute transform maps -10/0/+10 to 0/50/100",()=>{
  for(const [raw,expected] of [[-10,0],[0,50],[10,100]]){
    const r=rows().map(x=>({...x,revgrowth:raw}));
    const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
    assert.equal(out.status,"READY");
    assert.equal(out.components.revenueGrowth.score,expected);
  }
});

test("E1-R1 earnings growth breadth is positive EPS-growth share with zero excluded",()=>{
  const r=rows().map((x,i)=>({...x,epsgrowth:i<4?1:i===4?0:-1}));
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
  assert.equal(out.status,"READY");
  assert.equal(out.components.earningsGrowthBreadth.raw,40);
  assert.equal(out.components.earningsGrowthBreadth.score,40);
});

test("E1-R1 uses constituent median rather than market-cap weighted mean",()=>{
  const r=rows().map((x,i)=>({...x,marketcap:i===9?1000000:100,epsgrowth:i===9?1000:0}));
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
  assert.equal(out.status,"READY");
  assert.equal(out.components.epsGrowth.raw,0);
  assert.equal(out.components.epsGrowth.score,50);
});

test("E1-R1 count coverage below 80% is PARTIAL/null",()=>{
  const r=rows().map((x,i)=>({...x,opmargin:i<7?x.opmargin:null}));
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.match(out.missing[0],/MARGIN_COUNT_COVERAGE/);
});

test("E1-R1 market-cap coverage below 95% is PARTIAL/null",()=>{
  const r=rows().map((x,i)=>({...x,marketcap:i===9?1000:1,epsgrowth:i===9?null:10}));
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.match(out.missing[0],/EPSGROWTH_MARKET_CAP_COVERAGE/);
});

test("E1-R1 duplicate screener ticker fails closed",()=>{
  const r=[...rows(),{...rows()[0]}];
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:r,retrievedAt,now});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"DUPLICATE_SCREENER_TICKER");
});

test("E1-R1 stale universe over 2 completed sessions is PARTIAL/null",()=>{
  const out=buildEarningsE1R1({observationDate,snapshot:snapshot(),screenerRows:rows(),retrievedAt,now,lagTradingSessions:3});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"STALE");
});

test("E1-R1 cached fundamentals older than 7 days is PARTIAL/null",()=>{
  const out=buildEarningsE1R1({
    observationDate,snapshot:snapshot(),screenerRows:rows(),
    retrievedAt:"2026-09-10T00:00:00.000Z",now:"2026-09-18T00:00:01.000Z"
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"STALE_CACHE");
});

test("E1-R1 does not backfill historical dates from current universe",()=>{
  const s=snapshot();s.asOfDate="2026-09-18";
  const out=buildEarningsE1R1({
    observationDate:"2025-09-18",snapshot:s,screenerRows:rows(),retrievedAt,now
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"UNIVERSE_SNAPSHOT_DATE_MISMATCH");
});
