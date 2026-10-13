import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const ALPACA_DIR="asset-r10-alpaca";
const COLLECTION_FILE="local-asset-bubble-r10-alpaca-collection.json";
const OUT="local-sector-fear-greed-r21348-etf-local-source-discovery";
const DISCOVERY_END="2026-10-09";

export const R21348_ETFS=Object.freeze({technology:"XLK",healthcare:"XLV",financials:"XLF",discretionary:"XLY",communication:"XLC",industrials:"XLI",staples:"XLP",energy:"XLE",utilities:"XLU",realEstate:"XLRE",materials:"XLB"});
export const R21348_REFERENCE_OBSERVATIONS=756;

const ETF_SET=new Set(Object.values(R21348_ETFS));
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listFiles(dir){const out=[];if(!fs.existsSync(dir))return out;for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);let st;try{st=fs.statSync(file);}catch{continue;}if(st.isFile()&&(/^group-\d+\.json$/.test(name)||name.endsWith(".json")))out.push(file);}const inc=path.join(dir,"incremental");if(fs.existsSync(inc))for(const name of fs.readdirSync(inc).sort()){const file=path.join(inc,name);try{if(fs.statSync(file).isFile())out.push(file);}catch{}}return out;}

export function extractDateR21348(row){const d=String(row?.tradeDate??row?.date??row?.trade_date??row?.t??"").slice(0,10);return validDate(d)?d:null;}
export function uniqueDatesR21348(rows=[]){return [...new Set((Array.isArray(rows)?rows:[]).map(extractDateR21348).filter(Boolean))].sort();}
export function intersectDatesR21348(dateLists=[]){const lists=(Array.isArray(dateLists)?dateLists:[]).map(x=>new Set(Array.isArray(x)?x:[]));if(!lists.length)return[];return [...lists[0]].filter(d=>lists.every(s=>s.has(d))).sort();}
export function classifyR21348({commonPostLockDates=[],etfsWithAnyPostLock=0,activeStoreEtfRows=0}={}){if(commonPostLockDates.length)return"POST_LOCK_ETF_DATA_AVAILABLE_LOCALLY";if(etfsWithAnyPostLock>0)return"PARTIAL_POST_LOCK_ETF_DATA_AVAILABLE_LOCALLY";if(activeStoreEtfRows>0)return"ETF_ROWS_EXIST_BUT_NO_POST_LOCK_SESSION";return"NO_SECTOR_ETF_ROWS_IN_ACTIVE_ALPACA_STORE";}

function rowsForTicker(obj,ticker){return Array.isArray(obj?.series?.[ticker])?obj.series[ticker]:[];}
function summary(rows,discoveryEnd=DISCOVERY_END){const dates=uniqueDatesR21348(rows),post=dates.filter(d=>d>discoveryEnd);return{rows:Array.isArray(rows)?rows.length:0,totalDates:dates.length,latestDate:dates.at(-1)??null,postLockDates:post.length,firstPostLock:post[0]??null,lastPostLock:post.at(-1)??null,dates,post};}
function readActiveEtfRows(base){const files=listFiles(path.join(base,ALPACA_DIR));const byTicker=Object.fromEntries([...ETF_SET].map(t=>[t,[]]));let parsedFiles=0,totalRows=0,etfRows=0;for(const file of files){const data=safeJson(file);if(!Array.isArray(data))continue;parsedFiles++;totalRows+=data.length;for(const row of data){const ticker=String(row?.ticker??row?.symbol??"").toUpperCase();if(!ETF_SET.has(ticker))continue;byTicker[ticker].push(row);etfRows++;}}return{files:files.length,parsedFiles,totalRows,etfRows,byTicker};}

