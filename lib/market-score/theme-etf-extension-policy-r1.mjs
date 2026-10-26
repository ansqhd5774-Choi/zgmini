// Standalone, side-effect-free policy for future ETF theme research.
// This module is intentionally NOT imported by the V1 seven-theme reader,
// R178 rolling reader, or existing optional sidecars.
export const THEME_ETF_EXTENSION_POLICY_VERSION='THEME_ETF_EXTENSION_POLICY_R1';
export const THEME_ETF_CHART_SESSIONS=252;

const hasText=x=>typeof x==='string'&&x.trim().length>0;
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const isTimestamp=x=>hasText(x)&&Number.isFinite(Date.parse(x));
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const sum=a=>a.reduce((total,x)=>total+x,0);
const dateBeforeOrOn=(date,now)=>Date.parse(date+'T00:00:00Z')<=now;
const timestampBeforeOrOn=(stamp,now)=>Date.parse(stamp)<=now;
const symbol=x=>hasText(x)&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(x);

// An accepted exception belongs to the theme's *material contract*, not to
// the mutable timestamp or sample count of every subsequent daily run.
// Re-running a previously verified pipeline must not silently revoke approval.
// A change of ETF basket, formula, price methodology, source, account mode,
// or terms identity still requires the publisher to revisit the decision.
export function themeEtfRiskScope(record){
 return JSON.stringify({themeId:record?.themeId,
  etfs:(Array.isArray(record?.etfs)?record.etfs:[]).map(x=>({kind:x?.kind,symbol:x?.symbol,weight:x?.weight})),
  benchmark:record?.benchmark,
  methodologyVersion:record?.methodologyVersion,
  priceMethodVersion:record?.priceMethodVersion,
  sources:(Array.isArray(record?.sourceEvidence)?record.sourceEvidence:[]).map(s=>({provider:s?.provider,dataset:s?.dataset,
   accountMode:s?.accountMode,evidenceId:s?.evidenceId,termsUrl:s?.termsUrl})),
  priceAdjustmentBasis:record?.priceEvidence?.adjustmentBasis,
 });
}

