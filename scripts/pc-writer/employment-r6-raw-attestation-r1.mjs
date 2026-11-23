// Optional PIT-04-05 read-only raw body/run attestation; never historical PIT approval.
// Uses frozen R6 schema, a bounded read transaction and no provider/DB writes.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {EMPLOYMENT_R6_TABLES,EMPLOYMENT_R6_GROUPS} from "../../lib/market-score/employment-r6-contract.mjs";
const T=EMPLOYMENT_R6_TABLES;
const validAsOf=date=>typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)
 &&Number.isFinite(Date.parse(date+"T00:00:00Z"))
 &&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;

const SHA256=/^[0-9a-f]{64}$/i;
const digestText=value=>createHash("sha256").update(value).digest("hex");
const parseRecord=value=>{
  try{
    const parsed=JSON.parse(value);
    return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:null;
  }catch{return null;}
};
const requiredColumns=(db,table,required)=>{
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))return false;
  const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name));
  return required.every(x=>columns.has(x));
};
const readRawLineageEvidence=(db,asOfDate)=>{
  if(!requiredColumns(db,T.rawSnapshot,["snapshot_id","chunk_index","chunk_count",
    "release_group","provider","request_key","retrieved_at","created_at","body_sha256",
    "detail_json","body_chunk"])
    ||!requiredColumns(db,T.runs,["provider","status","completed_at","detail_json"]))return null;
  const end=Date.parse(asOfDate+"T23:59:59.999Z");
  const isoEnd=new Date(end).toISOString();
  const meta=db.prepare(`SELECT snapshot_id,chunk_index,chunk_count,release_group,provider,
    request_key,retrieved_at,created_at,body_sha256,detail_json
    FROM ${T.rawSnapshot} WHERE retrieved_at<=? LIMIT 16001`).all(isoEnd);
  if(meta.length>16000)throw Error("PIT0405_CHUNK_CAP");
  const groups=new Map(),byClaimedResponse=new Map();
  for(const row of meta){
    const bucket=groups.get(row.snapshot_id)??[];
    bucket.push(row);groups.set(row.snapshot_id,bucket);
    const key=row.provider+"\u001f"+row.body_sha256;
    if(SHA256.test(String(row.body_sha256??""))&&String(row.provider??"").trim())
      byClaimedResponse.set(key,true);
  }
  if(groups.size>4000)throw Error("PIT0405_SNAPSHOT_CAP");
  const valid=new Map();
  let totalRawBytes=0;
  const body=db.prepare(`SELECT chunk_index,body_chunk FROM ${T.rawSnapshot}
    WHERE snapshot_id=? ORDER BY chunk_index`);
  for(const [id,parts] of groups){
    parts.sort((a,b)=>a.chunk_index-b.chunk_index);
    const head=parts[0],count=head?.chunk_count;
    if(!SHA256.test(String(id??""))||!SHA256.test(String(head?.body_sha256??""))
      ||!Number.isSafeInteger(count)||count<1||count>4096||parts.length!==count
      ||!String(head.provider??"").trim()||!String(head.request_key??"").trim()
      ||!String(head.release_group??"").trim())continue;
    const rt=Date.parse(head.retrieved_at??""),ct=Date.parse(head.created_at??"");
    const info=parseRecord(head.detail_json);
    if(!Number.isFinite(rt)||!Number.isFinite(ct)||ct<rt||ct>end||rt>end
      ||info?.responseHash!==head.body_sha256
      ||digestText([head.release_group,head.provider,head.request_key,
        head.body_sha256].join("|"))!==id)continue;
    if(parts.some((part,i)=>part.chunk_index!==i
      ||part.chunk_count!==count||part.body_sha256!==head.body_sha256
      ||part.provider!==head.provider||part.release_group!==head.release_group
      ||part.request_key!==head.request_key||part.retrieved_at!==head.retrieved_at
      ||part.created_at!==head.created_at||part.detail_json!==head.detail_json))continue;
    const sha=createHash("sha256");let bytes=0,index=0,complete=true;
    for(const chunk of body.iterate(id)){
      if(chunk.chunk_index!==index++||typeof chunk.body_chunk!=="string"){
        complete=false;break;
      }
      const chunkBytes=Buffer.byteLength(chunk.body_chunk);
      bytes+=chunkBytes;totalRawBytes+=chunkBytes;
      if(totalRawBytes>512*1024*1024)throw Error("PIT0405_RAW_BYTE_CAP");
      if(bytes>32*1024*1024){complete=false;break;}
      sha.update(chunk.body_chunk,"utf8");
    }
    if(!complete||index!==count||sha.digest("hex")!==head.body_sha256)continue;
    valid.set(id,head);
  }
  const certified=new Set();
  const runs=db.prepare(`SELECT provider,status,completed_at,detail_json FROM ${T.runs}
    WHERE completed_at<=? LIMIT 20001`).all(isoEnd);
  if(runs.length>20000)throw Error("PIT0405_RUN_CAP");
  for(const run of runs){
    const completed=Date.parse(run.completed_at??"");
    if(!["SUCCESS","PARTIAL"].includes(run.status)||!Number.isFinite(completed)
      ||completed>end)continue;
    const details=parseRecord(run.detail_json);
    if(!Array.isArray(details?.rawSnapshots))continue;
    for(const item of details.rawSnapshots){
      const snap=valid.get(item?.snapshotId),retrieved=Date.parse(snap?.retrieved_at??"");
      if(snap&&item.bodySha256===snap.body_sha256
        &&run.provider==="EMPLOYMENT_R6_"+snap.release_group
        &&Number.isFinite(retrieved)&&retrieved<=completed)certified.add(snap.snapshot_id);
    }
  }
  const byResponse=new Map(),byStoredResponse=new Map();
  for(const snap of valid.values()){
    byStoredResponse.set(snap.provider+"\u001f"+snap.body_sha256,true);
  }
  for(const id of certified){
    const snap=valid.get(id),key=snap.provider+"\u001f"+snap.body_sha256;
    const entries=byResponse.get(key)??[];
    entries.push(snap);byResponse.set(key,entries);
  }
  // Aggregate only frozen release-group names and retrieval months. Never
  // export request keys, raw hashes, body bytes, individual timestamps or IDs.
  const allowedGroups=new Set(Object.keys(EMPLOYMENT_R6_GROUPS));
  const byGroup=new Map(),byMonth=new Map();
  const monthOf=value=>typeof value==="string"
    &&/^\d{4}-(?:0[1-9]|1[0-2])-\d{2}T/.test(value)
    &&Number.isFinite(Date.parse(value))?value.slice(0,7):"UNKNOWN";
  const add=(map,key,id)=>{
    const row=map.get(key)??{metadataKeys:0,bodyVerifiedKeys:0,runCertifiedKeys:0};
    row.metadataKeys++;
    if(valid.has(id))row.bodyVerifiedKeys++;
    if(certified.has(id))row.runCertifiedKeys++;
    map.set(key,row);
  };
  for(const [id,parts] of groups){
    const head=parts[0];
    const group=allowedGroups.has(head?.release_group)?head.release_group:"UNKNOWN";
    add(byGroup,group,id);
    add(byMonth,monthOf(head?.retrieved_at),id);
  }
  const fields=(key,value,name)=>({[name]:key,...value});
  const snapshotByGroup=[...byGroup].sort(([a],[b])=>a.localeCompare(b))
    .map(([group,value])=>fields(group,value,"releaseGroup"));
  // Bound month cardinality without dropping older evidence. UNKNOWN stays
  // distinct from the OLDER (more than 12 distinct valid months) aggregate.
  const monthly=[...byMonth].filter(([month])=>month!=="UNKNOWN")
    .sort(([a],[b])=>b.localeCompare(a));
  const recent=monthly.slice(0,12),older=monthly.slice(12);
  const snapshotByMonth=recent.map(([month,value])=>fields(month,value,"retrievalMonth"));
  if(older.length){
    const totals={metadataKeys:0,bodyVerifiedKeys:0,runCertifiedKeys:0};
    for(const [,row] of older)for(const key of Object.keys(totals))totals[key]+=row[key];
    snapshotByMonth.push(fields("OLDER",totals,"retrievalMonth"));
  }
  if(byMonth.has("UNKNOWN"))snapshotByMonth.push(
    fields("UNKNOWN",byMonth.get("UNKNOWN"),"retrievalMonth"));
  return {rawSnapshotMetadataKeys:groups.size,rawSnapshotCertifiedKeys:certified.size,
    rawSnapshotInvalidBodyKeys:groups.size-valid.size,
    rawSnapshotValidWithoutRunKeys:valid.size-certified.size,
    rawSnapshotByGroup:snapshotByGroup,rawSnapshotByMonth:snapshotByMonth};
};

