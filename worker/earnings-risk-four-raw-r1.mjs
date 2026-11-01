// Supplemental stored-only E1-R4 raw aggregates. Does not alter the four-factor
// diagnostic, its weights, the E1-R5 domain, or any SEC collection.
export const RISK_R4_RAW_ROUTE='/api/earnings-recession-risk-four-raw';
export const RISK_R4_RAW_KEY='detail:earnings-recession-risk-four-raw:r1';
export const RISK_R4_RAW_SCHEMA='earnings-recession-risk-four-raw-r1-v1';
const IDS=['epsGrowth','margin','revenueGrowth','earningsGrowthBreadth'];
const WEIGHTS=[0.35,0.25,0.20,0.20];
const MAX_AGE=165*86_400_000;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)
  &&Number.isFinite(Date.parse(x+'T00:00:00Z'))
  &&new Date(Date.parse(x+'T00:00:00Z')).toISOString().slice(0,10)===x;
const quarterEnd=x=>date(x)&&[2,5,8,11].includes(Number(x.slice(5,7))-1)
  &&new Date(Date.UTC(Number(x.slice(0,4)),Number(x.slice(5,7)),0)).toISOString().slice(0,10)===x;
const ordinal=x=>Number(x.slice(0,4))*4+Math.floor((Number(x.slice(5,7))-1)/3);
const fields=(x,allowed)=>isObject(x)&&Object.keys(x).every(k=>allowed.includes(k));

export function validateRiskFourRaw(payload,{now=Date.now()}={}){
 if(!fields(payload,['schemaVersion','status','sourceVersion','sourceStoredAt',
   'sourceRetrievedAt','source','methodologyVersion','historyMode',
   'financialPeriodEnd','diagnosticScore','scoreFactors','factors','history'])
   ||payload.schemaVersion!==RISK_R4_RAW_SCHEMA||payload.status!=='READY'
   ||!/^[a-f0-9]{64}$/.test(payload.sourceVersion??'')
   ||!Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0
   ||payload.sourceStoredAt>now||payload.sourceRetrievedAt!==new Date(payload.sourceStoredAt).toISOString()
   ||payload.source!=='PC_STORED_SEC_EDGAR_E1_R4'
   ||payload.methodologyVersion!=='E1-R4'
   ||payload.historyMode!=='CURRENT_VINTAGE_NOT_PIT'
   ||!quarterEnd(payload.financialPeriodEnd)
   ||Date.parse(payload.financialPeriodEnd+'T23:59:59Z')>payload.sourceStoredAt
   ||!finite(payload.diagnosticScore)||payload.diagnosticScore<0||payload.diagnosticScore>100
   ||!Array.isArray(payload.scoreFactors)||payload.scoreFactors.length!==4
   ||!Array.isArray(payload.factors)||payload.factors.length!==4
   ||!Array.isArray(payload.history)||!payload.history.length||payload.history.length>5)
   throw Error('RISK_R4_RAW_INVALID_ENVELOPE');
 let computed=0;
 for(let i=0;i<4;i++){
   const s=payload.scoreFactors[i],f=payload.factors[i];
   if(!fields(s,['id','score'])||s.id!==IDS[i]||!finite(s.score)||s.score<0||s.score>100
     ||!fields(f,['id','value','previousValue','unit'])
     ||f.id!==IDS[i]||f.unit!=='PERCENT'||!finite(f.value)
     ||!(f.previousValue===null||finite(f.previousValue)))
     throw Error('RISK_R4_RAW_INVALID_FACTOR');
   computed+=WEIGHTS[i]*s.score;
 }
 if(Math.abs(computed-payload.diagnosticScore)>1e-7)throw Error('RISK_R4_RAW_SCORE_PARITY_FAILED');
 let last=-Infinity;
 for(const row of payload.history){
   if(!fields(row,['periodEnd','values'])||!quarterEnd(row.periodEnd)
     ||ordinal(row.periodEnd)<=last||ordinal(row.periodEnd)>ordinal(payload.financialPeriodEnd)
     ||!fields(row.values,IDS)||Object.keys(row.values).length!==4
     ||!IDS.every(id=>finite(row.values[id])))
     throw Error('RISK_R4_RAW_INVALID_HISTORY');
   last=ordinal(row.periodEnd);
 }
 const latest=payload.history.at(-1);
 if(latest.periodEnd!==payload.financialPeriodEnd
   ||!payload.factors.every(f=>f.value===latest.values[f.id]))
   throw Error('RISK_R4_RAW_PERIOD_MISMATCH');
 const previous=payload.history.at(-2);
 const immediatelyPrevious=previous&&ordinal(previous.periodEnd)===last-1?previous:null;
 if(!payload.factors.every(f=>f.previousValue===(immediatelyPrevious?.values[f.id]??null)))
   throw Error('RISK_R4_RAW_PREVIOUS_MISMATCH');
 return payload;
}