export function assessThemeEtfExtension(record,{now=Date.now()}={}){
 const researchProblems=[];
 const calculationProblems=[];
 const chartProblems=[];
 const publicationProblems=[];
 const warnings=[];
 const add=(collection,code)=>{if(!collection.includes(code))collection.push(code)};
 const portfolio=record?.etfs;

 if(!record||record.policyVersion!==THEME_ETF_EXTENSION_POLICY_VERSION)add(researchProblems,'POLICY_VERSION_INVALID');
 if(!hasText(record?.themeId)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.themeId))add(researchProblems,'THEME_ID_INVALID');
 if(!hasText(record?.theme))add(researchProblems,'THEME_NAME_INVALID');
 if(!hasText(record?.methodologyVersion)||!hasText(record?.priceMethodVersion)||!symbol(record?.benchmark))add(calculationProblems,'SCORING_METHOD_NOT_FINALIZED');
 if(!Array.isArray(portfolio)||portfolio.length===0)add(researchProblems,'NO_ETF_COMPONENTS');
 else {
  const seen=new Set();
  for(const x of portfolio){
   if(x?.kind!=='ETF'||!symbol(x?.symbol)||seen.has(x.symbol)){
    add(researchProblems,'ETF_COMPONENT_INVALID');break;
   }
   seen.add(x.symbol);
  }
  if(!researchProblems.includes('ETF_COMPONENT_INVALID')&&
     (portfolio.some(x=>typeof x.weight!=='number'||!Number.isFinite(x.weight)||x.weight<=0||x.weight>1)||
      Math.abs(sum(portfolio.map(x=>x.weight))-1)>1e-9))add(calculationProblems,'ETF_WEIGHT_NOT_FINALIZED');
 }

 const history=record?.history;
 if(!Array.isArray(history)||history.length!==THEME_ETF_CHART_SESSIONS)add(chartProblems,'CHART_252_SESSIONS_REQUIRED');
 else {
  let previous='';
  for(const point of history){
   if(!isDate(point?.date)||point.date<=previous||!dateBeforeOrOn(point.date,now)){
    add(chartProblems,'CHART_DATE_INVALID');break;
   }
   previous=point.date;
   if(point.score===null){
    if(!['INSUFFICIENT_LOOKBACK','SOURCE_GAP','CALCULATION_PENDING'].includes(point.missingReason))add(chartProblems,'MISSING_REASON_REQUIRED');
   }else if(!score(point.score)||point.missingReason!==undefined){add(chartProblems,'CHART_SCORE_INVALID');}
  }
  if(!chartProblems.length&&record.latestScore!==history.at(-1).score&&
     !(score(record.latestScore)&&score(history.at(-1).score)&&Math.abs(record.latestScore-history.at(-1).score)<1e-6))
   add(chartProblems,'LATEST_SCORE_MISMATCH');
 }

 const researchReady=researchProblems.length===0;
 const calculationReady=researchReady&&calculationProblems.length===0;
 const chartReady=calculationReady&&chartProblems.length===0;
 const currentScoreReady=chartReady&&score(record.latestScore);

 // Rights questions MUST NEVER prevent candidate discovery or private scoring.
 if(!record?.publicationAuthorized)add(publicationProblems,'PUBLICATION_NOT_AUTHORIZED');
 if(record?.publicationFormat!=='DERIVED_SCORE_ONLY')add(publicationProblems,'DERIVED_ONLY_PUBLICATION_REQUIRED');
 if(!currentScoreReady)add(publicationProblems,'LATEST_PUBLISHABLE_SCORE_UNAVAILABLE');
 if(!isTimestamp(record?.sourceAsOf)||!timestampBeforeOrOn(record.sourceAsOf,now))add(publicationProblems,'SOURCE_TIMESTAMP_UNVERIFIED');

 const sources=record?.sourceEvidence;
 let ambiguous=false;
 let prohibited=false;
 let provenanceComplete=Array.isArray(sources)&&sources.length>0;
 if(!provenanceComplete)add(publicationProblems,'SOURCE_EVIDENCE_MISSING');
 else for(const s of sources){
  if(!hasText(s?.provider)||!hasText(s?.dataset)||!hasText(s?.accountMode)||
     !hasText(s?.evidenceId)||!hasText(s?.termsUrl)||!/^https:\/\//.test(s.termsUrl)||
     !isDate(s?.checkedOn)||!dateBeforeOrOn(s.checkedOn,now))provenanceComplete=false;
  const r=s?.rights;
  if(r?.derivedDistribution==='PROHIBITED'||r?.internalStorage==='PROHIBITED')prohibited=true;
  else if(r?.derivedDistribution!=='ALLOWED'||r?.internalStorage!=='ALLOWED')ambiguous=true;
  // 'ALLOWED' is merely a stored claim until a source- and account-specific
  // review record exists. Unknown is a valid research outcome, not a fake PASS.
  if(s?.review?.decision!=='VERIFIED_FOR_ACCOUNT_MODE'||!hasText(s?.review?.reviewer)||
     !hasText(s?.review?.supportingEvidence))ambiguous=true;
 }
 if(!provenanceComplete)add(publicationProblems,'SOURCE_PROVENANCE_INCOMPLETE');
 if(prohibited)add(publicationProblems,'EXPLICIT_LICENSE_RESTRICTION');

 const risk=record?.publisherRiskAcceptance;
 const ownerAccepted=hasText(risk?.decisionId)&&risk?.themeId===record?.themeId&&
  isDate(risk?.acceptedOn)&&dateBeforeOrOn(risk.acceptedOn,now)&&
  risk?.unknownRightsAcknowledged===true&&risk?.limitedPriceCheckAcknowledged===true&&
  risk?.disclosureRequired===true&&risk?.acceptedScope===themeEtfRiskScope(record);
 if(ambiguous&&!ownerAccepted)add(publicationProblems,'LICENSE_SCOPE_UNCONFIRMED');
 if(ambiguous&&ownerAccepted)add(warnings,'PUBLISHER_ACCEPTED_LICENSE_AMBIGUITY_NOT_INDEPENDENTLY_VERIFIED');

 const quality=record?.priceEvidence;
 const priceMode=quality?.verification;
 if(!['FULLY_RECONCILED','LIMITED_CHECK'].includes(priceMode)||
    !isTimestamp(quality?.checkedAt)||!timestampBeforeOrOn(quality.checkedAt,now)||
    !Number.isInteger(quality?.referenceSamples)||quality.referenceSamples<1||
    !hasText(quality?.adjustmentBasis))add(publicationProblems,'PRICE_VALIDATION_MISSING');
 if(priceMode==='FULLY_RECONCILED'&&!hasText(quality?.reconciliationEvidenceId))add(publicationProblems,'PRICE_RECONCILIATION_EVIDENCE_MISSING');
 if(priceMode==='LIMITED_CHECK'&&!ownerAccepted)add(publicationProblems,'LIMITED_PRICE_VALIDATION_NOT_ACCEPTED');
 if(priceMode==='LIMITED_CHECK'&&ownerAccepted)add(warnings,'LIMITED_PRICE_VALIDATION_DISCLOSURE_REQUIRED');

 const publicationReady=researchReady&&chartReady&&publicationProblems.length===0;
 const publicationBasis=publicationReady?(ambiguous||priceMode==='LIMITED_CHECK'?'OWNER_ACCEPTED_LIMITATIONS':'RECORDED_SOURCE_RIGHTS_REVIEW'):'NOT_APPROVED';
 return {
  researchReady,calculationReady,chartReady,currentScoreReady,publicationReady,publicationBasis,
  researchProblems,calculationProblems,chartProblems,publicationProblems,warnings,
 };
}
