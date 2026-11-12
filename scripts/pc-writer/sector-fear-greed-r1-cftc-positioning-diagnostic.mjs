import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const DATASET="yw9f-hn96";
const API_BASE=`https://publicreporting.cftc.gov/resource/${DATASET}.json`;
const SINCE="2019-01-01T00:00:00.000";
const REPORT_JSON="local-sector-fear-greed-r1-cftc-positioning-diagnostic.json";
const REPORT_TXT="local-sector-fear-greed-r1-cftc-positioning-diagnostic.txt";
export const CFTC_SECTOR_CODES=Object.freeze({
  communication:"13874P",
  discretionary:"138747",
  staples:"138748",
  energy:"138749",
  financials:"13874C",
  healthcare:"13874E",
  industrials:"13874F",
  materials:"13874H",
  realEstate:"13874R",
  technology:"13874I",
  utilities:"13874J"
});

const finite=value=>Number.isFinite(Number(value));
const isoDay=value=>{const s=String(value??"").slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(`${s}T00:00:00Z`))?s:null;};
const num=(row,...keys)=>{for(const key of keys){if(finite(row?.[key]))return Number(row[key]);}return null;};
const dayMs=86400000;
const daysBetween=(a,b)=>Math.round((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/dayMs);

export function normalizeCftcPositionRows(rows=[]){
  const out=[];
  const seen=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=isoDay(row?.report_date_as_yyyy_mm_dd);
    const code=String(row?.cftc_contract_market_code??"").trim();
    const openInterest=num(row,"open_interest_all");
    const levLong=num(row,"lev_money_positions_long");
    const levShort=num(row,"lev_money_positions_short");
    const assetLong=num(row,"asset_mgr_positions_long");
    const assetShort=num(row,"asset_mgr_positions_short");
    if(!date||!code||!finite(openInterest)||openInterest<=0||![levLong,levShort,assetLong,assetShort].every(Number.isFinite))continue;
    const normalized={date,code,market:String(row?.contract_market_name??row?.market_and_exchange_names??"").slice(0,120),openInterest,levLong,levShort,assetLong,assetShort};
    const key=`${code}|${date}`;
    const prior=seen.get(key);
    if(prior&&JSON.stringify(prior)!==JSON.stringify(normalized))throw new Error("CFTC_POSITIONING_DUPLICATE_CONFLICT");
    if(!prior){seen.set(key,normalized);out.push(normalized);}
  }
  return out.sort((a,b)=>a.code.localeCompare(b.code)||a.date.localeCompare(b.date));
}

export function summarizeCftcPositionCoverage(rows,{asOfDate=new Date().toISOString().slice(0,10)}={}){
  const byCode=new Map();
  for(const row of rows){const list=byCode.get(row.code)??[];list.push(row);byCode.set(row.code,list);}
  const sectors=[];
  for(const [sector,code] of Object.entries(CFTC_SECTOR_CODES)){
    const list=(byCode.get(code)??[]).sort((a,b)=>a.date.localeCompare(b.date));
    let maxGapDays=null;
    for(let i=1;i<list.length;i++){const gap=daysBetween(list[i-1].date,list[i].date);maxGapDays=maxGapDays===null?gap:Math.max(maxGapDays,gap);}
    const cutoff=new Date(`${asOfDate}T00:00:00Z`);cutoff.setUTCDate(cutoff.getUTCDate()-1096);const cutoffDay=cutoff.toISOString().slice(0,10);
    const trailing3y=list.filter(row=>row.date>=cutoffDay&&row.date<=asOfDate);
    const latest=list.at(-1)?.date??null;
    sectors.push({sector,code,rows:list.length,first:list[0]?.date??null,last:latest,trailing3yRows:trailing3y.length,has156Weeks:trailing3y.length>=156,maxGapDays,latestAgeDays:latest?daysBetween(latest,asOfDate):null});
  }
  return {status:sectors.every(x=>x.has156Weeks)?"CANDIDATE_HISTORY_READY":"CANDIDATE_HISTORY_PARTIAL",requiredWeeklyReferenceObservations:156,sectors};
}

