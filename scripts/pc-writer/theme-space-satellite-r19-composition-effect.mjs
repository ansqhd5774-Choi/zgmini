// R19: PRIVATE read-only composition-change attribution of the R18 real basket.
// Same approved individual R2 scores and original NY15 source; proposed R4-A
// weights remain UNAPPROVED. No provider, price, public, D1 or scheduler writes.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSpaceVariableBasketShadow} from './theme-space-satellite-r18-variable-basket-shadow.mjs';
import {scoreRelativeThemeBasket} from './theme-optional-relative-weight-r4.mjs';

const R18_MANIFEST='1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b';
const R18_SPY='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
const R18_HISTORY='94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216';
const check=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const round=n=>Number(n.toFixed(5));
const percentile=(values,percent)=>{
 if(!values.length)return null;
 const s=[...values].sort((a,b)=>a-b);
 return round(s[Math.min(s.length-1,Math.ceil(percent*s.length)-1)]);
};
const sum=values=>values.reduce((a,b)=>a+b,0);

// Decompose each date-to-date change with a contemporaneous ETF intersection:
// Δfull = (fullNew - commonNew) + (commonNew - commonOld)
//       + (commonOld - fullOld).
// The first and last terms are membership-entry/exit effects; the middle
// contains ONLY common ETF score movements and the existing R4-A weight ramp.
// At no point is a synthetic one-ETF theme score created or published.
export function diagnoseSpaceBasketComposition({dates,symbols,timelines,
 sessionCounts,history}={}){
 check(Array.isArray(dates)&&dates.length>=2&&Array.isArray(symbols)&&
  symbols.length>=2&&new Set(symbols).size===symbols.length&&
  Array.isArray(history)&&history.length>=2,
  'R19_PRIVATE_TRACE_INVALID');
 const ix=new Map(dates.map((d,i)=>[d,i]));
 check(ix.size===dates.length&&history.every((day,i)=>day.date===dates.at(
  dates.length-history.length+i)&&Array.isArray(day.active)),
  'R19_PRIVATE_HISTORY_DATE_MISMATCH');
 const entries=Object.fromEntries(symbols.map(s=>[s,0]));
 const exits=Object.fromEntries(symbols.map(s=>[s,0]));
 let same=0,changed=0,unmatched=0,dominated=0,opposing=0;
 let recent21Changed=0;
 const attributable=[],membershipAbsolute=[],withinAbsolute=[],totalAbsolute=[],events=[];
 const scoreAt=(date,tickers)=>{
  check(tickers.length>=2,'R19_COMMON_INTERSECTION_TOO_SHORT');
  const i=ix.get(date);
  check(Number.isInteger(i),'R19_DATE_NOT_IN_SPY');
  return scoreRelativeThemeBasket({etfs:tickers.map(symbol=>{
   const cell=timelines?.[symbol]?.[i],sessions=sessionCounts?.[symbol]?.get(date);
   check(Number.isFinite(cell?.score)&&Number.isInteger(sessions)&&
    sessions>=40&&['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE'].includes(cell?.status),
    'R19_ELIGIBLE_ETF_MISSING_ACTUAL_SCORE');
   return {symbol,score:cell.score,sessions,status:cell.status};
  })}).score;
 };
 for(let i=1;i<history.length;i++){
  const old=history[i-1],now=history[i];
  if(!Number.isFinite(old.score)||!Number.isFinite(now.score)){
   unmatched++;
   continue;
  }
  const enter=now.active.filter(s=>!old.active.includes(s));
  const leave=old.active.filter(s=>!now.active.includes(s));
  const hasChange=enter.length>0||leave.length>0;
  if(hasChange){changed++;if(i>=history.length-21)recent21Changed++;}
  else same++;
  for(const ticker of enter){check(ticker in entries,'R19_UNLISTED_MEMBER');entries[ticker]++;}
  for(const ticker of leave){check(ticker in exits,'R19_UNLISTED_MEMBER');exits[ticker]++;}
  const common=old.active.filter(s=>now.active.includes(s));
  if(common.length<2){unmatched++;continue;}
  const fullOld=scoreAt(old.date,old.active);
  const fullNow=scoreAt(now.date,now.active);
  const commonOld=scoreAt(old.date,common);
  const commonNow=scoreAt(now.date,common);
  const before=commonOld-fullOld,after=fullNow-commonNow;
  const membership=before+after,within=commonNow-commonOld;
  const delta=fullNow-fullOld;
  check(Math.abs(membership+within-delta)<1e-9&&
   Math.abs(fullOld-old.score)<.00002&&
   Math.abs(fullNow-now.score)<.00002,
   'R19_R18_SCORE_OR_ATTRIBUTION_MISMATCH');
  check(!hasChange?(Math.abs(membership)<1e-9):true,
   'R19_UNCHANGED_MEMBER_NONZERO_COMPOSITION');
  attributable.push({from:old.date,to:now.date,
   entrance:enter,exit:leave,membership,within,delta});
  membershipAbsolute.push(Math.abs(membership));
  withinAbsolute.push(Math.abs(within));
  totalAbsolute.push(Math.abs(delta));
  if(hasChange&&Math.abs(membership)>Math.abs(within))dominated++;
  if(membership*within<0)opposing++;
  if(hasChange)events.push({from:old.date,to:now.date,
   entrants:enter,exits:leave,membershipEffect:round(membership),
   sameMemberMovement:round(within),totalChange:round(delta),
   absoluteMembershipEffect:Math.abs(membership)});
 }
 events.sort((a,b)=>b.absoluteMembershipEffect-a.absoluteMembershipEffect||
  a.to.localeCompare(b.to));
 const top=events.slice(0,8).map(({absoluteMembershipEffect,...rest})=>rest);
 return {displayDays:history.length,adjacentPairs:history.length-1,
  attributablePairs:attributable.length,unattributablePairs:unmatched,
  compositionChangePairs:changed,unchangedMemberPairs:same,
  recent21CompositionChanges:recent21Changed,
  membershipDominatesChangePairs:dominated,
  opposingMembershipVsCommonPairs:opposing,
  totalAbsoluteDayChange:round(sum(totalAbsolute)),
  totalAbsoluteMembershipEffect:round(sum(membershipAbsolute)),
  totalAbsoluteCommonMemberMovement:round(sum(withinAbsolute)),
  membershipEffectAbsMedian:percentile(membershipAbsolute,.5),
  membershipEffectAbsP90:percentile(membershipAbsolute,.9),
  membershipEffectAbsMax:membershipAbsolute.length?round(Math.max(...membershipAbsolute)):null,
  entriesByTicker:entries,exitsByTicker:exits,
  largestCompositionEvents:top,
  note:'Attribution is algebraic per adjacent date, NOT a change to live scores'};
}

