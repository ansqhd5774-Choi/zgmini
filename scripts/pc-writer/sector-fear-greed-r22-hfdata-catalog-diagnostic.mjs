import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {
  SECTOR_R22_HFDATA_SOURCE_METHOD,
  SECTOR_R22_HFDATA_SYMBOLS_URL,
  SECTOR_R22_HFDATA_HISTORY_START,
  SECTOR_R22_HFDATA_ATTRIBUTION,
  SECTOR_R22_HFDATA_LIBRARY_CITATION,
  parseSectorR22HfSymbolCatalogue,
  assessSectorR22HfCatalogue,
} from "../../lib/market-score/sector-fear-greed-r22-hfdata-source.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const OUTPUT_JSON="local-sector-fear-greed-r22-hfdata-catalog-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r22-hfdata-catalog-diagnostic.txt";
const BENCHMARKS=["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)];
const round=value=>Number.isFinite(value)?Math.round(value*10000)/10000:null;

async function fetchCatalogue(fetchImpl){
  if(typeof fetchImpl!=="function")throw new TypeError("SECTOR_R22_HFDATA_FETCH_REQUIRED");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetchImpl(SECTOR_R22_HFDATA_SYMBOLS_URL,{method:"GET",headers:{Accept:"application/json"},redirect:"error",signal:controller.signal});
    if(!response?.ok)throw new Error(`SECTOR_R22_HFDATA_CATALOG_HTTP_${Number(response?.status)||0}`);
    const type=String(response.headers?.get?.("content-type")??"").toLowerCase();
    if(type&&!type.includes("application/json"))throw new Error("SECTOR_R22_HFDATA_CATALOG_CONTENT_TYPE_INVALID");
    const text=await response.text();if(text.length>2_000_000)throw new Error("SECTOR_R22_HFDATA_CATALOG_TOO_LARGE");
    let payload;try{payload=JSON.parse(text);}catch{throw new Error("SECTOR_R22_HFDATA_CATALOG_JSON_INVALID");}
    return parseSectorR22HfSymbolCatalogue(payload);
  }finally{clearTimeout(timer);}
}

export async function runSectorFearGreedR22HfDataCatalogDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date(),fetchImpl=globalThis.fetch}={}){
  const pitPath=path.join(base,PIT_FILE);if(!fs.existsSync(pitPath))throw new Error("SECTOR_R22_HFDATA_PIT_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8"));
  const catalogue=await fetchCatalogue(fetchImpl);
  const assessment=assessSectorR22HfCatalogue({catalogue,pitHistory:pit,requiredBenchmarks:BENCHMARKS});
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const sectorRows=Object.entries(assessment.sectors).sort(([a],[b])=>a.localeCompare(b));
  const report={
    version:SECTOR_R22_HFDATA_SOURCE_METHOD,
    generatedAt,
    status:assessment.benchmarksComplete?"CATALOG_DIAGNOSTIC_COMPLETE":"CATALOG_BENCHMARK_MISSING",
    mode:"SHADOW_SOURCE_DIAGNOSTIC_ONLY",
    source:"HF Data Library / IEX HIST",
    sourceHistoryStart:SECTOR_R22_HFDATA_HISTORY_START,
    sourceRequests:1,
    apiKeyUsed:false,
    rawBarsDownloaded:false,
    rawRowsStored:false,
    publicMutation:false,
    dbSchemaChanged:false,
    productionFormulaChanged:false,
    schedulerChanged:false,
    attribution:SECTOR_R22_HFDATA_ATTRIBUTION,
    libraryCitation:SECTOR_R22_HFDATA_LIBRARY_CITATION,
    assessment:{...assessment,coverage:round(assessment.coverage),sectors:Object.fromEntries(sectorRows.map(([id,row])=>[id,{...row,coverage:round(row.coverage)}]))},
  };
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.2 HF DATA LIBRARY CATALOG DIAGNOSTIC",
    `generatedAt=${generatedAt}`,
    `status=${report.status}`,
    `source=${report.source}`,
    `historyStart=${report.sourceHistoryStart}`,
    `catalogueCount=${catalogue.count}`,
    `pitTickers=${assessment.pitTickers} available=${assessment.availableTickers} missing=${assessment.missingTickers} coverage=${round(assessment.coverage)}`,
    `benchmarksComplete=${assessment.benchmarksComplete}`,
    `benchmarks=${assessment.benchmarks.map(item=>`${item.ticker}:${item.available?"YES":"NO"}`).join(",")}`,
    "",
    "SECTOR | REQUIRED | AVAILABLE | MISSING | COVERAGE | MISSING_TICKERS",
  ];
  for(const [sectorId,row] of sectorRows)lines.push(`${sectorId} | ${row.required} | ${row.available} | ${row.missing} | ${round(row.coverage)} | ${row.missingTickers.join(",")||"-"}`);
  lines.push("",`sourceRequests=${report.sourceRequests} apiKeyUsed=false rawBarsDownloaded=false rawRowsStored=false`,"publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","note=CATALOG_ONLY_DOWNLOAD_ELIGIBILITY_NOT_YET_PROVEN");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");
  return {status:report.status,jsonFile,txtFile,sourceRequests:1,apiKeyUsed:false,summary:{catalogueCount:catalogue.count,pitTickers:assessment.pitTickers,availableTickers:assessment.availableTickers,missingTickers:assessment.missingTickers,coverage:round(assessment.coverage),benchmarksComplete:assessment.benchmarksComplete}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runSectorFearGreedR22HfDataCatalogDiagnostic().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"SECTOR_R22_HFDATA_CATALOG_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,sourceRequests:0,apiKeyUsed:false,rawBarsDownloaded:false,publicMutation:false}));process.exitCode=1;});
}
