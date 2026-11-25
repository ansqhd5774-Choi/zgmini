import {createHash} from "node:crypto";
import {EMPLOYMENT_R4_SHADOW_TABLES as T,EMPLOYMENT_R4_CORE_STATES as STATES} from "./employment-r4-shadow-contract.mjs";
import {prepareEmploymentHistoryRepair} from "./employment-r6-history-repair-preview.mjs";

const series="STATE_INITIAL_CLAIMS",geoType="STATE";
const identity=["logical_series_id","geography_type","geography_code","observation_date"];
const copy=["logical_series_id","provider","provider_series_id","geography_type","geography_code",
 "frequency","unit","seasonal_adjustment","population_coverage","observation_date",
 "release_date","value","source_revision","source_hash","quality_status","pit_class","schema_version"];
const cols=[...copy,"available_at","retrieved_at","provenance_json","change_type","recorded_at"];
const where=identity.map(k=>k+"=?").join(" AND ");
const sha=s=>createHash("sha256").update(s).digest("hex");
const canonical=x=>Object.entries(x).sort(([a],[b])=>a.localeCompare(b));

function readPlan(db,receipt,recordedAt){
 const currentRows=db.prepare("SELECT * FROM "+T.current+
   " WHERE logical_series_id=? AND geography_type=?").all(series,geoType);
 const historyRows=db.prepare("SELECT DISTINCT "+identity.join(",")+" FROM "+T.history+
   " WHERE logical_series_id=? AND geography_type=?").all(series,geoType);
 const plan=prepareEmploymentHistoryRepair({...receipt,currentRows,historyRows,recordedAt});
 const ordered=plan.rows.sort((a,b)=>a.key.localeCompare(b.key));
 for(const p of ordered){
  if(!STATES.includes(p.currentPreimage.geography_code))throw Error("W04_REPAIR_REGION_INVALID");
  const date=p.currentPreimage.observation_date;
  const d=new Date(date+"T00:00:00Z");
  if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==date||d.getUTCDay()!==6)
   throw Error("W04_REPAIR_WEEK_INVALID");
 }
 const selectionSha256=sha(JSON.stringify(ordered.map(p=>[p.key,
   canonical(p.currentPreimage),canonical(p.sourceReceipt)])));
 return {...plan,selectionSha256};
}

// The caller uses its existing read transaction and keeps the selected keyset
// and raw receipt private. Only the count and digest are approval candidates.
export function previewEmploymentHistoryRepairSelection(db,receipt){
 if(db?.isTransaction!==true)throw Error("W04_REPAIR_READ_TRANSACTION_REQUIRED");
 const p=readPlan(db,receipt,new Date().toISOString());
 return {status:p.status,eligible:p.eligible,held:p.held,selectionSha256:p.selectionSha256,
  historicalVersionAttested:false,repairAuthorized:false,sqliteWrites:0};
}

// Transaction primitive, not an installer, CLI or authorization source.
// A registered B Writer must verify the externally approved receipt/selection,
// own the Core resource lease, and retain its existing WAL-consistent backup
// and recovery journal before invoking this function. No provider/D1 effects.
export function applyEmploymentHistoryRepairTransaction(db,receipt,{approvedSelectionSha256,approvedCount}={}){
 if(!db||db.isTransaction!==false||!Number.isSafeInteger(approvedCount)||approvedCount<1||
   !/^[a-f0-9]{64}$/.test(approvedSelectionSha256??""))
  throw Error("W04_REPAIR_SELECTION_REQUIRED");
 db.exec("BEGIN IMMEDIATE");
 try{
  const at=new Date().toISOString();
  const plan=readPlan(db,receipt,at);
  if(plan.eligible!==approvedCount||plan.selectionSha256!==approvedSelectionSha256)
   throw Error("W04_REPAIR_SELECTION_DRIFT");
  // Existing schema has no History identity uniqueness constraint. An
  // unexpected trigger could invalidate the promised single-table effect.
  if(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name=?").get(T.history)||
     db.prepare("SELECT name FROM sqlite_temp_master WHERE type='trigger' AND tbl_name=?").get(T.history))
   throw Error("W04_REPAIR_UNEXPECTED_HISTORY_TRIGGER");
  const insert=db.prepare("INSERT INTO "+T.history+" ("+cols.join(",")+") VALUES ("+
    cols.map(()=>"?").join(",")+")");
  const check=db.prepare("SELECT "+cols.join(",")+" FROM "+T.history+" WHERE "+where);
  let inserted=0;
  for(const p of plan.rows){
   const c=p.currentPreimage, key=identity.map(k=>c[k]), original=JSON.parse(c.provenance_json);
   if(!original||typeof original!=="object"||Array.isArray(original))throw Error("W04_REPAIR_PROVENANCE_INVALID");
   if(check.all(...key).length)throw Error("W04_REPAIR_HISTORY_EXISTS");
   const provenance=JSON.stringify({...original,w04HistoryRepair:{
    receiptSha256:receipt.receiptSha256,evidenceDigest:receipt.evidenceDigest,
    sourceSnapshotId:p.sourceReceipt.snapshotId,responseHash:p.sourceReceipt.responseHash,
    originalCurrentRetrievedAt:c.retrieved_at,originalCurrentAvailableAt:c.available_at,
    exactReceiptRetrievedAt:p.sourceReceipt.retrievedAt,recordedAt:at,historicalAvailabilityProved:false
   }});
   const values=[...copy.map(k=>c[k]),at,p.sourceReceipt.retrievedAt,provenance,"INSERT",at];
   if(Number(insert.run(...values).changes)!==1)throw Error("W04_REPAIR_INSERT_FAILED");
   const found=check.all(...key);
   if(found.length!==1||cols.some((k,i)=>found[0][k]!==values[i]))
    throw Error("W04_REPAIR_READBACK_FAILED");
   inserted++;
  }
  db.exec("COMMIT");
  return {status:"HISTORY_REPAIR_COMMITTED",inserted,recordedAt:at,
   selectionSha256:plan.selectionSha256,historicalVersionAttested:false,
   providerCalls:0,d1Writes:0};
 }catch(e){if(db.isTransaction)db.exec("ROLLBACK");throw e;}
}
