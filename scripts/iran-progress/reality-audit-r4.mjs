/** Non-mutating local audit. Does NOT call providers, Ollama, or publish anything. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const safeCheckpoint=(db,key)=>{try{const x=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(key);return x?JSON.parse(x.body):null;}catch{return null;}};
const safeCount=(db,sql)=>{try{return Number(db.prepare(sql).get().n);}catch{return null;}};
const safeGroup=(db,sql)=>{try{return db.prepare(sql).all().map(({label,count})=>({label,count:Number(count)}));}catch{return [];}};
const eventOverview=db=>{try{
 const sql=`SELECT COALESCE(json_extract(e.body,'$.axis'),'UNCLASSIFIED') AS axis,
  COALESCE(json_extract(e.body,'$.status'),'UNKNOWN') AS status,
  COUNT(*) AS count,MAX(e.verified_at) AS lastVerifiedAt
  FROM event_revisions e
  JOIN (SELECT event_id, MAX(revision) AS revision FROM event_revisions GROUP BY event_id) latest
  ON e.event_id=latest.event_id AND e.revision=latest.revision
  GROUP BY 1,2 ORDER BY 1,2`;
 return db.prepare(sql).all().map(r=>({axis:r.axis,status:r.status,count:Number(r.count),lastVerifiedAt:r.lastVerifiedAt}));
 }catch{return [];}};
const limitedCoverage=input=>Object.fromEntries(['IRN_USA','IRN_ISR','LINKED','YEMEN_HOUTHI'].map(id=>{
 const c=input?.coverage?.[id];
 return [id,{present:!!c,verified:c?.status==='VERIFIED',coverageThrough:c?.coverageThrough??null,materialPending:c?.materialPending??null}];
}));
const reasons=items=>{const result={};for(const x of items){if(x.reason&&x.reason!=='ACCEPTED')result[x.reason]=(result[x.reason]??0)+1;}return result;};
export function auditIranLocalReadOnly(db){
 const report=safeCheckpoint(db,'continuous-news-last-run-r3');
 const queue=safeCheckpoint(db,'continuous-news-queue-r3')?.items??[];
 const events=safeCheckpoint(db,'reference-flow-continuous-news-r3');
 const last=safeCheckpoint(db,'reference-flow-last-valid-r3');
 const evalR14=safeCheckpoint(db,'article-ai-evaluation-r14');
 const verifiedInput=safeCheckpoint(db,'verified-input');
 const latestEventRevisions=eventOverview(db);
 const coverage=limitedCoverage(verifiedInput);
 const candidates=safeGroup(db,'SELECT state AS label, COUNT(*) AS count FROM discovery_candidates GROUP BY state ORDER BY state');
 const seen=new Map();
 for(const item of queue){if(typeof item.url==='string')seen.set(item.url,item);}
 const items=[...seen.values()];
 const processed=items.filter(x=>Number.isSafeInteger(x.analyzedAt));
 return {
  source:'LOCAL_SQLITE_READ_ONLY',providerCalls:0,ollamaCalls:0,dbWrites:0,
  r3:{
   latestRunStatus:report?.status??'NO_RUN',
   lastCheckAt:report?.checkedAt??null,
   lastDiscoverySuccessAt:report?.lastDiscoverySuccessAt??null,
   reportCounts:report?Object.fromEntries(['discovered','analyzed','accepted','failed','pending','classifiedUnique','matchedRuleUnique','unmatchedRuleUnique','scoreChanged'].map(k=>[k,report[k]??null])):null,
   queueTotal:items.length,
   queueAnalyzed:processed.length,
   queueAccepted:processed.filter(x=>x.reason==='ACCEPTED').length,
   queueRejected:processed.filter(x=>x.reason&&x.reason!=='ACCEPTED'&&x.reason!=='ARTICLE_REFRESH_DELAYED').length,
   queuePending:items.filter(x=>!Number.isSafeInteger(x.analyzedAt)).length,
   queueRejectionReasons:reasons(processed),
   savedSignalCount:Array.isArray(events?.events)?events.events.length:null,
   lastValidEventCount:last?.eventCount??null,
   lastValidScore:last?.score??null,
   classifierMethod:'HEADLINE_RULES_R3_NOT_OLLAMA',
  },
  candidateDiscovery:{
   states:candidates,
   total:candidates.reduce((n,r)=>n+r.count,0),
   decisions:safeCount(db,"SELECT COUNT(*) AS n FROM decisions WHERE id LIKE 'discovery:%'"),
  },
  articleOllama:{
   evaluationStatus:evalR14?.status??'NOT_RECORDED',
   storedDecisions:safeCount(db,"SELECT COUNT(*) AS n FROM decisions WHERE id LIKE 'article-ai:%'"),
  },
  r4InputInventory:{
   verifiedInputCheckpointPresent:verifiedInput!==null,
   latestEventRevisions,
   latestEventCount:latestEventRevisions.reduce((a,v)=>a+v.count,0),
   coverage,
   relations:Object.fromEntries(['IRN_USA','IRN_ISR','YEMEN_HOUTHI'].map(id=>[id,{
    checkpointPresent:verifiedInput?.relations?.[id]!=null
   }])),
   nuclearInputPresent:verifiedInput?.nuclear!=null,
   hormuzR13CoveragePresent:verifiedInput?.hormuzCoverage!=null,
   missingR4IndependentInputs:[
    ...(!coverage.YEMEN_HOUTHI.present?['YEMEN_HOUTHI_COVERAGE']:[]),
    ...(verifiedInput?.relations?.YEMEN_HOUTHI==null?['YEMEN_HOUTHI_RELATION']:[]),
    'R4_HORMUZ_OFFICIAL_EVENT_RESTRICTION_REVALIDATION',
    'R4_RED_SEA_OFFICIAL_EVENT_RESTRICTION_REVALIDATION',
   ],
   exactRealityScoreStatus:'NOT_CALCULATED',
   r13LinkedIsNotYemenProof:true,
  },
  note:'R3 headline rule acceptance, Ollama parsing, verified events and published score are different measurements. No real-war conclusion is inferred.',
 };
}
function defaultFile(){
 const explicit=process.env.ZGMINI_IRAN_DB;
 if(explicit)return explicit;
 const base=process.env.ZGMINI_IRAN_HOME;
 if(base)return path.join(base,'iran.sqlite');
 if(process.platform==='win32'){
  const pc='E:\\ZGmini\\data\\iran-progress-r13\\iran.sqlite';
  if(fs.existsSync(pc))return pc;
 }
 return path.join(os.homedir(),'.zgmini','iran-progress-r13','iran.sqlite');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const filename=defaultFile();
 if(!fs.existsSync(filename)){
  console.log(JSON.stringify({status:'AUTOMATION_BLOCKED',reason:'LOCAL_DB_NOT_FOUND',databaseOpened:false}));
  process.exitCode=2;
 }else{
  let db;
  try{
   db=new DatabaseSync(filename,{readOnly:true});
   console.log(JSON.stringify({status:'READ_ONLY_AUDIT',...auditIranLocalReadOnly(db)}));
  }catch(error){
   console.log(JSON.stringify({status:'STATE_UNKNOWN',reason:'LOCAL_DB_READ_FAILED',errorCode:error?.code??'UNKNOWN'}));
   process.exitCode=1;
  }finally{db?.close();}
 }
}
