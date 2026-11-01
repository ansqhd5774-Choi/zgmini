// R26: private selected ETF roster audit; no provider, D1, or publication writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditDatedAumEvidence,compareDatedAumBasket} from
 './theme-space-satellite-r23-aum-shadow.mjs';

const need=(ok,reason)=>{if(!ok)throw Object.assign(new Error(reason),{code:reason});};
const SYMBOL=/^[A-Z][A-Z0-9.-]{0,15}$/;

export function auditApprovedRoster(evidence,policy){
 need(policy?.version===1&&policy.theme==='space-satellite'&&
  policy.selectionPolicy==='ALL_CURRENTLY_ELIGIBLE_NO_FIXED_ETF_COUNT'&&
  policy.selectionApproved===true&&policy.maximumEtfCount===null&&
  policy.futureEligibleEtfsMayBeAdded===true,
  'R26_POLICY_INVALID_OR_CAPPED');
 const selected=policy.approvedCurrentSymbols;
 need(Array.isArray(selected)&&selected.length>=3&&
  selected.every(s=>typeof s==='string'&&SYMBOL.test(s))&&
  new Set(selected).size===selected.length,'R26_SELECTED_SYMBOLS_INVALID');
 const blocked=policy.excludedFromCurrentSelectionNoRetry;
 need(Array.isArray(blocked)&&blocked.every(s=>typeof s==='string'&&SYMBOL.test(s))&&
  new Set(blocked).size===blocked.length&&
  selected.every(s=>!blocked.includes(s)),'R26_NO_RETRY_LIST_INVALID');
 need(policy.approvedThreePlusWeighting==='NORMALIZED_DATED_OFFICIAL_AUM'&&
  policy.futureEtfsRequireRealPriceScoreAumAndThemeFit===true,
  'R26_REQUIRED_GATE_MISSING');
 const disclosure=policy.mixedThemeDisclosures??{};
 need(typeof disclosure==='object'&&!Array.isArray(disclosure)&&
  Object.entries(disclosure).every(([s,message])=>
   selected.includes(s)&&typeof message==='string'&&message.trim().length>=10),
  'R26_MIXED_THEME_DISCLOSURE_INVALID');
 need(disclosure.ROKT||!selected.includes('ROKT'),
  'R26_ROKT_MIXED_THEME_DISCLOSURE_REQUIRED');
 const prior=auditDatedAumEvidence(evidence); // Enforces R21 PC digest.
 const bySymbol=new Map(evidence.rows.map(r=>[r.symbol,r]));
 need(selected.every(s=>bySymbol.has(s)),'R26_NO_REAL_EVIDENCE_FOR_SELECTED');
 const current=compareDatedAumBasket({scoreAsOf:evidence.scoreAsOf,
  rows:selected.map(s=>bySymbol.get(s))});
 need(current.eligibleCount>=3&&current.weightsApproved,
  'R26_THREE_PLUS_REAL_ETFS_NOT_AVAILABLE');
 return {report:'SPACE_SATELLITE_R26_ROSTER_APPROVAL_PRIVATE_AUDIT',
  status:'SELECTION_APPROVED_PUBLICATION_BLOCKED',
  scoreAsOf:evidence.scoreAsOf,
  approvedCurrentSymbols:selected,
  eligibleCurrentSymbols:current.included,
  currentExcludedNoRetry:blocked,
  maxEtfCount:null,
  futureEligibleEtfsMayBeAdded:true,
  mixedThemeDisclosures:disclosure,
  privateScore:current.privateAumScenarioScore,
  weightsPercent:current.weightsPercent,
  r21ProvenancePreserved:Boolean(prior.sourceManifestSha256&&prior.spyManifestSha256),
  aumEvidenceMixedDates:current.evidenceMixedDates,
  finalBasketSelected:true,
  weightsApproved:true,
  rightsVerified:false,
  publicationAuthorized:false,
  historical252DayAumVerified:false,
  providerCalls:0,collectionRetries:0,rawFilesWritten:0,
  publicWrites:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('READ_ONLY: --audit verifies the user-approved current roster.');
 }else try{
  const dir=path.dirname(fileURLToPath(import.meta.url));
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,
   'theme-space-satellite-r23-dated-aum-evidence.json'),'utf8'));
  const policy=JSON.parse(fs.readFileSync(path.join(dir,
   'theme-space-satellite-r26-approved-roster.json'),'utf8'));
  console.log(JSON.stringify(auditApprovedRoster(evidence,policy),null,2));
 }catch(e){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R26_ROSTER_APPROVAL_PRIVATE_AUDIT',
   status:'BLOCKED',reason:e.code??e.message,
   providerCalls:0,publicWrites:0,d1Writes:0}));
  process.exitCode=1;
 }
}
