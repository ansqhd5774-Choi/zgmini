import {
  B1_R3_HISTORY_INGEST_R1,
  ingestBreadthB1R3HistoricalPayloadR1,
  validateBreadthB1R3HistoryPayloadR1,
} from "./breadth-b1-r3-history-ingest-r1.mjs";
import {
  B1_R3_ACTIVE_SOURCE_CONTRACT_R5,
  B1_R3_SEMANTIC_SCHEMA_R1,
  breadthB1R3SemanticSnapshotR5,
} from "./breadth-b1-r3-semantic-r5.mjs";

export const B1_R3_HISTORY_INGEST_R2="B1-R3-HISTORY-PROD-INGEST-R2";
export const B1_R3_HISTORY_SEMANTIC_TABLE_R1="market_score_breadth_b1_r3_semantic_v1";

const finite=n=>typeof n==="number"&&Number.isFinite(n);
const rows=x=>Array.isArray(x?.results)?x.results:Array.isArray(x)?x:[];

async function initializeSemanticTable(db){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  await db.prepare(`CREATE TABLE IF NOT EXISTS ${B1_R3_HISTORY_SEMANTIC_TABLE_R1}(
    trade_date TEXT PRIMARY KEY,
    previous_date TEXT NOT NULL,
    semantic_contract TEXT NOT NULL,
    semantic_schema TEXT NOT NULL,
    semantic_sha256 TEXT NOT NULL,
    member_count INTEGER NOT NULL,
    pair_count INTEGER NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_semantic_hash_v1
    ON ${B1_R3_HISTORY_SEMANTIC_TABLE_R1}(semantic_sha256)`).run();
}

async function getSemanticSnapshot(db,tradeDate){
  const row=await db.prepare(`SELECT * FROM ${B1_R3_HISTORY_SEMANTIC_TABLE_R1} WHERE trade_date=?`)
    .bind(tradeDate).first();
  return row??null;
}

function sameSemantic(existing,snapshot){
  return String(existing?.trade_date??"")===snapshot.tradeDate
    && String(existing?.previous_date??"")===snapshot.previousDate
    && String(existing?.semantic_contract??"")===snapshot.semanticContractRevision
    && String(existing?.semantic_schema??"")===snapshot.semanticSchema
    && String(existing?.semantic_sha256??"")===snapshot.semanticSha256
    && Number(existing?.member_count)===snapshot.memberCount
    && Number(existing?.pair_count)===snapshot.pairCount;
}

async function storeSemanticSnapshot(db,snapshot,nowIso){
  const existing=await getSemanticSnapshot(db,snapshot.tradeDate);
  if(existing){
    if(!sameSemantic(existing,snapshot))throw new Error("EXISTING_SEMANTIC_SNAPSHOT_CONFLICT");
    await db.prepare(`UPDATE ${B1_R3_HISTORY_SEMANTIC_TABLE_R1} SET last_seen_at=? WHERE trade_date=?`)
      .bind(nowIso,snapshot.tradeDate).run();
    return {inserted:false,noop:true};
  }
  await db.prepare(`INSERT INTO ${B1_R3_HISTORY_SEMANTIC_TABLE_R1}(
    trade_date,previous_date,semantic_contract,semantic_schema,semantic_sha256,
    member_count,pair_count,first_seen_at,last_seen_at
  ) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
    snapshot.tradeDate,snapshot.previousDate,snapshot.semanticContractRevision,snapshot.semanticSchema,
    snapshot.semanticSha256,snapshot.memberCount,snapshot.pairCount,nowIso,nowIso
  ).run();
  return {inserted:true,noop:false};
}

/** @param {{env?:import('../../worker/runtime-contracts').DataEnv,db?:D1Database,store?:ReturnType<typeof import('./breadth-b1-r3-store.mjs').createBreadthB1R3Store>|null,payload?:unknown,now?:()=>Date,lockTtlMs?:number}} [options] */
export async function ingestBreadthB1R3HistoricalPayloadR2({
  env={},db=env?.DB,store=null,payload,now=()=>new Date(),lockTtlMs=60000,
}={}){
  // Preserve all R1 validation, normalization, coverage and current-date protections.
  const normalized=validateBreadthB1R3HistoryPayloadR1(payload);

  if(String(payload?.semanticContractRevision??"")!==B1_R3_ACTIVE_SOURCE_CONTRACT_R5){
    throw new Error("SEMANTIC_CONTRACT_MISMATCH");
  }
  const suppliedHash=String(payload?.semanticSha256??"").trim().toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(suppliedHash))throw new Error("SEMANTIC_SHA256_REQUIRED");

  const semantic=await breadthB1R3SemanticSnapshotR5({
    tradeDate:normalized.tradeDate,
    previousDate:normalized.previousDate,
    members:normalized.members,
    rows:normalized.rows.map(r=>({
      ticker:r.ticker,
      previousClose:r.previousClose,
      currentClose:r.currentClose,
      currentVolume:r.currentVolume,
      currentResolvedSymbol:r.provenance?.currentResolvedSymbol??r.ticker,
      previousResolvedSymbol:r.provenance?.previousResolvedSymbol??r.ticker,
      currentResolution:r.provenance?.currentResolution??"exact",
      previousResolution:r.provenance?.previousResolution??"exact",
    })),
  });
  if(semantic.semanticSha256!==suppliedHash)throw new Error("SEMANTIC_SHA256_MISMATCH");

  await initializeSemanticTable(db);
  const existing=await getSemanticSnapshot(db,semantic.tradeDate);
  if(existing&&!sameSemantic(existing,semantic)){
    // Fail before R1 can mutate normalized rows.
    throw new Error("EXISTING_SEMANTIC_SNAPSHOT_CONFLICT");
  }

  const result=await ingestBreadthB1R3HistoricalPayloadR1({
    env,db,store,payload,now,lockTtlMs,
  });

  if(result.status==="PAUSED_LIVE_PRIORITY"){
    return {
      ...result,
      ingestVersion:B1_R3_HISTORY_INGEST_R2,
      semanticContractRevision:semantic.semanticContractRevision,
      semanticSha256:semantic.semanticSha256,
      semanticStored:false,
    };
  }

  const nowValue=typeof now==="function"?now():new Date();
  const nowIso=(nowValue instanceof Date?nowValue:new Date(nowValue)).toISOString();
  const semanticWrite=await storeSemanticSnapshot(db,semantic,nowIso);

  return {
    ...result,
    ingestVersion:B1_R3_HISTORY_INGEST_R2,
    baseIngestVersion:B1_R3_HISTORY_INGEST_R1,
    semanticContractRevision:semantic.semanticContractRevision,
    semanticSchema:semantic.semanticSchema,
    semanticSha256:semantic.semanticSha256,
    semanticStored:true,
    semanticInserted:semanticWrite.inserted,
    semanticNoop:semanticWrite.noop,
  };
}
