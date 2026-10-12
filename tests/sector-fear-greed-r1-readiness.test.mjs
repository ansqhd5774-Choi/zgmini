import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {buildSectorReadinessReport,renderSectorReadinessText,runSectorFearGreedR1Readiness} from "../scripts/pc-writer/sector-fear-greed-r1-readiness.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const sectorIds=Object.keys(SECTOR_FEAR_GREED_R1_ETFS);
function dateAt(i){return new Date(Date.UTC(2022,0,1)+i*86400000).toISOString().slice(0,10);}
function prices(n=900,offset=0){return Array.from({length:n},(_,i)=>({date:dateAt(i),close:100+offset+i*0.11+Math.sin(i/13)}));}
function derived(n=800){return Array.from({length:n},(_,i)=>({date:dateAt(i),b50:0.45+0.1*Math.sin(i/17),b200:0.50+0.1*Math.sin(i/23),highLowNet:0.05*Math.sin(i/11),volumeBreadth:0.15*Math.sin(i/7),coverage:{memberCount:50,observed:50,observedRatio:1,directionReady:50,directionRatio:1,ma50Ready:50,ma50Ratio:1,ma200Ready:50,ma200Ratio:1,highLow52wReady:50,highLow52wRatio:1}}));}
function bundle(){const out={SPY:prices(900,20)};for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS))out[ticker]=prices(900,sectorId.length);return out;}
function inputs(){return {sectors:Object.fromEntries(sectorIds.map(id=>[id,derived()]))};}

test("five axes can be READY while Options still blocks final score",()=>{const report=buildSectorReadinessReport({universe:{memberCount:503},priceBundle:bundle(),constituentInputs:inputs(),constituentRows:500000});assert.equal(report.summary.readyFive,11);assert.equal(report.summary.finalReady,0);for(const item of Object.values(report.sectors)){assert.equal(item.status,"READY_5_OF_5");assert.equal(item.finalStatus,"PARTIAL");assert.equal(item.finalScore,null);assert.equal(item.options.status,"BLOCKED");assert.equal(item.availableWeight,0.85);}});
test("stored S&P benchmark never substitutes for SPY",()=>{const priceBundle=bundle();priceBundle.SPY=[];const report=buildSectorReadinessReport({universe:{memberCount:503},priceBundle,constituentInputs:inputs(),benchmark:{rows:1200,usedAsSpy:false}});for(const item of Object.values(report.sectors)){assert.equal(item.components.relativeStrength.status,"PARTIAL");assert.equal(item.components.relativeStrength.reason,"SPY_HISTORY_MISSING");}});
test("text output exposes states and no final READY claim",()=>{const text=renderSectorReadinessText(buildSectorReadinessReport({priceBundle:{}}));assert.match(text,/SECTOR \| ETF \| T \| B \| D \| R \| V \| O/);assert.match(text,/technology \| XLK/);assert.match(text,/OPTIONS_REMAIN_BLOCKED/);});
test("runtime opens core.sqlite read-only and writes only report files",()=>{const base=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-sector-readiness-"));try{fs.mkdirSync(path.join(base,"storage"),{recursive:true});const dbFile=path.join(base,"storage","core.sqlite"),db=new DatabaseSync(dbFile);db.exec("CREATE TABLE market_input_batches_v1(batch_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)");db.close();const out=runSectorFearGreedR1Readiness(base,{now:new Date("2026-10-12T12:00:00Z")});assert.equal(out.providerCalls,0);assert.equal(out.publicMutation,false);assert.equal(out.dbSchemaChanged,false);assert.ok(fs.existsSync(out.jsonFile));assert.ok(fs.existsSync(out.txtFile));const check=new DatabaseSync(dbFile,{readOnly:true});const tables=check.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name);check.close();assert.deepEqual(tables,["market_input_batches_v1"]);}finally{fs.rmSync(base,{recursive:true,force:true});}});
