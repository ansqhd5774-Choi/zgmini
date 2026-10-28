// Approved R10 six-factor raw observations. Sidecar key only: never rewrites
// the scored assetBubble projection, its factor scores, or market weights.
export const ASSET_R10_RAW_KEY='detail:asset-bubble-raw:r1';
export const ASSET_R10_RAW_ROUTE='/api/asset-bubble-raw';
export const ASSET_R10_RAW_SCHEMA='asset-bubble-r10-raw-r1-v1';
const IDS=Object.freeze(['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity']);
const UNITS=Object.freeze(['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS']);
const DISPLAY_UNITS=Object.freeze(['배','로그 %p','%p','%','백분위점','%p']);
const SOURCES=Object.freeze(['FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP',
 'STORED_SP500_PRICE_3M_VS_12M','FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE',
 'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q',
 'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH',
 'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY']);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)
 &&Number.isFinite(Date.parse(x+'T00:00:00Z'))
 &&new Date(Date.parse(x+'T00:00:00Z')).toISOString().slice(0,10)===x;
const quarter=x=>typeof x==='string'&&/^\d{4}-Q[1-4]$/.test(x);
const quarterOf=x=>x.slice(0,4)+'-Q'+Math.ceil(Number(x.slice(5,7))/3);
const previousQuarter=q=>q.endsWith('Q1')?`${Number(q.slice(0,4))-1}-Q4`
 :q.slice(0,6)+(Number(q.at(-1))-1);
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-7;

export function validateAssetR10Raw(payload,{now=Date.now()}={}){
 if(!isObject(payload)||payload.schemaVersion!==ASSET_R10_RAW_SCHEMA
  ||payload.status!=='READY'||payload.rightsStatus!=='USER_ACCEPTED_UNVERIFIED'
  ||payload.historyMode!=='CURRENT_VINTAGE_NOT_PIT'
  ||typeof payload.sourceVersion!=='string'||payload.sourceVersion.length<8
  ||payload.sourceVersion.length>1000||!Number.isSafeInteger(payload.sourceStoredAt)
  ||payload.sourceStoredAt<=0||payload.sourceStoredAt>now
  ||!date(payload.asOfDate)||!quarter(payload.scoreObservationQuarter)
  ||!quarter(payload.diagnosticQuarter)
  ||!finite(payload.diagnosticScore)
  ||payload.diagnosticScore<0||payload.diagnosticScore>100
  ||!Array.isArray(payload.factors)||payload.factors.length!==IDS.length)
  throw Error('ASSET_R10_RAW_INVALID_ENVELOPE');
 const q=payload.scoreObservationQuarter;
 const end=new Date(Date.UTC(Number(q.slice(0,4)),Number(q.at(-1))*3,0))
  .toISOString().slice(0,10);
 if(end>payload.asOfDate)throw Error('ASSET_R10_RAW_FUTURE_SCORE_QUARTER');
 const previous=previousQuarter(q);
 for(let i=0;i<IDS.length;i++){
  const factor=payload.factors[i];
  if(!isObject(factor)||factor.id!==IDS[i]||factor.unit!==UNITS[i]
   ||factor.source!==SOURCES[i]||!finite(factor.score)
   ||factor.score<0||factor.score>100||!finite(factor.value)
   ||!date(factor.observationDate)
   ||factor.observationDate>payload.asOfDate
   ||quarterOf(factor.observationDate)!==q
   ||!(factor.previousValue===null||finite(factor.previousValue))
   ||!(factor.previousObservationDate===null||date(factor.previousObservationDate))
   ||(factor.previousValue===null)!==(factor.previousObservationDate===null)
   ||(factor.previousObservationDate!==null
    &&quarterOf(factor.previousObservationDate)!==previous))
   throw Error('ASSET_R10_RAW_INVALID_FACTOR');
 }
 return payload;
}

export function toAssetR10RawPayload(evidence){
 if(evidence?.status!=='PASS_READONLY_ASSET_R10_RAW_PREFLIGHT'
  ||evidence?.pcSqliteWrites!==0||evidence?.d1Writes!==0
  ||evidence?.scoreWrites!==0||evidence?.providerRequests!==0)
  throw Error('ASSET_R10_RAW_PREFLIGHT_REQUIRED');
 return validateAssetR10Raw({schemaVersion:ASSET_R10_RAW_SCHEMA,status:'READY',
  sourceVersion:evidence.sourceVersion,sourceStoredAt:evidence.sourceStoredAt,
  asOfDate:evidence.asOfDate,
  scoreObservationQuarter:evidence.scoreObservationQuarter,
  diagnosticQuarter:evidence.diagnosticQuarter,
  rightsStatus:evidence.rightsStatus,historyMode:evidence.historicalMode,
  diagnosticScore:evidence.diagnosticScore,factors:evidence.factors});
}

