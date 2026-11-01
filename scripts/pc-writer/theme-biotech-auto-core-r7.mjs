// Biotech-only bounded collection -> local SHA-verified score -> immutable
// continuation -> optional versioned D1 publication. All external effects
// are explicit injected adapters; neither seven themes nor R1 is written.
import fs from 'node:fs';
import path from 'node:path';
import {buildBiotechShadow,saveBiotechShadow} from './theme-biotech-shadow-core-r5.mjs';
import {buildBiotechConfirmedContinuationR6,saveBiotechConfirmedContinuationR6} from './theme-biotech-continuation-r6.mjs';
import {buildBiotechPublicR2} from './theme-biotech-public-record-r7.mjs';
import {eligibleBiotechContinuationR2,BIOTECH_CONTINUATION_PUBLIC_KEY} from '../../worker/theme-biotech-continuation-r2.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const ensure=(ok,code)=>{if(!ok)fail(code);};
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'));
const plusDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);

export function biotechBoundedCollectionWindow({manifest,now=Date.now()}={}){
 ensure(manifest?.version===1&&manifest.themeId==='biotech'&&Array.isArray(manifest.files),'BIOTECH_R7_MANIFEST_INVALID');
 const symbols=['IBB','XBI','SPY'];
 const latest=symbols.map(s=>manifest.files.filter(f=>f.path?.startsWith('raw/'+s+'_')&&date(f.observationThrough))
  .map(f=>f.observationThrough).sort().at(-1));
 ensure(latest.every(date),'BIOTECH_R7_MISSING_SYMBOL');
 const earliest=[...latest].sort()[0];
 const upper=plusDays(new Date(Number(now)-48*3600000).toISOString().slice(0,10),0);
 if(earliest>=upper)return null;
 const end=[upper,plusDays(earliest,6)].sort()[0];
 return {start:plusDays(earliest,-6),end};
}

export async function runBiotechAutoR7({dataRoot,db,collect,readBase,allowCollect=false,allowPublish=false,
 inspectManifest=null,calculateShadow=buildBiotechShadow,saveShadow=saveBiotechShadow,
 buildContinuation=buildBiotechConfirmedContinuationR6,saveContinuation=saveBiotechConfirmedContinuationR6,
 now=Date.now}={}){
 const report={report:'BIOTECH_AUTO_R7',status:'STARTED',themeId:'biotech',providerCalls:0,
  d1Writes:0,publicWrites:0,schedulerWrites:0,confirmedObservationDate:null,reason:null};
 try{
  ensure(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'BIOTECH_R7_DATA_ROOT_UNAVAILABLE');
  ensure(db&&typeof db.read==='function','BIOTECH_R7_DB_UNAVAILABLE');
  const prevR2=await db.read(BIOTECH_CONTINUATION_PUBLIC_KEY);
  const previous=prevR2??await db.read('theme-biotech-optional-r1');
  ensure(previous?.body?.status==='READY'&&previous.body.etfs?.join(',')==='IBB,XBI','BIOTECH_R7_PRIOR_UNAVAILABLE');
  const prior=previous.body;
  const manifestPath=path.join(dataRoot,'themes','biotech','raw-manifest.json');
  ensure(fs.existsSync(manifestPath),'BIOTECH_R7_MANIFEST_MISSING');
  if(inspectManifest)ensure(inspectManifest(dataRoot,'themes/biotech/raw-manifest.json','biotech').status==='SHA_VERIFIED',
   'BIOTECH_R7_MANIFEST_SHA_INVALID');
  let manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const window=biotechBoundedCollectionWindow({manifest,now:now()});
  if(allowCollect&&window){
   ensure(typeof collect==='function','BIOTECH_R7_COLLECTOR_MISSING');
   const gathered=await collect({dataRoot,themeId:'biotech',start:window.start,end:window.end,maxRequests:4});
   report.providerCalls=gathered.providerCalls??0;
   if(gathered.status!=='PRIVATE_RAW_COLLECTION_COMPLETE'){
    report.status=gathered.status==='CHECKPOINT_READY_TO_RESUME'?'COLLECTION_RESUME_NEEDED':'COLLECTION_STOPPED';
    report.reason=gathered.status;return report;
   }
   if(inspectManifest)ensure(inspectManifest(dataRoot,'themes/biotech/raw-manifest.json','biotech').status==='SHA_VERIFIED',
    'BIOTECH_R7_POSTCOLLECTION_SHA_INVALID');
   manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  }
  const shadow=calculateShadow({dataRoot,priorRecord:prior});
  report.confirmedObservationDate=shadow.observationDate;
  if(shadow.observationDate<=prior.observationDate){report.status='NO_NEW_CONFIRMED_SESSION';return report;}
  report.shadow=saveShadow(dataRoot,shadow);
  const candidate=buildContinuation({prior,shadow});
  report.continuation=saveContinuation(dataRoot,candidate);
  report.newConfirmedDates=candidate.reconciliation.newConfirmedDates;
  report.overlappingPublicDatesPreserved=candidate.reconciliation.existingOverlappingDatesPreserved;
  if(!allowPublish){report.status='PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED';return report;}
  ensure(typeof readBase==='function'&&typeof db.writeVersioned==='function',
   'BIOTECH_R7_PUBLICATION_ADAPTER_NOT_READY');
  const base=await readBase();
  ensure(base?.status==='READY'&&date(base.observationDate)&&candidate.observationDate<=base.observationDate,
   'BIOTECH_R7_PUBLIC_BASE_NOT_READY');
  const pub=buildBiotechPublicR2({candidate,previous:prior,candidateFileSha256:report.continuation.sha256,
   optIn:true,now:now()});
  ensure(eligibleBiotechContinuationR2(pub,base,{now:now(),storedAt:now()}),
   'BIOTECH_R7_READER_ELIGIBILITY_REJECTED');
  const result=await db.writeVersioned(BIOTECH_CONTINUATION_PUBLIC_KEY,pub,prevR2?.storedAt??null);
  if(result.status==='UNCHANGED'){report.status='UNCHANGED_NO_WRITE';return report;}
  report.d1Writes=result.changes;report.publicWrites=result.changes;
  report.status='D1_READBACK_VERIFIED_PUBLIC_READER_PENDING';
  const fresh=await readBase();
  const theme=fresh?.themes?.find(t=>t.theme==='바이오·신약'&&
   (t.observationDate??fresh.observationDate)===pub.observationDate&&t.score===pub.score);
  if(theme?.score===pub.score&&theme.history?.length===252){report.status='PUBLIC_API_VERIFIED';report.publicVerified=true;}
  return report;
 }catch(e){report.status='BLOCKED';report.reason=e?.code??'BIOTECH_R7_UNCLASSIFIED';return report;}
}
