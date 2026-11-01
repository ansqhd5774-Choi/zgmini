// R23: read-only, dated AUM weighting comparison for new themes.
// R24: user approved relative AUM as the three-plus ETF weighting policy.
// Formula approval does not authorize basket selection, rights, or publication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SYMBOL=/^[A-Z][A-Z0-9.-]{0,15}$/;
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const HASH=/^[0-9a-f]{64}$/;
// Confirmed by the user's R21 actual PC result, not a new source download.
const R21_PC_PROVENANCE={
 sourceManifestSha256:'1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b',
 spyManifestSha256:'76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e',
 r18HistorySha256:'94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216'
};
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const round=(n,d=5)=>Number(n.toFixed(d));
const dateMs=d=>{
 need(typeof d==='string'&&ISO_DATE.test(d),'R23_DATE_INVALID');
 const ms=Date.parse(`${d}T00:00:00Z`);
 need(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===d,
  'R23_DATE_INVALID');
 return ms;
};

// Facts are passed in as a small dated evidence record. No ticker list, ETF
// count, issuer URL, numerical AUM, or price series is hardcoded in this scorer.
export function compareDatedAumBasket({scoreAsOf,rows,priorPrivateScore=null}={}){
 const asOfMs=dateMs(scoreAsOf);
 need(Array.isArray(rows)&&rows.length>=2,'R23_CANDIDATES_INSUFFICIENT');
 need(priorPrivateScore===null||
  (typeof priorPrivateScore==='number'&&Number.isFinite(priorPrivateScore)&&
   priorPrivateScore>=0&&priorPrivateScore<=100),
  'R23_PRIOR_SCORE_INVALID');
 const seen=new Set(),eligible=[],excluded=[];
 for(const row of rows){
  const symbol=row?.symbol;
  need(typeof symbol==='string'&&SYMBOL.test(symbol)&&!seen.has(symbol),
   'R23_TICKER_INVALID_OR_DUPLICATE');
  seen.add(symbol);
  // A missing real individual score is not 0. Preserve this candidate without
  // searching again; do not invent AUM or a forced basket membership.
  if(row.score===null||row.score===undefined){
   excluded.push({symbol,reason:'NO_REAL_CURRENT_INDIVIDUAL_SCORE'});
   continue;
  }
  need(typeof row.score==='number'&&Number.isFinite(row.score)&&
   row.score>=0&&row.score<=100,'R23_INDIVIDUAL_SCORE_INVALID');
  if(row.aumUsd===null||row.aumUsd===undefined){
   excluded.push({symbol,reason:'OFFICIAL_AUM_UNAVAILABLE_NO_RETRY'});
   continue;
  }
  need(typeof row.aumUsd==='number'&&Number.isFinite(row.aumUsd)&&
   row.aumUsd>0,'R23_AUM_INVALID');
  const evidenceMs=dateMs(row.aumAsOf);
  need(evidenceMs<=asOfMs,'R23_FUTURE_AUM_LOOKAHEAD');
  need(typeof row.issuerUrl==='string'&&
   /^https:\/\/[^\s/]+/.test(row.issuerUrl),'R23_ISSUER_URL_INVALID');
  eligible.push({symbol,score:row.score,aumUsd:row.aumUsd,
   aumAsOf:row.aumAsOf,lagDays:(asOfMs-evidenceMs)/86_400_000});
 }
 if(eligible.length<2)return {
  scoreAsOf,candidateCount:rows.length,eligibleCount:eligible.length,
  included:eligible.map(x=>x.symbol),excluded,
  totalAumUsd:null,weightsPercent:null,privateAumScenarioScore:null,
  comparedToPrivateScore:priorPrivateScore,scoreDelta:null,
  evidenceMixedDates:null,collectionRetries:0,
  threePlusEtfWeightingApproved:true,weightsApproved:false,
  publicationAuthorized:false};
 const totalAum=eligible.reduce((sum,x)=>sum+x.aumUsd,0);
 need(Number.isFinite(totalAum)&&totalAum>0,'R23_TOTAL_AUM_INVALID');
 const score=eligible.reduce((sum,x)=>sum+x.score*(x.aumUsd/totalAum),0);
 const weights=Object.fromEntries(eligible.map(x=>[x.symbol,
  round(x.aumUsd/totalAum*100,4)]));
 const distinctDates=new Set(eligible.map(x=>x.aumAsOf));
 return {scoreAsOf,candidateCount:rows.length,eligibleCount:eligible.length,
  included:eligible.map(x=>x.symbol),excluded,totalAumUsd:round(totalAum,2),
  weightsPercent:weights,privateAumScenarioScore:round(score),
  comparedToPrivateScore:priorPrivateScore,
  scoreDelta:priorPrivateScore===null?null:round(score-priorPrivateScore),
  issuerAumAsOf:Object.fromEntries(eligible.map(x=>[x.symbol,x.aumAsOf])),
  evidenceMixedDates:distinctDates.size>1,
  maximumEvidenceLagDays:Math.max(...eligible.map(x=>x.lagDays)),
  method:'NORMALIZED_OFFICIAL_AUM_THREE_PLUS_POLICY_APPROVED_PRIVATE_SHADOW',
  threePlusEtfWeightingApproved:true,weightsApproved:eligible.length>=3,
  collectionRetries:0,
  providerCalls:0,rawFilesWritten:0,d1Writes:0,publicWrites:0,
  schedulerWrites:0,rightsVerified:false,publicationAuthorized:false};
}

export function auditDatedAumEvidence(evidence){
 need(evidence?.version===1&&evidence?.snapshotType===
  'NON_OPERATIONAL_PRIVATE_AUM_SENSITIVITY',
  'R23_EVIDENCE_TYPE_INVALID');
 need(typeof evidence.checkedAt==='string','R23_CHECK_DATE_MISSING');
 dateMs(evidence.checkedAt);
 need(HASH.test(evidence.sourceManifestSha256??'')&&
  HASH.test(evidence.spyManifestSha256??'')&&
  HASH.test(evidence.r18HistorySha256??''),
  'R23_PREVIOUS_PC_PROVENANCE_MISSING');
 need(Object.entries(R21_PC_PROVENANCE).every(([key,value])=>
  evidence[key]===value),'R23_R21_PC_PROVENANCE_CHANGED');
 const result=compareDatedAumBasket({scoreAsOf:evidence.scoreAsOf,
  rows:evidence.rows,priorPrivateScore:evidence.r21PrivateScore});
 return {report:'SPACE_SATELLITE_R23_DATED_AUM_PRIVATE_SENSITIVITY',
  status:'READ_ONLY_CROSS_DATE_NOT_FOR_PUBLICATION',
  sourceManifestSha256:evidence.sourceManifestSha256,
  spyManifestSha256:evidence.spyManifestSha256,
  r18HistorySha256:evidence.r18HistorySha256,
  issuerEvidenceCheckedAt:evidence.checkedAt,...result,
  oldScoresPreserved:true,originalR18HistoryRewritten:false,
  finalBasketSelected:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('READ_ONLY: --audit compares a dated local evidence snapshot.');
 }else try{
  const file=path.join(path.dirname(fileURLToPath(import.meta.url)),
   'theme-space-satellite-r23-dated-aum-evidence.json');
  console.log(JSON.stringify(auditDatedAumEvidence(
   JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
 }catch(e){console.error(JSON.stringify({report:'SPACE_SATELLITE_R23_DATED_AUM_PRIVATE_SENSITIVITY',
   status:'BLOCKED',reason:e.code??String(e.message??e),providerCalls:0,
   d1Writes:0,publicWrites:0,schedulerWrites:0}));process.exitCode=1;}
}
