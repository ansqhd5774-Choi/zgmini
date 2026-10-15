import {hash} from './store.mjs';
import {verifyEvent} from './verification.mjs';
import {openStore} from './store.mjs';import {buildIranProgress} from '../../lib/iran-progress/r13.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
// A review proposal cannot authorize its own verified source assertions.
// Trusted fact assertions must already exist in the immutable source ledger.
export function recordEventReview(store,review,now){
 if(!store?.db||!Number.isSafeInteger(now)||now<=0||!review?.proposal||!Array.isArray(review.documents)
  ||!Array.isArray(review.holds)||!review.holds.every(s=>typeof s==='string'&&/^[A-Z_]+$/.test(s)))throw Error('EVENT_REVIEW_INVALID');
 const p=review.proposal;
 if(typeof p.eventId!=='string'||!/^IRAN:[A-Z0-9:_-]{1,100}$/.test(p.eventId)||typeof p.material!=='boolean')throw Error('EVENT_REVIEW_ID_INVALID');
 const docs=review.documents.map(d=>{
  let url;try{url=new URL(d.sourceUrl);}catch{throw Error('EVENT_REVIEW_SOURCE_INVALID');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||typeof d.text!=='string'||d.text.length>1500
   ||d.textHash!==hash(d.text))throw Error('EVENT_REVIEW_SOURCE_INVALID');
  const source=store.db.prepare('SELECT body FROM sources WHERE id=?').get('fact-assertion:'+d.id);
  return source&&source.body===JSON.stringify(d)?d:{...d,assertionStatus:'PENDING',verificationOrigin:'REVIEW_CANDIDATE'};
 });
 const reviewHash=hash(review);
 const old=store.db.prepare('SELECT body,revision FROM event_revisions WHERE event_id=? ORDER BY revision DESC LIMIT 1').get(p.eventId);
 if(old&&JSON.parse(old.body).reviewHash===reviewHash)return {status:'UNCHANGED',event:JSON.parse(old.body),storageVerified:true};
 const revision=(old?.revision??0)+1;
 const verified=verifyEvent({...p,revision},docs,now);
 if(verified.status==='VERIFIED'&&review.holds.length)throw Error('EVENT_REVIEW_UNRESOLVED_HOLDS');
 const event=verified.status==='VERIFIED'?{...verified,reviewHash,material:p.material,reviewedAt:now}:
  {eventId:p.eventId,revision,status:'PENDING_REVIEW',material:p.material,
   eventAt:null,axis:p.facts?.axis??null,hormuz:p.facts?.hormuz===true,
   verifiedAt:now,reviewedAt:now,occurrenceVerified:false,actorVerified:false,connectionVerified:false,
   severityVerified:false,severity:null,reason:verified.reason,holds:review.holds,
   evidence:docs.map(d=>d.id),reviewHash,decisionVersion:'IRAN_EVENT_REVIEW_R14'};
 // Pending verifiedAt is only the existing revision-ordering field, never proof of verification.
 store.db.exec('BEGIN IMMEDIATE');
 try{
  for(const d of docs)store.putSource('review-evidence:'+hash(d),d,now);
  store.putDecision('event-review:'+reviewHash,{...review,result:event.status,reason:event.reason??null},now);
  store.putEvent(event);store.db.exec('COMMIT');
 }catch(e){store.db.exec('ROLLBACK');throw e;}
 const row=store.db.prepare('SELECT body FROM event_revisions WHERE event_id=? AND revision=?').get(event.eventId,event.revision);
 if(row?.body!==JSON.stringify(event))throw Error('EVENT_REVIEW_READBACK_FAILED');
 return {status:event.status,event,storageVerified:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==1||!args[0].startsWith('--review='))throw Error('EVENT_REVIEW_ARGS_INVALID');
 const file=path.resolve(args[0].slice(9));
 if(fs.statSync(file).size>262144)throw Error('EVENT_REVIEW_FILE_TOO_LARGE');
 const data=JSON.parse(fs.readFileSync(file,'utf8')),reviews=Array.isArray(data)?data:[data];
 if(!reviews.length||reviews.length>32)throw Error('EVENT_REVIEW_BATCH_INVALID');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const store=openStore(path.join(base,'iran.sqlite')),now=Date.now(),owner=randomUUID();
 try{
  if(!store.claim(owner,now))console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));
  else{
   const results=reviews.map(r=>recordEventReview(store,r,now));
   const input={...(store.getCheckpoint('verified-input')??{}),events:store.events()};
   const result=buildIranProgress(input,now),calculation=store.calculate(input,result);
   const report={version:'IRAN_EVENT_REVIEW_R14',reviewedAt:now,reviewed:results.length,
    verified:results.filter(r=>r.event.status==='VERIFIED').length,pending:results.filter(r=>r.event.status==='PENDING_REVIEW').length,
    reused:results.filter(r=>r.status==='UNCHANGED').length,storageVerified:results.every(r=>r.storageVerified),
    calculation,status:result.status,score:result.score,missing:result.missing,coverageAdvanced:false,publication:'NOT_REQUESTED'};
   store.checkpoint('event-review-last-run-r14',report);
   if(JSON.stringify(store.getCheckpoint('event-review-last-run-r14'))!==JSON.stringify(report))throw Error('EVENT_REVIEW_REPORT_READBACK_FAILED');
   console.log(JSON.stringify(report));
  }
 }catch(e){console.error(/^[A-Z_]+$/.test(e.message??'')?e.message:'EVENT_REVIEW_FAILED');process.exitCode=2;}
 finally{store.release(owner);store.close();}
}
