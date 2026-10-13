import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const LOCK_FILE="local-sector-fear-greed-r21346-prospective-lock-readiness.json";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21347-prospective-data-inventory";

export const R21347_EXPECTED_LOCK_STATUS="SHADOW_R21346_PROSPECTIVE_LOCK_READY";
export const R21347_FEATURE="internalCorrelationShock";
export const R21347_REFERENCE_OBSERVATIONS=756;
export const R21347_SECTOR_ETFS=Object.freeze({
  technology:"XLK",
  healthcare:"XLV",
  financials:"XLF",
  discretionary:"XLY",
  communication:"XLC",
  industrials:"XLI",
  staples:"XLP",
  energy:"XLE",
  utilities:"XLU",
  realEstate:"XLRE",
  materials:"XLB",
});

const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=safeJson(file);return Array.isArray(x)?x:[];}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}

export function extractDateR21347(row){const d=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10);return validDate(d)?d:null;}
export function uniqueDatesR21347(rows=[]){return [...new Set((Array.isArray(rows)?rows:[]).map(extractDateR21347).filter(Boolean))].sort();}
export function intersectDatesR21347(dateLists=[]){const lists=(Array.isArray(dateLists)?dateLists:[]).map(x=>new Set(Array.isArray(x)?x:[]));if(!lists.length)return[];return [...lists[0]].filter(d=>lists.every(s=>s.has(d))).sort();}
export function classifyReadinessR21347({stockPostLockDates=[],commonEtfPostLockDates=[]}={}){if(!stockPostLockDates.length)return"WAIT_FOR_POST_LOCK_STOCK_DATA";if(!commonEtfPostLockDates.length)return"WAIT_FOR_POST_LOCK_ETF_DATA";return"RAW_POST_LOCK_DATA_PRESENT_REQUIRES_FROZEN_SIGNAL_RECOMPUTE";}

export function runR21347(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const lock=safeJson(path.join(base,LOCK_FILE));
  if(lock?.status!==R21347_EXPECTED_LOCK_STATUS)throw new Error("R21347_LOCK_NOT_READY");
  if(lock?.contract?.feature!==R21347_FEATURE||lock?.contract?.normalizationReference!==R21347_REFERENCE_OBSERVATIONS)throw new Error("R21347_LOCK_CONTRACT_MISMATCH");
  const discoveryEnd=lock?.contract?.discoveryEnd;if(!validDate(discoveryEnd))throw new Error("R21347_DISCOVERY_END_MISSING");

  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21347_ALPACA_STOCK_STORE_MISSING");
  const stockRows=stockFiles.flatMap(arr),stockDates=uniqueDatesR21347(stockRows),stockPostLockDates=stockDates.filter(d=>d>discoveryEnd);

  const iex=safeJson(path.join(base,IEX_FILE))??{},r21331=safeJson(path.join(base,R21331_FILE))??{},sectorEtfs={};
  for(const [sectorId,ticker] of Object.entries(R21347_SECTOR_ETFS)){
    const dates=uniqueDatesR21347([...(iex?.series?.[ticker]??[]),...(r21331?.series?.[ticker]??[])]),post=dates.filter(d=>d>discoveryEnd);
    sectorEtfs[sectorId]={ticker,totalDates:dates.length,latestDate:dates.at(-1)??null,postLockDates:post.length,firstPostLock:post[0]??null,lastPostLock:post.at(-1)??null,dates:post};
  }
  const commonEtfPostLockDates=intersectDatesR21347(Object.values(sectorEtfs).map(x=>x.dates));
  const state=classifyReadinessR21347({stockPostLockDates,commonEtfPostLockDates});
  const report={version:"R2.13.47-PROSPECTIVE-DATA-INVENTORY",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R21347_PROSPECTIVE_DATA_INVENTORY_COMPLETE",mode:"LOCAL_READ_ONLY_INVENTORY",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,diagnosticOnly:true,contractHash:lock.contractHash,feature:R21347_FEATURE,discoveryEnd,stock:{files:stockFiles.length,rows:stockRows.length,totalDates:stockDates.length,latestDate:stockDates.at(-1)??null,postLockDates:stockPostLockDates.length,firstPostLock:stockPostLockDates[0]??null,lastPostLock:stockPostLockDates.at(-1)??null},sectorEtfs:Object.fromEntries(Object.entries(sectorEtfs).map(([id,x])=>[id,{ticker:x.ticker,totalDates:x.totalDates,latestDate:x.latestDate,postLockDates:x.postLockDates,firstPostLock:x.firstPostLock,lastPostLock:x.lastPostLock}])),commonEtfPostLock:{sessions:commonEtfPostLockDates.length,first:commonEtfPostLockDates[0]??null,last:commonEtfPostLockDates.at(-1)??null},state,next:state==="RAW_POST_LOCK_DATA_PRESENT_REQUIRES_FROZEN_SIGNAL_RECOMPUTE"?"RUN_FROZEN_PROSPECTIVE_SIGNAL_RECOMPUTE_WITHOUT_RETUNING":"WAIT_FOR_REQUIRED_LOCAL_POST_LOCK_DATA"};
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.47 PROSPECTIVE DATA INVENTORY",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`contractHash=${report.contractHash}`,`feature=${report.feature}`,`discoveryEnd=${discoveryEnd}`,`stockFiles=${report.stock.files} stockRows=${report.stock.rows} stockPostLockDates=${report.stock.postLockDates} stockLatest=${report.stock.latestDate??"NA"}`,`commonEtfPostLockSessions=${report.commonEtfPostLock.sessions} first=${report.commonEtfPostLock.first??"NA"} last=${report.commonEtfPostLock.last??"NA"}`,`state=${state}`,"","SECTOR | ETF | LATEST | POST_LOCK_DATES | FIRST_POST | LAST_POST",...Object.entries(report.sectorEtfs).map(([id,x])=>`${id} | ${x.ticker} | ${x.latestDate??"NA"} | ${x.postLockDates} | ${x.firstPostLock??"NA"} | ${x.lastPostLock??"NA"}`),"","note=R21346_CURRENT_PROSPECTIVE_OBSERVATIONS_WAS_A_READINESS_PLACEHOLDER_NOT_A_LOCAL_DATA_MEASUREMENT","note=R21347_ONLY_INVENTORIES_EXISTING_LOCAL_DATES_AND_DOES_NOT_RECOMPUTE_OR_RETUNE_THE_LOCKED_SIGNAL","note=SECTOR_ETF_MAPPING_IS_THE_FROZEN_11_SECTOR_DIAGNOSTIC_MAPPING_COPIED_LOCALLY_TO_AVOID_DEPENDENCY_ON_A_RESEARCH_ONLY_MODULE_ABSENT_FROM_CURRENT_MAIN","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE",`next=${report.next}`];saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21347();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,stock:r.stock,commonEtfPostLock:r.commonEtfPostLock,state:r.state,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
