import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const LEGACY_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const COLLECTION_FILE="local-asset-bubble-r10-alpaca-collection.json";
const OUT="local-sector-fear-greed-r21349-etf-collection-path-audit";
export const R21349_ETFS=Object.freeze({technology:"XLK",healthcare:"XLV",financials:"XLF",discretionary:"XLY",communication:"XLC",industrials:"XLI",staples:"XLP",energy:"XLE",utilities:"XLU",realEstate:"XLRE",materials:"XLB"});
export const R21349_REFERENCE_OBSERVATIONS=756;
const ETFS=Object.values(R21349_ETFS),ETF_SET=new Set(ETFS);

function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function tickerOf(row){return String(row?.ticker??row?.symbol??"").toUpperCase();}
function dateOf(row){const d=String(row?.tradeDate??row?.date??row?.trade_date??row?.t??"").slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:null;}
function listGroupFiles(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n));}
function unique(a){return [...new Set(a)];}
function summaryRows(rows=[]){const byTicker={};for(const t of ETFS)byTicker[t]=[];for(const r of Array.isArray(rows)?rows:[]){const t=tickerOf(r);if(ETF_SET.has(t))byTicker[t].push(r);}return Object.fromEntries(ETFS.map(t=>{const dates=unique(byTicker[t].map(dateOf).filter(Boolean)).sort();return[t,{rows:byTicker[t].length,dates:dates.length,latest:dates.at(-1)??null}];}));}

export function classifyR21349({groupEtfCount=0,legacyEtfs=0,activeEtfRows=0}={}){
 if(groupEtfCount===11)return"ACTIVE_GROUP_UNIVERSE_CONTAINS_ALL_ETFS";
 if(groupEtfCount>0)return"ACTIVE_GROUP_UNIVERSE_PARTIAL_ETFS";
 if(activeEtfRows>0)return"ACTIVE_ROWS_EXIST_OUTSIDE_GROUP_UNIVERSE";
 if(legacyEtfs===11)return"LEGACY_ETF_BACKFILL_ONLY_NOT_IN_ACTIVE_GROUP_UNIVERSE";
 if(legacyEtfs>0)return"PARTIAL_LEGACY_ETF_BACKFILL_ONLY";
 return"NO_APPROVED_LOCAL_ETF_COLLECTION_PATH_EVIDENCE";
}

