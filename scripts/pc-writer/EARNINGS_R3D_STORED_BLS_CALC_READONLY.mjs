// Earnings Companion C R3-D: stored BLS raw lineage + informational calculations.
// READ ONLY. No API, no DB/D1 writes, no scheduler, no E1/other scoring changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const DB_PATH = path.join(ROOT,'storage','core.sqlite');
const CONTRACT = 'EARNINGS_COMPANION_R3C_BLS_DIRECT_V1';
const SERIES = ['WPSFD4','WPSFD41','PRS85006111'];
const sha = v => crypto.createHash('sha256').update(v,'utf8').digest('hex');
const fail = code => { throw new Error(code); };
const decimal = value => typeof value === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)
  && Number.isFinite(Number(value));
const isIsoDate = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(value))
  && Number.isFinite(Date.parse(value));
const format = value => value===null || !Number.isFinite(value)?'UNAVAILABLE':value.toFixed(6);

function periodOrdinal(row, quarterly) {
  const y = Number(row.year), p = String(row.period);
  if (quarterly) {
    if (!/^Q0[1-4]$/.test(p)) fail('INVALID_QUARTER_PERIOD');
    const n = Number(p.slice(1));
    if (row.observationDate !== `${y}-Q${n}`) fail('QUARTER_DATE_MISMATCH');
    return y*4+n-1;
  }
  if (!/^M(0[1-9]|1[0-2])$/.test(p)) fail('INVALID_MONTH_PERIOD');
  const m = Number(p.slice(1));
  if (row.observationDate !== `${y}-${p.slice(1)}-01`) fail('MONTH_DATE_MISMATCH');
  return y*12+m-1;
}

function validateRows(rows, id) {
  if (!Array.isArray(rows) || !rows.length || rows.length>400) fail('DATA_ROWS_INVALID');
  const quarterly=id==='PRS85006111';
  const seen = new Set(), ordinals = new Map();
  const expectedFreq = quarterly?'QUARTERLY':'MONTHLY';
  const expectedUnit = quarterly?'PERCENT_YEAR_OVER_YEAR':'INDEX';
  for (const row of rows) {
    if (row?.seriesID!==id || row.frequency!==expectedFreq || row.rawUnit!==expectedUnit
      || row.seasonalAdjustment!=='SA' || row.annualRateFlag!==false
      || !decimal(row.rawValue) || !Number.isFinite(row.value)
      || row.value!==Number(row.rawValue) || !Array.isArray(row.footnotes)
      || row.vintageId!==null || row.releaseDate!==null || row.availableAt!==null
      || !/^\d{4}$/.test(row.year)) fail('RAW_ROW_CONTRACT_INVALID');
    const ordinal = periodOrdinal(row,quarterly);
    if (seen.has(ordinal)) fail('DUPLICATE_OBSERVATION_PERIOD');
    seen.add(ordinal);
    ordinals.set(ordinal,row);
  }
  const ordered=[...ordinals.keys()].sort((a,b)=>a-b);
  let gaps=0;
  for(let i=1;i<ordered.length;i++) gaps += ordered[i]-ordered[i-1]-1;
  if (gaps<0) fail('PERIOD_SEQUENCE_INVALID');
  const latest=ordinals.get(ordered.at(-1));
  let pairCount=0,latestYoy=null,latestBase=null;
  if (!quarterly) {
    for(const at of ordered) {
      const base=ordinals.get(at-12), now=ordinals.get(at);
      if (!base || !(base.value>0)) continue;
      pairCount++;
      if (at===ordered.at(-1)) {
        latestYoy=100*(now.value/base.value-1);
        latestBase=base.observationDate;
      }
    }
  }
  return {id,quarterly,rows:rows.length,first:ordinals.get(ordered[0]).observationDate,
    last:latest.observationDate,gaps,latestValue:latest.value,
    latestRawValue:latest.rawValue,yoyPairs:quarterly?null:pairCount,
    latestYoy:quarterly?null:latestYoy,latestBase};
}

