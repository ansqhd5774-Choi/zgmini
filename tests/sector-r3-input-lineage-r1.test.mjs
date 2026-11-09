import test from 'node:test';
import assert from 'node:assert/strict';
import {sectorR3InputLineage} from '../lib/score-history/sector-r3-input-lineage-r1.mjs';
import {scoreInputRebuildDecision} from '../lib/score-history/input-lineage-r1.mjs';

const IDS=['technology','communication','discretionary','industrials','financials',
 'utilities','healthcare','materials','energy','staples','realEstate'];
const source=()=>{
 const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
 return {
  version:'SECTOR-FEAR-GREED-R3-ROLLING-252-V1',
  generatedAt:'2026-11-10T00:00:00Z',
  status:'SECTOR_FEAR_GREED_R3_ROLLING_252_READY',
  approvedR1ReferenceRequirement:756,
  summary:{allReady252:true},
  sectors:Object.fromEntries(IDS.map(id=>[id,{fiveRaw:dates.map(date=>({date,score:40}))}])),
 };
};
const sign=(s,id)=>sectorR3InputLineage({source:s,sectorId:id});

test('S01 has deterministic READY signature for validated 252-row source',()=>{
 const x=sign(source());
 assert.equal(x.scoreId,'sectorR3:technology');
 assert.equal(x.eligibilityState,'READY');
 assert.equal(x.sourceCount,2);
 assert.match(x.inputSignature,/^[a-f0-9]{64}$/);
});
test('regenerating stored source metadata without input change is stable',()=>{
 const a=source(),b=source();
 b.generatedAt='2026-11-11T23:00:00Z';b.version='R2.13.32';
 b.sectors.technology.fiveRaw[0].extra='ignored';
 assert.equal(sign(a).inputSignature,sign(b).inputSignature);
});
test('S01 effective five-axis score correction changes its signature',()=>{
 const a=source(),b=source();b.sectors.technology.fiveRaw[251].score=41;
 assert.notEqual(sign(a).inputSignature,sign(b).inputSignature);
});
test('unrelated S02 score correction does not change S01 signature',()=>{
 const a=source(),b=source();b.sectors.communication.fiveRaw[251].score=41;
 assert.equal(sign(a).inputSignature,sign(b).inputSignature);
 assert.notEqual(sign(a,'communication').inputSignature,sign(b,'communication').inputSignature);
});
test('peer date misalignment blocks readiness and changes signature',()=>{
 const a=source(),b=source();b.sectors.communication.fiveRaw[251].date='2027-01-01';
 const x=sign(b);assert.equal(x.eligibilityState,'PARTIAL');
 assert.notEqual(sign(a).inputSignature,x.inputSignature);
});
test('unapproved producer state cannot satisfy eligibility',()=>{
 const b=source();b.status='UNKNOWN';
 assert.equal(sign(b).eligibilityState,'PARTIAL');
});
test('reference requirement change blocks readiness',()=>{
 const b=source();b.approvedR1ReferenceRequirement=500;
 assert.equal(sign(b).eligibilityState,'PARTIAL');
});
test('all source sectors must have 252 complete and aligned rows',()=>{
 const b=source();b.sectors.healthcare.fiveRaw.pop();
 assert.equal(sign(b).eligibilityState,'PARTIAL');
});
test('missing selected history stays missing, never synthesizes a zero',()=>{
 const b=source();delete b.sectors.technology;
 assert.equal(sign(b).eligibilityState,'PARTIAL');
});
test('new common trade date produces new logical input signature',()=>{
 const a=source(),b=source();
 for(const id of IDS){b.sectors[id].fiveRaw.shift();b.sectors[id].fiveRaw.push({date:'2025-09-10',score:40});}
 assert.notEqual(sign(a).inputSignature,sign(b).inputSignature);
});
test('previously verified unchanged signature skips only new rebuild',()=>{
 const x=sign(source());
 assert.deepEqual(scoreInputRebuildDecision(x,{...x,publicationVerified:true}),
  {required:false,reason:'UNCHANGED_EFFECTIVE_INPUT'});
 assert.equal(scoreInputRebuildDecision(x,{...x,publicationVerified:false}).required,true);
});
test('same-day corrected score is detected, not silently published',()=>{
 const a=source(),b=source();b.sectors.technology.fiveRaw[251].score=42;
 assert.deepEqual(scoreInputRebuildDecision(sign(b),{...sign(a),publicationVerified:true}),
  {required:true,reason:'EFFECTIVE_INPUT_CHANGED'});
});
test('unsupported sector identifier is not accepted',()=>{
 assert.throws(()=>sign(source(),'fake-sector'),/SECTOR_R3_UNSUPPORTED_ID/);
});
