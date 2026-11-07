// Read-only public *research summary* contract. Not wired to a production route.
// Existing 19 public series and four R2 scores are independent and unchanged.
import {INFLATION_CANDIDATES_7} from '../lib/inflation-causal-candidates-public-7-catalog.mjs';

export const INFLATION_CANDIDATES_7_PUBLIC_KEY='detail:inflation-causal-candidates-7:r1';
export const INFLATION_CANDIDATES_7_PUBLIC_ROUTE='/api/inflation-candidate-inputs';
export const INFLATION_CANDIDATES_7_PUBLIC_SCHEMA='inflation-causal-candidates-7-r1-v1';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const allowed=(value,keys)=>Object.keys(value).every(key=>keys.includes(key));
const rowFields=['id','series','unit','status','value','previousValue','observationDate',
  'previousObservationDate','sourceStoredAt','availableAt','history'];
const rootFields=['schemaVersion','status','score','sourceVersion','sourceStoredAt','indicators'];
const strictDate=value=>{
  if(typeof value!=='string'||!/^(?:19|20)\d\d-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?$/.test(value))return false;
  const full=value.length===7?value+'-01':value;
  const parsed=new Date(full+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,value.length)===value;
};
const strictIso=value=>{
  if(typeof value!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value))return false;
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())&&parsed.toISOString()===
    (value.includes('.')?value:value.replace('Z','.000Z'));
};

export function validateInflationCandidates7Public(payload,{now=Date.now()}={}){
  if(!object(payload)||!allowed(payload,rootFields)||
    payload.schemaVersion!==INFLATION_CANDIDATES_7_PUBLIC_SCHEMA||
    !['READY','PARTIAL'].includes(payload.status)||payload.score!==null||
    typeof payload.sourceVersion!=='string'||payload.sourceVersion.length<8||payload.sourceVersion.length>160||
    !Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<1||payload.sourceStoredAt>now||
    !Array.isArray(payload.indicators)||payload.indicators.length!==7)
    throw Error('INFL7_PUBLIC_ENVELOPE_INVALID');

  let ready=0;
  for(let i=0;i<INFLATION_CANDIDATES_7.length;i++){
    const meta=INFLATION_CANDIDATES_7[i],row=payload.indicators[i];
    if(!object(row)||!allowed(row,rowFields)||row.id!==meta.id||
      row.series!==meta.series||row.unit!==meta.unit||
      !['READY','PENDING','STALE'].includes(row.status)||!Array.isArray(row.history)||
      row.history.length>13||row.history.some((point,j)=>!object(point)||
        !allowed(point,['date','value'])||!strictDate(point.date)||!finite(point.value)||
        (j>0&&point.date<=row.history[j-1].date)))
      throw Error('INFL7_PUBLIC_ROW_INVALID');
    if(row.status==='READY'){
      if(!finite(row.value)||!strictDate(row.observationDate)||!strictIso(row.sourceStoredAt)||
        Date.parse(row.sourceStoredAt)>now||
        (row.availableAt!==null&&row.availableAt!==undefined&&!strictIso(row.availableAt))||
        !(row.previousValue===null||finite(row.previousValue))||
        !(row.previousObservationDate===null||strictDate(row.previousObservationDate))||
        (row.previousValue===null)!==(row.previousObservationDate===null)||
        (row.previousObservationDate!==null&&row.previousObservationDate>=row.observationDate)||
        row.history.length===0||row.history.at(-1).date!==row.observationDate||
        row.history.at(-1).value!==row.value||
        row.history.some(point=>point.date>row.observationDate))
        throw Error('INFL7_PUBLIC_READY_INVALID');
      ready++;
    }else if(row.value!==null||row.previousValue!==null||row.observationDate!==null||
      row.previousObservationDate!==null||row.sourceStoredAt!==null||
      row.availableAt!==null||row.history.length!==0)
      throw Error('INFL7_PUBLIC_NONREADY_LEAK');
  }
  if((ready===7)!==(payload.status==='READY')||ready===0)
    throw Error('INFL7_PUBLIC_COVERAGE_INVALID');
  return payload;
}

// The owning Worker can connect this to the approved route after independent review.
// No provider access, computation, mutation, or raw PC storage reads in visitor requests.
export async function readInflationCandidates7PublicResponse(request,db,{now=Date.now()}={}){
  const headers={'cache-control':'no-store','x-robots-tag':'noindex',
    'x-content-type-options':'nosniff','x-public-projection':'STORED',
    'content-type':'application/json; charset=utf-8'};
  const respond=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{status,headers});
  if(!['GET','HEAD'].includes(request.method))return respond({reason:'METHOD_NOT_ALLOWED'},405);
  if(new URL(request.url).search)return respond({reason:'QUERY_NOT_ALLOWED'},400);
  if(!db?.prepare)return respond({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);
  let record;
  try{
    record=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(INFLATION_CANDIDATES_7_PUBLIC_KEY).first();
  }catch{return respond({status:'unavailable',reason:'PROJECTION_READ_UNAVAILABLE'},503);}
  if(!record)return respond({status:'PENDING',reason:'STORED_PUBLIC_SUMMARY_PENDING',score:null,indicators:[]});
  try{
    if(typeof record.body!=='string'||record.body.length>45000)throw Error('INVALID_BODY');
    const saved=JSON.parse(record.body),payload=validateInflationCandidates7Public(saved?.payload,{now});
    if(!object(saved.projection)||saved.projection.status!=='READY'||
      !Number.isSafeInteger(saved.projection.builtAt)||saved.projection.builtAt>now||
      Number(record.stored_at)!==saved.projection.builtAt||
      saved.projection.sourceVersion!==payload.sourceVersion||
      saved.projection.sourceStoredAt!==payload.sourceStoredAt)
      throw Error('INVALID_CHECKPOINT');
    return respond(payload);
  }catch{return respond({status:'unavailable',reason:'STORED_PUBLIC_SUMMARY_INVALID'},503);}
}
