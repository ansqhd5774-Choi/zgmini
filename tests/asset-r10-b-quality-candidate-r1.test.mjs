import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {assembleR10BStoredQualityCandidate,R10_RESEARCH_IDENTITY_QUARANTINE}
 from '../scripts/pc-writer/asset-r10-b-quality-candidate-r1.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify([...value].sort())).digest('hex');
const sessions=(start,end)=>{
 const result=[];
 for(let cursor=new Date(start+'T00:00:00Z');
  cursor.toISOString().slice(0,10)<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
  const d=cursor.toISOString().slice(0,10);
  if(d!=='2025-01-09'&&isMarketSession(d))result.push(d);
 }
 return result;
};
const names=Array.from({length:488},(_,i)=>'T'+String(i).padStart(4,'0'));
const priced=[...names,'HON'];
const approvedMembers=[...priced,'PSKY'],officialMembers=[...priced,'SKYD'];
const allSessions=sessions('2024-01-01','2026-09-30').slice(-520);
const approvedThrough='2026-06-30';
assert.equal(allSessions.at(-1),'2026-09-30');
assert.ok(allSessions.includes(approvedThrough));
const firstNewIndex=allSessions.findIndex(x=>x>approvedThrough);
const startPriceIndex=firstNewIndex-199;
assert.ok(startPriceIndex>=0);

function fixture(){
 const officialPit={status:'READY',membershipLookAheadSafe:true,
  currentUniverseSurvivorshipBiasRemoved:true,publicMutation:false,
  eventDigest:'a'.repeat(64),targetSessions:520,
  first:allSessions[0],last:allSessions.at(-1),currentDate:allSessions.at(-1),
  currentMemberHash:hash(officialMembers),
  universes:allSessions.map(tradeDate=>({tradeDate,
   members:officialMembers,memberCount:490}))};
 const approvedPit={verifiedThrough:approvedThrough,eligibleUniverses:[
  {tradeDate:approvedThrough,members:approvedMembers,memberCount:490}]};
 const prices=[],future=[];
 for(let n=startPriceIndex;n<allSessions.length;n++){
  const date=allSessions[n],target=date<=approvedThrough?prices:future;
  for(let i=0;i<priced.length;i++){
   const row={ticker:priced[i],tradeDate:date,
    currentClose:100+0.02*n+0.001*i};
   target.push(date>approvedThrough?{...row,source:'ALPACA',feed:'iex',
    adjustmentStatus:'split',asof:'-',symbolMappingMode:'UNMAPPED_ASOF_DASH'}:row);
  }
 }
 const approvedDailyQuality=sessions('2024-09-03',approvedThrough).map(observationDate=>({
  observationDate,members:490,valid200:488,above200:488,
  coverage:488/490,participation:1,
 }));
 const sp500Rows=sessions('2023-08-01','2026-09-30')
  .map((observationDate,i)=>({observationDate,value:3000+0.68*i+30*Math.sin(i/23)}));
 return {approvedPit,officialPit,baseGroups:[prices],
  incrementalGroups:[future],approvedDailyQuality,sp500Rows,
  asOfDate:'2026-10-02',
  identityQuarantineMode:R10_RESEARCH_IDENTITY_QUARANTINE};
}
let shared=null,baseline=null;
const raw=()=>shared??=fixture();
const candidate=()=>baseline??=assembleR10BStoredQualityCandidate(raw());
const assess=x=>assembleR10BStoredQualityCandidate(x);

function readOnly(r){
 assert.equal(r.readOnly,true);assert.equal(r.canPromote,false);
 assert.equal(r.productionEligible,false);
 for(const key of ['providerCalls','approvedInputWrites','sqliteWrites',
  'd1Writes','releaseWrites','coreTaskChanges','lockPidActions'])assert.equal(r[key],0);
}
test('stored R7 PIT and Alpaca base+incremental assemble actual daily 200MA quality, then R41 252-pair B',()=>{
 const x=raw(),oldLast=x.approvedDailyQuality.at(-1);
 const result=candidate();readOnly(result);
 assert.equal(result.status,'RESEARCH_B_STORED_QUALITY_BASELINE_REQUIRED');
 assert.equal(result.preflightStatus,'CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY');
 assert.equal(result.originalMemberDenominatorPreserved,true);
 assert.deepEqual(result.unresolvedIdentitySymbols,['SKYD']);
 assert.ok(result.newDailyRows.length>60);
 assert.equal(result.newDailyRows[0].observationDate,allSessions[firstNewIndex]);
 assert.equal(result.newDailyRows[0].members,490);
 assert.equal(result.newDailyRows[0].valid200,488);
 assert.equal(result.newDailyRows[0].above200,488);
 assert.equal(result.newDailyRows[0].coverage,488/490);
 assert.equal(result.newDailyRows[0].participation,1);
 assert.equal(result.quarters.find(x=>x.quarter==='2026-Q3').status,'READY');
 assert.equal(result.quarters.find(x=>x.quarter==='2025-Q2').breadthDivergence,null);
 assert.equal(result.quarters.find(x=>x.quarter==='2025-Q3').breadthDivergence,null);
 assert.deepEqual(x.approvedDailyQuality.at(-1),oldLast);
 assert.match(result.qualityNewSha256,/^[a-f0-9]{64}$/);
});

