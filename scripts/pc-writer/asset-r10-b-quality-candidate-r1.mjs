import {createHash} from 'node:crypto';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {priceWindowQuarantined} from '../../lib/market-score/asset-r10-price-quarantine.mjs';
import {inspectR10BreadthIncremental,R10_RESEARCH_IDENTITY_QUARANTINE}
 from './asset-r10-breadth-incremental.mjs';
import {replayStoredR10BMonthly} from './asset-r10-b-monthly-replay-r1.mjs';

// A pure candidate assembly step for the missing collection→quality→B bridge.
// No filesystem, provider, SQLite, D1, Core or scheduler interaction. In
// particular, this never rewrites the approved R10 PIT, quality or B release.
export const R10_B_QUALITY_CANDIDATE_METHOD='R10_B_STORED_PIT_PRICE_QUALITY_CANDIDATE_R1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,14}$/;
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validDate=value=>typeof value==='string'&&DATE.test(value)&&
  !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validSession=date=>date!=='2025-01-09'&&isMarketSession(date);
const stop=(status,extra={})=>({method:R10_B_QUALITY_CANDIDATE_METHOD,status,
  readOnly:true,canPromote:false,productionEligible:false,providerCalls:0,
  approvedInputWrites:0,sqliteWrites:0,d1Writes:0,releaseWrites:0,
  coreTaskChanges:0,lockPidActions:0,...extra});

