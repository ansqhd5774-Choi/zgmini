// Earnings Companion C R4 phase 1: offline PC SQLite -> local JSON/TXT preview.
// No network calls, SQLite writes, D1 operations, scheduling or score changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {analyze,validateSnapshot} from './EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PC_ROOT = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const DB_PATH = path.join(PC_ROOT, 'storage', 'core.sqlite');
export const SCHEMA_VERSION = 'earnings-companion-c-r4-v1';
const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const fail = code => { throw new Error(code); };
const SOURCE = 'U.S. Bureau of Labor Statistics';

// Extensible registry: entries are independently labeled but not independent evidence.
export const INDICATORS = Object.freeze([
  {indicatorId:'bls_ppi_final_demand_yoy_sa',name:'최종수요 생산자물가 · 전년 대비',seriesId:'WPSFD4',kind:'DERIVED',method:'YOY_SA_T_MINUS_12',unit:'PERCENT'},
  {indicatorId:'bls_ppi_final_demand_index',name:'최종수요 생산자물가 · 지수',seriesId:'WPSFD4',kind:'RAW',method:'SOURCE_INDEX',unit:'INDEX'},
  {indicatorId:'bls_ppi_goods_yoy_sa',name:'재화 생산자물가 · 전년 대비',seriesId:'WPSFD41',kind:'DERIVED',method:'YOY_SA_T_MINUS_12',unit:'PERCENT'},
  {indicatorId:'bls_ppi_goods_index',name:'재화 생산자물가 · 지수',seriesId:'WPSFD41',kind:'RAW',method:'SOURCE_INDEX',unit:'INDEX'},
  {indicatorId:'bls_unit_labor_cost_yoy',name:'비농업 단위노동비용 · 전년 대비',seriesId:'PRS85006111',kind:'RAW',method:'SOURCE_YOY',unit:'PERCENT'},
]);
export const SERVICE_INDICATORS = Object.freeze([
  {indicatorId:'bls_ppi_services_yoy_sa',name:'서비스 생산자물가 · 전년 대비',
    seriesId:'WPSFD42',kind:'DERIVED',method:'YOY_SA_T_MINUS_12',unit:'PERCENT'},
  {indicatorId:'bls_ppi_services_index',name:'서비스 생산자물가 · 지수',
    seriesId:'WPSFD42',kind:'RAW',method:'SOURCE_INDEX',unit:'INDEX'},
]);

const isoUTC = value => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function ordinal(period, quarterly) {
  if (quarterly) {
    if (!/^\d{4}-Q[1-4]$/.test(period)) fail('INVALID_QUARTER_KEY');
    const [y,q] = period.split('-Q').map(Number);
    return y * 4 + q - 1;
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) fail('INVALID_MONTH_KEY');
  const [y,m] = period.split('-').map(Number);
  return y * 12 + m - 1;
}