function buildUrl(){
  const codes=Object.values(CFTC_SECTOR_CODES).map(code=>`'${code}'`).join(",");
  const select=["report_date_as_yyyy_mm_dd","cftc_contract_market_code","contract_market_name","market_and_exchange_names","open_interest_all","asset_mgr_positions_long","asset_mgr_positions_short","lev_money_positions_long","lev_money_positions_short"].join(",");
  const where=`cftc_contract_market_code in (${codes}) AND report_date_as_yyyy_mm_dd >= '${SINCE}'`;
  const q=new URLSearchParams({"$select":select,"$where":where,"$order":"report_date_as_yyyy_mm_dd ASC","$limit":"5000"});
  return `${API_BASE}?${q}`;
}

function safeCode(error){const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:"CFTC_POSITIONING_DIAGNOSTIC_FAILED";}
function atomicWrite(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);}

export async function runCftcPositioningDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=new Date()}={}){
  if(typeof fetchImpl!=="function")throw new Error("FETCH_UNAVAILABLE");
  const url=buildUrl();
  const response=await fetchImpl(url,{headers:{accept:"application/json","user-agent":"ZGMINI-sector-fear-greed-shadow/1.0"},redirect:"error"});
  if(!response?.ok)throw new Error(`CFTC_HTTP_${response?.status??"UNKNOWN"}`);
  const text=await response.text();
  if(text.length>8_000_000)throw new Error("CFTC_BODY_TOO_LARGE");
  let raw;try{raw=JSON.parse(text);}catch{throw new Error("CFTC_JSON_INVALID");}
  const rows=normalizeCftcPositionRows(raw);
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const asOfDate=generatedAt.slice(0,10);
  const coverage=summarizeCftcPositionCoverage(rows,{asOfDate});
  const payload={version:1,generatedAt,mode:"SHADOW_DIAGNOSTIC_ONLY",source:"CFTC TFF Combined",dataset:DATASET,sourceRights:"US_GOVERNMENT_PUBLIC_DOMAIN",providerRequests:1,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,...coverage};
  const jsonFile=path.join(base,REPORT_JSON),txtFile=path.join(base,REPORT_TXT);
  atomicWrite(jsonFile,JSON.stringify(payload,null,2)+"\n");
  const lines=["ZGMINI SECTOR FEAR & GREED R1 CFTC POSITIONING DIAGNOSTIC",`generatedAt=${generatedAt}`,`status=${payload.status}`,`source=CFTC TFF Combined dataset=${DATASET}`,"sourceRights=US_GOVERNMENT_PUBLIC_DOMAIN",`providerRequests=${payload.providerRequests}`,`requiredWeeklyReferenceObservations=${payload.requiredWeeklyReferenceObservations}`,"SECTOR | CODE | ROWS | FIRST | LAST | 3Y_ROWS | 156_READY | MAX_GAP_DAYS | LATEST_AGE_DAYS"];
  for(const row of payload.sectors)lines.push(`${row.sector} | ${row.code} | ${row.rows} | ${row.first??"MISSING"} | ${row.last??"MISSING"} | ${row.trailing3yRows} | ${row.has156Weeks?"YES":"NO"} | ${row.maxGapDays??"MISSING"} | ${row.latestAgeDays??"MISSING"}`);
  lines.push("rawRowsStored=false publicMutation=false dbSchemaChanged=false productionFormulaChanged=false");
  lines.push("note=DIAGNOSTIC_ONLY_NO_SCORE_NO_WEIGHT_CHANGE");
  atomicWrite(txtFile,lines.join("\n")+"\n");
  return {...payload,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runCftcPositioningDiagnostic().then(result=>console.log(JSON.stringify({status:result.status,providerRequests:result.providerRequests,sectors:result.sectors,jsonFile:result.jsonFile,txtFile:result.txtFile},null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error),publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false}));process.exitCode=1;});
}
