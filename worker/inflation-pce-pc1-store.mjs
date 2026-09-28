import {persistInflationApiHistory} from "./api-history-store.mjs";
import {loadStoredInflationPitSeries} from "./inflation-pit-reader.mjs";

export const INFLATION_PCE_PC1_MODE="PCE_SAME_VINTAGE_PC1";
export const INFLATION_PCE_PC1_SERIES=Object.freeze(["PCEPILFE","PCEPI"]);
const EXCEPTIONS=Object.freeze({
  PCEPILFE:Object.freeze({"2003-11-01|2003-12-23":0.8}),
  PCEPI:Object.freeze({"2003-11-01|2003-12-23":1.3}),
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const minusMonths=(dateStr,n)=>{
  const [y,m,d]=dateStr.split("-").map(Number);
  return new Date(Date.UTC(y,m-1-n,d)).toISOString().slice(0,10);
};
export const pcePc1VintageField=(seriesId,vintageDate)=>
  `${seriesId}_PC1_${vintageDate.replaceAll("-","")}`;

function numericCell(value){
  if(value===null||value===undefined||value===""||value==="."||value==="#NA")return null;
  const number=Number(value);
  return finite(number)?number:null;
}
export function approvedPcePc1Exception(seriesId,observationDate,availableAt){
  const value=EXCEPTIONS?.[seriesId]?.[`${observationDate}|${availableAt}`];
  return finite(value)?value:null;
}
async function loadSchedule(db,asOf){
  const reader=await loadStoredInflationPitSeries(db,{asOf,seriesIds:[...INFLATION_PCE_PC1_SERIES]});
  if(reader.status!=="READY_STORED_PIT_HISTORY"||reader.issues.length){
    throw new Error("PCE_PC1_PIT_SCHEDULE_UNAVAILABLE");
  }
  return Object.fromEntries(INFLATION_PCE_PC1_SERIES.map(seriesId=>[
    seriesId,
    reader.series[seriesId].map(row=>({
      observationDate:row.observationDate,
      availableAt:row.availableAt,
    })),
  ]));
}
async function fetchPc1(seriesId,schedule,{key,fetchImpl=globalThis.fetch}={}){
  if(typeof key!=="string"||!key.trim())throw new Error("FRED_API_KEY_MISSING");
  if(!schedule.length)throw new Error(`PCE_PC1_EMPTY_SCHEDULE_${seriesId}`);
  const vintages=[...new Set(schedule.map(row=>row.availableAt))].sort();
  const url=new URL("https://api.stlouisfed.org/fred/series/observations");
  url.search=new URLSearchParams({
    series_id:seriesId,
    api_key:key.trim(),
    file_type:"json",
    output_type:"2",
    units:"pc1",
    observation_start:minusMonths(schedule[0].observationDate,12),
    observation_end:schedule.at(-1).observationDate,
    vintage_dates:vintages.join(","),
    limit:"100000",
  });

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),90000);
  let response;
  try{
    response=await fetchImpl(url,{signal:controller.signal,headers:{accept:"application/json"}});
  }finally{
    clearTimeout(timer);
  }
  if(!response?.ok)throw new Error(`FRED_HTTP_${response?.status??"UNKNOWN"}_${seriesId}`);
  const data=await response.json();
  if(data?.error_code)throw new Error(`FRED_API_ERROR_${seriesId}_${String(data.error_code)}`);
  if(Number(data?.output_type)!==2||String(data?.units)!=="pc1"||!Array.isArray(data?.observations)){
    throw new Error(`FRED_PC1_SCHEMA_${seriesId}`);
  }
  const byDate=new Map();
  for(const row of data.observations){
    if(validDate(String(row?.date??"")))byDate.set(row.date,row);
  }

  const rows=[],missing=[];
  for(const item of schedule){
    const source=byDate.get(item.observationDate);
    let value=numericCell(source?.[pcePc1VintageField(seriesId,item.availableAt)]);
    let vintageMethod="FRED_OUTPUT_TYPE_2_PC1_SAME_VINTAGE";
    if(value===null){
      value=approvedPcePc1Exception(seriesId,item.observationDate,item.availableAt);
      if(value!==null)vintageMethod="BEA_TABLE11_APPROVED_R29_33_EXCEPTION";
    }
    if(value===null){
      missing.push(item);
      continue;
    }
    rows.push({
      observationDate:item.observationDate,
      value,
      releaseDate:item.availableAt,
      availableAt:item.availableAt,
      realtimeStart:item.availableAt,
      realtimeEnd:null,
      vintageId:item.availableAt,
      vintageMethod,
      revision:"INITIAL_RELEASE_PC1",
    });
  }
  return {seriesId,rows,missing,requestCount:1};
}

export async function persistInflationPcePc1(db,{
  key,
  asOf,
  fetchImpl=globalThis.fetch,
  retrievedAt=new Date().toISOString(),
}={}){
  if(!validDate(asOf))throw new Error("PCE_PC1_ASOF_INVALID");
  const schedule=await loadSchedule(db,asOf);
  const results=await Promise.all(
    INFLATION_PCE_PC1_SERIES.map(seriesId=>fetchPc1(seriesId,schedule[seriesId],{key,fetchImpl}))
  );
  const missing=results.flatMap(result=>result.missing.map(row=>({seriesId:result.seriesId,...row})));
  if(missing.length){
    return {
      status:"PARTIAL",
      requestCount:results.length,
      automaticRetries:0,
      missing,
      storage:null,
    };
  }
  const storageInputs=results.map(result=>({
    seriesId:result.seriesId,
    status:"READY_PCE_SAME_VINTAGE_PC1",
    authority:"FRED+BEA_APPROVED_EXCEPTION",
    transport:"FRED_OUTPUT_TYPE_2_UNITS_PC1",
    frequency:"MONTHLY",
    historyMode:INFLATION_PCE_PC1_MODE,
    releaseDatePolicy:"STORED_INITIAL_RELEASE_AVAILABLE_AT",
    availableAtPolicy:"STORED_INITIAL_RELEASE_AVAILABLE_AT",
    sourceCount:result.rows.length,
    requestCount:1,
    rows:result.rows,
  }));
  const storage=await persistInflationApiHistory(db,storageInputs,{asOf,retrievedAt});
  return {
    status:storage.status==="STORED"?"STORED":"PARTIAL",
    requestCount:results.length,
    automaticRetries:0,
    missing:[],
    storage,
  };
}

export const INFLATION_PCE_PC1_CONTRACT=Object.freeze({
  schemaVersion:1,
  role:"API_COLLECTION_AND_STORAGE_ONLY",
  historyMode:INFLATION_PCE_PC1_MODE,
  providerRequests:2,
  automaticRetries:0,
  scoringReadsProvider:false,
  approvedExceptions:Object.freeze([
    Object.freeze({seriesId:"PCEPILFE",observationDate:"2003-11-01",availableAt:"2003-12-23",value:0.8}),
    Object.freeze({seriesId:"PCEPI",observationDate:"2003-11-01",availableAt:"2003-12-23",value:1.3}),
  ]),
});
