// Optional stored-only BEA manufacturing corporate-profits sidecar.
// No Census, remote GET provider fetch, scoring, scheduler, or D1 write on GET.
import {
  BEA_MFG_PROFIT_SERIES,BEA_MFG_PROFIT_PAGE,BEA_MFG_PROFIT_SCHEMA,
} from '../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';

export const BEA_MFG_ROUTE='/api/earnings-recession-bea-manufacturing-profit';
export const BEA_MFG_SNAPSHOT_KEY='detail:earnings-bea-manufacturing-profit:r1';
const DAY=86_400_000,MAX_AGE=165*DAY;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k));
const quarter=s=>{
  if(typeof s!=='string'||!/^\d{4}-Q[1-4]$/.test(s))return null;
  return Number(s.slice(0,4))*4+Number(s.at(-1))-1;
};

export function validateBeaMfgProfit(payload,{now=Date.now()}={}){
  if(!keys(payload,['schemaVersion','status','sourceVersion','sourceStoredAt',
    'sourceRetrievedAt','historicalMode','indicator'])
    ||payload.schemaVersion!==BEA_MFG_PROFIT_SCHEMA||payload.status!=='READY'
    ||!/^[a-f0-9]{64}$/.test(payload.sourceVersion??'')
    ||!Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0
    ||payload.sourceStoredAt>now
    ||payload.sourceRetrievedAt!==new Date(payload.sourceStoredAt).toISOString()
    ||payload.historicalMode!=='CURRENT_VINTAGE_NOT_PIT')
    throw Error('BEA_MFG_INVALID_ENVELOPE');
  const i=payload.indicator;
  if(!keys(i,['id','name','source','seriesId','sourceURL','transport','frequency',
    'adjustment','profitsDefinition','unit','value','observationPeriod',
    'observationPeriodEnd','yearAgoPeriod','yearAgoPeriodEnd',
    'currentProfitsBillionsUsdAnnualRate','yearAgoProfitsBillionsUsdAnnualRate',
    'officialReleaseDate','history'])
    ||i.id!=='bea_manufacturing_corporate_profits_yoy'
    ||i.source!=='BEA NIPA Table 6.16D N400RC'
    ||i.seriesId!==BEA_MFG_PROFIT_SERIES||i.sourceURL!==BEA_MFG_PROFIT_PAGE
    ||i.transport!=='FRED_CSV'||i.frequency!=='QUARTERLY'
    ||i.adjustment!=='SAAR'||i.profitsDefinition!=='WITH_INVENTORY_VALUATION_ADJUSTMENT'
    ||i.unit!=='PERCENT_YOY'||i.officialReleaseDate!==null
    ||!finite(i.value)||!finite(i.currentProfitsBillionsUsdAnnualRate)
    ||!finite(i.yearAgoProfitsBillionsUsdAnnualRate)
    ||i.yearAgoProfitsBillionsUsdAnnualRate<=0
    ||Math.abs(i.value-(i.currentProfitsBillionsUsdAnnualRate/i.yearAgoProfitsBillionsUsdAnnualRate-1)*100)>1e-8
    ||quarter(i.observationPeriod)===null||quarter(i.yearAgoPeriod)!==quarter(i.observationPeriod)-4
    ||!Array.isArray(i.history)||i.history.length!==5)
    throw Error('BEA_MFG_INVALID_INDICATOR');
  const current=quarter(i.observationPeriod);
  for(let n=0;n<5;n++){
    const point=i.history[n];
    const expected=current-4+n;
    const year=Math.floor(expected/4),q=expected%4+1;
    const end=new Date(Date.UTC(year,q*3,0)).toISOString().slice(0,10);
    if(!keys(point,['period','periodEnd','profitsBillionsUsdAnnualRate'])
      ||quarter(point.period)!==expected||point.periodEnd!==end
      ||!finite(point.profitsBillionsUsdAnnualRate))
      throw Error('BEA_MFG_INVALID_HISTORY');
  }
  if(i.observationPeriodEnd!==i.history[4].periodEnd
    ||i.yearAgoPeriodEnd!==i.history[0].periodEnd
    ||i.currentProfitsBillionsUsdAnnualRate!==i.history[4].profitsBillionsUsdAnnualRate
    ||i.yearAgoProfitsBillionsUsdAnnualRate!==i.history[0].profitsBillionsUsdAnnualRate
    ||Date.parse(i.observationPeriodEnd+'T23:59:59Z')>payload.sourceStoredAt)
    throw Error('BEA_MFG_CHECKPOINT_MISMATCH');
  return payload;
}

