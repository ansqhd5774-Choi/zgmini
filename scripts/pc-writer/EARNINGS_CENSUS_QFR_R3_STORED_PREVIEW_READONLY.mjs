// Census QFR R3: calculate only from previously saved, immutable PC SQLite ZIP.
// Never fetch live Census, alter the risk score, write PC SQLite/D1, or publish.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {QFR_URL} from './EARNINGS_CENSUS_QFR_R1_READONLY.mjs';
import {PROVIDER,DATASET,CONTRACT,checkQfrSchema}
  from './EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const PC_ROOT=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
const DB_PATH=path.join(PC_ROOT,'storage','core.sqlite');
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const fail=code=>{throw Error(code);};

function validUtc(value){
  if(typeof value!=='string'||!ISO.test(value))return false;
  const date=new Date(value);
  return Number.isFinite(date.getTime())&&date.toISOString()===value;
}

export function buildStoredQfrPreview(db){
  if(!db||typeof db.prepare!=='function')fail('QFR_SQLITE_DATABASE_REQUIRED');
  const checked=checkQfrSchema(db); // All existing CENSUS ZIPs and snapshot references.
  if(checked.priorSnapshots===0)fail('QFR_STORED_SNAPSHOT_MISSING');
  if(checked.priorSnapshots>200)fail('QFR_STORED_SNAPSHOT_SCAN_LIMIT_EXCEEDED');
  const versions=db.prepare(`SELECT snapshot_sha256,as_of,retrieved_at,
      latest_observation_date,provenance_json,chunk_hashes_json
    FROM api_history_snapshots_v1 WHERE provider=? AND dataset=?`).all(PROVIDER,DATASET);
  if(versions.length!==checked.priorSnapshots)fail('QFR_STORED_SNAPSHOT_COUNT_MISMATCH');
  const findChunk=db.prepare(`SELECT first_seen_at,payload_json
    FROM api_history_chunks_v1 WHERE provider=? AND dataset=? AND chunk_sha256=?`);
  const valid=versions.map(snapshot=>{
    let provenance,payload,hashes;
    try{provenance=JSON.parse(snapshot.provenance_json);hashes=JSON.parse(snapshot.chunk_hashes_json);}
    catch{fail('QFR_STORED_JSON_INVALID');}
    if(!Array.isArray(hashes)||hashes.length!==1||!SHA.test(hashes[0]))
      fail('QFR_STORED_CHUNK_REFERENCE_INVALID');
    const chunk=findChunk.get(PROVIDER,DATASET,hashes[0]);
    if(!chunk)fail('QFR_STORED_CHUNK_MISSING');
    try{payload=JSON.parse(chunk.payload_json);}catch{fail('QFR_STORED_JSON_INVALID');}
    if(!SHA.test(snapshot.snapshot_sha256)||!validUtc(snapshot.retrieved_at)
      ||!validUtc(chunk.first_seen_at)||snapshot.as_of!==snapshot.retrieved_at.slice(0,10)
      ||chunk.first_seen_at!==snapshot.retrieved_at
      ||provenance?.contract!==CONTRACT||provenance?.sourceURL!==QFR_URL
      ||provenance?.sourceRetrievedAt!==snapshot.retrieved_at
      ||provenance?.sourceSha256!==payload?.sourceSha256
      ||provenance?.authority!=='U.S. Census Bureau'
      ||provenance?.independentSourceCount!==1||provenance?.scoreInput!==false
      ||provenance?.isAdj!=='0'||provenance?.geo!=='US'
      ||provenance?.category!=='MFG'||provenance?.etIdx!=='0'
      ||provenance?.officialVintageId!==null
      ||payload?.observedThrough!==snapshot.latest_observation_date)
      fail('QFR_STORED_PROVENANCE_MISMATCH');
    return {row:{...snapshot,first_seen_at:chunk.first_seen_at},provenance,payload};
  }).sort((a,b)=>
    b.row.latest_observation_date.localeCompare(a.row.latest_observation_date)
    ||b.row.retrieved_at.localeCompare(a.row.retrieved_at));
  if(valid.length>1
    &&valid[0].row.latest_observation_date===valid[1].row.latest_observation_date
    &&valid[0].row.retrieved_at===valid[1].row.retrieved_at
    &&valid[0].row.snapshot_sha256!==valid[1].row.snapshot_sha256)
    fail('QFR_STORED_REVISION_ORDER_AMBIGUOUS');
  const chosen=valid[0],history=chosen.payload.history;
  if(!Array.isArray(history)||history.length!==5)
    fail('QFR_STORED_HISTORY_INVALID');
  const current=history.at(-1),previous=history.at(-2);
  if(!(current?.salesMillionsUSD>0)||!(previous?.salesMillionsUSD>0)
    ||!Number.isFinite(current.afterTaxProfitMillionsUSD)
    ||!Number.isFinite(previous.afterTaxProfitMillionsUSD))
    fail('QFR_STORED_MEASURES_INVALID');
  // Recalculate from the saved source's sales and profit, not the cached margin.
  const value=100*current.afterTaxProfitMillionsUSD/current.salesMillionsUSD;
  const previousValue=100*previous.afterTaxProfitMillionsUSD/previous.salesMillionsUSD;
  if(value!==current.afterTaxProfitMarginPct
    ||previousValue!==previous.afterTaxProfitMarginPct)
    fail('QFR_STORED_DERIVED_VALUE_MISMATCH');
  return {
    status:'PASS_QFR_STORED_READONLY_PREVIEW',
    provider:PROVIDER,dataset:DATASET,contract:CONTRACT,
    snapshotSha256:chosen.row.snapshot_sha256,
    sourceSha256:chosen.payload.sourceSha256,
    sourceStoredAt:Date.parse(chosen.row.first_seen_at),
    sourceRetrievedAt:chosen.row.retrieved_at,
    dataUpdatedOn:chosen.provenance.sourceDataUpdatedOn??null,
    officialVintageId:null,historyMode:'CURRENT_RETRIEVAL_NOT_PIT',
    sourceURL:QFR_URL,adjustment:'NOT_SEASONALLY_ADJUSTED',
    independentSourceCount:1,scoreInput:false,
    observedThrough:current.period,history,
    indicator:{indicatorId:'census_qfr_manufacturing_after_tax_margin_nsa',
      name:'미국 제조업 세후이익률',kind:'DERIVED',unit:'PERCENT',
      value,previousValue,changePercentagePoints:value-previousValue,
      observationPeriod:current.period,previousPeriod:previous.period,
      releaseDate:null,source:'U.S. Census Bureau QFR',
      methodology:'100 * after_tax_profit_millions_usd / sales_millions_usd',
    },
    storedSnapshotsChecked:valid.length,
    latestQuarterVersions:valid.filter(v=>v.row.latest_observation_date===current.period).length,
  };
}

