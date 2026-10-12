import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {
  buildSectorReadinessReport,
  renderSectorReadinessText,
  runSectorFearGreedR1Readiness,
} from "../scripts/pc-writer/sector-fear-greed-r1-readiness.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const sectorIds=Object.keys(SECTOR_FEAR_GREED_R1_ETFS);
function dateAt(index){return new Date(Date.UTC(2022,0,1)+index*86400000).toISOString().slice(0,10)}
function prices(n=900,offset=0){return Array.from({length:n},(_,i)=>({date:dateAt(i),close:100+offset+i*0.11+Math.sin(i/13)}))}
function derived(n=756){
  return Array.from({length:n},(_,i)=>({
    date:dateAt(i),
    b50:0.45+0.1*Math.sin(i/17),
    b200:0.50+0.1*Math.sin(i/23),
    highLowNet:0.05*Math.sin(i/11),
    volumeBreadth:0.15*Math.sin(i/7),
    coverage:{memberCount:50,observed:50,observedRatio:1,directionReady:50,directionRatio:1,ma50Ready:50,ma50Ratio:1,ma200Ready:50,ma200Ratio:1,highLow52wReady:50,highLow52wRatio:1},
  }));
}
function bundle(){
  const out={SPY:prices(900,20)};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS))out[ticker]=prices(900,sectorId.length);
  return out;
}
function constituentInputs(){return {sectors:Object.fromEntries(sectorIds.map(id=>[id,derived()]))}}

test("readiness report keeps all five axes separate and blocks only final score when options are absent",()=>{
  const report=buildSectorReadinessReport({
    now:new Date("2026-10-12T12:00:00Z"),
    universe:{memberCount:503},
    priceBundle:bundle(),
    constituentInputs:constituentInputs(),
    constituentRows:500000,
  });
  assert.equal(report.providerCalls,0);
  assert.equal(report.publicMutation,false);
  assert.equal(report.dbSchemaChanged,false);
  assert.equal(report.summary.readyFive,11);
  assert.equal(report.summary.finalReady,0);
  for(const item of Object.values(report.sectors)){
    assert.equal(item.status,"READY_5_OF_5");
    assert.equal(item.finalStatus,"PARTIAL");
    assert.equal(item.finalScore,null);
    assert.equal(item.availableWeight,0.85);
    assert.equal(item.options.status,"BLOCKED");
    assert.ok(Number.isFinite(item.weightedContribution));
  }
});

test("stored S&P 500 benchmark is diagnostic only and never substitutes for missing SPY",()=>{
  const priceBundle=bundle();
  priceBundle.SPY=[];
  const report=buildSectorReadinessReport({
    universe:{memberCount:503},priceBundle,constituentInputs:constituentInputs(),
    benchmark:{rows:1200,usedAsSpy:false},
  });
  for(const item of Object.values(report.sectors)){
    assert.equal(item.components.trend.status,"READY");
    assert.equal(item.components.relativeStrength.status,"PARTIAL");
    assert.equal(item.components.relativeStrength.reason,"SPY_HISTORY_MISSING");
  }
  assert.match(report.warnings.join("\n"),/NOT_SUBSTITUTED_FOR_SPY/);
});

test("missing current GICS mapping leaves breadth and demand explicit instead of inventing sector membership",()=>{
  const report=buildSectorReadinessReport({priceBundle:bundle(),constituentInputs:null,universe:null});
  for(const item of Object.values(report.sectors)){
    assert.equal(item.components.breadth.status,"PARTIAL");
    assert.equal(item.components.demand.status,"PARTIAL");
    assert.equal(item.components.breadth.reason,"CURRENT_GICS_UNIVERSE_MISSING");
    assert.equal(item.components.demand.reason,"CURRENT_GICS_UNIVERSE_MISSING");
  }
});

test("text output exposes component states and never claims final READY",()=>{
  const report=buildSectorReadinessReport({priceBundle:{}});
  const text=renderSectorReadinessText(report);
  assert.match(text,/SECTOR \| ETF \| T \| B \| D \| R \| V \| O \| 5AXIS \| FINAL/);
  assert.match(text,/technology \| XLK/);
  assert.match(text,/OPTIONS_REMAIN_BLOCKED/);
  assert.doesNotMatch(text,/FINAL=READY/);
});

test("runtime reads core.sqlite query-only, writes only readiness reports, and does not use stored benchmark as SPY",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-sector-readiness-"));
  fs.mkdirSync(path.join(base,"storage"),{recursive:true});
  const dbFile=path.join(base,"storage","core.sqlite");
  const db=new DatabaseSync(dbFile);
  db.exec("CREATE TABLE market_input_batches_v1(batch_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)");
  const benchmark={series:{SP500:prices(900).map(row=>({observationDate:row.date,value:row.close}))}};
  db.prepare("INSERT INTO market_input_batches_v1(batch_key,body,stored_at) VALUES(?,?,?)").run("shadowSp500Benchmark:test",JSON.stringify(benchmark),123);
  db.close();
  const before=new DatabaseSync(dbFile,{readOnly:true});
  const beforeTables=before.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name);
  before.close();

  const result=runSectorFearGreedR1Readiness(base,{now:new Date("2026-10-12T12:00:00Z")});
  assert.equal(result.providerCalls,0);
  assert.equal(result.publicMutation,false);
  assert.equal(result.dbSchemaChanged,false);
  assert.ok(fs.existsSync(result.jsonFile));
  assert.ok(fs.existsSync(result.txtFile));
  const report=JSON.parse(fs.readFileSync(result.jsonFile,"utf8"));
  assert.equal(report.sources.benchmark.rows,900);
  assert.equal(report.sources.benchmark.usedAsSpy,false);
  assert.equal(report.sectors.technology.components.relativeStrength.reason,"SECTOR_ETF_HISTORY_MISSING");

  const after=new DatabaseSync(dbFile,{readOnly:true});
  const afterTables=after.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name);
  after.close();
  assert.deepEqual(afterTables,beforeTables);
  fs.rmSync(base,{recursive:true,force:true});
});