export function beaMfgFreshness(payload,{now=Date.now()}={}){
  const end=Date.parse(payload.indicator.observationPeriodEnd+'T23:59:59Z');
  const reason=payload.sourceStoredAt>now||end>now?'FUTURE_SOURCE_OR_PERIOD'
    :now-payload.sourceStoredAt>MAX_AGE?'SOURCE_RETRIEVAL_EXPIRED'
    :now-end>MAX_AGE?'OBSERVATION_EXPIRED':null;
  return {status:reason?'STALE':'FRESH',reason};
}

const headers={'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-robots-tag':'noindex',
  'x-content-type-options':'nosniff','x-public-projection':'STORED'};

export async function readBeaMfgResponse(request,db,{now=Date.now()}={}){
  const reply=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{status,headers});
  if(!['GET','HEAD'].includes(request.method))return reply({reason:'METHOD_NOT_ALLOWED'},405);
  if(new URL(request.url).search)return reply({reason:'QUERY_NOT_ALLOWED'},400);
  if(!db?.prepare)return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
  let raw;
  try{raw=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .bind(BEA_MFG_SNAPSHOT_KEY).first();}
  catch{return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
  if(!raw)return reply({status:'unavailable',reason:'STORED_PROJECTION_PENDING'},503);
  try{
    if(typeof raw.body!=='string'||raw.body.length>32_000)throw Error('INVALID_BODY');
    const e=JSON.parse(raw.body);
    if(!keys(e,['payload','projection'])||!keys(e.projection,
      ['status','sourceVersion','sourceStoredAt','builtAt']))throw Error('INVALID_STORED_ENVELOPE');
    const p=validateBeaMfgProfit(e.payload,{now}),x=e.projection;
    if(x.status!=='READY'||x.sourceVersion!==p.sourceVersion
      ||x.sourceStoredAt!==p.sourceStoredAt||!Number.isSafeInteger(x.builtAt)
      ||x.builtAt>now||Number(raw.stored_at)!==x.builtAt)
      throw Error('INVALID_PROJECTION_CHECKPOINT');
    const freshness=beaMfgFreshness(p,{now});
    if(freshness.status==='STALE')return reply({status:'unavailable',reason:freshness.reason},503);
    return reply({...p,freshness});
  }catch{return reply({status:'unavailable',reason:'STORED_PROJECTION_INVALID'},503);}
}

export function beaMfgWriter(db){
  if(!db?.prepare)throw Error('BEA_MFG_STORAGE_UNAVAILABLE');
  return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
    validateBeaMfgProfit(payload,{now:storedAt});
    if(!Number.isSafeInteger(storedAt)||storedAt<payload.sourceStoredAt
      ||beaMfgFreshness(payload,{now:storedAt}).status!=='FRESH')
      throw Error('BEA_MFG_SOURCE_NOT_READY');
    const previous=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(BEA_MFG_SNAPSHOT_KEY).first();
    if(previous){
      let old;
      try{old=JSON.parse(previous.body);validateBeaMfgProfit(old.payload,{now:storedAt});}
      catch{throw Error('BEA_MFG_EXISTING_INVALID');}
      if(old.payload.sourceStoredAt>payload.sourceStoredAt)throw Error('BEA_MFG_SUPERSEDED');
      if(old.payload.sourceStoredAt===payload.sourceStoredAt
        &&old.payload.sourceVersion!==payload.sourceVersion)
        throw Error('BEA_MFG_CONFLICTING_VERSION');
      if(old.payload.sourceVersion===payload.sourceVersion
        &&JSON.stringify(old.payload.indicator)===JSON.stringify(payload.indicator))
        return {status:'ALREADY_STORED',key:BEA_MFG_SNAPSHOT_KEY,storedAt:Number(previous.stored_at)};
    }
    const body=JSON.stringify({payload,projection:{status:'READY',builtAt:storedAt,
      sourceStoredAt:payload.sourceStoredAt,sourceVersion:payload.sourceVersion}});
    if(body.length>32_000)throw Error('BEA_MFG_PAYLOAD_TOO_LARGE');
    const result=await db.prepare(`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
      VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at
      WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') <= ?
      AND market_public_snapshots_v1.stored_at <= ?`)
      .bind(BEA_MFG_SNAPSHOT_KEY,body,storedAt,payload.sourceStoredAt,storedAt).run();
    if(result?.meta?.changes!==1)throw Error('BEA_MFG_SUPERSEDED');
    const checked=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(BEA_MFG_SNAPSHOT_KEY).first();
    if(checked?.body!==body||Number(checked.stored_at)!==storedAt)
      throw Error('BEA_MFG_READBACK_MISMATCH');
    return {status:'READBACK_VERIFIED',key:BEA_MFG_SNAPSHOT_KEY,storedAt};
  }});
}