// Source-only entrypoint: the approved Runner must supply a sealed Core DB path.
// Missing legacy raw/run schema is explicitly NOT the same as zero evidence.
export function auditEmploymentR6RawAttestation({dbPath,asOfDate,
 beforeReadOnlyOpen=null,afterReadOnlyOpen=null,onSqliteOpened=null}={}){
 if(!validAsOf(asOfDate)||typeof dbPath!=="string"||!path.isAbsolute(dbPath)
   ||!fs.existsSync(dbPath))throw Error("PIT0405_INPUT_INVALID");
 let db=null,active=false;
 try{
  beforeReadOnlyOpen?.(dbPath);
  db=new DatabaseSync(dbPath,{readOnly:true});
  db.exec("PRAGMA query_only=ON");
  onSqliteOpened?.(dbPath);
  afterReadOnlyOpen?.(dbPath);
  db.exec("BEGIN");active=true;
  const read=readRawLineageEvidence(db,asOfDate);
  const fields=["rawSnapshotMetadataKeys","rawSnapshotCertifiedKeys",
   "rawSnapshotInvalidBodyKeys","rawSnapshotValidWithoutRunKeys",
   "rawSnapshotByGroup","rawSnapshotByMonth"];
  const publicCounts=Object.fromEntries(fields.map(k=>[k,read?.[k]??null]));
  return {kind:"EMPLOYMENT_R6_PIT0405_RAW_ATTESTATION_SOURCE_ONLY_V1",
   status:read?"HOLD_RAW_LINEAGE_NOT_HISTORICAL_PIT":"NO_RUNTIME_EVIDENCE",
   asOfDate,...publicCounts,
   historicalPitAttested:false,promotionApproved:false,repairAuthorized:false,
   providerCalls:0,sqliteWrites:0,d1Writes:0};
 }finally{
  try{if(db&&active)db.exec("ROLLBACK");}finally{db?.close();}
 }
}