export function riskFourRawFreshness(payload,{now=Date.now()}={}){
 const end=Date.parse(payload.financialPeriodEnd+'T23:59:59Z');
 const reason=payload.sourceStoredAt>now||end>now?'FUTURE_PERIOD'
   :now-payload.sourceStoredAt>MAX_AGE?'SOURCE_EXPIRED'
   :now-end>MAX_AGE?'OBSERVATION_EXPIRED':null;
 return {status:reason?'STALE':'FRESH',reason};
}

const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-robots-tag':'noindex','x-content-type-options':'nosniff','x-public-projection':'STORED'};

export async function readRiskFourRawResponse(request,db,{now=Date.now()}={}){
 const reply=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{status,headers});
 if(!['GET','HEAD'].includes(request.method))return reply({reason:'METHOD_NOT_ALLOWED'},405);
 if(new URL(request.url).search)return reply({reason:'QUERY_NOT_ALLOWED'},400);
 if(!db?.prepare)return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(RISK_R4_RAW_KEY).first();}
 catch{return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
 if(!row)return reply({status:'unavailable',reason:'STORED_PROJECTION_PENDING'},503);
 try{
   if(typeof row.body!=='string'||row.body.length>30_000)throw Error('INVALID_BODY');
   const envelope=JSON.parse(row.body);
   if(!fields(envelope,['payload','projection'])
     ||!fields(envelope.projection,['status','sourceVersion','sourceStoredAt','builtAt']))
     throw Error('INVALID_ENVELOPE');
   const payload=validateRiskFourRaw(envelope.payload,{now}),p=envelope.projection;
   if(p.status!=='READY'||p.sourceVersion!==payload.sourceVersion
     ||p.sourceStoredAt!==payload.sourceStoredAt||!Number.isSafeInteger(p.builtAt)
     ||p.builtAt>now||Number(row.stored_at)!==p.builtAt)
     throw Error('INVALID_CHECKPOINT');
   const freshness=riskFourRawFreshness(payload,{now});
   if(freshness.status!=='FRESH')return reply({status:'unavailable',reason:freshness.reason},503);
   return reply({...payload,freshness});
 }catch{return reply({status:'unavailable',reason:'STORED_PROJECTION_INVALID'},503);}
}

export function riskFourRawWriter(db){
 if(!db?.prepare)throw Error('RISK_R4_RAW_STORAGE_UNAVAILABLE');
 return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
   validateRiskFourRaw(payload,{now:storedAt});
   if(!Number.isSafeInteger(storedAt)||storedAt<payload.sourceStoredAt
     ||riskFourRawFreshness(payload,{now:storedAt}).status!=='FRESH')
     throw Error('RISK_R4_RAW_SOURCE_STALE');
   const previous=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
     .bind(RISK_R4_RAW_KEY).first();
   if(previous){
     let old;
     try{old=JSON.parse(previous.body);validateRiskFourRaw(old.payload,{now:storedAt});}
     catch{throw Error('RISK_R4_RAW_EXISTING_INVALID');}
     if(old.payload.sourceStoredAt>payload.sourceStoredAt)throw Error('RISK_R4_RAW_SUPERSEDED');
     if(old.payload.sourceStoredAt===payload.sourceStoredAt
       &&old.payload.sourceVersion!==payload.sourceVersion)
       throw Error('RISK_R4_RAW_CONFLICTING_VERSION');
     if(old.payload.sourceVersion===payload.sourceVersion
       &&JSON.stringify(old.payload.factors)===JSON.stringify(payload.factors))
       return {status:'ALREADY_STORED',key:RISK_R4_RAW_KEY,storedAt:Number(previous.stored_at)};
   }
   const body=JSON.stringify({payload,projection:{status:'READY',sourceVersion:payload.sourceVersion,
     sourceStoredAt:payload.sourceStoredAt,builtAt:storedAt}});
   if(body.length>30_000)throw Error('RISK_R4_RAW_TOO_LARGE');
   const result=await db.prepare(`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
     VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at
     WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') <= ?
     AND market_public_snapshots_v1.stored_at <= ?`)
     .bind(RISK_R4_RAW_KEY,body,storedAt,payload.sourceStoredAt,storedAt).run();
   if(result?.meta?.changes!==1)throw Error('RISK_R4_RAW_SUPERSEDED');
   const checked=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
     .bind(RISK_R4_RAW_KEY).first();
   if(checked?.body!==body||Number(checked.stored_at)!==storedAt)
     throw Error('RISK_R4_RAW_READBACK_MISMATCH');
   return {status:'READBACK_VERIFIED',key:RISK_R4_RAW_KEY,storedAt};
 }});
}