// On any sidecar read/validation failure, keep the separately stored scored
// API response intact and leave raw cells missing. Never synthesize zeroes.
export function mergeAssetR10Raw(scored,raw,{now=Date.now()}={}){
 try{
  validateAssetR10Raw(raw,{now});
  if(!isObject(scored)||scored.status!=='READY'
   ||scored.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'
   ||scored.historyMode!=='CURRENT_VINTAGE_ONLY'
   ||scored.rightsStatus!==raw.rightsStatus
   ||scored.sourceVersion!==raw.sourceVersion
   ||scored.sourceStoredAt!==raw.sourceStoredAt
   ||scored.scoreObservationQuarter!==raw.scoreObservationQuarter
   ||scored.asOfDate!==raw.asOfDate
   ||!near(scored.score,raw.diagnosticScore)
   ||!Array.isArray(scored.indicators)
   ||scored.indicators.length!==IDS.length
   ||!scored.indicators.every((r,i)=>r.id===IDS[i]
    &&r.status==='READY'&&near(r.score,raw.factors[i].score)))return scored;
  return {...scored,indicators:scored.indicators.map((row,i)=>({
   ...row,value:raw.factors[i].value,
   previousValue:raw.factors[i].previousValue,
   unit:DISPLAY_UNITS[i],rawUnit:raw.factors[i].unit,
   observationDate:raw.factors[i].observationDate,
   previousObservationDate:raw.factors[i].previousObservationDate,
   source:raw.factors[i].source,
  })),rawPublication:'R10_RAW_R1_READBACK_VALIDATED'};
 }catch{return scored;}
}

// Separate endpoint to preserve the existing score API's one-SELECT CORE D1
// performance contract. The UI checks the exact score lineage before joining.
export async function readAssetR10RawResponse(request,db,{now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex',
  'x-content-type-options':'nosniff','x-public-projection':'STORED'};
 const reply=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),
  {status,headers:{...headers,'content-type':'application/json; charset=utf-8'}});
 if(!['GET','HEAD'].includes(request.method))
  return reply({reason:'METHOD_NOT_ALLOWED'},405);
 if(new URL(request.url).search)return reply({reason:'QUERY_NOT_ALLOWED'},400);
 if(!db?.prepare)return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(ASSET_R10_RAW_KEY).first();}
 catch{return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
 if(!row)return reply({status:'unavailable',reason:'STORED_PROJECTION_PENDING'},503);
 try{
  if(typeof row.body!=='string'||row.body.length>30_000)throw Error('INVALID_BODY');
  const envelope=JSON.parse(row.body),p=envelope?.projection;
  const payload=validateAssetR10Raw(envelope?.payload,{now});
  if(!isObject(p)||p.status!=='READY'||!Number.isSafeInteger(p.builtAt)
   ||Number(row.stored_at)!==p.builtAt||p.builtAt>now
   ||p.sourceVersion!==payload.sourceVersion
   ||p.sourceStoredAt!==payload.sourceStoredAt)
   throw Error('INVALID_CHECKPOINT');
  return reply(payload);
 }catch{return reply({status:'unavailable',reason:'STORED_PROJECTION_INVALID'},503);}
}

export function assetR10RawWriter(db){
 if(!db?.prepare)throw Error('ASSET_R10_RAW_STORAGE_UNAVAILABLE');
 return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
  validateAssetR10Raw(payload,{now:storedAt});
  if(!Number.isSafeInteger(storedAt)||storedAt<payload.sourceStoredAt)
   throw Error('ASSET_R10_RAW_WRITE_TIME_INVALID');
  const previous=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(ASSET_R10_RAW_KEY).first();
  if(previous){
   let old;
   try{old=validateAssetR10Raw(JSON.parse(previous.body).payload,{now:storedAt});}
   catch{throw Error('ASSET_R10_RAW_EXISTING_INVALID');}
   if(old.sourceStoredAt>payload.sourceStoredAt)
    throw Error('ASSET_R10_RAW_SUPERSEDED');
   if(old.sourceStoredAt===payload.sourceStoredAt
    &&old.sourceVersion!==payload.sourceVersion)
    throw Error('ASSET_R10_RAW_CONFLICTING_VERSION');
   if(old.sourceVersion===payload.sourceVersion
    &&JSON.stringify(old.factors)===JSON.stringify(payload.factors))
    return {status:'ALREADY_STORED',key:ASSET_R10_RAW_KEY,storedAt:Number(previous.stored_at)};
  }
  const body=JSON.stringify({payload,projection:{status:'READY',
   sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,builtAt:storedAt}});
  if(body.length>30_000)throw Error('ASSET_R10_RAW_BODY_TOO_LARGE');
  const result=await db.prepare(`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
    VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at
    WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') <= ?
    AND market_public_snapshots_v1.stored_at <= ?`)
   .bind(ASSET_R10_RAW_KEY,body,storedAt,payload.sourceStoredAt,storedAt).run();
  if(result?.meta?.changes!==1)throw Error('ASSET_R10_RAW_SUPERSEDED');
  const checked=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(ASSET_R10_RAW_KEY).first();
  if(checked?.body!==body||Number(checked.stored_at)!==storedAt)
   throw Error('ASSET_R10_RAW_READBACK_MISMATCH');
  return {status:'READBACK_VERIFIED',key:ASSET_R10_RAW_KEY,storedAt};
 }});
}