export function runR21349(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
 const dir=path.join(base,ALPACA_DIR),groups=listGroupFiles(dir);let groupRows=0;const groupSymbols=new Set(),groupEtfs=new Set();
 for(const file of groups){const rows=safeJson(file);if(!Array.isArray(rows))continue;groupRows+=rows.length;for(const r of rows){const t=tickerOf(r);if(t){groupSymbols.add(t);if(ETF_SET.has(t))groupEtfs.add(t);}}}
 const incDir=path.join(dir,"incremental");let incFiles=0,incRows=[];if(fs.existsSync(incDir))for(const n of fs.readdirSync(incDir).sort()){const f=path.join(incDir,n);try{if(!fs.statSync(f).isFile())continue;}catch{continue;}incFiles++;const x=safeJson(f);if(Array.isArray(x))incRows.push(...x);}
 const activeSummary=summaryRows(incRows),activeEtfRows=Object.values(activeSummary).reduce((s,x)=>s+x.rows,0);
 const legacy=safeJson(path.join(base,LEGACY_FILE))??{},legacySeries=legacy?.series??{},legacySummary={};let legacyEtfs=0;
 for(const t of ETFS){const rows=Array.isArray(legacySeries[t])?legacySeries[t]:[];const dates=unique(rows.map(dateOf).filter(Boolean)).sort();legacySummary[t]={rows:rows.length,dates:dates.length,latest:dates.at(-1)??null};if(rows.length)legacyEtfs++;}
 const collection=safeJson(path.join(base,COLLECTION_FILE))??{},checkpoint=safeJson(path.join(dir,"incremental-checkpoint.json"))??{},baseCheckpoint=safeJson(path.join(dir,"checkpoint.json"))??{};
 const state=classifyR21349({groupEtfCount:groupEtfs.size,legacyEtfs,activeEtfRows});
 const report={version:"R2.13.49-ETF-COLLECTION-PATH-AUDIT",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R21349_ETF_COLLECTION_PATH_AUDIT_COMPLETE",mode:"LOCAL_READ_ONLY_AUDIT",providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,approvedR1ReferenceRequirement:R21349_REFERENCE_OBSERVATIONS,referenceRequirementChanged:false,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,diagnosticOnly:true,groupUniverse:{files:groups.length,rows:groupRows,totalSymbols:groupSymbols.size,etfs:[...groupEtfs].sort(),etfCount:groupEtfs.size,missingEtfs:ETFS.filter(t=>!groupEtfs.has(t))},incremental:{files:incFiles,rows:incRows.length,sectorEtfRows:activeEtfRows,byTicker:activeSummary},legacyBackfill:{fileExists:fs.existsSync(path.join(base,LEGACY_FILE)),etfsPresent:legacyEtfs,byTicker:legacySummary},checkpoint:{incrementalThrough:checkpoint?.through??null,baseEnd:baseCheckpoint?.end??null},collection:{checkedAt:collection?.checkedAt??null,status:collection?.status??null,runRequests:Number.isFinite(collection?.runRequests)?collection.runRequests:null,storageVerified:typeof collection?.storageVerified==="boolean"?collection.storageVerified:null,errorCode:collection?.errorCode??null},state,next:state==="LEGACY_ETF_BACKFILL_ONLY_NOT_IN_ACTIVE_GROUP_UNIVERSE"?"REQUIRES_EXPLICIT_APPROVAL_BEFORE_ADDING_ETFS_TO_ACTIVE_COLLECTION_UNIVERSE_OR_PROVIDER_CALL":"REVIEW_AUDIT_BEFORE_ANY_COLLECTION_CHANGE"};
 const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);saveJson(jf,report);
 const lines=["ZGMINI SECTOR FEAR & GREED R2.13.49 ETF COLLECTION PATH AUDIT",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`groupFiles=${groups.length} groupRows=${groupRows} totalSymbols=${groupSymbols.size} groupEtfCount=${groupEtfs.size}/11`,`groupEtfs=${[...groupEtfs].sort().join(",")||"NONE"}`,`missingEtfs=${report.groupUniverse.missingEtfs.join(",")||"NONE"}`,`incrementalFiles=${incFiles} incrementalRows=${incRows.length} incrementalSectorEtfRows=${activeEtfRows}`,`legacyFileExists=${report.legacyBackfill.fileExists} legacyEtfsPresent=${legacyEtfs}/11`,`checkpointIncrementalThrough=${report.checkpoint.incrementalThrough??"NA"} checkpointBaseEnd=${report.checkpoint.baseEnd??"NA"}`,`collectionStatus=${report.collection.status??"NA"} checkedAt=${report.collection.checkedAt??"NA"} requests=${report.collection.runRequests??"NA"} storageVerified=${report.collection.storageVerified??"NA"} error=${report.collection.errorCode??"NA"}`,`state=${state}`,"","ETF | GROUP_MEMBER | ACTIVE_INCREMENTAL_ROWS | ACTIVE_LATEST | LEGACY_ROWS | LEGACY_LATEST",...ETFS.map(t=>`${t} | ${groupEtfs.has(t)?"YES":"NO"} | ${activeSummary[t].rows} | ${activeSummary[t].latest??"NA"} | ${legacySummary[t].rows} | ${legacySummary[t].latest??"NA"}`),"","note=READ_ONLY_LOCAL_AUDIT_ONLY","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE",`next=${report.next}`];saveText(tf,lines.join("\n")+"\n");return{...report,jsonFile:jf,txtFile:tf};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21349();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,groupUniverse:r.groupUniverse,incremental:{files:r.incremental.files,rows:r.incremental.rows,sectorEtfRows:r.incremental.sectorEtfRows},legacyBackfill:{fileExists:r.legacyBackfill.fileExists,etfsPresent:r.legacyBackfill.etfsPresent},checkpoint:r.checkpoint,collection:r.collection,state:r.state,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