function periodAt(n, quarterly) {
  if (quarterly) {
    const y=Math.floor(n/4), q=n%4+1;
    return `${String(y).padStart(4,'0')}-Q${q}`;
  }
  const y=Math.floor(n/12), m=n%12+1;
  return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}`;
}

function valuesAt(rowMap, n, method) {
  const now=rowMap.get(n);
  if (!now) return null;
  if (method!=='YOY_SA_T_MINUS_12') return now.value;
  const base=rowMap.get(n-12);
  // A zero/negative denominator cannot produce a valid index YoY.
  if (!base || !(base.value>0)) return null;
  const value=100*(now.value/base.value-1);
  return Number.isFinite(value)?value:null;
}

function buildRow(def, item) {
  const quarterly=def.seriesId==='PRS85006111';
  const rawByOrdinal=new Map();
  for (const raw of item.rawRows) {
    const period=quarterly?raw.observationDate:raw.observationDate.slice(0,7);
    const at=ordinal(period,quarterly);
    if (rawByOrdinal.has(at)) fail('R4_DUPLICATE_OBSERVATION');
    rawByOrdinal.set(at,{value:raw.value,period});
  }
  if (!rawByOrdinal.size) fail('R4_SOURCE_ROWS_EMPTY');
  const latestOrdinal=Math.max(...rawByOrdinal.keys());
  const latestPeriod=periodAt(latestOrdinal,quarterly);
  const current=valuesAt(rawByOrdinal,latestOrdinal,def.method);
  const before=valuesAt(rawByOrdinal,latestOrdinal-1,def.method);
  const previousPeriod=before===null?null:periodAt(latestOrdinal-1,quarterly);
  const change=current===null||before===null?null:current-before;
  const periods=quarterly?5:13;
  const history=Array.from({length:periods},(_,i)=>{
    const at=latestOrdinal-periods+1+i;
    return {period:periodAt(at,quarterly),value:valuesAt(rawByOrdinal,at,def.method)};
  });
  const actualPoints=history.filter(point=>point.value!==null).length;
  const status=current===null?'PARTIAL':'READY';
  return {
    indicatorId:def.indicatorId,name:def.name,category:'COST_PRESSURE',kind:def.kind,
    value:current,unit:def.unit,frequency:quarterly?'QUARTERLY':'MONTHLY',
    adjustment:'SA',observationPeriod:latestPeriod,previousPeriod,
    previousValue:before,change,
    changeUnit:def.unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS',
    releaseDate:null,nextReleaseDate:null,retrievedAt:item.retrievedAt,
    provider:'BLS',seriesId:def.seriesId,publisher:SOURCE,
    sourceURL:`https://data.bls.gov/timeseries/${def.seriesId}`,
    method:def.method,status,
    unavailableReason:current===null
      ?def.method==='YOY_SA_T_MINUS_12'?'EXACT_T_MINUS_12_BASE_MISSING_OR_NONPOSITIVE':'LATEST_OBSERVATION_MISSING'
      :null,
    history,historyCoverage:{actualPoints,expectedPeriods:periods,complete:actualPoints===periods},
  };
}