export function runR21348(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const discoveryEnd=DISCOVERY_END;
  const iex=safeJson(path.join(base,IEX_FILE))??{},r21331=safeJson(path.join(base,R21331_FILE))??{},active=readActiveEtfRows(base);
  const sectors={};let etfsWithAnyPostLock=0;
  for(const [sectorId,ticker] of Object.entries(R21348_ETFS)){
    const legacyRows=[...rowsForTicker(iex,ticker),...rowsForTicker(r21331,ticker)];
    const legacy=summary(legacyRows),activeStore=summary(active.byTicker[ticker]??[]),combined=summary([...legacyRows,...(active.byTicker[ticker]??[])]);
    if(combined.postLockDates>0)etfsWithAnyPostLock++;
    sectors[sectorId]={ticker,legacy:{rows:legacy.rows,totalDates:legacy.totalDates,latestDate:legacy.latestDate,postLockDates:legacy.postLockDates},activeStore:{rows:activeStore.rows,totalDates:activeStore.totalDates,latestDate:activeStore.latestDate,postLockDates:activeStore.postLockDates},combined:{totalDates:combined.totalDates,latestDate:combined.latestDate,postLockDates:combined.postLockDates,firstPostLock:combined.firstPostLock,lastPostLock:combined.lastPostLock},combinedPost:combined.post};
  }
  const commonPostLockDates=intersectDatesR21348(Object.values(sectors).map(x=>x.combinedPost));
  const state=classifyR21348({commonPostLockDates,etfsWithAnyPostLock,activeStoreEtfRows:active.etfRows});
  const checkpoint=safeJson(path.join(base,ALPACA_DIR,"incremental-checkpoint.json"))??{};
  const baseCheckpoint=safeJson(path.join(base,ALPACA_DIR,"checkpoint.json"))??{};
  const collection=safeJson(path.join(base,COLLECTION_FILE))??{};
  const next=state==="POST_LOCK_ETF_DATA_AVAILABLE_LOCALLY"?"USE_EXISTING_LOCAL_ETF_ROWS_FOR_FROZEN_PROSPECTIVE_RECOMPUTE":state==="PARTIAL_POST_LOCK_ETF_DATA_AVAILABLE_LOCALLY"?"WAIT_OR_COMPLETE_EXISTING_APPROVED_LOCAL_ETF_COLLECTION":"DO_NOT_CALL_PROVIDER_AUTOMATICALLY_REVIEW_APPROVED_ETF_COLLECTION_PATH";
  const report={version:"R2.13.48-ETF-LOCAL-SOURCE-DISCOVERY",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R21348_ETF_LOCAL_SOURCE_DISCOVERY_COMPLETE",mode:"LOCAL_READ_ONLY_DISCOVERY",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,approvedR1ReferenceRequirement:R21348_REFERENCE_OBSERVATIONS,referenceRequirementChanged:false,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,diagnosticOnly:true,discoveryEnd,activeAlpacaStore:{files:active.files,parsedFiles:active.parsedFiles,totalRows:active.totalRows,sectorEtfRows:active.etfRows},checkpoint:{incrementalThrough:checkpoint?.through??null,baseEnd:baseCheckpoint?.end??null},collection:{checkedAt:collection?.checkedAt??null,status:collection?.status??null,runRequests:Number.isFinite(collection?.runRequests)?collection.runRequests:null,storageVerified:typeof collection?.storageVerified==="boolean"?collection.storageVerified:null,errorCode:collection?.errorCode??null},sectors:Object.fromEntries(Object.entries(sectors).map(([id,x])=>[id,{ticker:x.ticker,legacy:x.legacy,activeStore:x.activeStore,combined:x.combined}])),etfsWithAnyPostLock,commonPostLock:{sessions:commonPostLockDates.length,first:commonPostLockDates[0]??null,last:commonPostLockDates.at(-1)??null},state,next};
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.48 ETF LOCAL SOURCE DISCOVERY",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`discoveryEnd=${discoveryEnd}`,`activeStoreFiles=${active.files} parsed=${active.parsedFiles} totalRows=${active.totalRows} sectorEtfRows=${active.etfRows}`,`checkpointIncrementalThrough=${report.checkpoint.incrementalThrough??"NA"} checkpointBaseEnd=${report.checkpoint.baseEnd??"NA"}`,`collectionStatus=${report.collection.status??"NA"} collectionCheckedAt=${report.collection.checkedAt??"NA"} runRequests=${report.collection.runRequests??"NA"} storageVerified=${report.collection.storageVerified??"NA"} errorCode=${report.collection.errorCode??"NA"}`,`etfsWithAnyPostLock=${etfsWithAnyPostLock}/11`,`commonPostLockSessions=${report.commonPostLock.sessions} first=${report.commonPostLock.first??"NA"} last=${report.commonPostLock.last??"NA"}`,`state=${state}`,"","SECTOR | ETF | LEGACY_LATEST | ACTIVE_ROWS | ACTIVE_LATEST | COMBINED_LATEST | POST_LOCK_DATES | FIRST_POST | LAST_POST",...Object.entries(report.sectors).map(([id,x])=>`${id} | ${x.ticker} | ${x.legacy.latestDate??"NA"} | ${x.activeStore.rows} | ${x.activeStore.latestDate??"NA"} | ${x.combined.latestDate??"NA"} | ${x.combined.postLockDates} | ${x.combined.firstPostLock??"NA"} | ${x.combined.lastPostLock??"NA"}`),"","note=READ_ONLY_SCAN_OF_EXISTING_LOCAL_STORES_ONLY","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE",`next=${next}`];saveText(txtFile,lines.join("\n")+"\n");return{...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21348();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,activeAlpacaStore:r.activeAlpacaStore,checkpoint:r.checkpoint,collection:r.collection,etfsWithAnyPostLock:r.etfsWithAnyPostLock,commonPostLock:r.commonPostLock,state:r.state,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
