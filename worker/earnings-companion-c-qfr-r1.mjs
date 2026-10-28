// Independently checkpointed, informational Census QFR manufacturing margin.
// Never update the BLS companion keys, E1-R4 scores, or collect data in a Worker.
export const QFR_SNAPSHOT_KEY='detail:earnings-recession-indicators:census-qfr-mfg-margin:v1';
export const QFR_SCHEMA='earnings-companion-c-qfr-r1-v1';
const URL='https://www.census.gov/econ_getzippedfile/?programCode=QFR';
const DATASET='QFR_MFG_US_NSA_AFTER_TAX_MARGIN';
const ID='census_qfr_manufacturing_after_tax_margin_nsa';
const DAY=86_400_000;
const FRESHNESS_DAYS=165; // Display heuristic, not a Census release schedule.
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const fail=code=>{throw Error(code);};
const isUtc=value=>typeof value==='string'&&UTC.test(value)
  &&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const exact=(value,allowed,code)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||Object.keys(value).length!==allowed.length
    ||allowed.some(key=>!Object.hasOwn(value,key)))fail(code);
};
const number=value=>typeof value==='number'&&Number.isFinite(value);
const periodOrdinal=period=>{
  if(typeof period!=='string'||!/^\d{4}-Q[1-4]$/.test(period))fail('QFR_D1_PERIOD_INVALID');
  const [year,q]=period.split('-Q').map(Number);
  return year*4+q-1;
};
const periodEnd=period=>{
  const n=periodOrdinal(period)+1;
  return Date.UTC(Math.floor(n/4),(n%4)*3,1);
};

export function validateQfrCompanionPayload(payload,{now=Date.now()}={}){
  exact(payload,['schemaVersion','status','sourceVersion','sourceSha256','sourceStoredAt',
    'generatedAt','historicalMode','observedThrough','coverage','rows'],'QFR_D1_PAYLOAD_INVALID');
  if(payload.schemaVersion!==QFR_SCHEMA||payload.status!=='READY'
    ||!SHA.test(payload.sourceVersion??'')||!SHA.test(payload.sourceSha256??'')
    ||!Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0
    ||!Number.isSafeInteger(now)||payload.sourceStoredAt>now
    ||!isUtc(payload.generatedAt)||Date.parse(payload.generatedAt)<payload.sourceStoredAt
    ||Date.parse(payload.generatedAt)>now
    ||payload.historicalMode!=='CURRENT_RETRIEVAL_NOT_PIT'
    ||!Array.isArray(payload.rows)||payload.rows.length!==1
    ||JSON.stringify(payload).length>30_000)fail('QFR_D1_META_INVALID');
  exact(payload.coverage,['configured','ready','independentSources'],'QFR_D1_COVERAGE_INVALID');
  if(payload.coverage.configured!==1||payload.coverage.ready!==1
    ||payload.coverage.independentSources!==1)fail('QFR_D1_COVERAGE_INVALID');
  const row=payload.rows[0];
  exact(row,['indicatorId','name','category','kind','provider','publisher','dataset',
    'sourceURL','frequency','adjustment','unit','value','previousValue','change',
    'changeUnit','observationPeriod','previousPeriod','retrievedAt','releaseDate',
    'officialVintageId','method','status','history'],'QFR_D1_ROW_INVALID');
  if(row.indicatorId!==ID||row.name!=='미국 제조업 세후이익률'
    ||row.category!=='PROFITABILITY'||row.kind!=='DERIVED'
    ||row.provider!=='CENSUS'||row.publisher!=='U.S. Census Bureau'
    ||row.dataset!==DATASET||row.sourceURL!==URL||row.frequency!=='QUARTERLY'
    ||row.adjustment!=='NSA'||row.unit!=='PERCENT'
    ||row.changeUnit!=='PERCENTAGE_POINTS'
    ||row.method!=='AFTER_TAX_PROFIT_DIVIDED_BY_NET_SALES'||row.status!=='READY'
    ||row.releaseDate!==null||row.officialVintageId!==null
    ||!number(row.value)||!number(row.previousValue)||!number(row.change)
    ||!isUtc(row.retrievedAt)||Date.parse(row.retrievedAt)!==payload.sourceStoredAt
    ||row.observationPeriod!==payload.observedThrough
    ||periodOrdinal(row.previousPeriod)!==periodOrdinal(row.observationPeriod)-1
    ||periodEnd(row.observationPeriod)>payload.sourceStoredAt
    ||Math.abs(row.change-(row.value-row.previousValue))>1e-9*Math.max(1,Math.abs(row.change)))
    fail('QFR_D1_ROW_INVALID');
  if(!Array.isArray(row.history)||row.history.length!==5)fail('QFR_D1_HISTORY_INVALID');
  const obs=periodOrdinal(row.observationPeriod);
  for(let i=0;i<5;i++){
    const point=row.history[i];
    exact(point,['period','value'],'QFR_D1_HISTORY_INVALID');
    if(periodOrdinal(point.period)!==obs-4+i||!number(point.value))
      fail('QFR_D1_HISTORY_INVALID');
  }
  if(row.history[4].value!==row.value||row.history[3].value!==row.previousValue)
    fail('QFR_D1_HISTORY_INVALID');
  return payload;
}