async function main(){
  const now=new Date().toISOString();
  const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const output=path.join(HERE,`EARNINGS_CENSUS_QFR_R3_STORED_RESULT_${stamp}.txt`);
  const notes=['EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY',`UTC=${now}`,
    'MODE=PC_SQLITE_READ_ONLY_STORED_SOURCE_ONLY',
    `PROVIDER=${PROVIDER}`,`DATASET=${DATASET}`,`CONTRACT=${CONTRACT}`,
    'SOURCE_HTTP_REQUESTS=0','D1_WRITES=0','SCORE_WRITES=0','WEB_DEPLOYMENTS=0'];
  let db;
  try{
    if(process.argv.length!==2)fail('QFR_R3_INVALID_ARGUMENT');
    if(!fs.existsSync(DB_PATH))fail('QFR_PC_SQLITE_MISSING');
    db=new DatabaseSync(DB_PATH,{readOnly:true,timeout:4000});
    db.exec('PRAGMA query_only=ON');
    const info=buildStoredQfrPreview(db);
    notes.push(`STORED_SNAPSHOTS_VERIFIED=${info.storedSnapshotsChecked}`);
    notes.push(`LATEST_QUARTER_VERSIONS=${info.latestQuarterVersions}`);
    notes.push(`SNAPSHOT_SHA256=${info.snapshotSha256}`);
    notes.push(`SOURCE_SHA256=${info.sourceSha256}`);
    notes.push(`SOURCE_RETRIEVED_AT=${info.sourceRetrievedAt}`);
    notes.push(`SOURCE_STORED_AT=${info.sourceStoredAt}`);
    notes.push(`SOURCE_DATA_UPDATED_ON=${info.dataUpdatedOn??'UNAVAILABLE'}`);
    notes.push(`OBSERVED_THROUGH=${info.observedThrough}`);
    notes.push(`MANUFACTURING_AFTER_TAX_MARGIN_PCT=${info.indicator.value}`);
    notes.push(`PREVIOUS_QUARTER_MARGIN_PCT=${info.indicator.previousValue}`);
    notes.push(`CHANGE_PERCENTAGE_POINTS=${info.indicator.changePercentagePoints}`);
    notes.push(`HISTORY_JSON=${JSON.stringify(info.history)}`);
    notes.push(`INDICATOR_PREVIEW_JSON=${JSON.stringify(info.indicator)}`);
    notes.push(`RESULT=${info.status}`);
  }catch(e){
    const code=typeof e?.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)
      ?e.message:'QFR_R3_STORED_REVIEW_REQUIRED';
    notes.push(`ERROR=${code}`);
    notes.push('RESULT=FAIL_QFR_STORED_PREVIEW_NO_WRITE');
    process.exitCode=2;
  }finally{
    try{db?.close();}catch{}
    notes.push('PC_SQLITE_WRITES=0');
    try{
      fs.writeFileSync(output,notes.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`TXT_CREATED=${path.basename(output)}`);
    }catch{console.error('QFR_R3_RESULT_TXT_WRITE_FAILED');process.exitCode=2;}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
