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
export async function loadPc1Series(db,{asOf}={}){
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