function validatePIT(pit){
 if(pit?.status!=='READY'||pit.membershipLookAheadSafe!==true||
    pit.currentUniverseSurvivorshipBiasRemoved!==true||pit.publicMutation!==false||
    !/^[a-f0-9]{64}$/.test(pit.eventDigest??'')||
    !Array.isArray(pit.universes)||pit.universes.length<501||
    pit.universes.length>530||pit.targetSessions!==pit.universes.length||
    pit.first!==pit.universes[0]?.tradeDate||
    pit.last!==pit.universes.at(-1)?.tradeDate||
    pit.currentDate!==pit.last)return false;
 let prev='';
 for(const row of pit.universes){
  if(!validDate(row?.tradeDate)||row.tradeDate<=prev||!validSession(row.tradeDate)||
     !Array.isArray(row.members)||row.members.length<490||row.members.length>520||
     row.memberCount!==row.members.length||row.members.some(s=>!TICKER.test(s))||
     new Set(row.members).size!==row.members.length)return false;
  prev=row.tradeDate;
 }
 // Explicitly verify the session sequence, not merely 501 sorted dates.
 let cursor=pit.first;
 for(const row of pit.universes){
  if(cursor!==row.tradeDate)return false;
  cursor=new Date(Date.parse(cursor+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  for(let n=0;n<10&&!validSession(cursor);n++)
   cursor=new Date(Date.parse(cursor+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 }
 return true;
}
function buildPrices(groups,incremental,approvedThrough){
 if(!Array.isArray(groups)||groups.length<1||groups.length>64||
    !Array.isArray(incremental)||incremental.length>5000)return null;
 const prices=new Map(),baseSymbols=new Set(),unmapped=new Set();
 let count=0;
 for(const [isIncremental,sets] of [[false,groups],[true,incremental]]){
  for(const group of sets){
   if(!Array.isArray(group))return null;
   for(const row of group){
    if(++count>700000||!TICKER.test(row?.ticker)||!validDate(row?.tradeDate)||
       !Number.isFinite(row?.currentClose)||row.currentClose<=0)return null;
    if(isIncremental){
     if(row.source!=='ALPACA'||row.feed!=='iex'||
        row.adjustmentStatus!=='split'||row.asof!=='-'||
        row.symbolMappingMode!=='UNMAPPED_ASOF_DASH')return null;
    }else if(row.tradeDate>approvedThrough)return null;
    const key=row.ticker+'|'+row.tradeDate;
    if(prices.has(key)&&prices.get(key)!==row.currentClose)return null;
    prices.set(key,row.currentClose);
    if(isIncremental)unmapped.add(key);
    else baseSymbols.add(row.ticker);
   }
  }
 }
 return {prices,baseSymbols,unmapped,priceCount:count};
}

/**
 * Research-only B quality derivation from actual PIT and immutable price rows.
 * The original quality, score and early null history are never modified.
 *
 * Caller must independently audit PIT security identity, source rights and
 * price action basis; even success is not authorization to publish the rows.
 */
export function assembleR10BStoredQualityCandidate({approvedPit,officialPit,
 baseGroups=[],incrementalGroups=[],approvedDailyQuality=[],sp500Rows=[],
 approvedBHistory=null,asOfDate,identityQuarantineMode=null}={}){
 if(!validDate(asOfDate)||!validDate(approvedPit?.verifiedThrough)||
    !validDate(officialPit?.last)||officialPit.last>asOfDate||
    approvedPit.verifiedThrough>=asOfDate||
    approvedPit.verifiedThrough>=officialPit.last)
  return stop('STOP_R10_B_QUALITY_DATE_SCOPE_INVALID');
 if(!validatePIT(officialPit))return stop('STOP_R7_PIT_501_SESSION_INTEGRITY_UNVERIFIED');
 const audited=inspectR10BreadthIncremental({approvedPit,officialPit,
  baseGroups,incrementalGroups,asOfDate,identityQuarantineMode});
 if(!['CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY',
       'CANDIDATE_INPUTS_VALIDATED_AUDIT_PENDING'].includes(audited.status))
  return stop('STOP_R38_PIT_PRICE_RESEARCH_PREFLIGHT',{firstFail:audited.status});
 if(!Array.isArray(approvedDailyQuality)||!approvedDailyQuality.length||
    approvedDailyQuality.length>1200||
    approvedDailyQuality.some(row=>!validDate(row?.observationDate)||
      row.observationDate>approvedPit.verifiedThrough))
  return stop('STOP_APPROVED_DAILY_QUALITY_SCOPE_INVALID');
 const source=buildPrices(baseGroups,incrementalGroups,approvedPit.verifiedThrough);
 if(!source)return stop('STOP_ALPACA_PRICE_LINEAGE_UNVERIFIED');

 const dates=officialPit.universes.map(row=>row.tradeDate);
 const unresolved=new Set(audited.unresolvedSymbols??[]);
 const qualityNew=[];
 for(const {tradeDate,members} of officialPit.universes){
  if(tradeDate<=approvedPit.verifiedThrough||tradeDate>asOfDate)continue;
  const window=dates.filter(date=>date<=tradeDate).slice(-200);
  let valid200=0,above200=0;
  if(window.length===200){
   for(const ticker of members){
    if(unresolved.has(ticker)||priceWindowQuarantined(ticker,window))continue;
    if(!source.baseSymbols.has(ticker)&&
       !window.every(date=>source.unmapped.has(ticker+'|'+date)))continue;
    const values=window.map(date=>source.prices.get(ticker+'|'+date));
    if(values.some(value=>!Number.isFinite(value)||value<=0))continue;
    valid200++;
    const ma=values.reduce((sum,value)=>sum+value,0)/200;
    if(values.at(-1)>ma)above200++;
   }
  }
  const coverage=valid200/members.length;
  qualityNew.push({observationDate:tradeDate,members:members.length,
   valid200,above200,coverage,
   participation:coverage>=.98?above200/valid200:null});
 }
 if(!qualityNew.length)return stop('STOP_NEW_R7_PIT_QUALITY_DATES_MISSING');
 const combined=[...approvedDailyQuality,...qualityNew];
 const replay=replayStoredR10BMonthly({qualityRows:combined,sp500Rows,asOfDate,
  approvedBHistory});
 if(!['RESEARCH_B_REPLAY_BASELINE_MATCH_NOT_AUTOPROMOTABLE',
       'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE'].includes(replay.status))
  return stop('STOP_B_MONTHLY_REPLAY_OR_APPROVED_HISTORY_DRIFT',{
   firstFail:replay.status,
   firstMismatchQuarter:replay.firstMismatchQuarter??null});
 return stop(approvedBHistory===null?'RESEARCH_B_STORED_QUALITY_BASELINE_REQUIRED':
   'RESEARCH_B_STORED_QUALITY_REPLAYED_NOT_AUTOPROMOTABLE',{
  approvedThrough:approvedPit.verifiedThrough,
  officialPitCurrentDate:officialPit.currentDate,
  sourceEventDigest:officialPit.eventDigest,
  officialPitSha256:sha(officialPit),approvedPitSha256:sha(approvedPit),
  baseGroupsSha256:sha(baseGroups),incrementalGroupsSha256:sha(incrementalGroups),
  approvedQualitySha256:sha(approvedDailyQuality),
  qualityNewSha256:sha(qualityNew),
  newDailyRows:qualityNew,months:replay.months,quarters:replay.quarters,
  pairedObservationCount:replay.pairedObservationCount,
  firstScoredObservationDate:replay.firstScoredObservationDate,
  originalMemberDenominatorPreserved:true,
  unresolvedIdentitySymbols:[...unresolved].sort(),
  preflightStatus:audited.status,
  preflightOverlapChecked:audited.overlapChecked,
  nextGate:'INDEPENDENT_PIT_501_PRICE_RIGHTS_APPROVED_B_OPERATOR_REVIEW',
 });
}

export {R10_RESEARCH_IDENTITY_QUARANTINE};
