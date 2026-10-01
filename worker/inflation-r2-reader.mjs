import {INFLATION_PIT_SERIES} from "./inflation-pit-backfill.mjs";
import {loadStoredInflationPitSeries} from "./inflation-pit-reader.mjs";
import {INFLATION_PCE_PC1_MODE,INFLATION_PCE_PC1_SERIES} from "./inflation-pce-pc1-store.mjs";
import {
  buildInflationR2StoredHistory,
  calculateInflationR2At,
  snapshotInflationR2Features,
  INFLATION_R2_METHOD_REVISION,
} from "../lib/diagnostic-layer/inflation-r2-stored.mjs";

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function parseArray(value){
  if(typeof value!=="string"||!value)return [];
  try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[];}catch{return [];}
}
async function firstRow(db,sql,args){
  const statement=db.prepare(sql).bind(...args);
  if(typeof statement.first==="function")return await statement.first();
  if(typeof statement.all==="function"){
    const out=await statement.all();
    return Array.isArray(out?.results)?out.results[0]??null:null;
  }
  throw new Error("INFLATION_R2_DB_READ_UNSUPPORTED");
}
async function loadPc1Series(db,{asOf}={}){
  const series={},snapshots={},missing=[],issues=[];
  for(const dataset of INFLATION_PCE_PC1_SERIES){
    try{
      const snapshot=await firstRow(
        db,
        `SELECT snapshot_sha256,retrieved_at,history_mode,row_count,chunk_hashes_json
           FROM api_history_snapshots_v1
          WHERE provider=? AND dataset=? AND history_mode=?
          ORDER BY retrieved_at DESC
          LIMIT 1`,
        ["FRED",dataset,INFLATION_PCE_PC1_MODE],
      );
      if(!snapshot){missing.push(dataset);continue;}
      const rows=[];
      for(const chunkHash of parseArray(snapshot.chunk_hashes_json)){
        const chunk=await firstRow(
          db,
          `SELECT payload_json FROM api_history_chunks_v1
            WHERE provider=? AND dataset=? AND chunk_sha256=? LIMIT 1`,
          ["FRED",dataset,chunkHash],
        );
        const payload=parseArray(chunk?.payload_json);
        if(!payload.length)throw new Error(`CHUNK_MISSING_${chunkHash}`);
        rows.push(...payload);
      }
      const filtered=rows
        .map(row=>({
          observationDate:row?.observationDate,
          availableAt:row?.availableAt,
          value:Number(row?.value),
        }))
        .filter(row=>validDate(row.observationDate)&&validDate(row.availableAt)&&row.availableAt<=asOf&&finite(row.value))
        .sort((a,b)=>a.observationDate.localeCompare(b.observationDate)||a.availableAt.localeCompare(b.availableAt));
      if(!filtered.length){missing.push(dataset);continue;}
      series[dataset]=filtered;
      snapshots[dataset]={
        snapshotSha256:snapshot.snapshot_sha256??null,
        retrievedAt:snapshot.retrieved_at??null,
        historyMode:snapshot.history_mode??null,
        rowCount:Number(snapshot.row_count??0),
      };
    }catch(error){
      missing.push(dataset);
      issues.push(`${dataset}:${error instanceof Error?error.message:"UNKNOWN"}`);
    }
  }
  return {series,snapshots,missing,issues};
}
function monthEnds(asOf,count=12){
  const end=new Date(`${asOf}T00:00:00Z`),out=[];
  for(let offset=count-1;offset>=0;offset-=1){
    const d=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-offset+1,0));
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}
function partial(reason,extra={}){
  return {
    status:"PARTIAL",
    score:null,
    missingFactors:[reason],
    indicators:[],
    trend:[],
    freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY",
    updatedAt:null,
    methodologyVersion:INFLATION_R2_METHOD_REVISION,
    interpretation:"Inflation R2: stored PIT history only; live provider fallback forbidden",
    ...extra,
  };
}

export async function loadStoredInflationR2Domain(db,{asOf}={}){
  if(!validDate(asOf))throw new Error("INFLATION_R2_ASOF_INVALID");
  if(!db||typeof db.prepare!=="function")return partial("INFLATION_R2_DB_UNAVAILABLE");
  const [pit,pc1]=await Promise.all([
    loadStoredInflationPitSeries(db,{asOf,seriesIds:[...INFLATION_PIT_SERIES]}),
    loadPc1Series(db,{asOf}),
  ]);
  if(pit.status!=="READY_STORED_PIT_HISTORY"){
    return partial("INFLATION_R2_PIT_INCOMPLETE",{storage:{pitStatus:pit.status,pc1Missing:pc1.missing}});
  }
  if(pc1.missing.length||pc1.issues.length){
    return partial("INFLATION_R2_PCE_PC1_INCOMPLETE",{storage:{pitStatus:pit.status,pc1Missing:pc1.missing,pc1Issues:pc1.issues}});
  }

  const history=buildInflationR2StoredHistory({pitSeries:pit.series,pcePc1:pc1.series});
  const current=calculateInflationR2At(history,asOf);
  const features=snapshotInflationR2Features(history,asOf);
  if(current.status!=="READY"){
    return partial("INFLATION_R2_COMPONENT_MISSING",{missingFactors:current.missing,axes:current.axes});
  }
  const labels=[
    ["목표안정","TARGET_STABILITY"],
    ["기조모멘텀","UNDERLYING_MOMENTUM"],
    ["기대인플레","EXPECTATIONS"],
    ["공급압력","SUPPLY_PIPELINE"],
  ];
  const trend=monthEnds(asOf,12)
    .map(date=>({date,result:calculateInflationR2At(history,date)}))
    .filter(item=>item.result.status==="READY")
    .map(item=>({label:item.date,value:item.result.score}));
  const retrievedAts=[
    ...Object.values(pit.snapshots??{}).map(item=>item?.retrievedAt),
    ...Object.values(pc1.snapshots??{}).map(item=>item?.retrievedAt),
  ].filter(value=>typeof value==="string"&&value).sort();

  return {
    status:"READY",
    score:current.score,
    missingFactors:[],
    indicators:labels.map(([name,axis])=>({
      name,
      status:"READY",
      score:current.axes[axis],
      asOfDate:asOf,
      source:"STORED_PIT_HISTORY",
      freshness:"INITIAL_RELEASE_ONLY",
    })),
    trend,
    freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY",
    updatedAt:retrievedAts.at(-1)??null,
    asOfDate:asOf,
    methodologyVersion:INFLATION_R2_METHOD_REVISION,
    interpretation:"Inflation R2: 7 validated axes, equal 1/7 robust non-fitted top-level weights; stored PIT history only",
    axes:current.axes,
    features,
    storage:{
      pitStatus:pit.status,
      pitLookAheadSafe:pit.lookAheadSafe===true,
      pcePc1Mode:INFLATION_PCE_PC1_MODE,
    },
  };
}

export const INFLATION_R2_READER_CONTRACT=Object.freeze({
  schemaVersion:1,
  scoreSource:"STORED_HISTORY_ONLY",
  pitMode:"INITIAL_RELEASE_ONLY",
  pcePc1Mode:INFLATION_PCE_PC1_MODE,
  liveProviderFallback:false,
  networkRequests:0,
  providerRequests:0,
});
