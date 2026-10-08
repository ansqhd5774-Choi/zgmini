import {IRAN_PROGRESS_VERSION,WEIGHTS,DAY} from '../lib/iran-progress/r13.mjs';
export const IRAN_PROGRESS_PUBLIC_KEY='public:iran-progress:r13';
export const IRAN_PROGRESS_STATUS_KEY='public:iran-progress:r13:status';
const finiteScore=n=>Number.isFinite(n)&&n>=0&&n<=100;
export function validatePublicIran(body,now){
 if(body?.version!==IRAN_PROGRESS_VERSION||body.status!=='READY'||!finiteScore(body.score)
  ||body.historyMode!=='AS_PUBLISHED'||!Array.isArray(body.history)||body.history.length>56)return false;
 const timestamps=['observationAt','lastVerifiedAt','calculatedAt','publishedAt'];
 if(timestamps.some(k=>!Number.isSafeInteger(body[k])||body[k]<1||body[k]>now))return false;
 if(body.observationAt>body.calculatedAt||body.calculatedAt>body.publishedAt)return false;
 if(Object.keys(WEIGHTS).some(k=>!finiteScore(body.domains?.[k])))return false;
 const expected=Object.entries(WEIGHTS).reduce((s,[k,w])=>s+body.domains[k]*w,0);
 if(Math.abs(expected-body.score)>1e-8)return false;
 if(!['UNKNOWN','ACTIVE','CEASEFIRE_PROGRESS','ENDED','RECONFLICT'].includes(body.relations?.IRN_ISR)
  ||!['UNKNOWN','ACTIVE','CEASEFIRE_PROGRESS','ENDED','RECONFLICT'].includes(body.relations?.IRN_USA))return false;
 if(body.overallEnded!==(body.relations.IRN_ISR==='ENDED'&&body.relations.IRN_USA==='ENDED'))return false;
 let previous=0;
 for(const p of body.history){if(!Number.isSafeInteger(p.at)||p.at<=previous||p.at>now||!finiteScore(p.value))return false;previous=p.at;}
 return true;
}
/** @param {Request} request @param {{db?: any, now?: number}} options */
export async function storedIranProgressResponse(request,{db,now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff','x-iran-progress-source':'STORED'};
 if(request.method!=='GET')return Response.json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},{status:405,headers});
 if(!db?.prepare)return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_DATABASE_UNBOUND'},{status:503,headers});
 let row;try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_PROGRESS_PUBLIC_KEY).first();}
 catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_READ_FAILED'},{status:503,headers});}
 if(!row)return Response.json({status:'PENDING',score:null,reason:'VERIFIED_RESULT_PENDING'},{status:503,headers});
 let body;try{body=JSON.parse(row.body);}catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_RESULT_INVALID'},{status:503,headers});}
 if(!validatePublicIran(body,now))return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_RESULT_INVALID'},{status:503,headers});
 let state;
 try{const r=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_PROGRESS_STATUS_KEY).first();state=r?JSON.parse(r.body):null;}
 catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_STATUS_READ_FAILED'},{status:503,headers});}
 if(state?.version===IRAN_PROGRESS_VERSION&&Number.isSafeInteger(state.calculatedAt)&&state.calculatedAt>body.calculatedAt&&state.calculatedAt<=now&&state.status!=='READY'){
  return Response.json({status:'PENDING',score:null,reason:state.reason??'VERIFIED_INPUT_PENDING',missing:state.missing??[],calculatedAt:state.calculatedAt,lastNormalObservationAt:body.observationAt},{status:503,headers});
 }
 const age=now-Math.min(body.observationAt,body.lastVerifiedAt);
 if(age>72*DAY/24)return Response.json({status:'STALE',score:null,reason:'OBSERVATION_EXPIRED',observationAt:body.observationAt},{status:503,headers});
 return Response.json({...body,status:age>DAY?'STALE':'READY',displayState:age>DAY?'갱신 지연':'정상'},{headers});
}
