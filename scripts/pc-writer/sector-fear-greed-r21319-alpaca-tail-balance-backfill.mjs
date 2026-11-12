import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadLocalProviders} from "./local-env.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const START="2023-07-12";
const END="2023-09-29";
const EXPECTED_GROUPS=55;
const MAX_PROVIDER_REQUESTS=55;
const OUT="local-sector-fear-greed-r21319-alpaca-tail-balance-backfill";
const CHECKPOINT="r21319-tail-balance-backfill-checkpoint.json";
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const safeJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}};
const safeCode=(error,fallback="R21319_ALPACA_BACKFILL_FAILED")=>{const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:fallback;};
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function groupFiles(dir){return fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).sort():[];}
function groupSymbols(file){const rows=safeJson(file);if(!Array.isArray(rows))throw new Error("R21319_GROUP_FILE_INVALID");const symbols=[...new Set(rows.map(row=>String(row?.ticker??"").trim()).filter(Boolean))].sort();if(!symbols.length)throw new Error("R21319_GROUP_SYMBOLS_EMPTY");return symbols;}
function normalizeStoredRows(rows,{allowedSymbols,start=START,end=END}={}){
  const allow=allowedSymbols instanceof Set?allowedSymbols:new Set(allowedSymbols??[]),out=[],keys=new Set();
  for(const row of Array.isArray(rows)?rows:[]){const ticker=String(row?.ticker??"").trim(),tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),close=Number(row?.currentClose??row?.current_close??row?.close),volume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!ticker||!allow.has(ticker)||!validDate(tradeDate)||tradeDate<start||tradeDate>end||!finite(close)||close<=0||!finite(volume)||volume<0)throw new Error("R21319_STORED_ROW_INVALID");const key=`${ticker}|${tradeDate}`;if(keys.has(key))throw new Error("R21319_STORED_DUPLICATE");keys.add(key);out.push({ticker,tradeDate,currentClose:close,currentVolume:volume,source:"ALPACA",feed:"iex",adjustmentStatus:"split"});}
  return out.sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}