// Invokes the previously verified R3D validator before reading the chosen raw cohort.
// Only explicitly selected, hash-verified BLS rows are used; no fallback namespace.
export function buildPreview(db,{generatedAt=new Date().toISOString(),includeServices=true}={}) {
  if (!isoUTC(generatedAt)) fail('R4_GENERATED_AT_INVALID');
  const prior=analyze(db);
  const picked=new Map();
  const firstSeen=[];
  for(const item of prior.rows) {
    const stored=db.prepare(`SELECT chunk_hashes_json,retrieved_at FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset=? AND snapshot_sha256=? LIMIT 1`)
      .get(item.id,item.snapshotSha256);
    if (!stored || stored.retrieved_at!==prior.cohortRetrievedAt) fail('R4_COHORT_SNAPSHOT_CHANGED');
    let hashes;
    try {hashes=JSON.parse(stored.chunk_hashes_json);} catch {fail('R4_COHORT_CHUNK_LIST_INVALID');}
    if (!Array.isArray(hashes)||hashes.length!==1) fail('R4_COHORT_CHUNK_LIST_INVALID');
    const chunk=db.prepare(`SELECT payload_json,first_seen_at FROM api_history_chunks_v1
      WHERE provider='BLS' AND dataset=? AND chunk_sha256=? LIMIT 1`)
      .get(item.id,hashes[0]);
    if(!chunk||sha256(chunk.payload_json)!==hashes[0]) fail('R4_CHUNK_CHANGED_AFTER_VALIDATION');
    if(!isoUTC(chunk.first_seen_at)
      || Date.parse(chunk.first_seen_at)>Date.parse(item.retrievedAt)) fail('R4_FIRST_SEEN_AT_INVALID');
    let rawRows;
    try {rawRows=JSON.parse(chunk.payload_json);} catch {fail('R4_RAW_JSON_INVALID');}
    if(!Array.isArray(rawRows)||rawRows.length!==item.rows
      ||rawRows.at(-1)?.observationDate!==item.last) fail('R4_RAW_ROWS_CHANGED_AFTER_VALIDATION');
    picked.set(item.id,{...item,rawRows,firstSeenAt:chunk.first_seen_at});
    firstSeen.push(Date.parse(chunk.first_seen_at));
  }
  // The optional service PPI is independently captured and hash-verified.
  // Keep each retrieval's own timestamp/SHA; never manufacture a common cohort.
  const services=!includeServices?[]:db.prepare(`SELECT provider,dataset,snapshot_sha256,as_of,retrieved_at,
    status,history_mode,row_count,latest_observation_date,chunk_hashes_json,provenance_json
    FROM api_history_snapshots_v1
    WHERE provider='BLS' AND dataset='WPSFD42'
    ORDER BY retrieved_at DESC LIMIT 501`).all();
  if(services.length>500)fail('R4_SERVICE_SNAPSHOT_SCAN_LIMIT');
  if(services.length) {
    const source=validateSnapshot(db,services[0]);
    const hashList=JSON.parse(services[0].chunk_hashes_json);
    const chunk=db.prepare(`SELECT payload_json,first_seen_at FROM api_history_chunks_v1
      WHERE provider='BLS' AND dataset='WPSFD42' AND chunk_sha256=? LIMIT 1`)
      .get(hashList[0]);
    if(!chunk||sha256(chunk.payload_json)!==hashList[0])
      fail('R4_SERVICE_CHUNK_CHANGED_AFTER_VALIDATION');
    if(!isoUTC(chunk.first_seen_at)
      ||Date.parse(chunk.first_seen_at)>Date.parse(source.retrievedAt))
      fail('R4_SERVICE_FIRST_SEEN_AT_INVALID');
    let rawRows;
    try{rawRows=JSON.parse(chunk.payload_json);}catch{fail('R4_SERVICE_RAW_JSON_INVALID');}
    if(!Array.isArray(rawRows)||rawRows.length!==source.rows
      ||rawRows.at(-1)?.observationDate!==source.last)
      fail('R4_SERVICE_RAW_ROWS_CHANGED_AFTER_VALIDATION');
    picked.set(source.id,{...source,rawRows,firstSeenAt:chunk.first_seen_at});
    firstSeen.push(Date.parse(chunk.first_seen_at));
  }
  const activeIndicators=picked.has('WPSFD42')
    ?[...INDICATORS,...SERVICE_INDICATORS]:INDICATORS;
  const activeSources=[...prior.rows,...(picked.has('WPSFD42')?[picked.get('WPSFD42')]:[])];
  const rows=activeIndicators.map(def=>{
    const source=picked.get(def.seriesId);
    if(!source) fail('R4_REGISTRY_SOURCE_UNVERIFIED');
    return buildRow(def,source);
  });
  const coverage={configured:rows.length,ready:rows.filter(r=>r.status==='READY').length,
    partial:rows.filter(r=>r.status==='PARTIAL').length,
    unavailable:rows.filter(r=>r.status==='UNAVAILABLE').length};
  const status=prior.status==='PASS_R3D_STORED_ONLY_CALCULATION'&&coverage.ready===coverage.configured
    ?'READY':'PARTIAL';
  const identity=[SCHEMA_VERSION,...activeSources.map(x=>`${x.id}|${x.snapshotSha256}`).sort()];
  const sourceVersion=sha256(identity.join('\n'));
  return {
    payload:{schemaVersion:SCHEMA_VERSION,status,sourceVersion,
      sourceStoredAt:Math.min(...firstSeen),generatedAt,
      historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
      observedThroughBySeries:Object.fromEntries(activeSources.map(x=>[
        x.id,x.quarterly?x.last:x.last.slice(0,7)])),
      coverage,rows},
    diagnostics:{r3dStatus:prior.status,snapshotsChecked:prior.snapshotsChecked+(services.length?1:0),
      newerIncomplete:prior.newerIncomplete,cohortRetrievedAt:prior.cohortRetrievedAt,
      sourceStoredAtPolicy:'OLDEST_FIRST_SEEN_AT',
      serviceRetrievalIndependent:services.length>0,
      bySeries:activeSources.map(x=>({seriesId:x.id,snapshotSha256:x.snapshotSha256,
        firstSeenAt:picked.get(x.id).firstSeenAt,rawRows:x.rows,gaps:x.gaps})),
      duplicateEvidenceGroups:['WPSFD4 RAW+DERIVED','WPSFD41 RAW+DERIVED',
        ...(picked.has('WPSFD42')?['WPSFD42 RAW+DERIVED']:[])]},
  };
}

