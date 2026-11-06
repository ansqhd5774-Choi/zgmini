// Public *presentation summary* sidecar for collected 19 research inputs.
// The 4 existing Inflation R2 score components remain on /api/market-score.
// Never query providers, execute computation, or export private bulk raw history here.
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';

export const INFLATION_CAUSAL_PUBLIC_KEY='detail:inflation-causal-public-19:r1';
export const INFLATION_CAUSAL_PUBLIC_ROUTE='/api/inflation-causal-inputs';
export const INFLATION_CAUSAL_PUBLIC_SCHEMA='inflation-causal-public-19-r1-v1';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const date=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(x)&&
 Number.isFinite(Date.parse(x.length===7?x+'-01':x))&&
 new Date(Date.parse(x.length===7?x+'-01':x)).toISOString().slice(0,x.length)===x;
const iso=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d/.test(x)&&Number.isFinite(Date.parse(x));
const rowId=x=>INFLATION_CAUSAL_19.find(m=>m.id===x);

export function validateInflationCausalPublic(payload,{now=Date.now()}={}){
 if(!obj(payload)||payload.schemaVersion!==INFLATION_CAUSAL_PUBLIC_SCHEMA||
   !['READY','PARTIAL'].includes(payload.status)||payload.score!==null||
   typeof payload.sourceVersion!=='string'||payload.sourceVersion.length<8||payload.sourceVersion.length>160||
   !Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<1||payload.sourceStoredAt>now||
   !Array.isArray(payload.indicators)||payload.indicators.length!==19)
  throw Error('INFLATION_CAUSAL_PUBLIC_ENVELOPE_INVALID');
 let ready=0;
 for(let i=0;i<INFLATION_CAUSAL_19.length;i++){
  const m=INFLATION_CAUSAL_19[i],r=payload.indicators[i];
  if(!obj(r)||r.id!==m.id||r.series!==m.series||r.unit!==m.unit||
    !['READY','PENDING','STALE'].includes(r.status)||!Array.isArray(r.history)||
    r.history.length>13||r.history.some((p,j)=>!obj(p)||!date(p.date)||!finite(p.value)||
      (j>0&&p.date<=r.history[j-1].date))||
    Object.keys(r).some(k=>!['id','series','unit','status','value','previousValue',
      'observationDate','previousObservationDate','availableAt','sourceStoredAt','history'].includes(k)))
    throw Error('INFLATION_CAUSAL_PUBLIC_SERIES_INVALID');
  if(r.status==='READY'){
   if(!finite(r.value)||!date(r.observationDate)||!iso(r.sourceStoredAt)||
     (r.availableAt!==null&&r.availableAt!==undefined&&!iso(r.availableAt))||
     !(r.previousValue===null||finite(r.previousValue))||
     !(r.previousObservationDate===null||date(r.previousObservationDate))||
     (r.previousValue===null)!==(r.previousObservationDate===null)||
     (r.previousObservationDate!==null&&r.previousObservationDate>=r.observationDate)||
     r.history.some(p=>p.date>r.observationDate))
     throw Error('INFLATION_CAUSAL_PUBLIC_READY_INVALID');
   ready++;
  }else if(r.value!==null||r.previousValue!==null||r.observationDate!==null||
    r.previousObservationDate!==null||r.history.length!==0)
    throw Error('INFLATION_CAUSAL_PUBLIC_MISSING_LEAK');
 }
 if((ready===19)!==(payload.status==='READY'))throw Error('INFLATION_CAUSAL_PUBLIC_COVERAGE_INVALID');
 return payload;
}
export async function readInflationCausalPublicResponse(request,db,{now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff',
  'x-public-projection':'STORED','content-type':'application/json; charset=utf-8'};
 const reply=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{status,headers});
 if(!['GET','HEAD'].includes(request.method))return reply({reason:'METHOD_NOT_ALLOWED'},405);
 if(new URL(request.url).search)return reply({reason:'QUERY_NOT_ALLOWED'},400);
 if(!db?.prepare)return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(INFLATION_CAUSAL_PUBLIC_KEY).first();}
 catch{return reply({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
 if(!row)return reply({status:'PENDING',reason:'STORED_PUBLIC_SUMMARY_PENDING',indicators:[],score:null});
 try{
  if(typeof row.body!=='string'||row.body.length>45000)throw Error('INVALID_BODY');
  const saved=JSON.parse(row.body),payload=validateInflationCausalPublic(saved?.payload,{now});
  if(!obj(saved.projection)||saved.projection.status!=='READY'||
    !Number.isSafeInteger(saved.projection.builtAt)||saved.projection.builtAt>now||
    Number(row.stored_at)!==saved.projection.builtAt||
    saved.projection.sourceVersion!==payload.sourceVersion||
    saved.projection.sourceStoredAt!==payload.sourceStoredAt)throw Error('INVALID_CHECKPOINT');
  return reply(payload);
 }catch{return reply({status:'unavailable',reason:'STORED_PUBLIC_SUMMARY_INVALID'},503);}
}
export function inflationCausalPublicWriter(db){
 if(!db?.prepare)throw Error('INFLATION_CAUSAL_PUBLIC_STORAGE_UNAVAILABLE');
 return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
  validateInflationCausalPublic(payload,{now:storedAt});
  if(!Number.isSafeInteger(storedAt)||storedAt<payload.sourceStoredAt)
   throw Error('INFLATION_CAUSAL_PUBLIC_WRITE_TIME_INVALID');
  const old=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(INFLATION_CAUSAL_PUBLIC_KEY).first();
  if(old){
   let previous;
   try{previous=validateInflationCausalPublic(JSON.parse(old.body).payload,{now:storedAt});}
   catch{throw Error('INFLATION_CAUSAL_PUBLIC_EXISTING_INVALID')}
   if(previous.sourceStoredAt>payload.sourceStoredAt)throw Error('INFLATION_CAUSAL_PUBLIC_SUPERSEDED');
   if(previous.sourceStoredAt===payload.sourceStoredAt&&JSON.stringify(previous)!==JSON.stringify(payload))
    throw Error('INFLATION_CAUSAL_PUBLIC_CHECKPOINT_CONFLICT');
   if(JSON.stringify(previous)===JSON.stringify(payload))
    return {status:'ALREADY_STORED',key:INFLATION_CAUSAL_PUBLIC_KEY,storedAt:Number(old.stored_at)};
  }
  const body=JSON.stringify({payload,projection:{status:'READY',
   sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,builtAt:storedAt}});
  if(body.length>45000)throw Error('INFLATION_CAUSAL_PUBLIC_BODY_TOO_LARGE');
  const out=await db.prepare(`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
   VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at
   WHERE json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt') <= ?
   AND market_public_snapshots_v1.stored_at <= ?`)
   .bind(INFLATION_CAUSAL_PUBLIC_KEY,body,storedAt,payload.sourceStoredAt,storedAt).run();
  if(out?.meta?.changes!==1)throw Error('INFLATION_CAUSAL_PUBLIC_SUPERSEDED');
  const check=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(INFLATION_CAUSAL_PUBLIC_KEY).first();
  if(check?.body!==body||Number(check.stored_at)!==storedAt)
   throw Error('INFLATION_CAUSAL_PUBLIC_READBACK_MISMATCH');
  return {status:'READBACK_VERIFIED',key:INFLATION_CAUSAL_PUBLIC_KEY,storedAt};
 }});
}
