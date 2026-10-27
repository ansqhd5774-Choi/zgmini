// Stored-only BEA unit-profit sidecar. Public GET never fetches FRED, calculates
// a market score, writes to D1 or modifies the eight-risk diagnostic.
export const BEA_UNIT_ROUTE='/api/earnings-recession-bea-unit-profit';
export const BEA_UNIT_SNAPSHOT_KEY='detail:earnings-bea-unit-profit:v1';
export const BEA_UNIT_SCHEMA='earnings-bea-unit-profit-r1-v1';
const SERIES='A463RD3Q052SBEA';
const PAGE=`https://fred.stlouisfed.org/series/${SERIES}`;
const DAY=86_400_000,MAX_AGE=165*DAY;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const iso=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
 &&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const quarter=date=>{
 if(typeof date!=='string'||!/^\d{4}-(03-31|06-30|09-30|12-31)$/.test(date))return null;
 const stamp=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==date)return null;
 const [year,month]=date.split('-').map(Number);
 return year*4+month/3-1;
};

export function validateBeaUnitProfit(payload,{now=Date.now()}={}){
 if(!keys(payload,['schemaVersion','status','sourceVersion','sourceStoredAt','retrievedAt','historyMode','indicator'])
 ||payload.schemaVersion!==BEA_UNIT_SCHEMA||payload.status!=='READY'
 ||!/^[a-f0-9]{64}$/.test(payload.sourceVersion??'')
 ||!Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0||payload.sourceStoredAt>now
 ||!iso(payload.retrievedAt)||Date.parse(payload.retrievedAt)!==payload.sourceStoredAt
 ||payload.historyMode!=='CURRENT_VINTAGE_SOURCE_PERIOD_END')
  throw Error('BEA_UNIT_INVALID_ENVELOPE');
 const i=payload.indicator;
 if(!keys(i,['id','source','seriesId','sourceURL','transport','unit','observationPeriodEnd',
 'previousPeriodEnd','value','previousValue','change','history'])
 ||i.id!=='bea_nonfinancial_unit_profit'||i.source!=='BEA NIPA Table 1.15 A463RD'
 ||i.seriesId!==SERIES||i.sourceURL!==PAGE||i.transport!=='FRED_CSV'
 ||i.unit!=='USD_PER_REAL_GVA_UNIT'||!finite(i.value)||!finite(i.previousValue)
 ||!finite(i.change)||Math.abs(i.change-(i.value-i.previousValue))>1e-9
 ||quarter(i.observationPeriodEnd)===null
 ||quarter(i.previousPeriodEnd)!==quarter(i.observationPeriodEnd)-1
 ||Date.parse(i.observationPeriodEnd+'T23:59:59Z')>payload.sourceStoredAt
 ||!Array.isArray(i.history)||i.history.length!==5)
  throw Error('BEA_UNIT_INVALID_ROW');
 const final=quarter(i.observationPeriodEnd);
 for(let n=0;n<5;n++){
  const point=i.history[n];
  if(!keys(point,['date','value'])||quarter(point.date)!==final-4+n||!finite(point.value))
   throw Error('BEA_UNIT_INVALID_HISTORY');
 }
 if(i.history.at(-1).value!==i.value||i.history.at(-2).value!==i.previousValue)
  throw Error('BEA_UNIT_HISTORY_NOT_ALIGNED');
 return payload;
}

export function beaUnitFreshness(payload,{now=Date.now()}={}){
 const sourceAt=payload.sourceStoredAt;
 const observedEnd=Date.parse(payload.indicator.observationPeriodEnd+'T23:59:59Z');
 const reason=sourceAt>now||observedEnd>now?'FUTURE_SOURCE_OR_PERIOD'
  :now-sourceAt>MAX_AGE?'SOURCE_RETRIEVAL_EXPIRED'
  :now-observedEnd>MAX_AGE?'OBSERVATION_EXPIRED':null;
 return {status:reason?'STALE':'FRESH',reason};
}

const headers={'cache-control':'no-store','x-robots-tag':'noindex',
 'x-content-type-options':'nosniff','content-type':'application/json; charset=utf-8',
 'x-public-projection':'STORED'};
