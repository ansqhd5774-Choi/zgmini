import {
  EMPLOYMENT_R4_CORE_STATES,
  EMPLOYMENT_R4_DIFFUSION_SERIES,
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
} from "./employment-r4-shadow-contract.mjs";

export const DOL_ETA539_URL = "https://oui.doleta.gov/unemploy/csv/ar539.csv";
export const BLS_PUBLIC_API_URL = "https://api.bls.gov/publicAPI/v1/timeseries/data/";

const DAY = 86400000;
const finite = value => typeof value === "number" && Number.isFinite(value);
const coreSet = new Set(EMPLOYMENT_R4_CORE_STATES);

function stable(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,"0")).join("");
}
function csvLine(line) {
  const out=[];let cur="",quoted=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(quoted){
      if(c==='"'&&line[i+1]==='"'){cur+='"';i++;}
      else if(c==='"')quoted=false;
      else cur+=c;
    } else {
      if(c==='"')quoted=true;
      else if(c===','){out.push(cur);cur="";}
      else cur+=c;
    }
  }
  out.push(cur);return out;
}
function parseCsv(text) {
  const lines=String(text).replace(/\r/g,"").split("\n").filter(Boolean);
  const header=csvLine(lines.shift()??"").map(v=>v.trim());
  const rows=lines.map(line=>{const vals=csvLine(line),row={};for(let i=0;i<header.length;i++)row[header[i]]=vals[i]??"";return row;});
  return {header,rows};
}
function parseDate(value) {
  const s=String(value??"").trim();
  let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m)return Date.UTC(+m[3],+m[1]-1,+m[2]);
  m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if(m)return Date.UTC(+m[1],+m[2]-1,+m[3]);
  return null;
}
const isoDate = ts => finite(ts) ? new Date(ts).toISOString().slice(0,10) : null;
function periodEnd(year, period) {
  const month=Number(String(period).replace(/^M/,""));
  if(!Number.isInteger(month)||month<1||month>12)return null;
  return new Date(Date.UTC(Number(year),month,0)).toISOString().slice(0,10);
}
function retrievedIso(value) {
  const out = value instanceof Date ? value.toISOString() : String(value ?? "");
  if(!Number.isFinite(Date.parse(out)))throw new TypeError("RETRIEVED_AT_INVALID");
  return out;
}

export async function parseEta539ShadowRows(csvText, {
  retrievedAt,
  historyWeeks = 60,
  sourceUrl = DOL_ETA539_URL,
} = {}) {
  const rt=retrievedIso(retrievedAt);
  const parsed=parseCsv(csvText);
  const hm=new Map(parsed.header.map(h=>[h.toLowerCase(),h]));
  for(const key of ["st","rptdate","c2","c3"]) if(!hm.has(key)) throw new Error(`ETA539_FIELD_MISSING:${key}`);
  const latestByStateWeek=new Map();
  for(const raw of parsed.rows){
    const st=String(raw[hm.get("st")]??"").trim().toUpperCase();
    if(!coreSet.has(st))continue;
    const week=parseDate(raw[hm.get("c2")]),report=parseDate(raw[hm.get("rptdate")]);
    const value=Number(String(raw[hm.get("c3")]??"").replace(/,/g,""));
    if(!finite(week)||!finite(value))continue;
    const key=`${st}|${week}`,old=latestByStateWeek.get(key);
    if(!old||Number(report??-Infinity)>=Number(old.report??-Infinity)) latestByStateWeek.set(key,{st,week,report,value,raw});
  }
  const byWeek=new Map();
  for(const row of latestByStateWeek.values()){const a=byWeek.get(row.week)??[];a.push(row);byWeek.set(row.week,a);}
  const completeWeeks=[...byWeek.entries()].filter(([,a])=>new Set(a.map(r=>r.st)).size===EMPLOYMENT_R4_CORE_STATES.length).map(([w])=>w).sort((a,b)=>b-a);
  const selected=completeWeeks.slice(0,Math.max(1,Number(historyWeeks)||60)).sort((a,b)=>a-b);
  const latest=selected.at(-1)??null;
  const responseHash=await sha256Hex(String(csvText));
  const rows=[];
  for(const week of selected){
    const list=(byWeek.get(week)??[]).sort((a,b)=>a.st.localeCompare(b.st));
    for(const item of list){
      const reportDate=isoDate(item.report);
      const rawCanonical=JSON.stringify(stable({st:item.st,reflectedWeek:isoDate(item.week),reportDate,value:item.value}));
      rows.push({
        logicalSeriesId:"STATE_INITIAL_CLAIMS",
        provider:"DOL_ETA",
        providerSeriesId:"ETA539:C3",
        geographyType:"STATE",
        geographyCode:item.st,
        frequency:"WEEKLY",
        unit:"CLAIMS_COUNT",
        seasonalAdjustment:"NOT_ASSERTED",
        populationCoverage:"STATE_UI_INITIAL_CLAIMS",
        observationDate:isoDate(item.week),
        releaseDate:null,
        availableAt:week===latest?rt:null,
        retrievedAt:rt,
        value:item.value,
        sourceRevision:reportDate?`ETA539:RPTDATE:${reportDate}`:null,
        sourceHash:await sha256Hex(rawCanonical),
        qualityStatus:"READY_CORE_51",
        pitClass:week===latest?EMPLOYMENT_R4_PIT_CLASSES.forwardObserved:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
        schemaVersion:EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
        provenance:{sourceUrl,field:"c3",reflectedWeek:isoDate(item.week),reportPeriodEnding:reportDate,responseHash,rawRecordHash:await sha256Hex(rawCanonical),universe:"50_STATES_PLUS_DC"},
      });
    }
  }
  return {rows,meta:{sourceUrl,responseHash,selectedWeeks:selected.map(isoDate),latestCompleteWeek:isoDate(latest),coreCount:EMPLOYMENT_R4_CORE_STATES.length}};
}

