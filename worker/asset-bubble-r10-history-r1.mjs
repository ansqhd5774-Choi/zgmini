// Optional historical R10 raw sidecar. Never touches approved score/weights
// or the existing two-observation detail:asset-bubble-raw:r1 snapshot.
export const ASSET_R10_HISTORY_KEY='detail:asset-bubble-history:r1';
export const ASSET_R10_HISTORY_ROUTE='/api/asset-bubble-history';
export const ASSET_R10_HISTORY_SCHEMA='asset-bubble-r10-history-r1-v1';

const IDS=['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity'];
const UNITS=['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS'];
const SOURCES=['FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP',
 'STORED_SP500_PRICE_3M_VS_12M','FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE',
 'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q',
 'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH',
 'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const quarter=x=>typeof x==='string'&&/^\d{4}-Q[1-4]$/.test(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)
 &&Number.isFinite(Date.parse(x+'T00:00:00Z'))
 &&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const ofDate=x=>x.slice(0,4)+'-Q'+Math.ceil(Number(x.slice(5,7))/3);
const previous=q=>q.endsWith('Q1')?`${Number(q.slice(0,4))-1}-Q4`
 :`${q.slice(0,6)}${Number(q.at(-1))-1}`;
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-7;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function validateAssetR10History(payload,{now=Date.now()}={}){
 if(!object(payload)||payload.schemaVersion!==ASSET_R10_HISTORY_SCHEMA
  ||!['READY','PARTIAL'].includes(payload.status)
  ||payload.historyMode!=='CURRENT_VINTAGE_NOT_PIT'
  ||payload.rightsStatus!=='USER_ACCEPTED_UNVERIFIED'
  ||typeof payload.sourceVersion!=='string'||payload.sourceVersion.length<8
  ||payload.sourceVersion.length>1000
  ||!Number.isSafeInteger(payload.sourceStoredAt)
  ||payload.sourceStoredAt<=0||payload.sourceStoredAt>now
  ||!date(payload.asOfDate)||!quarter(payload.scoreObservationQuarter)
  ||!quarter(payload.firstQuarter)||!quarter(payload.lastQuarter)
  ||payload.lastQuarter!==payload.scoreObservationQuarter
  ||!finite(payload.approvedScore)||payload.approvedScore<0||payload.approvedScore>100
  ||!Array.isArray(payload.factors)||payload.factors.length!==6)
  throw Error('ASSET_R10_HISTORY_INVALID_ENVELOPE');
 const quarters=[payload.lastQuarter];
 for(let i=0;i<4;i++)quarters.unshift(previous(quarters[0]));
 if(quarters[0]!==payload.firstQuarter)
  throw Error('ASSET_R10_HISTORY_INVALID_PERIOD');
 let partial=false;
 for(let i=0;i<IDS.length;i++){
  const f=payload.factors[i];
  if(!object(f)||f.id!==IDS[i]||f.unit!==UNITS[i]
   ||f.source!==SOURCES[i]||!['READY_1Y','PARTIAL_1Y'].includes(f.status)
   ||!Array.isArray(f.points)||f.points.length!==5
   ||!Array.isArray(f.missingQuarters))
   throw Error('ASSET_R10_HISTORY_INVALID_FACTOR');
  const missing=[];
  for(let j=0;j<5;j++){
   const point=f.points[j];
   if(!object(point)||point.quarter!==quarters[j])
    throw Error('ASSET_R10_HISTORY_INVALID_QUARTER');
   const absent=point.observationDate===null&&point.value===null;
   const present=date(point.observationDate)&&finite(point.value)
    &&ofDate(point.observationDate)===point.quarter
    &&point.observationDate<=payload.asOfDate;
   if(!absent&&!present)throw Error('ASSET_R10_HISTORY_INVALID_POINT');
   if(absent)missing.push(point.quarter);
  }
  if(!equal(missing,f.missingQuarters)
   ||(missing.length===0)!==(f.status==='READY_1Y')
   ||f.points[4].value===null||f.points[3].value===null)
   throw Error('ASSET_R10_HISTORY_MISSING_CONTRACT');
  if(missing.length)partial=true;
 }
 if((partial?'PARTIAL':'READY')!==payload.status)
  throw Error('ASSET_R10_HISTORY_STATUS_MISMATCH');
 return payload;
}

export function toAssetR10HistoryPayload(evidence){
 if(!['READY_1Y_READONLY','PARTIAL_1Y_READONLY'].includes(evidence?.status)
  ||evidence.approvedRawParity!=='PASS'
  ||evidence.providerRequests!==0||evidence.pcSqliteWrites!==0
  ||evidence.d1Writes!==0||evidence.scoreWrites!==0||evidence.deployments!==0)
  throw Error('ASSET_R10_HISTORY_APPROVED_AUDIT_REQUIRED');
 return validateAssetR10History({schemaVersion:ASSET_R10_HISTORY_SCHEMA,
  status:evidence.status==='READY_1Y_READONLY'?'READY':'PARTIAL',
  historyMode:evidence.historicalMode,rightsStatus:evidence.rightsStatus,
  sourceVersion:evidence.sourceVersion,sourceStoredAt:evidence.sourceStoredAt,
  asOfDate:evidence.asOfDate,scoreObservationQuarter:evidence.scoreObservationQuarter,
  firstQuarter:evidence.firstQuarter,lastQuarter:evidence.lastQuarter,
  approvedScore:evidence.approvedScore,factors:evidence.factors});
}

export async function readAssetR10HistoryResponse(request,db,{now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex',
  'x-content-type-options':'nosniff'};
 const respond=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),
  {status,headers:{...headers,'content-type':'application/json; charset=utf-8'}});
 if(!['GET','HEAD'].includes(request.method))return respond({reason:'METHOD_NOT_ALLOWED'},405);
 if(new URL(request.url).search)return respond({reason:'QUERY_NOT_ALLOWED'},400);
 if(!db?.prepare)return respond({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(ASSET_R10_HISTORY_KEY).first();}
 catch{return respond({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
 if(!row)return respond({status:'PENDING',reason:'STORED_PROJECTION_PENDING'});
 try{
  if(typeof row.body!=='string'||row.body.length>30_000)throw Error('INVALID_BODY');
  const parsed=JSON.parse(row.body),p=parsed.projection;
  const payload=validateAssetR10History(parsed.payload,{now});
  if(!object(p)||p.status!=='READY'||!Number.isSafeInteger(p.builtAt)
   ||p.builtAt>now||Number(row.stored_at)!==p.builtAt
   ||p.sourceVersion!==payload.sourceVersion
   ||p.sourceStoredAt!==payload.sourceStoredAt)
   throw Error('INVALID_CHECKPOINT');
  return respond(payload);
 }catch{return respond({status:'unavailable',reason:'STORED_PROJECTION_INVALID'},503);}
}

export function assetR10HistoryWriter(db){
 if(!db?.prepare)throw Error('ASSET_R10_HISTORY_STORAGE_UNAVAILABLE');
 return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
  validateAssetR10History(payload,{now:storedAt});
  if(!Number.isSafeInteger(storedAt)||storedAt<payload.sourceStoredAt)
   throw Error('ASSET_R10_HISTORY_WRITE_TIME_INVALID');
  const previousRow=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(ASSET_R10_HISTORY_KEY).first();
  if(previousRow){
   let old;
   try{old=validateAssetR10History(JSON.parse(previousRow.body).payload,{now:storedAt});}
   catch{throw Error('ASSET_R10_HISTORY_EXISTING_INVALID');}
   if(old.sourceStoredAt>payload.sourceStoredAt)
    throw Error('ASSET_R10_HISTORY_SUPERSEDED');
   if(old.sourceStoredAt===payload.sourceStoredAt
    &&old.sourceVersion!==payload.sourceVersion)
    throw Error('ASSET_R10_HISTORY_CONFLICTING_VERSION');
   if(old.sourceVersion===payload.sourceVersion){
    if(!equal(old,payload))throw Error('ASSET_R10_HISTORY_CONFLICTING_CONTENT');
    return {status:'ALREADY_STORED',key:ASSET_R10_HISTORY_KEY,
     storedAt:Number(previousRow.stored_at)};
   }
  }
  const body=JSON.stringify({payload,projection:{status:'READY',
   sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,
   builtAt:storedAt}});
  if(body.length>30_000)throw Error('ASSET_R10_HISTORY_BODY_TOO_LARGE');
  const result=await db.prepare(`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
    VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at
    WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') <= ?
    AND market_public_snapshots_v1.stored_at <= ?`)
   .bind(ASSET_R10_HISTORY_KEY,body,storedAt,payload.sourceStoredAt,storedAt).run();
  if(result?.meta?.changes!==1)throw Error('ASSET_R10_HISTORY_SUPERSEDED');
  const checked=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(ASSET_R10_HISTORY_KEY).first();
  if(checked?.body!==body||Number(checked.stored_at)!==storedAt)
   throw Error('ASSET_R10_HISTORY_READBACK_MISMATCH');
  return {status:'READBACK_VERIFIED',key:ASSET_R10_HISTORY_KEY,storedAt};
 }});
}
