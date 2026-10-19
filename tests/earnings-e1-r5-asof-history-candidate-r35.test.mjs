import test from 'node:test';
import assert from 'node:assert/strict';
import {
 buildEarningsAsOfHistoryCandidate as candidate,
 E1_R5_ASOF_HISTORY_BASIS as basis,
 E1_R5_ASOF_HISTORY_IDS as ids,
 E1_R5_ASOF_HISTORY_SOURCE_VERSION as version,
} from '../lib/market-score/earnings-e1-r5-asof-history-candidate.mjs';

const storedAt='2026-10-16T21:24:31.000Z';
const anchors=['2025-12-01','2026-03-05','2026-06-05','2026-09-04','2026-10-19'];
function sample(id,values=[1,2,3,4,5]){
 return {id,asOfDate:'2026-10-19',currentValue:values.at(-1),
  observations:anchors.map((date,i)=>({date,value:values[i]})),sourceVersion:version,sourceStoredAt:storedAt};
}
test('11 approved draft candidates preserve prior/current and dates as AS-OF, not source periods',()=>{
 assert.equal(ids.length,11);
 for(const id of ids){
  const row=candidate(sample(id));
  assert.ok(row,`missing ${id}`);
  assert.equal(row.id,id);
  assert.equal(row.basis,basis);
  assert.deepEqual(row.current,{evaluationAsOfDate:'2026-10-19',value:5});
  assert.deepEqual(row.previous,{evaluationAsOfDate:'2026-09-04',value:4});
  assert.equal(row.history1Y.length,5);
  assert.equal(row.sourceVersion,version);
  assert.equal(row.sourceStoredAt,storedAt);
  assert.equal('sourcePeriodEnd' in row,false);
  assert.equal('releaseDate' in row,false);
 }
});
test('S12 normalized composite uses its stored score semantics, not CFO raw values',()=>{
 const score=candidate(sample('S12',[35,43,52,65,73.5]));
 assert.equal(score.current.value,73.5);
 assert.equal(score.previous.value,65);
 assert.equal(candidate(sample('S12',[35,43,52,65,101])),null);
 assert.equal(candidate(sample('S12',[35,43,52,65,-1])),null);
});
test('S10 and S13 allow valid negative raw values; do not treat missing as zero',()=>{
 assert.equal(candidate(sample('S10',[-2,-1,0,0.5,-0.5])).current.value,-0.5);
 assert.equal(candidate(sample('S13',[-0.9,-0.3,0,0.2,-0.1])).previous.value,0.2);
 assert.equal(candidate(sample('S10',[-2,-1,null,0.5,-0.5])),null);
});
test('reject contradictory current point, duplicate/nonchronological/missing/malformed dates',()=>{
 const a=sample('S1');
 assert.equal(candidate({...a,currentValue:4.9}),null);
 assert.equal(candidate({...a,observations:[...a.observations.slice(0,4),{date:'2026-10-18',value:5}]}),null);
 assert.equal(candidate({...a,observations:[...a.observations.slice(0,3),a.observations[2],a.observations[4]]}),null);
 assert.equal(candidate({...a,observations:[...a.observations.slice(0,2),{date:'2026-02-31',value:3},...a.observations.slice(3)]}),null);
 assert.equal(candidate({...a,observations:[]}),null);
 assert.equal(candidate({...a,observations:[a.observations.at(-1)]}),null);
});
test('reject unsupported ID, stale/mixed provenance and outside-one-year observations',()=>{
 assert.equal(candidate(sample('S6')),null);
 assert.equal(candidate(sample('S11')),null);
 assert.equal(candidate({...sample('S1'),sourceVersion:'UNVERIFIED'}),null);
 assert.equal(candidate({...sample('S1'),sourceStoredAt:'NOT_A_DATE'}),null);
 assert.equal(candidate({...sample('S1'),observations:[{date:'2024-12-01',value:1},...sample('S1').observations]}),null);
});
test('return a sanitized numeric/date series only, never echo extra company or file data',()=>{
 const base=sample('S2');
 base.observations[0].companyFacts={SECRET:'not a public output'};
 const row=candidate(base);
 assert.ok(row);
 assert.equal(JSON.stringify(row).includes('SECRET'),false);
});