test('exact approved early null + prior quarter history may be checked without automatic promotion',()=>{
 const x=raw(),initial=candidate();
 const approvedBHistory=initial.quarters.filter(q=>q.quarter>='2025-Q2'&&q.quarter<='2026-Q2')
  .map(({quarter,breadthDivergence})=>({quarter,breadthDivergence}));
 const r=assess({...x,approvedBHistory});readOnly(r);
 assert.equal(r.status,'RESEARCH_B_STORED_QUALITY_REPLAYED_NOT_AUTOPROMOTABLE');
 assert.equal(r.quarters.find(x=>x.quarter==='2026-Q3').status,'READY');
});

test('ordinary mode never silently substitutes PSKY for SKYD',()=>{
 const x=raw(),r=assess({...x,identityQuarantineMode:null});
 readOnly(r);
 assert.equal(r.status,'STOP_R38_PIT_PRICE_RESEARCH_PREFLIGHT');
 assert.equal(r.firstFail,'PIT_OVERLAP_MEMBERSHIP_DRIFT');
});

test('R7 source fewer than 501 sessions or missing an internal actual market session cannot proceed',()=>{
 const x=raw();
 const incomplete={...x.officialPit,targetSessions:500,first:allSessions[20],
  universes:x.officialPit.universes.slice(20)};
 assert.equal(assess({...x,officialPit:incomplete}).status,
  'STOP_R7_PIT_501_SESSION_INTEGRITY_UNVERIFIED');
 const missing=[...x.officialPit.universes];
 missing.splice(200,1);
 const skip={...x.officialPit,targetSessions:519,universes:missing};
 assert.equal(assess({...x,officialPit:skip}).status,
  'STOP_R7_PIT_501_SESSION_INTEGRITY_UNVERIFIED');
});

test('future R7 PIT cannot masquerade as an as-of research candidate',()=>{
 const x=raw();
 const future=assess({...x,asOfDate:'2026-09-01'});
 readOnly(future);
 assert.equal(future.status,'STOP_R10_B_QUALITY_DATE_SCOPE_INVALID');
 const approvedBeyondOfficial={...x.approvedPit,verifiedThrough:'2026-10-01'};
 assert.equal(assess({...x,approvedPit:approvedBeyondOfficial,asOfDate:'2026-11-02'}).status,
  'STOP_R10_B_QUALITY_DATE_SCOPE_INVALID');
});

test('wrong Alpaca asof mapping is rejected before any derived B publication input exists',()=>{
 const x=raw();
 const changed=[...x.incrementalGroups[0]];
 changed[0]={...changed[0],asof:'2026-09-30'};
 const r=assess({...x,incrementalGroups:[changed]});
 readOnly(r);
 assert.equal(r.status,'STOP_ALPACA_PRICE_LINEAGE_UNVERIFIED');
 assert.equal(r.newDailyRows,undefined);
});

test('missing 200MA member coverage cannot reduce 490-stock denominator to a fabricated 98%',()=>{
 const x=raw(),changed=x.incrementalGroups[0].filter(row=>
  row.tradeDate!=='2026-09-30'||!names.slice(0,11).includes(row.ticker));
 const r=assess({...x,incrementalGroups:[changed]});
 readOnly(r);
 assert.equal(r.status,'STOP_R38_PIT_PRICE_RESEARCH_PREFLIGHT');
 assert.equal(r.firstFail,'PIT_PRICE_200MA_COVERAGE_INSUFFICIENT');
});

test('original approved quality cannot contain unapproved future daily rows',()=>{
 const x=raw();
 const changed=[...x.approvedDailyQuality,
  {...x.approvedDailyQuality.at(-1),observationDate:'2026-07-01'}];
 assert.equal(assess({...x,approvedDailyQuality:changed}).status,
  'STOP_APPROVED_DAILY_QUALITY_SCOPE_INVALID');
});

test('manufactured early quarter value or changed approved B score stops independent replay',()=>{
 const x=raw(),initial=candidate();
 const approvedBHistory=initial.quarters.filter(q=>q.quarter>='2025-Q2'&&q.quarter<='2026-Q2')
  .map(({quarter,breadthDivergence})=>({quarter,breadthDivergence}));
 const early=structuredClone(approvedBHistory);early[0].breadthDivergence=12;
 const r=assess({...x,approvedBHistory:early});
 assert.equal(r.status,'STOP_B_MONTHLY_REPLAY_OR_APPROVED_HISTORY_DRIFT');
 assert.equal(r.firstFail,'STOP_APPROVED_B_QUARTER_REPLAY_DRIFT');
});
