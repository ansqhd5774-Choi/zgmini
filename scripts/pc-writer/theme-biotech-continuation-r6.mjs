// Biotech only: prepare a new confirmed series by appending new GMH sessions
// without recomputing or replacing any overlapping previously published score.
// This module has no provider, D1, scheduler, or seven-theme dependency.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const SHA=/^[a-f0-9]{64}$/;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValid=(check,code)=>{if(!check)throw Object.assign(new Error(code),{code});};
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
function validHistory(history,observationDate){
 return Array.isArray(history)&&history.length===252&&history.at(-1)?.date===observationDate&&history.every((p,i)=>
  date(p?.date)&&score(p?.score)&&(!i||p.date>history[i-1].date));
}

export function buildBiotechConfirmedContinuationR6({prior,shadow}={}){
 requireValid(prior?.status==='READY'&&prior.methodologyVersion===METHOD&&prior.etfs?.join(',')==='IBB,XBI'&&
  date(prior.observationDate)&&validHistory(prior.history,prior.observationDate),'BIOTECH_R6_PRIOR_INVALID');
 requireValid(shadow?.status==='PRIVATE_SHADOW_COMPUTED_NOT_PUBLISHED'&&shadow.themeId==='biotech'&&
  shadow.methodologyVersion===METHOD&&date(shadow.observationDate)&&validHistory(shadow.history,shadow.observationDate)&&
  score(shadow.score)&&shadow.score===shadow.history.at(-1).score&&
  /^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/.test(shadow.sourceVersion??'')&&SHA.test(shadow.scorerCodeSha256??'')&&
  shadow.provisional?.points?.length===0&&shadow.publicationAuthorized===false&&shadow.publicWrites===0&&
  shadow.d1Writes===0,'BIOTECH_R6_SHADOW_INVALID');
 requireValid(shadow.observationDate>prior.observationDate,'BIOTECH_R6_NO_NEW_CONFIRMED_SESSION');
 const old=new Map(prior.history.map(p=>[p.date,p]));
 const overlapping=shadow.history.filter(p=>p.date<=prior.observationDate);
 const appended=shadow.history.filter(p=>p.date>prior.observationDate);
 requireValid(overlapping.length>0&&appended.length>0&&
  overlapping.every(p=>old.has(p.date))&&
  prior.history.filter(p=>p.date>=overlapping[0].date).length===overlapping.length,
  'BIOTECH_R6_HISTORY_CALENDAR_MISMATCH');
 const history=shadow.history.map(p=>old.has(p.date)?{date:p.date,score:old.get(p.date).score}:{date:p.date,score:p.score});
 requireValid(validHistory(history,shadow.observationDate),'BIOTECH_R6_HISTORY_INVALID');
 const comparison=shadow.priorComparison??{};
 requireValid(comparison.publicObservationDate===prior.observationDate&&comparison.comparedDates===252&&
  Number.isInteger(comparison.changedDates)&&comparison.changedDates>=0&&comparison.changedDates<=252,
  'BIOTECH_R6_R5_COMPARISON_INVALID');
 const result={revisionId:'BIOTECH_CONFIRMED_CONTINUATION_R6_'+hash(Buffer.from(JSON.stringify({
   priorSourceVersion:prior.sourceVersion,priorDate:prior.observationDate,priorHistory:prior.history,
   shadowRevisionId:shadow.revisionId,shadowSourceVersion:shadow.sourceVersion}))).slice(0,16),
  status:'PRIVATE_CONFIRMED_CONTINUATION_NOT_PUBLISHED',themeId:'biotech',methodologyVersion:METHOD,
  observationDate:shadow.observationDate,score:history.at(-1).score,history,
  sourceLineage:{previousPublicSourceVersion:prior.sourceVersion??null,previousPublicObservationDate:prior.observationDate,
   newPrivateSourceVersion:shadow.sourceVersion,newPrivateScorerSha256:shadow.scorerCodeSha256,
   firstNewDate:appended[0].date,sourceReceivedThrough:shadow.sourceReceivedThrough,
   mode:'PRESERVED_OLD_PUBLISHED_SCORES_PLUS_NEW_GMH_CONFIRMED'},
  reconciliation:{existingOverlappingDatesPreserved:overlapping.length,newConfirmedDates:appended.length,
   previouslyObservedDriftDates:comparison.changedDates,maximumOldRecomputationDifference:comparison.maximumDifference,
   originalPriceDifferenceCause:comparison.inputPriceRootCause},
  provisional:{points:[]},publicationAuthorized:false,publicWrites:0,d1Writes:0,providerCalls:0,schedulerWrites:0};
 return result;
}

export function saveBiotechConfirmedContinuationR6(dataRoot,result){
 requireValid(result?.themeId==='biotech'&&result.status==='PRIVATE_CONFIRMED_CONTINUATION_NOT_PUBLISHED'&&
  result.publicWrites===0&&result.d1Writes===0&&validHistory(result.history,result.observationDate),
  'BIOTECH_R6_SAVE_NOT_ALLOWED');
 const base=fs.realpathSync(dataRoot),home=path.join(base,'themes','biotech');
 requireValid(fs.realpathSync(home).startsWith(base+path.sep),'BIOTECH_R6_DATA_ROOT_INVALID');
 const dir=path.join(home,'derived');fs.mkdirSync(dir,{recursive:true});
 requireValid(fs.realpathSync(dir).startsWith(fs.realpathSync(home)+path.sep),'BIOTECH_R6_DERIVED_ESCAPE');
 const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n'),digest=hash(bytes),filename='biotech-continuation-r6-'+digest.slice(0,16)+'.json';
 const dest=path.join(dir,filename);
 if(fs.existsSync(dest)){requireValid(hash(fs.readFileSync(dest))===digest,'BIOTECH_R6_IMMUTABLE_CONFLICT');
  return {status:'EXISTING_IDENTICAL',path:'themes/biotech/derived/'+filename,sha256:digest};}
 const tmp=dest+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,bytes,{flag:'wx'});
 try{fs.renameSync(tmp,dest)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
 requireValid(hash(fs.readFileSync(dest))===digest,'BIOTECH_R6_READBACK_FAILED');
 return {status:'IMMUTABLE_SAVED',path:'themes/biotech/derived/'+filename,sha256:digest};
}