export function runSpaceBasketCompositionAudit({dataRoot,
 r18Audit=runSpaceVariableBasketShadow,
 expectedHistory=R18_HISTORY,expectedManifest=R18_MANIFEST,
 expectedSpy=R18_SPY}={}){
 const r18=r18Audit({dataRoot,includePrivateTrace:true});
 check(r18?.report==='SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW'&&
  r18.sourceManifestSha256===expectedManifest&&
  r18.sharedSpyManifestSha256===expectedSpy&&
  r18.shadowHistorySha256===expectedHistory&&
  r18.last252DisplayDays===252&&r18.candidateCount===9,
  'R19_R18_SOURCE_OR_HISTORY_CHANGED');
 const t=r18.privateTrace;
 check(t&&t.history.length===r18.last252DisplayDays&&
  t.symbols.length===r18.candidateCount&&
  r18.latestPrivateProposal?.date===t.history.at(-1)?.date,
  'R19_INTERNAL_R18_TRACE_MISSING');
 const diag=diagnoseSpaceBasketComposition(t);
 check(diag.attributablePairs+diag.unattributablePairs===diag.adjacentPairs,
  'R19_ADJACENT_PAIR_ACCOUNTING_FAILED');
 return {report:'SPACE_SATELLITE_R19_PC_PRIVATE_COMPOSITION_EFFECT',
  status:'PRIVATE_R4_A_COMPOSITION_DIAGNOSTIC_NOT_RELEASE_AUTHORIZED',
  sourceManifestSha256:expectedManifest,sharedSpyManifestSha256:expectedSpy,
  priorShadowHistorySha256:expectedHistory,
  benchmarkLastDate:r18.benchmarkLastDate,
  candidateCount:r18.candidateCount,
  currentlyScoredEtfs:r18.independentlyCurrentScored,
  latestScore:r18.latestPrivateProposal.score,
  latestContributingEtfs:r18.latestPrivateProposal.contributingEtfs,
  methodology:'TWO_DATE_COMMON_MEMBER_SCORE_AND_MEMBERSHIP_DECOMPOSITION',
  ...diag,
  compositionCorrectedPublicScore:null,originalPricesChanged:false,
  weightsApproved:false,rightsVerified:false,finalBasketSelected:false,
  publicationAuthorized:false,providerCalls:0,rawFilesWritten:0,
  publicWrites:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit')
  console.log('READ_ONLY_DEFAULT: --audit; output is private diagnostic only.');
 else try{console.log(JSON.stringify(runSpaceBasketCompositionAudit({
  dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'}),null,2));}
 catch(e){console.error(JSON.stringify({
  report:'SPACE_SATELLITE_R19_PC_PRIVATE_COMPOSITION_EFFECT',
  status:'BLOCKED',reason:e.code??String(e.message??e).slice(0,95),
  providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;}
}
