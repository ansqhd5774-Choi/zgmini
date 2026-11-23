import test from 'node:test';
import assert from 'node:assert/strict';
import {shadowPaidAumPit} from './theme-paid-aum-pit-shadow.mjs';

const symbols=['IGV','XSW','AIQ'];
const candidates=[
 {ticker:'IGV',aumAsOf:'2025-03-31',firstAvailableDate:'2025-06-05',aumUsd:9466950686,sourceUrl:'https://www.sec.gov/igv'},
 {ticker:'XSW',aumAsOf:'2025-06-30',firstAvailableDate:'2025-09-08',aumUsd:499422848,sourceUrl:'https://www.sec.gov/xsw'},
 {ticker:'AIQ',aumAsOf:'2025-05-31',firstAvailableDate:'2025-08-01',aumUsd:3209293808,sourceUrl:'https://www.sec.gov/aiq'}
];
const points=Object.fromEntries(symbols.map((ticker,i)=>[ticker,[
 {date:'2025-06-04',score:50+i,realSessionCount:80,status:'ADAPTIVE_PROVISIONAL'},
 {date:'2025-09-05',score:50+i,realSessionCount:80,status:'ADAPTIVE_PROVISIONAL'},
 {date:'2025-09-08',score:50+i,realSessionCount:80,status:'ADAPTIVE_PROVISIONAL'},
 {date:'2026-10-30',score:50+i,realSessionCount:400,status:'R188_COMPATIBLE'}
]]));
const baseline=[{date:'2026-11-02',score:61.23},{date:'2026-11-03',score:61.24}];
const args={symbols,officialCandidates:candidates,scoreBySymbol:points,
 dates:['2025-06-04','2025-09-05','2025-09-08','2026-10-30','2026-11-02','2026-11-03'],
 transitionDate:'2026-11-02',existingHistory:baseline};
test('PIT first public dates gate old official rows; original post-transition points unchanged',()=>{
 const result=shadowPaidAumPit(args);
 assert.equal(result.status,'SHADOW_ONLY_NOT_APPROVED_FOR_PUBLICATION');
 assert.deepEqual(result.candidateHistory.map(x=>x.contributorCount),[0,2,3,3]);
 assert.equal(result.candidateHistory[0].score,null);
 assert.equal(result.additionalScoredDates,3);
 assert.deepEqual(result.existingHistory,baseline);
 assert.equal(result.existingHistoryUnchanged,true);
 assert.equal(result.providerCalls,0);
 assert.equal(result.operationalWrites,0);
 assert.equal(result.d1Writes,0);
});
test('missing 40 real sessions or missing score stays missing, never filled',()=>{
 const pointCopy=structuredClone(points);
 pointCopy.IGV[2].realSessionCount=39;
 pointCopy.XSW[2].score=null;
 pointCopy.AIQ[2].status='INSUFFICIENT_REAL_OBSERVATIONS';
 const result=shadowPaidAumPit({...args,scoreBySymbol:pointCopy});
 assert.equal(result.candidateHistory.find(x=>x.date==='2025-09-08').score,null);
 assert.equal(result.additionalScoredDates,2);
});
test('reject invalid disclosed evidence, nonmonotonic dates and baseline before transition',()=>{
 assert.throws(()=>shadowPaidAumPit({...args,officialCandidates:[{...candidates[0],firstAvailableDate:'2025-03-01'}]}),
  {message:'PIT_SHADOW_EVIDENCE_INVALID'});
 assert.throws(()=>shadowPaidAumPit({...args,dates:['2026-10-30','2025-09-08']}),{message:'PIT_SHADOW_INPUT_INVALID'});
 assert.throws(()=>shadowPaidAumPit({...args,existingHistory:[{date:'2026-10-30',score:40}]}),
  {message:'PIT_SHADOW_BASELINE_INVALID'});
});
