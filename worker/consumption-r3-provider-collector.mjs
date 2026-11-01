import {extractRetail} from "./consumption-r3-census-lib.mjs";
import {extractStable9Adaptive} from "./consumption-r3-nyfed-lib.mjs";
import {unzipSelected} from '../lib/diagnostic-layer/xlsx-lite.mjs';

const finite=Number.isFinite;
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

function csvLine(s){
  const out=[];let cur="",q=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='"'){if(q&&s[i+1]==='"'){cur+='"';i++}else q=!q}
    else if(c===","&&!q){out.push(cur);cur=""}
    else cur+=c;
  }
  out.push(cur);return out;
}
function num(x){
  if(typeof x==="number"&&finite(x))return x;
  const s=String(x??"").replaceAll(",","").trim();
  if(!s||s==="."||s==="NA")return null;
  const n=Number(s);return finite(n)?n:null;
}
function ymd(y,m,d){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function qInfoFromDate(date){
  if(!validDate(date))throw new Error("C1_R3_DATE_INVALID");
  const [y,m,d]=date.split("-").map(Number),q=Math.floor((m-1)/3)+1;
  return {year:y,month:m,day:d,quarter:q,key:`${y}-Q${q}`};
}
function quarterEnd(year,q){return ymd(year,q*3,[31,30,30,31][q-1])}
function previousQuarter(year,q){
  return q>1?{year,quarter:q-1}:{year:year-1,quarter:4};
}
export function latestCompletedQuarter(asOf){
  const x=qInfoFromDate(asOf),end=quarterEnd(x.year,x.quarter);
  if(asOf>=end)return {quarter:`${x.year}-Q${x.quarter}`,scoreDate:end,year:x.year,q:x.quarter};
  const p=previousQuarter(x.year,x.quarter);
  return {quarter:`${p.year}-Q${p.quarter}`,scoreDate:quarterEnd(p.year,p.quarter),year:p.year,q:p.quarter};
}
function shiftQuarter(year,q,delta){
  let n=year*4+(q-1)+delta;
  const y=Math.floor(n/4),qq=(n%4+4)%4+1;
  return {year:y,q:qq};
}
export function lastQuarterEnds(scoreDate,count=4){
  const x=qInfoFromDate(scoreDate);
  if(scoreDate!==quarterEnd(x.year,x.quarter))throw new Error("C1_R3_SCORE_DATE_NOT_QUARTER_END");
  const out=[];
  for(let d=-(count-1);d<=0;d++){
    const z=shiftQuarter(x.year,x.quarter,d);
    out.push(quarterEnd(z.year,z.q));
  }
  return out;
}
export function buildAlfredBlockUrl(seriesId,vintages){
  if(typeof seriesId!=="string"||!seriesId)throw new Error("ALFRED_SERIES_REQUIRED");
  if(!Array.isArray(vintages)||!vintages.length||vintages.some(x=>!validDate(x)))throw new Error("ALFRED_VINTAGES_INVALID");
  const ids=Array(vintages.length).fill(seriesId).join(",");
  return `https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=${ids}&vintage_date=${vintages.join(",")}`;
}
export function buildCensusMartsUrl(observationMonth){
  if(!/^\d{4}-\d{2}$/.test(String(observationMonth)))throw new Error("CENSUS_MONTH_INVALID");
  const [y,m]=observationMonth.split("-");
  return `https://www2.census.gov/retail/releases/historical/marts/rs${y.slice(2)}${m}.xlsx`;
}
export function buildNyfedHhdcUrl(reportQuarter){
  const m=String(reportQuarter).match(/^(\d{4})-Q([1-4])$/);
  if(!m)throw new Error("NYFED_QUARTER_INVALID");
  return `https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/xls/hhd_c_report_${m[1]}q${m[2]}.xlsx`;
}
export function buildEiaWpsrUrl(archiveDate){
  if(!validDate(archiveDate))throw new Error("EIA_ARCHIVE_DATE_INVALID");
  const [y,m,d]=archiveDate.split("-");
  return `https://www.eia.gov/petroleum/supply/weekly/archive/${y}/${y}_${m}_${d}/csv/table9.csv`;
}
export function latestWednesday(scoreDate){
  if(!validDate(scoreDate))throw new Error("EIA_SCORE_DATE_INVALID");
  const d=new Date(`${scoreDate}T00:00:00Z`);
  while(d.getUTCDay()!==3)d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
export function sourcePlanForQuarter(scoreDate,{alfredSeries=[]}={}){
  const x=qInfoFromDate(scoreDate);
  if(scoreDate!==quarterEnd(x.year,x.quarter))throw new Error("C1_R3_SCORE_DATE_NOT_QUARTER_END");
  const observationMonth=`${x.year}-${String((x.quarter-1)*3+1).padStart(2,"0")}`;
  const p=previousQuarter(x.year,x.quarter);
  const reportQuarter=`${p.year}-Q${p.quarter}`;
  const archiveDate=latestWednesday(scoreDate);
  const vintages=lastQuarterEnds(scoreDate,4);
  const sources=[];
  for(const seriesId of alfredSeries)sources.push({
    sourceKey:`ALFRED:${seriesId}`,provider:"ALFRED",seriesId,vintages,url:buildAlfredBlockUrl(seriesId,vintages)
  });
  sources.push({sourceKey:"CENSUS:MARTS",provider:"CENSUS",observationMonth,url:buildCensusMartsUrl(observationMonth)});
  sources.push({sourceKey:"NYFED:HHDC",provider:"NYFED",reportQuarter,url:buildNyfedHhdcUrl(reportQuarter)});
  sources.push({sourceKey:"EIA:WPSR",provider:"EIA",archiveDate,url:buildEiaWpsrUrl(archiveDate)});
  return {quarter:`${x.year}-Q${x.quarter}`,scoreDate,observationMonth,reportQuarter,archiveDate,vintages,sources};
}

async function getBytes(fetchImpl,url){
  const r=await fetchImpl(url,{headers:{"accept":"*/*","user-agent":"ZGMINI-C1-R3.45P/1.0"}});
  if(!r||typeof r.arrayBuffer!=="function")throw new Error(`C1_R3_FETCH_RESPONSE_INVALID:${url}`);
  if(!r.ok)throw new Error(`C1_R3_HTTP_${r.status}:${url}`);
  return Buffer.from(await r.arrayBuffer());
}
export async function parseAlfredCurrent(buf,seriesId,scoreDate){
  if(buf[0]===0x50&&buf[1]===0x4b){
    const entries=await unzipSelected(buf,{include:name=>name.endsWith('.csv'),maxEntries:32,maxTotalBytes:20000000});
    const column=`${seriesId}_${scoreDate.replaceAll('-','')}`;
    const matches=[...entries.values()].filter(bytes=>csvLine(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/)[0]).includes(column));
    if(matches.length!==1)throw new Error(`ALFRED_CURRENT_COLUMN_MISSING:${seriesId}:${scoreDate}`);
    buf=Buffer.from(matches[0]);
  }
  const text=buf.toString("utf8").replace(/^\uFEFF/,"");
  const lines=text.trim().split(/\r?\n/),head=csvLine(lines[0]||"");
  const col=`${seriesId}_${scoreDate.replaceAll("-","")}`,idx=head.indexOf(col);
  if(idx<1)throw new Error(`ALFRED_CURRENT_COLUMN_MISSING:${seriesId}:${scoreDate}`);
  const rows=[];
  for(const line of lines.slice(1)){
    if(!line.trim())continue;
    const a=csvLine(line),date=a[0],value=num(a[idx]);
    if(validDate(date)&&finite(value))rows.push({date,value});
  }
  if(!rows.length)throw new Error(`ALFRED_ROWS_EMPTY:${seriesId}:${scoreDate}`);
  return {provider:"ALFRED",seriesId,vintageDate:scoreDate,rows};
}
function parseEia(buf,quarter,archiveDate){
  const table=buf.toString("utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean).map(csvLine);
  const r=table.find(a=>/product supplied/i.test(a[0]||"")&&/finished motor gasoline/i.test(a[1]||""));
  if(!r)throw new Error("EIA_WPSR_ROW_MISSING");
  const current=num(r[6]),priorYear=num(r[7]);
  if(!finite(current)||!finite(priorYear)||priorYear===0)throw new Error("EIA_WPSR_VALUES_INVALID");
  return {provider:"EIA",modelQuarter:quarter,archiveDate,current,priorYear};
}

export async function collectConsumptionR3NormalizedSources({
  scoreDate,
  alfredSeries,
  sourceKeys=null,
  fetchImpl=globalThis.fetch,
}={}){
  if(typeof fetchImpl!=="function")throw new Error("C1_R3_FETCH_REQUIRED");
  const plan=sourcePlanForQuarter(scoreDate,{alfredSeries});
  const requested=sourceKeys==null
    ? plan.sources
    : (()=>{
        if(!Array.isArray(sourceKeys)||!sourceKeys.length)throw new Error("C1_R3_SOURCE_KEYS_INVALID");
        const wanted=new Set(sourceKeys);
        const selected=plan.sources.filter(x=>wanted.has(x.sourceKey));
        if(selected.length!==wanted.size)throw new Error("C1_R3_SOURCE_KEYS_UNKNOWN");
        return selected;
      })();
  const payloads={},sourceUrls={},attempts=[];
  for(const src of requested){
    attempts.push({sourceKey:src.sourceKey,url:src.url});
    const buf=await getBytes(fetchImpl,src.url);
    if(src.provider==="ALFRED"){
      payloads[src.sourceKey]=await parseAlfredCurrent(buf,src.seriesId,scoreDate);
    }else if(src.provider==="CENSUS"){
      const z=extractRetail(buf,src.observationMonth);
      payloads[src.sourceKey]={provider:"CENSUS",modelQuarter:plan.quarter,observationMonth:src.observationMonth,metrics:z.metrics};
    }else if(src.provider==="NYFED"){
      const z=extractStable9Adaptive(buf,src.reportQuarter);
      payloads[src.sourceKey]={provider:"NYFED",modelQuarter:plan.quarter,reportQuarter:src.reportQuarter,metrics:Object.fromEntries(Object.entries(z).filter(([k])=>!k.startsWith("__")))};
    }else if(src.provider==="EIA"){
      payloads[src.sourceKey]=parseEia(buf,plan.quarter,src.archiveDate);
    }
    sourceUrls[src.sourceKey]=src.url;
  }
  return {
    status:"COLLECTED_NORMALIZED",
    revision:"R3.45P",
    quarter:plan.quarter,
    scoreDate,
    payloads,
    sourceUrls,
    providerRequests:attempts.length,
    scoreComputed:false,
    attempts,
  };
}

export const C1_R3_PROVIDER_COLLECTOR_CONTRACT=Object.freeze({
  revision:"R3.45P",
  freePublicSources:true,
  expectedSourceCount:70,
  collectionOnly:true,
  scoreComputed:false,
  storagePerformed:false,
});
