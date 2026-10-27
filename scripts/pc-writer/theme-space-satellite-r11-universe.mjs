// Private, read-only inventory classification. No network, filesystem, score or publishing.
// A candidate count is NEVER a selection threshold: one or any number may qualify.
// Catalogue presence is not a substitute for a SHA-verified PC raw-price/score audit.
const TICKER=/^[A-Z][A-Z0-9.-]{0,11}$/;
const CATALOG=new Set(['UNKNOWN','LISTED','NOT_LISTED']);
const AUDIT=new Set(['NOT_TESTED','RAW_PASS','SCORE_PASS','BLOCKED']);
const VALID_STATUSES=new Set(['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE']);

export function classifyEtfDataAvailability({candidates}={}){
 if(!Array.isArray(candidates))throw Error('R11_CANDIDATE_ARRAY_REQUIRED');
 const seen=new Set();
 const rows=candidates.map(entry=>{
  if(!TICKER.test(entry?.symbol??'')||seen.has(entry.symbol))throw Error('R11_INVALID_OR_DUPLICATE_TICKER');
  seen.add(entry.symbol);
  const catalogStatus=entry.catalogStatus??'UNKNOWN';
  const auditStatus=entry.auditStatus??'NOT_TESTED';
  if(!CATALOG.has(catalogStatus)||!AUDIT.has(auditStatus))throw Error('R11_INVALID_EVIDENCE_STATUS');
  const n=entry.realCommonSessions??null;
  if(n!==null&&(!Number.isInteger(n)||n<0))throw Error('R11_INVALID_REAL_SESSION_COUNT');
  if(entry.spaceThemeEligible!==true&&entry.spaceThemeEligible!==false&&entry.spaceThemeEligible!==null&&entry.spaceThemeEligible!==undefined)
   throw Error('R11_INVALID_THEME_ELIGIBILITY');
  const audited=auditStatus==='RAW_PASS'||auditStatus==='SCORE_PASS';
  // A later catalogue delisting cannot invalidate already SHA-audited historical bars.
  if(audited&&n===null)throw Error('R11_AUDIT_EVIDENCE_CONFLICT');
  if(auditStatus==='SCORE_PASS'&&(n<40||!VALID_STATUSES.has(entry.scoreStatus)))
   throw Error('R11_SCORED_WITHOUT_VERIFIED_R2');
  // Eligibility to collect is not implied by a provider catalogue listing.
  // It still requires checking terms, full requested dates and actual raw data.
  let stage='CATALOG_CHECK_NEEDED';
  if(entry.spaceThemeEligible===false)stage='OUTSIDE_THEME';
  else if(auditStatus==='SCORE_PASS')stage='PRIVATE_SCORE_READY';
  else if(auditStatus==='RAW_PASS')stage=n>=40?'RAW_NEEDS_SCORE_AUDIT':'RAW_UNDER_40';
  else if(auditStatus==='BLOCKED')stage='PROVIDER_OR_RAW_BLOCKED';
  else if(catalogStatus==='LISTED')stage='CATALOG_LISTED_NEEDS_RAW_AUDIT';
  else if(catalogStatus==='NOT_LISTED')stage='CATALOG_NOT_LISTED';
  return {symbol:entry.symbol,stage,catalogStatus,auditStatus,realCommonSessions:n};
 });
 const symbolsFor=stage=>rows.filter(x=>x.stage===stage).map(x=>x.symbol);
 return {
  candidateCount:rows.length,
  // Never .slice(), choose a fixed number of symbols, or prefer the existing R9 pair.
  privateScoringReady:symbolsFor('PRIVATE_SCORE_READY'),
  rawNeedsScoreAudit:symbolsFor('RAW_NEEDS_SCORE_AUDIT'),
  rawUnder40:symbolsFor('RAW_UNDER_40'),
  catalogListedNeedsRawAudit:symbolsFor('CATALOG_LISTED_NEEDS_RAW_AUDIT'),
  catalogCheckNeeded:symbolsFor('CATALOG_CHECK_NEEDED'),
  catalogNotListed:symbolsFor('CATALOG_NOT_LISTED'),
  blocked:symbolsFor('PROVIDER_OR_RAW_BLOCKED'),
  outsideTheme:symbolsFor('OUTSIDE_THEME'),
  records:rows,
  finalBasketSelected:false,
  publicationAuthorized:false,
  method:'R11_RESEARCH_UNIVERSE_NO_COUNT_CAP_NO_SCORE_OR_IO',
 };
}
