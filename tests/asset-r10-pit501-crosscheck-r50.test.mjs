import test from 'node:test';
import assert from 'node:assert/strict';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {crosscheckR10Pit501ReadOnly} from '../scripts/pc-writer/asset-r10-pit501-crosscheck-r50.mjs';

// Synthetic membership fixtures only. They are NOT S&P DJI constituent data,
// provider records, source-rights evidence or publication authorization.
const marketDate=d=>d!=='2025-01-09'&&isMarketSession(d);
const dates=()=>{
  const out=[];
  for(let t=Date.parse('2024-10-01T00:00:00Z');out.length<501;t+=86400000){
    const d=new Date(t).toISOString().slice(0,10);
    if(marketDate(d))out.push(d);
  }
  return out;
};
const members=Array.from({length:500},(_,i)=>'Z'+String(i).padStart(4,'0'));
function fixture(){
  const all=dates();
  const original=all.map(tradeDate=>({tradeDate,members:[...members],memberCount:500}));
  const officialPit={status:'READY',membershipLookAheadSafe:true,
    currentUniverseSurvivorshipBiasRemoved:true,publicMutation:false,
    eventDigest:'a'.repeat(64),targetSessions:501,
    first:all[0],last:all.at(-1),currentDate:all.at(-1),
    universes:original};
  return {officialPit,independentSourceRows:structuredClone(original),
    asOfDate:'2026-11-02'};
}
const run=input=>crosscheckR10Pit501ReadOnly(input);
const status=input=>run(input).status;

test('501 trading sessions match as sets, but two copies still STOP without independent source authentication',()=>{
  const input=fixture(),untouched=structuredClone(input);
  input.independentSourceRows[200].members.reverse();
  const report=run(input);
  assert.equal(report.status,'STOP_INDEPENDENT_PIT_SOURCE_AUTHENTICATION_MISSING');
  assert.equal(report.comparedSessions,501);
  assert.equal(report.approvedSha256,report.independentSha256);
  assert.equal(report.sourceIndependenceAuthenticated,false);
  assert.equal(report.canPromote,false);
  assert.equal(report.productionEligible,false);
  assert.equal(report.readOnly,true);
  for(const key of ['providerCalls','sqliteWrites','approvedInputWrites',
    'releaseWrites','d1Writes','taskChanges'])assert.equal(report[key],0);
  assert.deepEqual(input.officialPit,untouched.officialPit);
});

test('forged independent source names, signatures and operator approval cannot authorize promotion',()=>{
  const input=fixture();
  input.independentSourceName='S_AND_P_DJI_OFFICIAL';
  input.independentSourceDate='2026-11-02';
  input.operatorApproved=true;
  input.detachedSignature='FAKE';
  const report=run(input);
  assert.equal(report.status,'STOP_INDEPENDENT_PIT_SOURCE_AUTHENTICATION_MISSING');
  assert.equal(report.sourceIndependenceAuthenticated,false);
  assert.equal(report.canPromote,false);
  assert.equal(report.d1Writes,0);
});

test('ticker rename or one-member substitution is never silently normalized',()=>{
  const input=fixture();
  input.independentSourceRows[300].members[0]='SKYD';
  const report=run(input);
  assert.equal(report.status,'STOP_PIT501_MEMBERSHIP_OR_IDENTITY_MISMATCH');
  assert.equal(report.mismatchCount,1);
  assert.equal(report.canPromote,false);
});

test('missing member and duplicate ticker in independent PIT are rejected',()=>{
  const a=fixture();a.independentSourceRows[5].members.pop();
  assert.equal(status(a),'STOP_INDEPENDENT_WITNESS_501_SESSION_INVALID');
  const b=fixture();b.independentSourceRows[5].members[0]=b.independentSourceRows[5].members[1];
  assert.equal(status(b),'STOP_INDEPENDENT_WITNESS_501_SESSION_INVALID');
});

test('501-day requirement and exact date sequence cannot be bypassed',()=>{
  const a=fixture();a.independentSourceRows.pop();
  assert.equal(status(a),'STOP_INDEPENDENT_WITNESS_501_SESSION_INVALID');
  const b=fixture();b.independentSourceRows[150].tradeDate='2025-01-09';
  assert.equal(status(b),'STOP_INDEPENDENT_WITNESS_501_SESSION_INVALID');
  const c=fixture();c.independentSourceRows[200].tradeDate=c.independentSourceRows[199].tradeDate;
  assert.equal(status(c),'STOP_INDEPENDENT_WITNESS_501_SESSION_INVALID');
});

test('official source shape and event lineage cannot be invented',()=>{
  const a=fixture();a.officialPit.eventDigest='FAKE';
  assert.equal(status(a),'STOP_R7_PIT_SOURCE_SHAPE_INVALID');
  const b=fixture();b.officialPit.targetSessions=500;
  assert.equal(status(b),'STOP_R7_PIT_SOURCE_SHAPE_INVALID');
  const c=fixture();c.officialPit.membershipLookAheadSafe=false;
  assert.equal(status(c),'STOP_R7_PIT_SOURCE_SHAPE_INVALID');
});

test('future observation and invalid as-of are not accepted',()=>{
  const a=fixture();a.asOfDate='2025-01-01';
  assert.equal(status(a),'STOP_PIT501_FUTURE_OBSERVATION');
  const b=fixture();b.asOfDate='bogus';
  assert.equal(status(b),'STOP_PIT501_ASOF_DATE_INVALID');
});