export function validateSnapshot(db, snapshot) {
  const id=snapshot.dataset;
  if (snapshot.provider!=='BLS' || ![...SERIES,'WPSFD42'].includes(id) || snapshot.status!=='READY_DIRECT_BLS'
    || snapshot.history_mode!==CONTRACT || !isIsoDate(snapshot.retrieved_at)
    || snapshot.as_of!==snapshot.retrieved_at.slice(0,10)) {
    fail('BLS_SNAPSHOT_CONTRACT_INVALID');
  }
  let hashes, provenance;
  try {hashes=JSON.parse(snapshot.chunk_hashes_json);provenance=JSON.parse(snapshot.provenance_json);}
  catch {fail('BLS_SNAPSHOT_JSON_INVALID');}
  if (!Array.isArray(hashes) || hashes.length!==1 || !/^[0-9a-f]{64}$/.test(hashes[0])
    || provenance?.contract!==CONTRACT || provenance?.authority!=='US_BLS'
    || provenance?.transportProvider!=='BLS_DIRECT_API' || provenance?.seriesID!==id
    || provenance?.retrievedAt!==snapshot.retrieved_at
    || !/^[a-f0-9]{64}$/.test(provenance?.responseSha256??'')) {
    fail('BLS_SOURCE_PROVENANCE_INVALID');
  }
  const quarterly = id==='PRS85006111';
  const expectedFreq=quarterly?'QUARTERLY':'MONTHLY';
  if (provenance.frequency!==expectedFreq || provenance.seasonalAdjustment!=='SA'
    || provenance.rawUnit!==(quarterly?'PERCENT_YEAR_OVER_YEAR':'INDEX')
    || provenance.officialVintageId!==null) fail('BLS_SERIES_METADATA_INVALID');
  const identity=JSON.stringify({contract:CONTRACT,provider:'BLS',dataset:id,
    frequency:expectedFreq,seasonalAdjustment:'SA',chunks:hashes});
  if (sha(identity)!==snapshot.snapshot_sha256) fail('SNAPSHOT_SHA256_MISMATCH');
  const chunk=db.prepare(`SELECT first_observation_date,last_observation_date,row_count,payload_json
    FROM api_history_chunks_v1 WHERE provider=? AND dataset=? AND chunk_sha256=? LIMIT 1`)
    .get('BLS',id,hashes[0]);
  if (!chunk || typeof chunk.payload_json!=='string' || sha(chunk.payload_json)!==hashes[0]) {
    fail('CHUNK_SHA256_MISMATCH');
  }
  let rows;
  try {rows=JSON.parse(chunk.payload_json);}catch{fail('BLS_PAYLOAD_JSON_INVALID');}
  const result=validateRows(rows,id);
  if (chunk.row_count!==result.rows || snapshot.row_count!==result.rows
    || chunk.first_observation_date!==result.first
    || chunk.last_observation_date!==result.last
    || snapshot.latest_observation_date!==result.last
    || provenance.periodStart!==result.first || provenance.periodEnd!==result.last) {
    fail('BLS_STORED_LINEAGE_MISMATCH');
  }
  return {...result,retrievedAt:snapshot.retrieved_at,
    responseSha256:provenance.responseSha256,snapshotSha256:snapshot.snapshot_sha256};
}

export function analyze(db) {
  if (!db || typeof db.prepare!=='function') fail('SQLITE_DATABASE_REQUIRED');
  const tables=db.prepare(`SELECT name FROM sqlite_master WHERE type='table'
    AND name IN ('api_history_snapshots_v1','api_history_chunks_v1')`).all().map(r=>r.name);
  if (tables.length!==2) fail('EXISTING_BLS_SOURCE_TABLES_MISSING');
  const snapshots=db.prepare(`SELECT provider,dataset,snapshot_sha256,as_of,retrieved_at,
    status,history_mode,row_count,latest_observation_date,chunk_hashes_json,provenance_json
    FROM api_history_snapshots_v1
    WHERE provider='BLS' AND dataset IN (?,?,?) ORDER BY retrieved_at DESC LIMIT 501`)
    .all(...SERIES);
  if (!snapshots.length) fail('BLS_DIRECT_SNAPSHOTS_MISSING');
  if (snapshots.length>500) fail('BLS_SNAPSHOT_SCAN_LIMIT_EXCEEDED');
  const valid=snapshots.map(s=>validateSnapshot(db,s));
  const cohorts=new Map();
  for (const item of valid) {
    const key=`${item.retrievedAt}|${item.responseSha256}`;
    const group=cohorts.get(key)??new Map();
    if (group.has(item.id)) fail('DUPLICATE_SERIES_IN_COHORT');
    group.set(item.id,item);
    cohorts.set(key,group);
  }
  const complete=[...cohorts.entries()].filter(([,group])=>SERIES.every(id=>group.has(id)));
  if (!complete.length) fail('COMPLETE_BLS_COHORT_MISSING');
  complete.sort((a,b)=>b[0].localeCompare(a[0]));
  const [cohortKey,chosen]=complete[0];
  const newestSnapshot=valid.reduce((v,x)=>v>x.retrievedAt?v:x.retrievedAt,'');
  const olderThanLatest=newestSnapshot>chosen.get(SERIES[0]).retrievedAt;
  const rows=SERIES.map(id=>chosen.get(id));
  for(const r of rows) r.storedVersions=valid.filter(s=>s.id===r.id).length;
  const missingYoy=rows.filter(v=>!v.quarterly&&v.latestYoy===null).map(v=>v.id);
  return {status:olderThanLatest?'PARTIAL_NEWER_INCOMPLETE_COHORT':missingYoy.length?
    'PARTIAL_YOY_BASE_MISSING':'PASS_R3D_STORED_ONLY_CALCULATION',
    snapshotsChecked:valid.length,cohorts:cohorts.size,
    cohortKey,cohortRetrievedAt:rows[0].retrievedAt,
    responseSha256:rows[0].responseSha256,rows,
    newerIncomplete:olderThanLatest,missingYoy};
}

