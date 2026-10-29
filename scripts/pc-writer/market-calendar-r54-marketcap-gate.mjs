// R54: pure, OFFLINE acceptance gate for pre-verified issuer-level USD market caps.
// NOT wired to the market-calendar publisher. Does not fetch data, calculate caps or write files.
// Approved thresholds, TTL/freshness and licensing MUST be established upstream.
const VALID_TICKER=/^[A-Z0-9.-]{1,12}$/;
const VALID_CIK=/^\d{10}$/;
const VALID_DATE=/^20\d{2}-\d{2}-\d{2}$/;
const FINITE_POSITIVE=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const VALID_DAY=d=>typeof d==='string'&&VALID_DATE.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const REQUIRED=['provenanceVerified','issuerWideCapVerified','classAndAdrVerified','corporateActionsVerified','approvedFreshnessVerified','publicDerivedDisplayRightsVerified'];
const reason=(code,extra={})=>({status:'UNVERIFIED',reason:code,stars:null,...extra});

function checkedPolicy(policy){
 // The R43 cutoffs are proposal values; this library is DISABLED without an externally
 // approved policy contract. It intentionally does not alter approval or freshness rules.
 if(!policy||policy.enabled!==true||policy.approved!==true||policy.id!=='MARKET_CALENDAR_R43' ||
     !FINITE_POSITIVE(policy.oneToTwoUsd)||!FINITE_POSITIVE(policy.twoToThreeUsd)||
     !Number.isSafeInteger(policy.oneToTwoUsd)||!Number.isSafeInteger(policy.twoToThreeUsd)||
     policy.oneToTwoUsd>=policy.twoToThreeUsd) return false;
 return true;
}
export function evaluateVerifiedIssuerGrades({tickers,issuerMap,capSnapshots,policy,asOf}={}){
 if(!Array.isArray(tickers)||!Array.isArray(issuerMap)||!Array.isArray(capSnapshots)||!VALID_DAY(asOf))throw Error('R54_ARGUMENTS_INVALID');
 if(tickers.length>10000||issuerMap.length>20000||capSnapshots.length>20000)throw Error('R54_INPUT_BUDGET_STOP');
 if(new Set(tickers).size!==tickers.length||tickers.some(t=>typeof t!=='string'||!VALID_TICKER.test(t)))throw Error('R54_TICKER_CONTRACT_STOP');
 const enabled=checkedPolicy(policy),mapped=new Map(),invalid=new Set();
 for(const item of issuerMap){
  const ticker=item?.ticker,issuerId=item?.issuerId;
  if(typeof ticker!=='string'||!VALID_TICKER.test(ticker)||typeof issuerId!=='string'||!VALID_CIK.test(issuerId))continue;
  if(invalid.has(ticker))continue;
  if(mapped.has(ticker)&&mapped.get(ticker)!==issuerId){mapped.delete(ticker);invalid.add(ticker);continue;}
  mapped.set(ticker,issuerId);
 }
 const snapshots=new Map(),conflicts=new Set();
 for(const s of capSnapshots){
  const issuerId=s?.issuerId;
  if(typeof issuerId!=='string'||!VALID_CIK.test(issuerId))continue;
  if(conflicts.has(issuerId))continue;
  if(snapshots.has(issuerId)){
   // No silent de-dupe / arbitrary latest-value selection without an approved contract.
   snapshots.delete(issuerId); conflicts.add(issuerId);continue;
  }
  snapshots.set(issuerId,s);
 }
 const issuerGrades=new Map();
 const result=tickers.map(ticker=>{
  const issuerId=mapped.get(ticker);
  if(!enabled)return {ticker,...reason('POLICY_NOT_APPROVED')};
  if(invalid.has(ticker))return {ticker,...reason('ISSUER_MAPPING_CONFLICT')};
  if(!issuerId)return {ticker,...reason('ISSUER_UNMAPPED')};
  if(conflicts.has(issuerId))return {ticker,...reason('ISSUER_SNAPSHOT_CONFLICT')};
  const observation=snapshots.get(issuerId);
  if(!observation)return {ticker,...reason('ISSUER_CAP_MISSING')};
  if(!FINITE_POSITIVE(observation.marketCapUsd)||observation.currency!=='USD'||!VALID_DAY(observation.priceAsOf)||!VALID_DAY(observation.sharesAsOf)||observation.priceAsOf>asOf||observation.sharesAsOf>asOf||
      typeof observation.sourceVersion!=='string'||!observation.sourceVersion.trim()||
      typeof observation.sourceStoredAt!=='string'||!Number.isFinite(Date.parse(observation.sourceStoredAt))||
      Date.parse(observation.sourceStoredAt)>Date.parse(asOf+'T23:59:59.999Z')) return {ticker,...reason('CAP_EVIDENCE_INVALID')};
  const missing=REQUIRED.find(k=>observation[k]!==true);
  if(missing)return {ticker,...reason('CAP_GATE_UNVERIFIED_'+missing.toUpperCase())};
  const cap=observation.marketCapUsd;
  const stars=cap>=policy.twoToThreeUsd?3:cap>=policy.oneToTwoUsd?2:1;
  const current=issuerGrades.get(issuerId);
  if(current&&current!==stars)throw Error('R54_ISSUER_GRADE_CONFLICT_STOP');
  issuerGrades.set(issuerId,stars);
  return {ticker,status:'VALIDATED_CANDIDATE_ONLY',issuerId,stars,
    priceAsOf:observation.priceAsOf,sharesAsOf:observation.sharesAsOf,sourceVersion:observation.sourceVersion};
 });
 return {status:enabled?'R54_OFFLINE_GATE_COMPLETE':'R54_POLICY_DISABLED',
   dataProviderRequests:0,dbWrites:0,d1Writes:0,publicStarsChanged:false,
   publishReady:false,items:result,
   accepted:result.filter(r=>r.status==='VALIDATED_CANDIDATE_ONLY').length,
   unverified:result.filter(r=>r.status==='UNVERIFIED').length};
}
