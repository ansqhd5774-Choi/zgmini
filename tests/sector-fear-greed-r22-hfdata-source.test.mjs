import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  normalizeSectorR22HfTicker,
  parseSectorR22HfSymbolCatalogue,
  assessSectorR22HfCatalogue,
  SECTOR_R22_HFDATA_REFERENCE_REQUIREMENT,
  SECTOR_R22_HFDATA_FEATURE_WARMUP,
} from "../lib/market-score/sector-fear-greed-r22-hfdata-source.mjs";
import {runSectorFearGreedR22HfDataCatalogDiagnostic} from "../scripts/pc-writer/sector-fear-greed-r22-hfdata-catalog-diagnostic.mjs";

const sectors=["energy","materials","industrials","consumer_discretionary","consumer_staples","health_care","financials","information_technology","communication_services","utilities","real_estate"];
const benchmarks=["SPY","XLK","XLC","XLY","XLP","XLF","XLV","XLI","XLE","XLB","XLRE","XLU"];
function pitCsv(count=600){const lines=["symbol,cik,name,sector,date_added,date_removed,created_at"];for(let i=0;i<count;i++)lines.push(`T${String(i).padStart(4,"0")},${i},Test ${i},${sectors[i%sectors.length]},2020-01-01,,2026-10-12`);return lines.join("\n")+"\n";}
function catalogue(count=600,{missing=[]}={}){const skip=new Set(missing);return {count:count+benchmarks.length,symbols:[...Array.from({length:count},(_,i)=>`T${String(i).padStart(4,"0")}`),...benchmarks].filter(x=>!skip.has(x)).map(ticker=>({ticker,size_bytes:123,last_modified:"2026-10-10T00:00:00Z"}))};}
const response=payload=>({ok:true,status:200,headers:{get:key=>String(key).toLowerCase()==="content-type"?"application/json":null},text:async()=>JSON.stringify(payload)});

test("HF Data ticker normalization handles IEX share-class aliases",()=>{assert.equal(normalizeSectorR22HfTicker("BRK.B"),"BRK-B");assert.equal(normalizeSectorR22HfTicker("bf.b"),"BF-B");assert.equal(normalizeSectorR22HfTicker("aapl"),"AAPL");});

test("catalogue assessment is coverage-only and keeps 756 plus 60-session contract",()=>{
  const parsed=parseSectorR22HfSymbolCatalogue(catalogue(600,{missing:["T0001"]}));
  const pitHistory={byTicker:{T0000:[{sectorId:"energy"}],T0001:[{sectorId:"energy"}],"BRK.B":[{sectorId:"financials"}]}};
  parsed.symbols.set("BRK-B",{ticker:"BRK-B",sizeBytes:1,lastModified:null});
  const out=assessSectorR22HfCatalogue({catalogue:parsed,pitHistory,requiredBenchmarks:benchmarks});
  assert.equal(out.pitTickers,3);assert.equal(out.availableTickers,2);assert.equal(out.missingTickers,1);assert.equal(out.benchmarksComplete,true);
  assert.equal(out.sectors.energy.required,2);assert.equal(out.sectors.energy.available,1);assert.equal(out.sectors.financials.available,1);
  assert.equal(SECTOR_R22_HFDATA_REFERENCE_REQUIREMENT,756);assert.equal(SECTOR_R22_HFDATA_FEATURE_WARMUP,60);
});

test("PC catalogue diagnostic makes one unauthenticated request and never downloads bars",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-hfdata-"));
  try{
    fs.writeFileSync(path.join(dir,"local-sector-fear-greed-r1-pit-gics.csv"),pitCsv());let calls=0;
    const fetchImpl=async(url,options)=>{calls++;assert.equal(url,"https://api.hfdatalibrary.com/v1/symbols");assert.equal(options.method,"GET");assert.equal(options.headers.Accept,"application/json");assert.equal(Object.hasOwn(options.headers,"X-API-Key"),false);return response(catalogue());};
    const out=await runSectorFearGreedR22HfDataCatalogDiagnostic(dir,{now:new Date("2026-10-12T00:00:00Z"),fetchImpl});
    assert.equal(calls,1);assert.equal(out.status,"CATALOG_DIAGNOSTIC_COMPLETE");assert.equal(out.sourceRequests,1);assert.equal(out.apiKeyUsed,false);assert.equal(out.summary.pitTickers,600);assert.equal(out.summary.availableTickers,600);assert.equal(out.summary.benchmarksComplete,true);
    const stored=JSON.parse(fs.readFileSync(path.join(dir,"local-sector-fear-greed-r22-hfdata-catalog-diagnostic.json"),"utf8"));
    assert.equal(stored.rawBarsDownloaded,false);assert.equal(stored.rawRowsStored,false);assert.equal(stored.publicMutation,false);assert.equal(stored.productionFormulaChanged,false);assert.equal(stored.assessment.referenceRequirement,756);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("missing benchmark remains explicit instead of fabricating download eligibility",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-hfdata-missing-"));
  try{fs.writeFileSync(path.join(dir,"local-sector-fear-greed-r1-pit-gics.csv"),pitCsv());const out=await runSectorFearGreedR22HfDataCatalogDiagnostic(dir,{fetchImpl:async()=>response(catalogue(600,{missing:["XLRE"]}))});assert.equal(out.status,"CATALOG_BENCHMARK_MISSING");assert.equal(out.summary.benchmarksComplete,false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
