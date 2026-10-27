// R25: private read-only sensitivity for user review of mixed-theme ETF inclusion.
// Uses previously verified R21/R23 evidence. Never fetches ETF/provider prices.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditDatedAumEvidence,compareDatedAumBasket} from
 './theme-space-satellite-r23-aum-shadow.mjs';

const need=(v,code)=>{if(!v)throw Object.assign(new Error(code),{code});};
const round=n=>Number(n.toFixed(5));

export function comparePurityAlternatives(evidence,{excludeSymbols=[]}={}){
 const base=auditDatedAumEvidence(evidence);
 need(Array.isArray(excludeSymbols)&&excludeSymbols.length>0&&
  excludeSymbols.every(s=>typeof s==='string'),
  'R25_EXCLUSION_LIST_INVALID');
 const excluded=new Set(excludeSymbols);
 need(excluded.size===excludeSymbols.length,'R25_DUPLICATE_EXCLUSION');
 const known=new Set(evidence.rows.map(x=>x.symbol));
 need([...excluded].every(x=>known.has(x)),'R25_EXCLUSION_NOT_IN_EVIDENCE');
 const remaining=evidence.rows.filter(x=>!excluded.has(x.symbol));
 need(remaining.length>=3,'R25_THREE_PLUS_APPROVAL_REQUIRES_THREE_CANDIDATES');
 const focus=compareDatedAumBasket({scoreAsOf:evidence.scoreAsOf,
  rows:remaining,priorPrivateScore:null});
 need(base.eligibleCount>=3&&focus.eligibleCount>=3&&
  base.weightsApproved&&focus.weightsApproved,
  'R25_THREE_PLUS_REAL_DATA_INSUFFICIENT');
 return {
  report:'SPACE_SATELLITE_R25_PRIVATE_PURITY_ALTERNATIVES',
  status:'PRIVATE_ALTERNATIVE_NOT_FINAL_SELECTION',
  scoreAsOf:evidence.scoreAsOf,
  sourceManifestSha256:evidence.sourceManifestSha256,
  spyManifestSha256:evidence.spyManifestSha256,
  r18HistorySha256:evidence.r18HistorySha256,
  fullBasket:{symbols:base.included,score:base.privateAumScenarioScore,
   aumWeightsPercent:base.weightsPercent},
  narrowerBasket:{symbols:focus.included,score:focus.privateAumScenarioScore,
   aumWeightsPercent:focus.weightsPercent},
  excludedForComparison:[...excluded],
  difference:round(focus.privateAumScenarioScore-base.privateAumScenarioScore),
  issuerAumEvidenceMixedDates:base.evidenceMixedDates||focus.evidenceMixedDates,
  threePlusEtfWeightingApproved:true,
  purityExclusionApproved:false,
  finalBasketSelected:false,
  rightsVerified:false,publicationAuthorized:false,
  providerCalls:0,collectionRetries:0,
  rawFilesWritten:0,d1Writes:0,publicWrites:0,schedulerWrites:0
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('READ_ONLY: pass --audit for the recorded mixed-theme comparison.');
 }else try{
  const evidencePath=path.join(path.dirname(fileURLToPath(import.meta.url)),
   'theme-space-satellite-r23-dated-aum-evidence.json');
  const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
  // The exclusion is an explicitly named hypothetical, not an automatic gate.
  console.log(JSON.stringify(comparePurityAlternatives(evidence,
   {excludeSymbols:['ROKT']}),null,2));
 }catch(e){
  console.error(JSON.stringify({status:'BLOCKED',reason:e.code??e.message,
   providerCalls:0,d1Writes:0,publicWrites:0}));
  process.exitCode=1;
 }
}
