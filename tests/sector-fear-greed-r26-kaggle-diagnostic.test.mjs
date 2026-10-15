import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {parseR26CsvRow,candidateDotDashAlias,resolveR26PitTicker,inspectR26KaggleCsv,BENCHMARKS,r26ProviderCallsFromEnv} from "../scripts/pc-writer/sector-fear-greed-r26-kaggle-diagnostic.mjs";

test("R2.6 CSV parser preserves quoted commas and escaped quotes",()=>{
  assert.deepEqual(parseR26CsvRow('2026-01-02,"BRK,B","a""b"'),["2026-01-02","BRK,B",'a"b']);
});

test("R2.6 PIT ticker resolver keeps exact identity ahead of dot-dash diagnostic alias",()=>{
  const pit={"BRK.B":[{}],"ABC":[{}]};
  assert.deepEqual(resolveR26PitTicker("ABC",pit),{ticker:"ABC",mode:"EXACT"});
  assert.equal(candidateDotDashAlias("BRK-B"),"BRK.B");
  assert.deepEqual(resolveR26PitTicker("BRK-B",pit),{ticker:"BRK.B",mode:"DOT_DASH_ALIAS"});
});

test("R2.6 provider-call evidence accepts only zero or one bounded acquisition request",()=>{
  assert.equal(r26ProviderCallsFromEnv({}),0);
  assert.equal(r26ProviderCallsFromEnv({ZGMINI_R26_KAGGLE_PROVIDER_CALLS:"0"}),0);
  assert.equal(r26ProviderCallsFromEnv({ZGMINI_R26_KAGGLE_PROVIDER_CALLS:"1"}),1);
  assert.equal(r26ProviderCallsFromEnv({ZGMINI_R26_KAGGLE_PROVIDER_CALLS:"2"}),0);
  assert.equal(r26ProviderCallsFromEnv({ZGMINI_R26_KAGGLE_PROVIDER_CALLS:"bad"}),0);
});

test("R2.6 CMD acquisition is Windows-only, one-shot and shadow-isolated",()=>{
  const source=fs.readFileSync(new URL("../scripts/pc-writer/run-sector-fear-greed-r26-kaggle-shadow.cmd",import.meta.url),"utf8");
  assert.match(source,/curl\.exe -L --fail --silent --show-error --retry 0/);
  assert.match(source,/andrewmvd\/sp-500-stocks\/sp500_stocks\.csv/);
  assert.match(source,/ZGMINI_R26_KAGGLE_PROVIDER_CALLS=%PROVIDER_CALLS%/);
  assert.doesNotMatch(source,/powershell|pwsh|wsl\.exe/i);
  assert.doesNotMatch(source,/wrangler|d1 execute|cloudflare|publish|scheduler/i);
});

test("R2.6 inspection reports benchmark presence and PIT coverage without scoring",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r26-")),file=path.join(dir,"sp500_stocks.csv");
  fs.writeFileSync(file,[
    "Date,Symbol,Adj Close,Close,High,Low,Open,Volume",
    "2026-01-02,AAA,10,10,10,10,10,100",
    "2026-01-02,BBB,20,20,20,20,20,200",
    "2026-01-02,SPY,100,100,100,100,100,1000",
    "2026-01-05,AAA,11,11,11,11,11,110",
    "2026-01-05,SPY,101,101,101,101,101,1001",
    "2026-01-06,AAA,12,12,12,12,12,120",
    "2026-01-06,BBB,22,22,22,22,22,220",
    "2026-01-06,SPY,102,102,102,102,102,1002",
  ].join("\n")+"\n");
  const pitHistory={byTicker:{AAA:[{ticker:"AAA",sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}],BBB:[{ticker:"BBB",sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}]}};
  const summary=await inspectR26KaggleCsv(file,{pitHistory});
  assert.equal(summary.uniqueTickers,3);
  assert.equal(summary.uniqueDates,3);
  assert.equal(summary.benchmarkPresent,1);
  assert.equal(summary.benchmarkTotal,BENCHMARKS.length);
  assert.equal(summary.benchmarks.SPY.sessions,3);
  assert.equal(summary.pit.sectors.technology.priceAtLeast98,2);
  assert.equal(summary.pit.sectors.technology.volumeAtLeast98,2);
  assert.equal(summary.pit.sectors.technology.priceMedian,1);
  assert.equal(summary.pit.sectors.technology.priceP10,0.6);
  assert.equal(summary.pit.sectors.technology.rawBreadth1007Potential,false);
  assert.equal(summary.pit.sectors.technology.rawDemand775Potential,false);
  fs.rmSync(dir,{recursive:true,force:true});
});