export async function parseBlsDiffusionShadowRows(payload, {
  retrievedAt,
  sourceUrl = BLS_PUBLIC_API_URL,
} = {}) {
  const rt=retrievedIso(retrievedAt);
  const series=Array.isArray(payload?.Results?.series)?payload.Results.series:[];
  const responseHash=await sha256Hex(JSON.stringify(stable(payload)));
  const rows=[];
  for(const s of series){
    const meta=EMPLOYMENT_R4_DIFFUSION_SERIES[s.seriesID];
    if(!meta)continue;
    const data=(s.data??[]).filter(d=>/^M\d{2}$/.test(d.period??"")&&finite(Number(d.value))).map(d=>({...d,value:Number(d.value),observationDate:periodEnd(d.year,d.period)})).filter(d=>d.observationDate).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    const latest=data.at(-1)?.observationDate??null;
    for(const item of data){
      const canonical=JSON.stringify(stable({seriesID:s.seriesID,year:item.year,period:item.period,value:item.value,footnotes:item.footnotes??[]}));
      const latestRow=item.observationDate===latest;
      rows.push({
        logicalSeriesId:meta.logicalSeriesId,
        provider:"BLS_CES_SAE",
        providerSeriesId:s.seriesID,
        geographyType:"AGGREGATE_GROUP",
        geographyCode:meta.geographyCode,
        frequency:"MONTHLY",
        unit:"DIFFUSION_INDEX_0_100",
        seasonalAdjustment:"SA",
        populationCoverage:meta.geographyCode,
        observationDate:item.observationDate,
        releaseDate:null,
        availableAt:latestRow?rt:null,
        retrievedAt:rt,
        value:item.value,
        sourceRevision:null,
        sourceHash:await sha256Hex(canonical),
        qualityStatus:"READY",
        pitClass:latestRow?EMPLOYMENT_R4_PIT_CLASSES.forwardObserved:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,
        schemaVersion:EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
        provenance:{sourceUrl,seriesID:s.seriesID,observationPeriod:`${item.year}-${item.period}`,observationDateConvention:"PERIOD_END",horizonMonths:meta.horizonMonths,footnotes:item.footnotes??[],responseHash,rawRecordHash:await sha256Hex(canonical)},
      });
    }
  }
  return {rows,meta:{sourceUrl,responseHash,seriesRequested:Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES),seriesReturned:[...new Set(rows.map(r=>r.providerSeriesId))]}};
}