export function qfrCompanionFreshness(row,{now=Date.now()}={}){
  const retrieved=Date.parse(row.retrievedAt),end=periodEnd(row.observationPeriod);
  const reason=!Number.isSafeInteger(now)||now<retrieved||now<end?'FUTURE_SOURCE_OR_PERIOD'
    :now-retrieved>=FRESHNESS_DAYS*DAY?'SOURCE_RETRIEVAL_EXPIRED'
    :now-end>=FRESHNESS_DAYS*DAY?'OBSERVATION_EXPIRED':null;
  return {status:reason?'STALE':'FRESH',reason,
    observedPeriodEnd:new Date(end).toISOString(),
    policyDays:{observation:FRESHNESS_DAYS,retrieval:FRESHNESS_DAYS}};
}

function verifyEnvelope(record,{now}){
  if(typeof record?.body!=='string'||record.body.length>30_500)
    fail('QFR_D1_EXISTING_INVALID');
  let envelope;
  try{envelope=JSON.parse(record.body);}catch{fail('QFR_D1_EXISTING_INVALID');}
  exact(envelope,['payload','projection'],'QFR_D1_EXISTING_INVALID');
  const p=envelope.projection;
  exact(p,['status','builtAt','sourceStoredAt','sourceVersion',
    'expectedSourceStoredAt','expectedSourceVersion'],'QFR_D1_EXISTING_INVALID');
  try{validateQfrCompanionPayload(envelope.payload,{now});}
  catch{fail('QFR_D1_EXISTING_INVALID');}
  if(p.status!=='READY'||p.sourceStoredAt!==envelope.payload.sourceStoredAt
    ||p.sourceVersion!==envelope.payload.sourceVersion
    ||p.expectedSourceStoredAt!==p.sourceStoredAt
    ||p.expectedSourceVersion!==p.sourceVersion
    ||!Number.isSafeInteger(p.builtAt)||p.builtAt<envelope.payload.sourceStoredAt
    ||p.builtAt>now||Number(record.stored_at)!==p.builtAt)
    fail('QFR_D1_EXISTING_INVALID');
  return envelope;
}

// Only a user-approved, PC-side manual publisher may call this writer.
export function qfrCompanionWriter(core){
  if(!core?.prepare)fail('QFR_D1_STORAGE_UNAVAILABLE');
  return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
    validateQfrCompanionPayload(payload,{now:storedAt});
    if(!Number.isSafeInteger(storedAt)||storedAt<Date.parse(payload.generatedAt))
      fail('QFR_D1_STORED_AT_INVALID');
    if(qfrCompanionFreshness(payload.rows[0],{now:storedAt}).status!=='FRESH')
      fail('QFR_D1_SOURCE_STALE');
    const before=await core.prepare(
      'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(QFR_SNAPSHOT_KEY).first();
    if(before){
      const prior=verifyEnvelope(before,{now:storedAt}).payload;
      if(prior.sourceStoredAt>payload.sourceStoredAt)fail('QFR_D1_SUPERSEDED');
      if(prior.sourceStoredAt===payload.sourceStoredAt){
        if(prior.sourceVersion!==payload.sourceVersion)fail('QFR_D1_CONFLICTING_VERSION');
        const identity=p=>JSON.stringify({schemaVersion:p.schemaVersion,sourceSha256:p.sourceSha256,
          historicalMode:p.historicalMode,observedThrough:p.observedThrough,
          coverage:p.coverage,rows:p.rows});
        if(identity(prior)!==identity(payload))fail('QFR_D1_CONFLICTING_CONTENT');
        // Exact DB body of prior record was verified; no duplicate write.
        return {status:'ALREADY_STORED',key:QFR_SNAPSHOT_KEY,
          storedAt:Number(before.stored_at),sourceVersion:payload.sourceVersion,
          sourceStoredAt:payload.sourceStoredAt};
      }
    }
    const envelope={payload,projection:{status:'READY',builtAt:storedAt,
      sourceStoredAt:payload.sourceStoredAt,sourceVersion:payload.sourceVersion,
      expectedSourceStoredAt:payload.sourceStoredAt,expectedSourceVersion:payload.sourceVersion}};
    const body=JSON.stringify(envelope);
    if(body.length>30_500)fail('QFR_D1_BODY_TOO_LARGE');
    const query=`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
      VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE
      SET body=excluded.body,stored_at=excluded.stored_at
      WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') < ?
        AND market_public_snapshots_v1.stored_at <= ?`;
    const result=await core.prepare(query).bind(QFR_SNAPSHOT_KEY,body,storedAt,
      payload.sourceStoredAt,storedAt).run();
    if(result?.meta?.changes!==1)fail('QFR_D1_SUPERSEDED');
    const after=await core.prepare(
      'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(QFR_SNAPSHOT_KEY).first();
    if(after?.body!==body||Number(after.stored_at)!==storedAt)
      fail('QFR_D1_READBACK_MISMATCH');
    return {status:'READBACK_VERIFIED',key:QFR_SNAPSHOT_KEY,storedAt,
      sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt};
  }});
}
