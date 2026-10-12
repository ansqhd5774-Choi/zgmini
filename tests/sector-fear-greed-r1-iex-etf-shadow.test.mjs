import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {collectSectorFearGreedR1IexEtfShadow,summarizeIexSectorPriceBundle,SECTOR_FEAR_GREED_R1_IEX_PRICE_METHOD} from "../scripts/pc-writer/collect-sector-fear-greed-r1-iex-etf-shadow.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const targets=["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)];
function bars(n=539){const out=[];for(let i=0;i<n;i++){const date=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);out.push({date,close:100+i/10,volume:1000+i});}return out;}

test("IEX ETF shadow backfill stores all 12 targets locally without public mutation",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"sector-iex-etf-"));let calls=0;
  try{
    const result=await collectSectorFearGreedR1IexEtfShadow(base,{now:new Date("2026-10-12T00:00:00Z"),fetchHistory:async({ticker})=>{calls++;assert.ok(targets.includes(ticker));return {ticker,bars:bars()};}});
    assert.equal(calls,12);
    assert.equal(result.status,"READY_IEX_WINDOW");
    assert.equal(result.minRows,539);
    assert.equal(result.maxRows,539);
    assert.equal(result.publicMutation,false);
    assert.equal(result.dbSchemaChanged,false);
    const payload=JSON.parse(fs.readFileSync(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json"),"utf8"));
    assert.equal(payload.methodologyVersion,SECTOR_FEAR_GREED_R1_IEX_PRICE_METHOD);
    assert.equal(Object.keys(payload.series).length,12);
    assert.equal(payload.series.SPY.length,539);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test("IEX ETF bundle summary exposes the limiting row count",()=>{
  const series=Object.fromEntries(targets.map(ticker=>[ticker,bars(ticker==="SPY"?539:520)]));
  const summary=summarizeIexSectorPriceBundle(series);
  assert.equal(summary.targets,12);
  assert.equal(summary.minRows,520);
  assert.equal(summary.maxRows,539);
});