export function createEmploymentR4ShadowProvider({fetchImpl=globalThis.fetch, now=()=>new Date()}={}) {
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");
  return {
    async fetchStateClaims({historyWeeks=60}={}) {
      const retrievedAt=now().toISOString();
      const response=await fetchImpl(DOL_ETA539_URL,{headers:{"user-agent":"ZGMINI-R4-Shadow/1.0"}});
      if(!response?.ok)throw new Error(`DOL_ETA539_HTTP_${response?.status??"ERR"}`);
      const text=await response.text();
      const parsed=await parseEta539ShadowRows(text,{retrievedAt,historyWeeks});
      return {...parsed,requestCount:1,retrievedAt};
    },
    async fetchGeographicDiffusion({startyear=null,endyear=null}={}) {
      const retrievedAt=now().toISOString();
      const currentYear=Number(retrievedAt.slice(0,4));
      const start=String(startyear??Math.max(1991,currentYear-1)),end=String(endyear??currentYear);
      const seriesid=Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES);
      let requestCount=0;

      const primaryResponse=await fetchImpl(BLS_PUBLIC_API_URL,{
        method:"POST",
        headers:{"content-type":"application/json","user-agent":"ZGMINI-R4-Shadow/1.0"},
        body:JSON.stringify({seriesid,startyear:start,endyear:end})
      });
      requestCount++;
      if(!primaryResponse?.ok)throw new Error(`BLS_DIFFUSION_HTTP_${primaryResponse?.status??"ERR"}`);
      const primaryPayload=await primaryResponse.json();
      const primaryParsed=await parseBlsDiffusionShadowRows(primaryPayload,{retrievedAt});
      let missing=seriesid.filter(id=>!primaryParsed.meta.seriesReturned.includes(id));

      const mergedSeries=Array.isArray(primaryPayload?.Results?.series)
        ? [...primaryPayload.Results.series]
        : [];
      const fallbackDiagnostics=[];

      if(missing.length){
        for(const id of missing){
          const url=`${BLS_PUBLIC_API_URL}${encodeURIComponent(id)}`;
          const response=await fetchImpl(url,{headers:{"user-agent":"ZGMINI-R4-Shadow/1.0"}});
          requestCount++;
          if(!response?.ok){
            fallbackDiagnostics.push({seriesID:id,status:"HTTP_ERROR",httpStatus:response?.status??null});
            continue;
          }
          const payload=await response.json();
          const returned=Array.isArray(payload?.Results?.series)?payload.Results.series:[];
          const exact=returned.find(x=>x?.seriesID===id);
          if(exact){
            mergedSeries.push(exact);
            fallbackDiagnostics.push({seriesID:id,status:"READY"});
          }else{
            fallbackDiagnostics.push({
              seriesID:id,
              status:"MISSING",
              apiStatus:payload?.status??null,
              message:Array.isArray(payload?.message)?payload.message.map(String):[],
            });
          }
        }
      }

      const mergedPayload={
        status:primaryPayload?.status??null,
        responseTime:primaryPayload?.responseTime??null,
        message:primaryPayload?.message??[],
        Results:{series:mergedSeries},
      };
      const parsed=await parseBlsDiffusionShadowRows(mergedPayload,{retrievedAt});
      missing=seriesid.filter(id=>!parsed.meta.seriesReturned.includes(id));
      if(missing.length){
        const primaryMessage=Array.isArray(primaryPayload?.message)
          ? primaryPayload.message.map(String).join(" | ").slice(0,800)
          : String(primaryPayload?.message??"").slice(0,800);
        throw new Error(`BLS_DIFFUSION_MISSING:${missing.join(",")}:PRIMARY_STATUS=${String(primaryPayload?.status??"UNKNOWN")}:PRIMARY_MESSAGE=${primaryMessage}`);
      }

      return {
        ...parsed,
        requestCount,
        retrievedAt,
        startyear:start,
        endyear:end,
        transport:{
          primary:"MULTI_SERIES_POST",
          primaryStatus:primaryPayload?.status??null,
          primaryReturned:primaryParsed.meta.seriesReturned.length,
          fallbackUsed:fallbackDiagnostics.length>0,
          fallbackRequests:fallbackDiagnostics.length,
          fallbackDiagnostics,
        },
      };
    },
  };
}

export const EMPLOYMENT_R4_SHADOW_PROVIDER_CONTRACT = Object.freeze({
  normalRequestsPerRun:2,
  maxRequestsPerRun:10,
  claimsUrl:DOL_ETA539_URL,
  diffusionUrl:BLS_PUBLIC_API_URL,
  diffusionPrimaryTransport:"MULTI_SERIES_POST",
  diffusionFallbackTransport:"SINGLE_SERIES_GET_FOR_MISSING_ONLY",
  bedRequests:0,
  scoreComputed:false,
});
