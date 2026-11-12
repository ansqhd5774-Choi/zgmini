import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {collectSectorFearGreedR1IexEtfShadow,summarizeIexSectorPriceBundle,mergeIexSectorPriceRows,SECTOR_FEAR_GREED_R1_IEX_PRICE_METHOD} from "../scripts/pc-writer/collect-sector-fear-greed-r1-iex-etf-shadow.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const targets=["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)];
function bars(n=539,start=0){const out=[];for(let i=0;i<n;i++){const k=start+i,date=new Date(Date.UTC(2024,0,1+k)).toISOString().slice(0,10);out.push({date,close:100+k/10,volume:1000+k});}return out;}

test("IEX ETF shadow backfill stores all 12 targets locally without public mutation",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"sector-iex-etf-"));let calls=0;
  try{
    const result=await collectSectorFearGreedR1IexEtfShadow(base,{now:new Date("2026-10-12T00:00:00Z"),fetchHistory:async({ticker})=>{calls++;assert.ok(targets.includes(ticker));return {ticker,bars:bars()};}});
    assert.equal(calls,12);
    assert.equal(result.status,"READY_IEX_WINDOW");
    assert.equal(result.minRows,539);
    assert.equal(result.maxRows,539);
    assert.equal(result.accumulating,true);
    assert.equal(result.mergeDiagnostics.priorRows,0);
    assert.equal(result.mergeDiagnostics.addedRows,539*12);
    assert.equal(result.publicMutation,false);
    assert.equal(result.dbSchemaChanged,false);
    const payload=JSON.parse(fs.readFileSync(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json"),"utf8"));
    assert.equal(payload.methodologyVersion,SECTOR_FEAR_GREED_R1_IEX_PRICE_METHOD);
    assert.equal(payload.accumulating,true);
    assert.equal(Object.keys(payload.series).length,12);
    assert.equal(payload.series.SPY.length,539);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test("IEX ETF shadow backfill retains dates that roll out of the provider window",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"sector-iex-etf-accumulate-"));let generation=0;
  try{
    const fetchHistory=async({ticker})=>({ticker,bars:generation===0?bars(539,0):bars(539,1)});
    const first=await collectSectorFearGreedR1IexEtfShadow(base,{now:new Date("2026-10-12T00:00:00Z"),fetchHistory});
    assert.equal(first.minRows,539);generation=1;
    const second=await collectSectorFearGreedR1IexEtfShadow(base,{now:new Date("2026-10-13T00:00:00Z"),fetchHistory});
    assert.equal(second.minRows,540);
    assert.equal(second.maxRows,540);
    assert.equal(second.mergeDiagnostics.priorRows,539*12);
    assert.equal(second.mergeDiagnostics.addedRows,12);
    const payload=JSON.parse(fs.readFileSync(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json"),"utf8"));
    assert.equal(payload.series.SPY.length,540);
    assert.equal(payload.series.SPY[0].date,bars(1,0)[0].date);
    assert.equal(payload.series.SPY.at(-1).date,bars(1,539)[0].date);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test("IEX ETF cumulative merge fails closed on conflicting same-date values",()=>{
  const prior=bars(3,0),fresh=bars(3,1);fresh[0]={...fresh[0],close:fresh[0].close+1};
  assert.throws(()=>mergeIexSectorPriceRows(prior,fresh),/SECTOR_IEX_ETF_HISTORY_CONFLICT/);
});

test("IEX ETF bundle summary exposes the limiting row count",()=>{
  const series=Object.fromEntries(targets.map(ticker=>[ticker,bars(ticker==="SPY"?539:520)]));
  const summary=summarizeIexSectorPriceBundle(series);
  assert.equal(summary.targets,12);
  assert.equal(summary.minRows,520);
  assert.equal(summary.maxRows,539);
});
