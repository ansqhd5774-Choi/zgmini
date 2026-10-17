import {IRAN_PROGRESS_VERSION,WEIGHTS,DAY} from '../lib/iran-progress/r13.mjs';
import {IRAN_FACTS_KEY,validateIranFacts,visibleIranFacts} from '../lib/iran-progress/facts.mjs';
import {IRAN_FLOW_KEY,validateReferenceFlow} from '../lib/iran-progress/reference-public.mjs';
import {IRAN_FLOW_R2_KEY} from '../lib/iran-progress/reference-flow-r2.mjs';
import {validateReferenceFlowR2} from '../lib/iran-progress/reference-public-r2.mjs';
import {IRAN_FLOW_R3_KEY} from '../lib/iran-progress/reference-flow-r3.mjs';
import {validateReferenceFlowR3} from '../lib/iran-progress/reference-public-r3.mjs';
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
async function storedScoreResponse(request,{db,now=Date.now()}={}){
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
/** @param {Request} request @param {{db?: any, now?: number}} options */
export async function storedIranProgressResponse(request,{db,now=Date.now()}={}){
 if(request.method==='GET'&&db?.prepare){
  let r3;try{r3=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_FLOW_R3_KEY).first();}
  catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'FLOW_R3_READ_FAILED'},{status:503,headers:{'cache-control':'no-store'}});}
  if(r3){
   let flow;try{flow=JSON.parse(r3.body);}catch{flow=null;}
   if(!validateReferenceFlowR3(flow,now))return Response.json({status:'UNAVAILABLE',score:null,reason:'FLOW_R3_INVALID'},{status:503,headers:{'cache-control':'no-store'}});
   return Response.json({...flow,status:now-flow.collectionCheckedAt>86400000?'UPDATE_DELAYED':flow.status},{headers:{'cache-control':'no-store','x-iran-progress-source':'STORED','x-iran-flow-version':'R3','x-iran-flow-reader':'R3'}});
  }
  let r2;try{r2=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_FLOW_R2_KEY).first();}
  catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'FLOW_R2_READ_FAILED'},{status:503,headers:{'cache-control':'no-store'}});}
  if(r2){
   let flow;try{flow=JSON.parse(r2.body);}catch{flow=null;}
   if(!validateReferenceFlowR2(flow,now))return Response.json({status:'UNAVAILABLE',score:null,reason:'FLOW_R2_INVALID'},{status:503,headers:{'cache-control':'no-store'}});
   return Response.json({...flow,status:now-flow.collectionCheckedAt>86400000?'UPDATE_DELAYED':flow.status},{headers:{'cache-control':'no-store','x-iran-progress-source':'STORED','x-iran-flow-version':'R2','x-iran-flow-reader':'R3'}});
  }
  let row;try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_FLOW_KEY).first();}
  catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'FLOW_READ_FAILED'},{status:503});}
  if(row){
   let flow;try{flow=JSON.parse(row.body);}catch{flow=null;}
   if(!validateReferenceFlow(flow,now))return Response.json({status:'UNAVAILABLE',score:null,reason:'FLOW_INVALID'},{status:503});
   return Response.json({...flow,status:now-flow.collectionCheckedAt>86400000?'UPDATE_DELAYED':flow.status},{headers:{'cache-control':'no-store','x-iran-progress-source':'STORED','x-iran-flow-reader':'R2'}});
  }
 }
 const response=await storedScoreResponse(request,{db,now});
 const score=await response.clone().json();
 if(request.method!=='GET'||score.status==='UNAVAILABLE')return response;
 let row;try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_FACTS_KEY).first();}
 catch{return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_FACTS_READ_FAILED'},{status:503,headers:response.headers});}
 if(!row)return response;
 let body;try{body=JSON.parse(row.body);}catch{body=null;}
 if(!validateIranFacts(body,now))return Response.json({status:'UNAVAILABLE',score:null,reason:'STORED_FACTS_INVALID'},{status:503,headers:response.headers});
 const facts=visibleIranFacts(body,now);
 return Response.json({...score,contentState:facts.length?'AVAILABLE':'PENDING',factsSnapshot:body,
  currentStateVerified:false},{status:facts.length?200:response.status,headers:response.headers});
}