// Only the independent WPSFD42 lineage enters the supplementary D1 checkpoint.
// The existing three-source C key continues to publish its same original five rows.
export function buildServiceSourcePreview(db,{generatedAt=new Date().toISOString()}={}){
  const full=buildPreview(db,{generatedAt,includeServices:true});
  const source=full.diagnostics.bySeries.find(row=>row.seriesId==='WPSFD42');
  if(!source)fail('R4_SERVICE_SOURCE_NOT_STORED');
  const rows=full.payload.rows.filter(row=>row.seriesId==='WPSFD42');
  if(rows.length!==2)fail('R4_SERVICE_INDICATOR_COUNT_MISMATCH');
  const ready=rows.filter(row=>row.status==='READY').length;
  const partial=rows.filter(row=>row.status==='PARTIAL').length;
  const unavailable=rows.length-ready-partial;
  const sourceStoredAt=Date.parse(source.firstSeenAt);
  if(!Number.isSafeInteger(sourceStoredAt)||sourceStoredAt<=0)
    fail('R4_SERVICE_FIRST_SEEN_AT_INVALID');
  const payload={
    schemaVersion:SCHEMA_VERSION,
    status:ready===rows.length?'READY':'PARTIAL',
    sourceVersion:sha256(`EARNINGS_C_SERVICE_SOURCE_CHECKPOINT_V1\nWPSFD42|${source.snapshotSha256}`),
    sourceStoredAt,generatedAt,
    historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
    observedThroughBySeries:{WPSFD42:rows[0].observationPeriod},
    coverage:{configured:rows.length,ready,partial,unavailable},
    rows,
  };
  return {payload,diagnostics:{
    ...full.diagnostics,snapshotsChecked:1,bySeries:[source],
    sourceStoredAtPolicy:'WPSFD42_FIRST_SEEN_AT',
    sourcePartition:'WPSFD42_ONLY_NO_BASE_REWRITE',
  }};
}