export function normalizeR21319AlpacaBody(body,symbols,{start=START,end=END}={}){
  if(!body?.bars||typeof body.bars!=="object"||Array.isArray(body.bars))throw new Error("R21319_ALPACA_INVALID_RESPONSE");
  if(body.next_page_token)throw new Error("R21319_UNEXPECTED_PAGINATION");
  const allowed=new Set(symbols),rows=[];
  for(const [ticker,bars] of Object.entries(body.bars)){if(!allowed.has(ticker)||!Array.isArray(bars))throw new Error("R21319_ALPACA_INVALID_RESPONSE");for(const bar of bars){const tradeDate=String(bar?.t??"").slice(0,10),close=Number(bar?.c),volume=Number(bar?.v);if(!validDate(tradeDate)||tradeDate<start||tradeDate>end||!finite(close)||close<=0||!finite(volume)||volume<0)throw new Error("R21319_ALPACA_INVALID_BAR");rows.push({ticker,tradeDate,currentClose:close,currentVolume:volume,source:"ALPACA",feed:"iex",adjustmentStatus:"split"});}}
  return normalizeStoredRows(rows,{allowedSymbols:allowed,start,end});
}
function outputName(groupName){return `r21319-${START}-${END}-${groupName}`;}
function benchmarkStatus(base){const payload=safeJson(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json")),dates=(payload?.series?.SPY??[]).map(row=>String(row?.date??"")).filter(validDate).sort();return {source:payload?.source??null,firstDate:dates[0]??null,lastDate:dates.at(-1)??null,coversBackfillStart:Boolean(dates.length&&dates[0]<=START)};}
export async function collectR21319AlpacaTailBalanceBackfill(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=new Date(),expectedGroups=EXPECTED_GROUPS,maxProviderRequests=MAX_PROVIDER_REQUESTS}={}){
  const alpacaDir=path.join(base,ALPACA_DIR),names=groupFiles(alpacaDir);if(names.length!==expectedGroups)throw new Error("R21319_GROUP_COUNT_MISMATCH");
  const env=loadLocalProviders(base);if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw new Error("ALPACA_CREDENTIAL_MISSING");
  const outputDir=path.join(alpacaDir,"incremental"),checkpointFile=path.join(alpacaDir,CHECKPOINT);fs.mkdirSync(outputDir,{recursive:true});
  const checkpoint=safeJson(checkpointFile),completed=new Set(Array.isArray(checkpoint?.completedGroups)?checkpoint.completedGroups:[]);let providerRequests=0,storedRows=0,skippedGroups=0;const groupResults=[];
  for(const name of names){const sourceFile=path.join(alpacaDir,name),symbols=groupSymbols(sourceFile),allowed=new Set(symbols),outputFile=path.join(outputDir,outputName(name));
    if(fs.existsSync(outputFile)){const existing=normalizeStoredRows(safeJson(outputFile),{allowedSymbols:allowed});storedRows+=existing.length;completed.add(name);skippedGroups++;groupResults.push({group:name,symbols:symbols.length,rows:existing.length,status:"STORED_VERIFIED_SKIP"});continue;}
    if(providerRequests>=maxProviderRequests)throw new Error("R21319_PROVIDER_REQUEST_BUDGET");if(providerRequests)await wait(1000);
    const url=new URL("https://data.alpaca.markets/v2/stocks/bars");url.search=new URLSearchParams({symbols:symbols.join(","),timeframe:"1Day",start:`${START}T00:00:00Z`,end:`${END}T23:59:59Z`,feed:"iex",adjustment:"split",limit:"10000"});
    providerRequests++;const response=await fetchImpl(url,{headers:{"APCA-API-KEY-ID":env.APCA_API_KEY_ID,"APCA-API-SECRET-KEY":env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(20000)});if(!response?.ok)throw new Error(`ALPACA_HTTP_${response?.status??0}`);
    let body;try{body=await response.json();}catch{throw new Error("R21319_ALPACA_JSON_INVALID");}
    const rows=normalizeR21319AlpacaBody(body,symbols);saveJson(outputFile,rows);const readback=normalizeStoredRows(safeJson(outputFile),{allowedSymbols:allowed});if(JSON.stringify(readback)!==JSON.stringify(rows))throw new Error("R21319_READBACK_FAILED");storedRows+=rows.length;completed.add(name);groupResults.push({group:name,symbols:symbols.length,rows:rows.length,status:"COLLECTED_STORED_VERIFIED"});saveJson(checkpointFile,{version:1,start:START,end:END,completedGroups:[...completed].sort(),updatedAt:new Date().toISOString()});
  }
  const outputFiles=names.map(name=>path.join(outputDir,outputName(name))),allRows=outputFiles.flatMap(file=>normalizeStoredRows(safeJson(file),{allowedSymbols:new Set(groupSymbols(path.join(alpacaDir,path.basename(file).replace(`r21319-${START}-${END}-`,""))))}));const dates=[...new Set(allRows.map(row=>row.tradeDate))].sort(),benchmark=benchmarkStatus(base),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const status=completed.size===names.length?"R21319_ALPACA_BACKFILL_STORED_VERIFIED":"R21319_ALPACA_BACKFILL_PARTIAL",nextBlocker=benchmark.coversBackfillStart?null:"LOCAL_BENCHMARK_DOES_NOT_COVER_BACKFILL_WINDOW";
  const report={version:"R2.13.19-ALPACA-TAIL-BALANCE-BACKFILL",generatedAt,status,mode:"APPROVED_LOCAL_RAW_BACKFILL",start:START,end:END,providerRequests,maxProviderRequests,rawRowsStored:true,storageVerified:completed.size===names.length,completedGroups:completed.size,totalGroups:names.length,skippedGroups,storedRows,uniqueStoredDates:dates.length,firstStoredDate:dates[0]??null,lastStoredDate:dates.at(-1)??null,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,formulaChanged:false,benchmarkSourceChanged:false,benchmark,tailBalanceReferenceReady:false,nextBlocker,groupResults};
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`),lines=["ZGMINI SECTOR FEAR & GREED R2.13.19 ALPACA TAIL BALANCE BACKFILL",`generatedAt=${generatedAt}`,`status=${status}`,`window=${START}..${END}`,`providerRequests=${providerRequests} maxProviderRequests=${maxProviderRequests}`,`groups=${completed.size}/${names.length} skipped=${skippedGroups}`,`storedRows=${storedRows} uniqueStoredDates=${dates.length} dates=${dates[0]??"NA"}..${dates.at(-1)??"NA"}`,`rawRowsStored=true storageVerified=${report.storageVerified}`,"publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","formulaChanged=false benchmarkSourceChanged=false",`benchmarkSource=${benchmark.source??"NA"} benchmarkWindow=${benchmark.firstDate??"NA"}..${benchmark.lastDate??"NA"} coversBackfillStart=${benchmark.coversBackfillStart}`,`tailBalanceReferenceReady=${report.tailBalanceReferenceReady}`,`nextBlocker=${nextBlocker??"NONE"}`,"","GROUP | SYMBOLS | ROWS | STATUS",...groupResults.map(item=>`${item.group} | ${item.symbols} | ${item.rows} | ${item.status}`),"","note=THIS_EXECUTES_ONLY_THE_USER_APPROVED_ALPACA_STOCK_BACKFILL_WINDOW","note=NO_BENCHMARK_SOURCE_FORMULA_REFERENCE_PUBLICATION_D1_OR_SCHEMA_CHANGE","note=EXISTING_OUTPUT_FILES_ARE_READ_BACK_VALIDATED_AND_SKIPPED_FOR_SAFE_RESUME"];
  saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){collectR21319AlpacaTailBalanceBackfill().then(result=>console.log(JSON.stringify({status:result.status,jsonFile:result.jsonFile,txtFile:result.txtFile,providerRequests:result.providerRequests,completedGroups:result.completedGroups,totalGroups:result.totalGroups,storedRows:result.storedRows,uniqueStoredDates:result.uniqueStoredDates,firstStoredDate:result.firstStoredDate,lastStoredDate:result.lastStoredDate,storageVerified:result.storageVerified,publicMutation:result.publicMutation,productionFormulaChanged:result.productionFormulaChanged,referenceRequirementChanged:result.referenceRequirementChanged,benchmark:result.benchmark,tailBalanceReferenceReady:result.tailBalanceReferenceReady,nextBlocker:result.nextBlocker},null,2))).catch(error=>{console.error(JSON.stringify({status:"FAILED",code:safeCode(error),publicMutation:false,d1Mutation:false,productionFormulaChanged:false,referenceRequirementChanged:false}));process.exitCode=1;});}
