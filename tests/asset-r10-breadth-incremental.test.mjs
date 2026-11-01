import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {inspectR10BreadthIncremental} from '../scripts/pc-writer/asset-r10-breadth-incremental.mjs';

const members=Array.from({length:490},(_,i)=>'T'+String(i).padStart(4,'0'));
const memberHash=list=>createHash('sha256').update(JSON.stringify([...list].sort())).digest('hex');
const days=[];
for(let day=new Date('2026-01-01T00:00:00Z');day.toISOString().slice(0,10)<='2026-10-30';day.setUTCDate(day.getUTCDate()+1)){
 const date=day.toISOString().slice(0,10);
 if(isMarketSession(date))days.push(date);
}
const sessions=days.slice(-205);
assert.ok(sessions.includes('2026-09-30'));
assert.equal(sessions.at(-1),'2026-10-30');
const approvedPit={verifiedThrough:'2026-09-30',eligibleUniverses:[{tradeDate:'2026-09-30',members}]};
const officialPit={
 status:'READY',membershipLookAheadSafe:true,currentUniverseSurvivorshipBiasRemoved:true,publicMutation:false,
 eventDigest:'a'.repeat(64),first:sessions[0],last:'2026-10-30',currentDate:'2026-10-30',
 currentMemberHash:memberHash(members),
 universes:sessions.map(tradeDate=>({tradeDate,members,memberCount:490})),
};
const allRows=sessions.flatMap(tradeDate=>members.map(ticker=>({ticker,tradeDate,currentClose:100})));
const oldRows=allRows.filter(row=>row.tradeDate<='2026-09-30');
const newRows=allRows.filter(row=>row.tradeDate>'2026-09-30').map(row=>({...row,source:'ALPACA',feed:'iex',adjustmentStatus:'split'}));
const subject={approvedPit,officialPit,baseGroups:[oldRows],incrementalGroups:[newRows],asOfDate:'2026-11-01'};

test('approved historical memberships and existing price inputs are only inspected, never promoted or mutated',()=>{
 const old=JSON.stringify(approvedPit),official=JSON.stringify(officialPit),base=JSON.stringify(oldRows),inc=JSON.stringify(newRows);
 const result=inspectR10BreadthIncremental(subject);
 assert.equal(result.status,'CANDIDATE_INPUTS_VALIDATED_AUDIT_PENDING');
 assert.equal(result.productionEligible,false);
 assert.equal(result.canPromote,false);
 assert.equal(result.overlapChecked,1);
 assert.deepEqual(result.candidateRows,[{observationDate:'2026-10-30',memberCount:490,valid200:490,coverage:1}]);
 assert.equal(JSON.stringify(approvedPit),old);
 assert.equal(JSON.stringify(officialPit),official);
 assert.equal(JSON.stringify(oldRows),base);
 assert.equal(JSON.stringify(newRows),inc);
});

test('future official memberships cannot silently change an already approved overlapping date',()=>{
 const changed={...officialPit,universes:officialPit.universes.map(row=>row.tradeDate==='2026-09-30'?{
  ...row,members:[...members.slice(0,-1),'DRIFT'],
 }:row)};
 const result=inspectR10BreadthIncremental({...subject,officialPit:changed});
 assert.equal(result.status,'PIT_OVERLAP_MEMBERSHIP_DRIFT');
 assert.equal(result.firstMismatchDate,'2026-09-30');
 assert.equal(result.canPromote,false);
});

test('a new index addition without 200-day stored Alpaca backfill is blocked',()=>{
 const future=[...members.slice(0,-1),'NEW'];
 const changed={...officialPit,currentMemberHash:memberHash(future),universes:officialPit.universes.map(row=>row.tradeDate>'2026-09-30'?{
  ...row,members:future,
 }:row)};
 const result=inspectR10BreadthIncremental({...subject,officialPit:changed});
 assert.equal(result.status,'PIT_NEW_SYMBOL_BACKFILL_REQUIRED');
 assert.deepEqual(result.missingSymbols,['NEW']);
 assert.equal(result.canPromote,false);
});

test('a new incremental price that conflicts with an immutable existing record blocks promotion',()=>{
 const changed=[...newRows,{...oldRows[0],currentClose:101,source:'ALPACA',feed:'iex',adjustmentStatus:'split'}];
 const result=inspectR10BreadthIncremental({...subject,incrementalGroups:[changed]});
 assert.equal(result.status,'ALPACA_PRICE_CONFLICT');
 assert.equal(result.canPromote,false);
});

test('an incomplete current month is never treated as a valid month end',()=>{
 const result=inspectR10BreadthIncremental({...subject,asOfDate:'2026-10-20'});
 assert.equal(result.status,'NO_NEW_COMPLETED_MONTHS');
 assert.equal(result.canPromote,false);
});

test('research-only PIT without the official verification flags is rejected',()=>{
 const result=inspectR10BreadthIncremental({...subject,officialPit:{...officialPit,membershipLookAheadSafe:false}});
 assert.equal(result.status,'OFFICIAL_PIT_NOT_VERIFIED');
 assert.equal(result.canPromote,false);
});

const newMemberUniverse=[...members.slice(0,-1),'NEW'];
const newMemberPit={...officialPit,currentMemberHash:memberHash(newMemberUniverse),
 universes:officialPit.universes.map(row=>row.tradeDate>'2026-09-30'?{
  ...row,members:newMemberUniverse,
 }:row)};
const newMember200=sessions.slice(-200).map(tradeDate=>({ticker:'NEW',tradeDate,currentClose:100,
 source:'ALPACA',feed:'iex',adjustmentStatus:'split',asof:'-',symbolMappingMode:'UNMAPPED_ASOF_DASH'}));
const withNewMember=rows=>inspectR10BreadthIncremental({...subject,officialPit:newMemberPit,
 incrementalGroups:[newRows,rows]});

test('new member full 200-session explicit unmapped Alpaca backfill is research-only',()=>{
 const result=withNewMember(newMember200);
 assert.equal(result.status,'CANDIDATE_INPUTS_VALIDATED_AUDIT_PENDING');
 assert.equal(result.candidateRows[0].coverage,1);
 assert.equal(result.productionEligible,false);
 assert.equal(result.canPromote,false);
});

test('new member one historical price missing remains blocked',()=>{
 const result=withNewMember(newMember200.slice(1));
 assert.equal(result.status,'PIT_NEW_SYMBOL_BACKFILL_REQUIRED');
 assert.equal(result.canPromote,false);
});

test('new member 200 rows without unmapped asof provenance remain blocked',()=>{
 const rows=newMember200.map(({asof,symbolMappingMode,...row})=>row);
 const result=withNewMember(rows);
 assert.equal(result.status,'PIT_NEW_SYMBOL_ASOF_PROVENANCE_REQUIRED');
 assert.equal(result.canPromote,false);
});

test('equal-price mapped duplicate does not launder new member asof provenance',()=>{
 const mapped={...newMember200[0],asof:'2026-11-01'};
 const result=withNewMember([...newMember200,mapped]);
 assert.equal(result.status,'PIT_NEW_SYMBOL_ASOF_PROVENANCE_REQUIRED');
 assert.equal(result.canPromote,false);
});
