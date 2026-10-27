// R4 companion C: separate stored, informational BLS readings. No score dependency.
// Public GET never calls a provider, computes a financial indicator, or writes D1.
export const EARNINGS_C_SNAPSHOT_KEY = 'detail:earnings-recession-indicators:v1';
// Separate source checkpoint. Never rewrites the already published three-source C snapshot.
export const EARNINGS_C_SERVICE_SNAPSHOT_KEY =
  'detail:earnings-recession-indicators:bls-wpsfd42:v1';
export const EARNINGS_C_ROUTE = '/api/earnings-recession-indicators';
export const EARNINGS_C_SCHEMA = 'earnings-companion-c-r4-v1';
const DAY = 86_400_000;

// Conservative operational display windows, NOT official BLS release schedules.
// Observed-period age and source retrieval age are assessed independently.
export const EARNINGS_C_FRESHNESS = Object.freeze({
  MONTHLY: Object.freeze({observationMaxAgeDays:75,retrievalMaxAgeDays:75}),
  QUARTERLY: Object.freeze({observationMaxAgeDays:165,retrievalMaxAgeDays:165}),
});
const SERIES = new Set(['WPSFD4','WPSFD41','PRS85006111','WPSFD42']);
const METHODS = new Set(['SOURCE_INDEX','YOY_SA_T_MINUS_12','SOURCE_YOY']);
const ROW_STATUSES = new Set(['READY','PARTIAL','PENDING','SOURCE_FAILED','UNAVAILABLE']);
const keys = (value,allowed,code) => {
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||Object.keys(value).some(key=>!allowed.includes(key)))throw Error(code);
};
const strictISO = value => typeof value==='string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const finiteOrNull = value => value===null||Number.isFinite(value);
const natural = value => Number.isSafeInteger(value)&&value>=0;
const periodNumber = (period,frequency) => {
  if(typeof period!=='string')throw Error('EARNINGS_C_INVALID_PERIOD');
  if(frequency==='MONTHLY'){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('EARNINGS_C_INVALID_PERIOD');
    const [y,m]=period.split('-').map(Number);return y*12+m-1;
  }
  if(frequency==='QUARTERLY'){
    if(!/^\d{4}-Q[1-4]$/.test(period))throw Error('EARNINGS_C_INVALID_PERIOD');
    const [y,q]=period.split('-Q').map(Number);return y*4+q-1;
  }
  throw Error('EARNINGS_C_INVALID_FREQUENCY');
};
const periodEndExclusive = (period,frequency) => {
  const n=periodNumber(period,frequency);
  if(frequency==='MONTHLY')return Date.UTC(Math.floor((n+1)/12),(n+1)%12,1);
  return Date.UTC(Math.floor((n+1)/4),(n+1)%4*3,1);
};
const allowedPayload=['schemaVersion','status','sourceVersion','sourceStoredAt','generatedAt','historicalMode','observedThroughBySeries','coverage','rows'];
const allowedRow=['indicatorId','name','category','kind','value','unit','frequency','adjustment','observationPeriod','previousPeriod','previousValue','change','changeUnit','releaseDate','nextReleaseDate','retrievedAt','provider','seriesId','publisher','sourceURL','method','status','unavailableReason','history','historyCoverage'];
const SERVICE_IDS=new Set(['bls_ppi_services_index','bls_ppi_services_yoy_sa']);
function validateServicePayload(payload,{now=Date.now()}={}){
  validateEarningsCompanionPayload(payload,{now});
  if(payload.rows.length!==2||payload.observedThroughBySeries.WPSFD42===undefined
    ||Object.keys(payload.observedThroughBySeries).length!==1
    ||payload.rows.some(row=>row.seriesId!=='WPSFD42'||!SERVICE_IDS.has(row.indicatorId))
    ||new Set(payload.rows.map(row=>row.indicatorId)).size!==2
    ||payload.rows.some(row=>row.indicatorId==='bls_ppi_services_index'
      &&(row.kind!=='RAW'||row.method!=='SOURCE_INDEX'||row.unit!=='INDEX'))
    ||payload.rows.some(row=>row.indicatorId==='bls_ppi_services_yoy_sa'
      &&(row.kind!=='DERIVED'||row.method!=='YOY_SA_T_MINUS_12'||row.unit!=='PERCENT')))
    throw Error('EARNINGS_C_INVALID_SERVICE_PAYLOAD');
  return payload;
}