export async function readBeaUnitResponse(request,db,{now=Date.now()}={}){
 const reply=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{status,headers});
 if(!['GET','HEAD'].includes(request.method))return reply({reason:'METHOD_NOT_ALLOWED'},405);
 if(new URL(request.url).search)return reply({reason:'QUERY_NOT_ALLOWED'},400);
 if(!db?.prepare)return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
 let raw;
 try{raw=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(BEA_UNIT_SNAPSHOT_KEY).first();}
 catch{return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
 if(!raw)return reply({status:'unavailable',reason:'STORED_PROJECTION_PENDING'},503);
 try{
  if(typeof raw.body!=='string'||raw.body.length>32_000)throw Error('INVALID_STORED_ROW');
  const envelope=JSON.parse(raw.body);
  if(!keys(envelope,['payload','projection'])||!keys(envelope.projection,
   ['status','sourceStoredAt','sourceVersion','builtAt']))throw Error('INVALID_STORED_ENVELOPE');
  const payload=validateBeaUnitProfit(envelope.payload,{now}),p=envelope.projection;
  if(p.status!=='READY'||p.sourceStoredAt!==payload.sourceStoredAt
   ||p.sourceVersion!==payload.sourceVersion||!Number.isSafeInteger(p.builtAt)
   ||p.builtAt>now||Number(raw.stored_at)!==p.builtAt)
   throw Error('BEA_UNIT_CHECKPOINT_MISMATCH');
  const freshness=beaUnitFreshness(payload,{now});
  if(freshness.status==='STALE')return reply({status:'unavailable',reason:freshness.reason},503);
  return reply({...payload,freshness});
 }catch{return reply({status:'unavailable',reason:'STORED_PROJECTION_INVALID'},503);}
}

// Only an explicit PC-run operation can call this writer with write-enabled D1.
export function beaUnitWriter(db){
 if(!db?.prepare)throw Error('BEA_UNIT_STORAGE_UNAVAILABLE');
 return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
  validateBeaUnitProfit(payload,{now:storedAt});
  if(!Number.isSafeInteger(storedAt)||storedAt<payload.sourceStoredAt
   ||beaUnitFreshness(payload,{now:storedAt}).status!=='FRESH')
   throw Error('BEA_UNIT_SOURCE_NOT_READY');
  const previous=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(BEA_UNIT_SNAPSHOT_KEY).first();
  if(previous){
   let old;
   try{old=JSON.parse(previous.body);validateBeaUnitProfit(old.payload,{now:storedAt});}
   catch{throw Error('BEA_UNIT_EXISTING_INVALID');}
   if(old.payload.sourceStoredAt>payload.sourceStoredAt)throw Error('BEA_UNIT_SUPERSEDED');
   if(old.payload.sourceStoredAt===payload.sourceStoredAt
    &&old.payload.sourceVersion!==payload.sourceVersion)
    throw Error('BEA_UNIT_CONFLICTING_VERSION');
   if(old.payload.sourceVersion===payload.sourceVersion
    &&JSON.stringify(old.payload.indicator)===JSON.stringify(payload.indicator))
    return {status:'ALREADY_STORED',key:BEA_UNIT_SNAPSHOT_KEY,storedAt:Number(previous.stored_at)};
  }
  const envelope={payload,projection:{status:'READY',builtAt:storedAt,
   sourceStoredAt:payload.sourceStoredAt,sourceVersion:payload.sourceVersion}};
  const body=JSON.stringify(envelope);
  if(body.length>32_000)throw Error('BEA_UNIT_PAYLOAD_TOO_LARGE');
  const write=await db.prepare(`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
   VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at
   WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') <= ?
   AND market_public_snapshots_v1.stored_at <= ?`)
   .bind(BEA_UNIT_SNAPSHOT_KEY,body,storedAt,payload.sourceStoredAt,storedAt).run();
  if(write?.meta?.changes!==1)throw Error('BEA_UNIT_SUPERSEDED');
  const checked=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(BEA_UNIT_SNAPSHOT_KEY).first();
  if(checked?.body!==body||Number(checked.stored_at)!==storedAt)
   throw Error('BEA_UNIT_READBACK_MISMATCH');
  return {status:'READBACK_VERIFIED',key:BEA_UNIT_SNAPSHOT_KEY,storedAt};
 }});
}