async function main(){
  const now=new Date().toISOString();
  const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
  const output=path.join(HERE,`EARNINGS_R3D_STORED_BLS_CALC_RESULT_${stamp}.txt`);
  const text=[
    'EARNINGS_COMPANION_R3D_STORED_BLS_CALC_READONLY_R1_20261027',
    `UTC=${now}`,
    'MODE=PC_SQLITE_READ_ONLY_NO_API',
    `CONTRACT=${CONTRACT}`,
    'API_REQUESTS=0',
    'FRED_CACHE_READ=NO',
  ];
  let db,done=false;
  try {
    if(!fs.existsSync(DB_PATH)) fail('PC_SQLITE_FILE_MISSING');
    db=new DatabaseSync(DB_PATH,{readOnly:true,timeout:4000});
    db.exec('PRAGMA query_only=ON');
    text.push('DB_OPEN_READONLY=YES');
    const info=analyze(db);
    text.push(`SNAPSHOTS_HASH_VERIFIED=${info.snapshotsChecked}`);
    text.push('DATA_COHORT_CONSISTENT=YES');
    text.push(`NEWER_INCOMPLETE_COHORT=${info.newerIncomplete?'YES':'NO'}`);
    text.push(`DATA_COHORT_RETRIEVED_AT=${info.cohortRetrievedAt}`);
    text.push(`DATA_COHORT_RESPONSE_SHA256=${info.responseSha256}`);
    for(const s of info.rows){
      const p=`BLS_${s.id}`;
      text.push(`${p}_PROVIDER=BLS`);
      text.push(`${p}_DATASET=${s.id}`);
      text.push(`${p}_CONTRACT=${CONTRACT}`);
      text.push(`${p}_SNAPSHOT_SHA256_VALID=YES`);
      text.push(`${p}_CHUNK_SHA256_VALID=YES`);
      text.push(`${p}_STORED_SNAPSHOT_VERSIONS=${s.storedVersions}`);
      text.push(`${p}_REVISIONS=UNDETERMINED_NO_OFFICIAL_VINTAGE`);
      text.push(`${p}_RETRIEVED_AT=${s.retrievedAt}`);
      text.push(`${p}_RAW_ROWS=${s.rows}`);
      text.push(`${p}_FIRST_PERIOD=${s.first}`);
      text.push(`${p}_LAST_PERIOD=${s.last}`);
      text.push(`${p}_GAPS=${s.gaps}`);
      text.push(`${p}_LATEST_RAW_VALUE=${s.latestRawValue}`);
      if(s.quarterly){
        text.push(`${p}_LATEST_QUARTER=${s.last}`);
        text.push(`${p}_LATEST_YOY_PERCENT_RAW=${s.latestRawValue}`);
        text.push(`${p}_TRANSFORM_APPLIED=NO`);
      }else{
        text.push(`${p}_LATEST_SA_INDEX=${s.latestRawValue}`);
        text.push(`${p}_YOY_VALID_PAIRS=${s.yoyPairs}`);
        text.push(`${p}_LATEST_YOY_DERIVED=${format(s.latestYoy)}`);
        text.push(`${p}_YOY_INPUT_CURRENT_PERIOD=${s.last}`);
        text.push(`${p}_YOY_INPUT_BASE_PERIOD=${s.latestBase??'UNAVAILABLE'}`);
        text.push(`${p}_LATEST_YOY_UNAVAILABLE_REASON=${s.latestYoy===null?'NO_EXACT_T_MINUS_12_BASE':'NONE'}`);
      }
    }
    text.push(`RESULT=${info.status}`);
    done=true;
  }catch(e){
    const code=typeof e?.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)?e.message:
      'SQLITE_OR_LINEAGE_REVIEW_REQUIRED';
    text.push(`ERROR=${code}`);
    text.push('RESULT=R3D_READ_ONLY_CHECK_FAILED');
    process.exitCode=2;
  }finally{
    try{db?.close();}catch{}
    text.push('SQLITE_WRITES=0');
    text.push('D1_WRITES=0');
    text.push('SCHEDULER_CHANGED=NO');
    text.push('EXISTING_SCORE_UNMODIFIED=YES');
    text.push('RAW_UNMODIFIED=YES');
    try{
      fs.writeFileSync(output,text.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`TXT_CREATED=${path.basename(output)}`);
      console.log(`R3D_READONLY_CHECK=${done?'FINISHED':'FAILED'}`);
    }catch{console.error('TXT_LOG_WRITE_FAILED');process.exitCode=1;}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await main();
}