export function validateEarningsCompanionPayload(payload,{now=Date.now()}={}){
  keys(payload,allowedPayload,'EARNINGS_C_INVALID_PAYLOAD');
  if(payload.schemaVersion!==EARNINGS_C_SCHEMA||!['READY','PARTIAL'].includes(payload.status)
    ||!/^[a-f0-9]{64}$/.test(payload.sourceVersion??'')
    ||!Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0
    ||!strictISO(payload.generatedAt)||payload.historicalMode!=='CURRENT_RETRIEVAL_NOT_PIT'
    ||payload.sourceStoredAt>now||Date.parse(payload.generatedAt)>now
    ||Date.parse(payload.generatedAt)<payload.sourceStoredAt)throw Error('EARNINGS_C_INVALID_META');
  keys(payload.observedThroughBySeries,[...SERIES],'EARNINGS_C_INVALID_COVERAGE');
  keys(payload.coverage,['configured','ready','partial','unavailable'],'EARNINGS_C_INVALID_COVERAGE');
  if(!Array.isArray(payload.rows)||payload.rows.length<1||JSON.stringify(payload).length>400_000
    ||payload.coverage.configured!==payload.rows.length)throw Error('EARNINGS_C_INVALID_COVERAGE');
  const seen=new Set(),seriesPeriods=new Map();
  const counts={ready:0,partial:0,unavailable:0};
  for(const row of payload.rows){
    keys(row,allowedRow,'EARNINGS_C_INVALID_ROW');
    if(!/^[a-z][a-z0-9_]{2,100}$/.test(row.indicatorId??'')||seen.has(row.indicatorId)
      ||typeof row.name!=='string'||!row.name||row.name.length>150
      ||row.category!=='COST_PRESSURE'||!['RAW','DERIVED'].includes(row.kind)
      ||!['INDEX','PERCENT'].includes(row.unit)||!EARNINGS_C_FRESHNESS[row.frequency]
      ||row.adjustment!=='SA'||row.provider!=='BLS'||!SERIES.has(row.seriesId)
      ||row.publisher!=='U.S. Bureau of Labor Statistics'
      ||row.sourceURL!==`https://data.bls.gov/timeseries/${row.seriesId}`
      ||!METHODS.has(row.method)||!ROW_STATUSES.has(row.status)
      ||!strictISO(row.retrievedAt)||Date.parse(row.retrievedAt)>now
      ||Date.parse(row.retrievedAt)<payload.sourceStoredAt
      ||row.releaseDate!==null||row.nextReleaseDate!==null
      ||!finiteOrNull(row.value)||!finiteOrNull(row.previousValue)
      ||!finiteOrNull(row.change)
      ||!['INDEX_POINTS','PERCENTAGE_POINTS'].includes(row.changeUnit)
      ||row.changeUnit!==(row.unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS')
      ||typeof row.unavailableReason!=='string'&&row.unavailableReason!==null
      ||row.kind==='DERIVED'&&row.method!=='YOY_SA_T_MINUS_12'
      ||row.method==='SOURCE_INDEX'&&row.unit!=='INDEX'
      ||row.method!=='SOURCE_INDEX'&&row.unit!=='PERCENT'
      ||row.seriesId==='PRS85006111'&&(row.kind!=='RAW'||row.method!=='SOURCE_YOY')
      ||row.seriesId!=='PRS85006111'&&!(row.kind==='RAW'&&row.method==='SOURCE_INDEX'
        ||row.kind==='DERIVED'&&row.method==='YOY_SA_T_MINUS_12')
      ||row.seriesId==='PRS85006111'&&row.frequency!=='QUARTERLY'
      ||row.seriesId!=='PRS85006111'&&row.frequency!=='MONTHLY'
      ||row.status==='READY'&&!Number.isFinite(row.value)
      ||row.status!=='READY'&&row.value!==null)throw Error('EARNINGS_C_INVALID_ROW');
    seen.add(row.indicatorId);
    const obs=periodNumber(row.observationPeriod,row.frequency);
    if(periodEndExclusive(row.observationPeriod,row.frequency)>Date.parse(row.retrievedAt)
      ||row.previousPeriod!==null&&periodNumber(row.previousPeriod,row.frequency)!==obs-1
      ||row.previousPeriod===null&&row.previousValue!==null
      ||row.previousPeriod!==null&&!Number.isFinite(row.previousValue)
      ||row.change===null&&row.value!==null&&row.previousValue!==null
      ||row.change!==null&&(row.previousValue===null||row.value===null
        ||Math.abs(row.change-(row.value-row.previousValue))>1e-9*Math.max(1,Math.abs(row.change))))throw Error('EARNINGS_C_INVALID_PERIOD');
    if(seriesPeriods.has(row.seriesId)&&seriesPeriods.get(row.seriesId)!==row.observationPeriod)
      throw Error('EARNINGS_C_MIXED_SERIES_PERIOD');
    seriesPeriods.set(row.seriesId,row.observationPeriod);
    keys(row.historyCoverage,['actualPoints','expectedPeriods','complete'],'EARNINGS_C_INVALID_HISTORY');
    const expected=row.frequency==='MONTHLY'?13:5;
    if(!Array.isArray(row.history)||row.history.length!==expected
      ||row.historyCoverage.expectedPeriods!==expected)throw Error('EARNINGS_C_INVALID_HISTORY');
    let actual=0;
    for(let i=0;i<expected;i++){
      const point=row.history[i];keys(point,['period','value'],'EARNINGS_C_INVALID_HISTORY');
      if(periodNumber(point.period,row.frequency)!==obs-expected+1+i
        ||!finiteOrNull(point.value))throw Error('EARNINGS_C_INVALID_HISTORY');
      if(point.value!==null)actual++;
    }
    if(row.historyCoverage.actualPoints!==actual||row.historyCoverage.complete!==(actual===expected)
      ||row.history.at(-1).value!==row.value)throw Error('EARNINGS_C_INVALID_HISTORY');
    counts[row.status==='READY'?'ready':row.status==='PARTIAL'?'partial':'unavailable']++;
  }
  if(Object.keys(payload.observedThroughBySeries).length!==seriesPeriods.size
    ||[...seriesPeriods].some(([s,p])=>payload.observedThroughBySeries[s]!==p)
    ||!Object.entries(counts).every(([k,v])=>payload.coverage[k]===v)
    ||payload.status!==(counts.ready===payload.rows.length?'READY':'PARTIAL'))
    throw Error('EARNINGS_C_INVALID_COVERAGE');
  return payload;
}

export function earningsCompanionFreshness(row,{now=Date.now()}={}){
  const policy=EARNINGS_C_FRESHNESS[row.frequency];
  const sourceAt=Date.parse(row.retrievedAt);
  const periodEnd=periodEndExclusive(row.observationPeriod,row.frequency);
  const reason=now<sourceAt||now<periodEnd?'FUTURE_SOURCE_OR_PERIOD'
    :now-sourceAt>=policy.retrievalMaxAgeDays*DAY?'SOURCE_RETRIEVAL_EXPIRED'
    :now-periodEnd>=policy.observationMaxAgeDays*DAY?'OBSERVATION_EXPIRED':null;
  return {status:reason?'STALE':'FRESH',reason,observedPeriodEnd:new Date(periodEnd).toISOString(),
    policyDays:{observation:policy.observationMaxAgeDays,retrieval:policy.retrievalMaxAgeDays}};
}

const responseHeaders=Object.freeze({'cache-control':'no-store','x-robots-tag':'noindex',
  'x-content-type-options':'nosniff','x-public-projection':'STORED'});
async function readOptionalService(core,{now}){
  let record;
  try {
    record=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(EARNINGS_C_SERVICE_SNAPSHOT_KEY).first();
  }catch{return {state:'READ_UNAVAILABLE'};}
  if(!record)return {state:'NOT_PUBLISHED'};
  try {
    if(typeof record.body!=='string'||record.body.length>400_000)
      throw Error('EARNINGS_C_SERVICE_STORED_ROW_INVALID');
    const envelope=JSON.parse(record.body);
    keys(envelope,['payload','projection'],'EARNINGS_C_INVALID_ENVELOPE');
    const payload=validateServicePayload(envelope.payload,{now});
    const projection=envelope.projection;
    keys(projection,['status','sourceVersion','sourceStoredAt',
      'expectedSourceVersion','expectedSourceStoredAt','builtAt'],'EARNINGS_C_INVALID_ENVELOPE');
    if(projection.status!=='READY'
      ||projection.sourceStoredAt!==payload.sourceStoredAt
      ||projection.sourceVersion!==payload.sourceVersion
      ||projection.expectedSourceStoredAt!==payload.sourceStoredAt
      ||projection.expectedSourceVersion!==payload.sourceVersion
      ||!Number.isSafeInteger(projection.builtAt)||projection.builtAt>now
      ||!Number.isSafeInteger(Number(record.stored_at))
      ||Number(record.stored_at)<payload.sourceStoredAt
      ||Number(record.stored_at)>now
      ||projection.builtAt!==Number(record.stored_at))
      throw Error('EARNINGS_C_SERVICE_CHECKPOINT_INVALID');
    return {state:'READY',payload};
  }catch{return {state:'INVALID'};}
}
async function compositeSourceVersion(baseVersion,serviceVersion){
  const bytes=new TextEncoder().encode(
    `earnings-companion-c-stored-merge-v1\n${baseVersion}\n${serviceVersion}`);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function readEarningsCompanionResponse(request,readOnlyCore,{now=Date.now()}={}){
  const reply=(body,status=200,extra={})=>new Response(request.method==='HEAD'?null:JSON.stringify(body),
    {status,headers:{...responseHeaders,'content-type':'application/json; charset=utf-8',...extra}});
  if(!['GET','HEAD'].includes(request.method))return reply({reason:'METHOD_NOT_ALLOWED'},405);
  if(new URL(request.url).search)return reply({reason:'QUERY_NOT_ALLOWED'},400);
  if(!readOnlyCore?.prepare)return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
  let raw;
  try{raw=await readOnlyCore.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .bind(EARNINGS_C_SNAPSHOT_KEY).first();}
  catch{return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
  if(!raw)return reply({status:'unavailable',reason:'STORED_PROJECTION_PENDING'},503);
  let envelope,payload,projection;
  try{
    if(typeof raw.body!=='string'||raw.body.length>400_000)throw Error('INVALID_STORED_ROW');
    envelope=JSON.parse(raw.body);keys(envelope,['payload','projection'],'EARNINGS_C_INVALID_ENVELOPE');
    projection=envelope.projection;keys(projection,['status','sourceVersion','sourceStoredAt','expectedSourceVersion','expectedSourceStoredAt','builtAt'],'EARNINGS_C_INVALID_ENVELOPE');
    payload=validateEarningsCompanionPayload(envelope.payload,{now});
    if(projection.status!=='READY'||projection.sourceStoredAt!==payload.sourceStoredAt
      ||projection.sourceVersion!==payload.sourceVersion
      ||projection.expectedSourceStoredAt!==payload.sourceStoredAt
      ||projection.expectedSourceVersion!==payload.sourceVersion
      ||!Number.isSafeInteger(projection.builtAt)||projection.builtAt>now
      ||!Number.isSafeInteger(Number(raw.stored_at))||Number(raw.stored_at)<payload.sourceStoredAt
      ||Number(raw.stored_at)>now||projection.builtAt!==Number(raw.stored_at))
      throw Error('EARNINGS_C_INVALID_CHECKPOINT');
  }catch{return reply({status:'unavailable',reason:'STORED_PROJECTION_INVALID'},503);}
  const extension=await readOptionalService(readOnlyCore,{now});
  let combined=payload;
  let extensionState=extension.state;
  if(extension.state==='READY'){
    try{
      const extra=extension.payload;
      const mergedRows=[...payload.rows,...extra.rows];
      const counts={ready:mergedRows.filter(row=>row.status==='READY').length,
        partial:mergedRows.filter(row=>row.status==='PARTIAL').length,
        unavailable:mergedRows.filter(row=>!['READY','PARTIAL'].includes(row.status)).length};
      const proposed={...payload,
        sourceVersion:await compositeSourceVersion(payload.sourceVersion,extra.sourceVersion),
        sourceStoredAt:Math.min(payload.sourceStoredAt,extra.sourceStoredAt),
        generatedAt:payload.generatedAt>extra.generatedAt?payload.generatedAt:extra.generatedAt,
        observedThroughBySeries:{...payload.observedThroughBySeries,...extra.observedThroughBySeries},
        coverage:{configured:mergedRows.length,...counts},
        status:counts.ready===mergedRows.length?'READY':'PARTIAL',rows:mergedRows};
      combined=validateEarningsCompanionPayload(proposed,{now});
    }catch{extensionState='INVALID';}
  }
  const rows=combined.rows.map(row=>{
    const freshness=earningsCompanionFreshness(row,{now});
    return {...row,status:freshness.status==='STALE'?'STALE':row.status,freshness};
  });
  const freshReady=rows.filter(row=>row.status==='READY').length;
  if(!freshReady)return reply({status:'unavailable',reason:'STORED_PROJECTION_STALE'},503);
  const coverage={configured:rows.length,ready:freshReady,
    partial:rows.filter(row=>row.status==='PARTIAL').length,
    stale:rows.filter(row=>row.status==='STALE').length,
    unavailable:rows.filter(row=>!['READY','PARTIAL','STALE'].includes(row.status)).length};
  return reply({...combined,status:freshReady===rows.length?'READY':'PARTIAL',coverage,rows},200,
    {'x-projection-source-at':new Date(combined.sourceStoredAt).toISOString(),
      'x-earnings-c-service':extensionState});
}

// Called only by an explicitly approved PC-side publisher, NEVER from a public request.
export function earningsCompanionWriter(core,{snapshotKey=EARNINGS_C_SNAPSHOT_KEY}={}){
  if(!core?.prepare)throw Error('EARNINGS_C_STORAGE_UNAVAILABLE');
  if(![EARNINGS_C_SNAPSHOT_KEY,EARNINGS_C_SERVICE_SNAPSHOT_KEY].includes(snapshotKey))
    throw Error('EARNINGS_C_SNAPSHOT_KEY_NOT_ALLOWED');
  return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
    validateEarningsCompanionPayload(payload,{now:storedAt});
    if(snapshotKey===EARNINGS_C_SERVICE_SNAPSHOT_KEY)
      validateServicePayload(payload,{now:storedAt});
    if(snapshotKey===EARNINGS_C_SNAPSHOT_KEY
      &&payload.rows.some(row=>row.seriesId==='WPSFD42'))
      throw Error('EARNINGS_C_SERVICE_REQUIRES_SEPARATE_KEY');
    if(!Number.isSafeInteger(storedAt)||storedAt<Date.parse(payload.generatedAt))
      throw Error('EARNINGS_C_INVALID_STORED_AT');
    if(!payload.rows.some(row=>row.status==='READY'
      &&earningsCompanionFreshness(row,{now:storedAt}).status==='FRESH'))
      throw Error('EARNINGS_C_NO_FRESH_ROWS');
    const previous=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(snapshotKey).first();
    if(previous){
      let old;try{old=JSON.parse(previous.body)?.projection;}catch{throw Error('EARNINGS_C_EXISTING_INVALID');}
      if(!Number.isSafeInteger(old?.sourceStoredAt)||!old?.sourceVersion
        ||old.sourceStoredAt>payload.sourceStoredAt)throw Error('EARNINGS_C_SUPERSEDED');
      if(old.sourceStoredAt===payload.sourceStoredAt){
        if(old.sourceVersion!==payload.sourceVersion)throw Error('EARNINGS_C_CONFLICTING_VERSION');
        let priorPayload;
        try{priorPayload=JSON.parse(previous.body)?.payload;
          validateEarningsCompanionPayload(priorPayload,{now:storedAt});}
        catch{throw Error('EARNINGS_C_EXISTING_INVALID');}
        const modelIdentity=x=>JSON.stringify({schemaVersion:x.schemaVersion,
          historicalMode:x.historicalMode,observedThroughBySeries:x.observedThroughBySeries,
          coverage:x.coverage,rows:x.rows});
        if(modelIdentity(priorPayload)!==modelIdentity(payload))
          throw Error('EARNINGS_C_CONFLICTING_CONTENT');
        return {status:'ALREADY_STORED',key:snapshotKey,storedAt:Number(previous.stored_at)};
      }
    }
    const envelope={payload,projection:{status:'READY',builtAt:storedAt,
      sourceStoredAt:payload.sourceStoredAt,sourceVersion:payload.sourceVersion,
      expectedSourceStoredAt:payload.sourceStoredAt,expectedSourceVersion:payload.sourceVersion}};
    const json=JSON.stringify(envelope);
    if(json.length>400_000)throw Error('EARNINGS_C_PAYLOAD_TOO_LARGE');
    const sql=`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
      VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE
      SET body=excluded.body,stored_at=excluded.stored_at
      WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') < ?
        AND market_public_snapshots_v1.stored_at <= ?`;
    const result=await core.prepare(sql).bind(snapshotKey,json,storedAt,
      payload.sourceStoredAt,storedAt).run();
    if(result?.meta?.changes!==1)throw Error('EARNINGS_C_SUPERSEDED');
    // Database readback is mandatory; a successful INSERT response alone is not a PASS.
    const check=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(snapshotKey).first();
    if(check?.body!==json||Number(check?.stored_at)!==storedAt)
      throw Error('EARNINGS_C_READBACK_MISMATCH');
    return {status:'READBACK_VERIFIED',key:snapshotKey,storedAt,
      sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt};
  }});
}
