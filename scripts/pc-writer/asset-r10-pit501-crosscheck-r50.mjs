import {createHash} from 'node:crypto';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

// Independent source authentication is a separate gate. Two matching JSON
// inputs are NOT proof that they came from independent S&P Dow Jones records.
// This cross-check only verifies a 501-session, full-denominator membership
// witness already collected under the approved private-PC storage contract.
export const R10_PIT501_CROSSCHECK_METHOD='ASSET_R10_PIT501_CROSSCHECK_RESEARCH_R50';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SYMBOL=/^[A-Z0-9][A-Z0-9.\-]{0,14}$/;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validDate=value=>typeof value==='string'&&DATE.test(value)&&
  !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const session=date=>date!=='2025-01-09'&&isMarketSession(date);
const stop=(status,more={})=>({method:R10_PIT501_CROSSCHECK_METHOD,status,
  readOnly:true,canPromote:false,productionEligible:false,
  providerCalls:0,sqliteWrites:0,approvedInputWrites:0,releaseWrites:0,
  d1Writes:0,taskChanges:0,...more});
const nextSession=date=>{
  let t=Date.parse(date+'T00:00:00Z');
  for(let i=0;i<10;i++){
    t+=86400000;
    const x=new Date(t).toISOString().slice(0,10);
    if(session(x))return x;
  }
  return null;
};
function validate501(rows){
  if(!Array.isArray(rows)||rows.length!==501)return null;
  const normalized=[];let prior=null;
  for(const row of rows){
    const date=row?.tradeDate,members=row?.members;
    if(!validDate(date)||!session(date)||date<=prior||
      (prior!==null&&date!==nextSession(prior))||
      !Array.isArray(members)||members.length<490||members.length>520||
      row.memberCount!==members.length||members.some(s=>!SYMBOL.test(s))||
      new Set(members).size!==members.length)return null;
    normalized.push({tradeDate:date,members:[...members].sort()});
    prior=date;
  }
  return normalized;
}

export function crosscheckR10Pit501ReadOnly({officialPit,
  independentSourceRows,asOfDate}={}){
  if(!validDate(asOfDate))return stop('STOP_PIT501_ASOF_DATE_INVALID');
  if(officialPit?.status!=='READY'||officialPit.membershipLookAheadSafe!==true||
    officialPit.currentUniverseSurvivorshipBiasRemoved!==true||
    officialPit.publicMutation!==false||!Array.isArray(officialPit.universes)||
    officialPit.universes.length<501||officialPit.universes.length>530||
    officialPit.targetSessions!==officialPit.universes.length||
    officialPit.first!==officialPit.universes[0]?.tradeDate||
    officialPit.last!==officialPit.universes.at(-1)?.tradeDate||
    officialPit.currentDate!==officialPit.universes.at(-1)?.tradeDate||
    typeof officialPit.eventDigest!=='string'||!/^[a-f0-9]{64}$/.test(officialPit.eventDigest))
    return stop('STOP_R7_PIT_SOURCE_SHAPE_INVALID');
  const approved=validate501(officialPit.universes.slice(-501));
  if(!approved)return stop('STOP_R7_PIT_501_SESSION_INVALID');
  const independent=validate501(independentSourceRows);
  if(!independent)return stop('STOP_INDEPENDENT_WITNESS_501_SESSION_INVALID');
  if(approved.at(-1).tradeDate>asOfDate||independent.at(-1).tradeDate>asOfDate)
    return stop('STOP_PIT501_FUTURE_OBSERVATION');
  let mismatchCount=0,firstMismatchDate=null;
  for(let i=0;i<501;i++){
    if(approved[i].tradeDate!==independent[i].tradeDate||
      JSON.stringify(approved[i].members)!==JSON.stringify(independent[i].members)){
      mismatchCount++;
      firstMismatchDate??=approved[i].tradeDate;
    }
  }
  const approvedSha256=hash(approved),independentSha256=hash(independent);
  if(mismatchCount)return stop('STOP_PIT501_MEMBERSHIP_OR_IDENTITY_MISMATCH',{
    comparedSessions:501,mismatchCount,firstMismatchDate,
    approvedSha256,independentSha256,
  });
  // A copied 501-day array can match byte-for-byte. No caller-provided string
  // (including `sourceName` or `approved:true`) authenticates independence.
  // This code has no independently verified source provenance,
  // so matching data must still STOP before any PC input promotion.
  return stop('STOP_INDEPENDENT_PIT_SOURCE_AUTHENTICATION_MISSING',{
    comparedSessions:501,firstTradeDate:approved[0].tradeDate,
    lastTradeDate:approved.at(-1).tradeDate,
    approvedSha256,independentSha256,
    membershipParity:'EXACT_UNORDERED_SET_MATCH',
    sourceIndependenceAuthenticated:false,
    requiredEvidence:[
      'INDEPENDENT_PIT_PROVIDER_AND_PRODUCT_IDENTIFIER',
      'SOURCE_EFFECTIVE_DATE_AND_COLLECTION_TIMESTAMP',
      'ORIGINAL_SOURCE_BYTES_SHA256_AND_PROVENANCE_READBACK',
      'PRICE_RIGHTS_AND_SECURITY_IDENTITY',
    ],
  });
}
