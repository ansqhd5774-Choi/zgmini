import {IRAN_PROGRESS_PUBLIC_KEY,IRAN_PROGRESS_STATUS_KEY,validatePublicIran} from '../../worker/iran-progress-public.mjs';
import {hash} from './store.mjs';
import {IRAN_PROGRESS_VERSION} from '../../lib/iran-progress/r13.mjs';
import {IRAN_FACTS_KEY,validateIranFacts} from '../../lib/iran-progress/facts.mjs';
import {IRAN_FLOW_KEY,validateReferenceFlow} from '../../lib/iran-progress/reference-public.mjs';
import {IRAN_FLOW_R2_KEY} from '../../lib/iran-progress/reference-flow-r2.mjs';
import {validateReferenceFlowR2} from '../../lib/iran-progress/reference-public-r2.mjs';
import {IRAN_FLOW_R3_KEY} from '../../lib/iran-progress/reference-flow-r3.mjs';
import {validateReferenceFlowR3} from '../../lib/iran-progress/reference-public-r3.mjs';
import {IRAN_R5_PUBLIC_KEY,validateIranR5Public} from '../../lib/iran-progress/daily-public-r5.mjs';
export async function publishIranR5Provisional(remote,db,body,{now=Date.now()}={}){
 if(!validateIranR5Public(body,now))throw Error('R5_PUBLICATION_CONTRACT_INVALID');
 return publishSnapshot(remote,db,IRAN_R5_PUBLIC_KEY,body,body.publishedAt);
}
export async function publishReferenceFlowR3(remote,db,body,{now=Date.now()}={}){
 if(!validateReferenceFlowR3(body,now))throw Error('FLOW_R3_PUBLIC_CONTRACT_INVALID');
 return publishSnapshot(remote,db,IRAN_FLOW_R3_KEY,body,body.publishedAt);
}
export async function publishReferenceFlowR2(remote,db,body,{now=Date.now()}={}){
 if(!validateReferenceFlowR2(body,now))throw Error('FLOW_R2_PUBLIC_CONTRACT_INVALID');
 return publishSnapshot(remote,db,IRAN_FLOW_R2_KEY,body,body.publishedAt);
}
export async function publishReferenceFlow(remote,db,body,{now=Date.now()}={}){
 if(!validateReferenceFlow(body,now))throw Error('FLOW_PUBLIC_CONTRACT_INVALID');
 return publishSnapshot(remote,db,IRAN_FLOW_KEY,body,body.publishedAt);
}
export async function publishOfficialFacts(remote,db,body,{now=Date.now()}={}){
 if(!validateIranFacts(body,now))throw Error('FACT_PUBLIC_CONTRACT_INVALID');
 return publishSnapshot(remote,db,IRAN_FACTS_KEY,body,body.publishedAt);
}
export function publicBody(result,history,now){
 const body={version:result.version,status:result.status,score:result.score,domains:result.domains,relations:result.relations,
  overallEnded:result.overallEnded,observationAt:result.observationAt,lastVerifiedAt:result.lastVerifiedAt,
  calculatedAt:result.calculatedAt,publishedAt:now,interpretation:result.interpretation,historyMode:'AS_PUBLISHED',
  history:history.filter(p=>p.at>=now-14*86400000).slice(-56),
  hormuzMethod:result.hormuz?.method??null,transit:result.hormuz?.traffic?{
   restrictionScore:result.hormuz.traffic.restrictionScore,continuity:result.hormuz.traffic.continuity,
   dailyAverage:result.hormuz.traffic.dailyAverage,attribution:result.hormuz.traffic.attribution,
   limitation:result.hormuz.traffic.limitation}:null};
 if(!validatePublicIran(body,now))throw Error('IRAN_PUBLIC_CONTRACT_INVALID');
 if(now-body.lastVerifiedAt>86400000)throw Error('IRAN_VERIFICATION_EXPIRED');
 return body;
}
export async function publishIran(remote,db,body,{now=Date.now()}={}){
 if(!validatePublicIran(body,now))throw Error('IRAN_PUBLIC_CONTRACT_INVALID');
 return publishSnapshot(remote,db,IRAN_PROGRESS_PUBLIC_KEY,body,body.publishedAt);
}
export async function publishIranStatus(remote,db,result){
 if(result?.version!==IRAN_PROGRESS_VERSION||!['READY','PENDING'].includes(result.status)||!Number.isSafeInteger(result.calculatedAt))throw Error('IRAN_STATUS_CONTRACT_INVALID');
 const body={version:result.version,status:result.status,score:null,missing:result.missing,calculatedAt:result.calculatedAt,
  reason:result.hormuz?.status==='H_PENDING_NEW_EVENT'?'H_PENDING_NEW_EVENT':result.status==='READY'?null:'VERIFIED_INPUT_PENDING'};
 return publishSnapshot(remote,db,IRAN_PROGRESS_STATUS_KEY,body,result.calculatedAt);
}
async function publishSnapshot(remote,db,key,body,storedAt){
 const encoded=JSON.stringify(body);
 const before=(await remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[key])).results?.[0];
 if(before&&Number(before.stored_at)>storedAt)return {status:'REMOTE_NEWER_PRESERVED'};
 if(before?.body===encoded)return {status:'UNCHANGED',bodyHash:hash(body)};
 let writeError;
 try{await remote.request(db,[{sql:'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>=market_public_snapshots_v1.stored_at',params:[key,encoded,storedAt]}]);}catch(e){writeError=e;}
 // A timeout can occur after a successful write. Read back before deciding; never blindly retry.
 const after=(await remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[key])).results?.[0];
 if(after?.body!==encoded||Number(after.stored_at)!==storedAt)throw Error(writeError?'IRAN_PUBLICATION_OUTCOME_UNKNOWN':'IRAN_PUBLICATION_READBACK_MISMATCH');
 return {status:'VERIFIED',bodyHash:hash(body),publishedAt:storedAt};
}
