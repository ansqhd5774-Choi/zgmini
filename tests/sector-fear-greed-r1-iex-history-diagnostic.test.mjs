import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {runSectorFearGreedR1IexHistoryDiagnostic} from "../scripts/pc-writer/sector-fear-greed-r1-iex-history-diagnostic.mjs";

function responseFor(ticker,rows=1010){
  const bars=[];for(let i=0;i<rows;i++)bars.push({time:Date.UTC(2020,0,1+i),close:100+i/10,volume:1000+i});
  return new Response(JSON.stringify({timeframe:"1d",source:"iex",feed:"TOPS1.6",attribution:"Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.",bars}),{status:200,headers:{"content-type":"application/json"}});
}

test("IEX sector diagnostic checks 12 ETFs plus 11 stock samples without storing raw history",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-sector-iex-"));let calls=0;
  const fetchImpl=async url=>{calls++;const ticker=decodeURIComponent(String(url).split("/").at(-1).replace(/\.json$/,""));return responseFor(ticker);};
  const result=await runSectorFearGreedR1IexHistoryDiagnostic(dir,{fetchImpl,delayMs:0});
  assert.equal(result.status,"ETF_LONG_HISTORY_READY");
  assert.equal(result.providerCalls,23);
  assert.equal(calls,23);
  assert.equal(result.summary.etfTargets,12);
  assert.equal(result.summary.etfMeets1007,12);
  assert.equal(result.summary.stockSamples,11);
  assert.equal(result.summary.stockMeets1007,11);
  assert.equal(result.rawHistoryStored,false);
  assert.equal(result.publicMutation,false);
  assert.equal(result.dbSchemaChanged,false);
  const text=fs.readFileSync(result.txtFile,"utf8");
  assert.match(text,/ETF \| SPY \| READY \| 1010/);
  assert.match(text,/rawHistoryStored=false/);
});

test("IEX sector diagnostic reports unsupported ETF explicitly instead of inventing history",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-sector-iex-fail-"));
  const fetchImpl=async url=>String(url).includes("/XLRE.json")?new Response("{}",{status:404}):responseFor("x");
  const result=await runSectorFearGreedR1IexHistoryDiagnostic(dir,{fetchImpl,delayMs:0});
  assert.equal(result.status,"PARTIAL");
  const xlre=result.targets.etfs.find(x=>x.ticker==="XLRE");
  assert.equal(xlre.status,"FAILED");
  assert.equal(xlre.rows,0);
  assert.equal(xlre.meets1007,false);
  assert.match(xlre.error,/BARS_SYMBOL_HTTP_404/);
});
