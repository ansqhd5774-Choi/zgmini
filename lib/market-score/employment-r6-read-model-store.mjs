import crypto from "node:crypto";
import {
  EMPLOYMENT_R6_TABLES,
} from "./employment-r6-contract.mjs";
import {
  createEmploymentR6Store,
} from "./employment-r6-store.mjs";

const finite=v=>Number.isFinite(Number(v));
const stable=v=>v==null||typeof v!=="object"?v:Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const json=v=>JSON.stringify(stable(v??{}));
const sha=v=>crypto.createHash("sha256").update(typeof v==="string"?v:json(v)).digest("hex");
const changes=r=>Number(r?.meta?.changes??r?.changes??0)||0;

function parseModel(row){
  if(!row)return null;
  let model=null;
  try{model=JSON.parse(String(row.model_json??row.modelJson??"null"));}catch{}
  return {
    versionId:String(row.version_id??row.versionId??""),
    scoreAsOf:String(row.score_as_of??row.scoreAsOf??""),
    formulaHash:String(row.formula_hash??row.formulaHash??""),
    dataHash:String(row.data_hash??row.dataHash??""),
    status:String(row.status??""),
    employmentScore:finite(row.employment_score??row.employmentScore)?Number(row.employment_score??row.employmentScore):null,
    model,
    createdAt:String(row.created_at??row.createdAt??""),
    readyAt:row.ready_at??row.readyAt??null,
  };
}

export function createEmploymentR6ReadModelStore(db,{
  now=()=>new Date(),
  baseStoreFactory=createEmploymentR6Store,
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const T=EMPLOYMENT_R6_TABLES,base=baseStoreFactory(db,{now});
  const stmt=(sql,values=[])=>db.prepare(sql).bind(...values);
  async function initialize(){await base.initialize();}

  async function stageVersion({scoreAsOf,formulaHash,dataHash,status,employmentScore,model}={}){
    await initialize();
    const normalizedStatus=status==="READY_CANDIDATE"?"PRECOMPUTED":"PARTIAL";
    const versionId=sha({scoreAsOf,formulaHash,dataHash,normalizedStatus,employmentScore,model});
    const r=await stmt(`INSERT OR IGNORE INTO ${T.readModel}(
      version_id,score_as_of,formula_hash,data_hash,status,employment_score,model_json,created_at,ready_at
    ) VALUES(?,?,?,?,?,?,?,?,NULL)`,[
      versionId,String(scoreAsOf),String(formulaHash),String(dataHash),normalizedStatus,
      finite(employmentScore)?Number(employmentScore):null,json(model),now().toISOString()
    ]).run();
    return {versionId,status:normalizedStatus,inserted:changes(r)>0};
  }

  async function getVersion(versionId){
    await initialize();
    return parseModel(await stmt(`SELECT * FROM ${T.readModel} WHERE version_id=? LIMIT 1`,[String(versionId)]).first());
  }

  async function getLatestReady(){
    await initialize();
    return parseModel(await stmt(`SELECT * FROM ${T.readModel}
      WHERE status='READY'
      ORDER BY ready_at DESC,score_as_of DESC,created_at DESC
      LIMIT 1`).first());
  }

  async function getCurrentReady(){
    await initialize();
    const row=await stmt(`SELECT m.* FROM ${T.readPointer} p
      JOIN ${T.readModel} m ON m.version_id=p.version_id
      WHERE p.pointer_key='CURRENT' AND m.status='READY'
      LIMIT 1`).first();
    return parseModel(row) ?? await getLatestReady();
  }

  async function promoteReady(versionId){
    await initialize();
    const id=String(versionId),readyAt=now().toISOString();
    const r=await stmt(`UPDATE ${T.readModel}
      SET status='READY',ready_at=COALESCE(ready_at,?)
      WHERE version_id=? AND status IN ('PRECOMPUTED','READY')`,[readyAt,id]).run();
    const row=await getVersion(id);
    if(!row||row.status!=="READY")throw new Error("READY_PROMOTION_FAILED");
    await stmt(`INSERT INTO ${T.readPointer}(pointer_key,version_id,updated_at)
      VALUES('CURRENT',?,?)
      ON CONFLICT(pointer_key) DO UPDATE SET version_id=excluded.version_id,updated_at=excluded.updated_at`,[
      id,readyAt
    ]).run();
    return {versionId:id,ready:true,pointerUpdated:true,changed:changes(r)>0};
  }

  return {initialize,stageVersion,getVersion,getLatestReady,getCurrentReady,promoteReady};
}

export const EMPLOYMENT_R6_READ_MODEL_STORE_CONTRACT=Object.freeze({
  versionedReadModel:true,
  readyGateRequired:true,
  pointerExposesReadyOnly:true,
  atomicPointerSingleStatement:true,
  previousReadyFallback:true,
  providerCalls:0,
  publicOutput:false,
});