export function reportLines(result,now) {
  const {payload,diagnostics}=result;
  const lines=['EARNINGS_COMPANION_R4_C_READ_MODEL_PREVIEW_R1_20261027',
    `UTC=${now}`,'MODE=PC_SQLITE_READ_ONLY_LOCAL_PREVIEW_NO_API',
    `R3D_REVALIDATION=${diagnostics.r3dStatus}`,
    `SNAPSHOTS_HASH_VERIFIED=${diagnostics.snapshotsChecked}`,
    `NEWER_INCOMPLETE_COHORT=${diagnostics.newerIncomplete?'YES':'NO'}`,
    `COHORT_RETRIEVED_AT=${diagnostics.cohortRetrievedAt}`,
    `SOURCE_VERSION=${payload.sourceVersion}`,
    `SOURCE_STORED_AT_MS=${payload.sourceStoredAt}`,
    `SOURCE_STORED_AT_POLICY=${diagnostics.sourceStoredAtPolicy}`,
    `HISTORICAL_MODE=${payload.historicalMode}`,
    `CONFIGURED_ROWS=${payload.coverage.configured}`,
    `READY_ROWS=${payload.coverage.ready}`,
    `PARTIAL_ROWS=${payload.coverage.partial}`,
    `UNAVAILABLE_ROWS=${payload.coverage.unavailable}`];
  for(const s of diagnostics.bySeries){
    lines.push(`BLS_${s.seriesId}_SNAPSHOT_SHA256=${s.snapshotSha256}`);
    lines.push(`BLS_${s.seriesId}_CHUNK_FIRST_SEEN_AT=${s.firstSeenAt}`);
    lines.push(`BLS_${s.seriesId}_RAW_ROWS=${s.rawRows}`);
    lines.push(`BLS_${s.seriesId}_GAPS=${s.gaps}`);
  }
  for(const row of payload.rows){
    const prefix=`ROW_${row.indicatorId.toUpperCase()}`;
    lines.push(`${prefix}_OBSERVATION=${row.observationPeriod}`);
    lines.push(`${prefix}_VALUE=${row.value===null?'UNAVAILABLE':row.value}`);
    lines.push(`${prefix}_PREVIOUS_VALUE=${row.previousValue===null?'UNAVAILABLE':row.previousValue}`);
    lines.push(`${prefix}_CHANGE=${row.change===null?'UNAVAILABLE':row.change}`);
    lines.push(`${prefix}_HISTORY_ACTUAL=${row.historyCoverage.actualPoints}`);
    lines.push(`${prefix}_HISTORY_EXPECTED=${row.historyCoverage.expectedPeriods}`);
    lines.push(`${prefix}_STATUS=${row.status}`);
    lines.push(`${prefix}_UNAVAILABLE_REASON=${row.unavailableReason??'NONE'}`);
  }
  lines.push(`SOURCE_GROUPS_INDEPENDENT=${diagnostics.bySeries.length}`,
    'RELEASE_DATES_INFERRED=NO',
    'PUBLIC_API_REGISTERED=NO','PUBLICATION_PERFORMED=NO',
    `RESULT=${payload.status==='READY'?'PASS_R4_LOCAL_PREVIEW_READY':'PARTIAL_R4_LOCAL_PREVIEW'}`);
  return lines;
}

async function main() {
  const now=new Date().toISOString();
  const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
  const stem=`EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_${stamp}`;
  const txtFile=path.join(HERE,stem+'.txt');
  const jsonFile=path.join(HERE,stem+'.json');
  let db,lines=[];
  try {
    if (!fs.existsSync(DB_PATH)) fail('PC_SQLITE_FILE_MISSING');
    db=new DatabaseSync(DB_PATH,{readOnly:true,timeout:4000});
    db.exec('PRAGMA query_only=ON');
    const result=buildPreview(db,{generatedAt:now});
    lines=reportLines(result,now);
    // Read-only source DB is closed before writing local preview artifacts.
    db.close();db=null;
    fs.writeFileSync(jsonFile,JSON.stringify(result.payload,null,2)+'\n',{encoding:'utf8',flag:'wx'});
    console.log(`JSON_CREATED=${path.basename(jsonFile)}`);
  } catch(e) {
    const code=typeof e?.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)
      ?e.message:'R4_LINEAGE_OR_PREVIEW_REVIEW_REQUIRED';
    lines=['EARNINGS_COMPANION_R4_C_READ_MODEL_PREVIEW_R1_20261027',
      `UTC=${now}`,'MODE=PC_SQLITE_READ_ONLY_LOCAL_PREVIEW_NO_API',
      `ERROR=${code}`,'RESULT=R4_LOCAL_PREVIEW_FAILED'];
    process.exitCode=2;
  } finally {
    try{db?.close();}catch{}
    lines.push('API_REQUESTS=0','SQLITE_WRITES=0','D1_WRITES=0',
      'SCHEDULER_CHANGED=NO','EXISTING_SCORE_UNMODIFIED=YES');
    try{
      fs.writeFileSync(txtFile,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`TXT_CREATED=${path.basename(txtFile)}`);
      console.log(`R4_LOCAL_PREVIEW=${process.exitCode?'FAILED':'FINISHED'}`);
    }catch{console.error('TXT_LOG_WRITE_FAILED');process.exitCode=1;}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await main();
}
