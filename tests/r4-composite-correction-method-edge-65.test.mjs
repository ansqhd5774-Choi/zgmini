import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMAIN_WEIGHTS,COMPOSITE_MODEL_VERSION,buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {
 COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified,mergeCompositeObservedDay,
} from '../lib/composite-observed-history-r1.mjs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';

// W06 R4 #65: characterization of ACTIVE functions only, using synthetic
// 12-domain inputs. NOT an approval to change the Writer's 15m sampling,
// publication schema, CM-R1 weights, methodology or live PC operation.
const day='2026-11-16';
const at=hhmm=>Date.parse(day+'T'+hhmm+':00.000Z');
const iso=hhmm=>new Date(at(hhmm)).toISOString();
const rows=()=>DOMAIN_WEIGHTS.map(spec=>({
 id:spec.id,status:'READY',score:50,
 asOfDate:day,
 methodologyVersion:spec.id==='credit'?'CREDIT-R1':null,
 trend:[{label:'2026-11-15',value:50},{label:day,value:50}],
}));
const current=(domains=rows(),clock='12:00')=>({
 status:'SUCCESS',asOfDate:day,
 ...buildCompositeMarketScore(domains,{updatedAt:iso(clock)}),
});
const sample=(body,clock)=>compositeSampleFromVerified(body,at(clock));
const firstArchive=body=>mergeCompositeObservedDay(null,day,sample(body,'12:00')).body;
const creditVersion=(value)=>rows().map(d=>
 d.id==='credit'?{...d,methodologyVersion:value}:d
);
const rateCorrection=(value)=>rows().map(d=>
 d.id==='rates'?{...d,score:value,trend:[{label:'2026-11-15',value:50},{label:day,value}]}:d
);
const daily=[{label:'2026-11-15',value:50},{label:day,value:50}];

test('CM-R1 edge cases use 12 approved actual weighted domains, not a replacement calculator',()=>{
 assert.equal(COMPOSITE_MODEL_VERSION,'CM-R1');
 assert.equal(DOMAIN_WEIGHTS.length,12);
 assert.equal(DOMAIN_WEIGHTS.reduce((sum,x)=>sum+x.weight,0),100);
 const result=current();
 assert.equal(result.overall.status,'READY');
 assert.equal(result.overall.score,50);
 assert.equal(result.dataQuality.reweighted,false);
});

test('identical score and source signature cannot create an unobserved flat point at +5m or +20m',()=>{
 const original=current(),archived=firstArchive(original);
 for(const clock of ['12:05','12:20']){
  const replay=sample(current(rows(),clock),clock);
  assert.equal(replay.signature,archived.points[0].signature);
  const merged=mergeCompositeObservedDay(archived,day,replay);
  assert.equal(merged.changed,false);
  assert.deepEqual(merged.body,archived);
 }
 const rendered=mergeCompositeObservedDisplay(daily,[{label:iso('12:00'),value:50}],1,
  {label:iso('12:20'),value:50,boundToPublishedCard:true});
 assert.deepEqual(rendered.map(p=>p.value),[50]);
});

test('a true numeric zero remains an eligible score, archive sample and latest chart point',()=>{
 const zeroRows=rows().map(d=>({...d,score:0,trend:[{label:day,value:0}]}));
 const result=current(zeroRows,'12:20');
 assert.equal(result.overall.status,'READY');
 assert.equal(result.overall.score,0);
 assert.equal(result.dataQuality.overallComputable,true);
 const zero=sample(result,'12:20');
 assert.equal(zero.score,0);
 assert.equal(mergeCompositeObservedDay(null,day,zero).body.points[0].score,0);
 const rendered=mergeCompositeObservedDisplay(daily,[{label:iso('12:00'),value:50}],1,
  {label:iso('12:20'),value:0,boundToPublishedCard:true});
 assert.deepEqual(rendered.map(p=>p.value),[50,0]);
});

test('missing, invalid, stale and PARTIAL domains are never silently replaced with 0/50 or reweighted',()=>{
 const invalid=[
  {status:'PARTIAL',score:50},
  {status:'STALE',score:50},
  {status:'UNAVAILABLE',score:50},
  {status:'READY',score:null},
  {status:'READY',score:undefined},
  {status:'READY',score:NaN},
 ];
 for(const patch of invalid){
  const inputs=rows().map(d=>d.id==='rates'?{...d,...patch}:d);
  const value=current(inputs,'12:05');
  assert.equal(value.overall.status,'PARTIAL');
  assert.equal(value.overall.score,null);
  assert.equal(value.dataQuality.reweighted,false);
  assert.equal(value.dataQuality.readyDomains,11);
  assert.deepEqual(value.overall.trend,[]);
  assert.throws(()=>sample(value,'12:05'),/COMPOSITE_OBSERVATION_UNVERIFIED/);
 }
 const absent=current(rows().filter(d=>d.id!=='rates'),'12:05');
 assert.equal(absent.overall.status,'PARTIAL');
 assert.equal(absent.overall.score,null);
 assert.ok(absent.dataQuality.missingDomains.includes('rates'));
});

test('a domain score 0 with other valid components is not interpreted as a missing domain',()=>{
 const inputs=rows().map(d=>d.id==='rates'?{...d,score:0}:d);
 const value=current(inputs);
 assert.equal(value.overall.status,'READY');
 assert.equal(value.domains.find(d=>d.id==='rates').score,0);
 assert.equal(value.overall.score,45);
 assert.equal(value.dataQuality.readyDomains,12);
});

test('official correction of one value on the SAME observation date preserves older calculation event',()=>{
 const original=current();
 const before=firstArchive(original);
 const copy=structuredClone(before);
 const corrected=current(rateCorrection(70),'12:20');
 assert.equal(corrected.asOfDate,day);
 assert.equal(corrected.overall.score,52);
 assert.equal(corrected.overall.trend.at(-1).value,52);
 const merged=mergeCompositeObservedDay(before,day,sample(corrected,'12:20'));
 assert.equal(merged.changed,true);
 assert.deepEqual(merged.body.points.map(p=>p.score),[50,52]);
 assert.deepEqual(merged.body.points.map(p=>p.calculatedAt),[iso('12:00'),iso('12:20')]);
 assert.deepEqual(before,copy,'earlier source/archive must not mutate');
 assert.equal(merged.body.points[0].asOfDate,merged.body.points[1].asOfDate);
 const rendered=mergeCompositeObservedDisplay(daily,merged.body.points.map(p=>({
  label:p.calculatedAt,value:p.score,
 })),1,{label:iso('12:20'),value:52,boundToPublishedCard:true});
 assert.deepEqual(rendered.map(p=>p.value),[50,52]);
});

test('same-time duplicate correction is idempotent and earlier point cannot be rewritten in the archive merge',()=>{
 const before=firstArchive(current());
 const changed=mergeCompositeObservedDay(before,day,sample(current(rateCorrection(70),'12:20'),'12:20'));
 assert.equal(changed.changed,true);
 const repeat=mergeCompositeObservedDay(changed.body,day,sample(current(rateCorrection(70),'12:20'),'12:20'));
 assert.equal(repeat.changed,false);
 assert.equal(repeat.body.points.length,2);
 assert.equal(repeat.body.points[0].score,50);
});

test('card-bound chart discards a conflicting same-timestamp saved point; newer official correction wins display only',()=>{
 const old=[{label:iso('12:00'),value:50},{label:iso('12:20'),value:50}];
 const view=mergeCompositeObservedDisplay(daily,old,1,
  {label:iso('12:20'),value:52,boundToPublishedCard:true});
 assert.deepEqual(view.map(p=>p.value),[50,52]);
 assert.deepEqual(old.map(p=>p.value),[50,50],'archived input must remain unchanged');
});

test('KNOWN GAP: metadata-only methodology change after 15 minutes can append equal-value flat archive point',()=>{
 const a=current(creditVersion('CREDIT-R1'),'12:00');
 const b=current(creditVersion('CREDIT-R2'),'12:20');
 assert.equal(a.overall.score,b.overall.score);
 assert.equal(a.domains.find(d=>d.id==='credit').methodologyVersion,'CREDIT-R1');
 assert.equal(b.domains.find(d=>d.id==='credit').methodologyVersion,'CREDIT-R2');
 const before=firstArchive(a),incoming=sample(b,'12:20');
 assert.notEqual(before.points[0].signature,incoming.signature);
 const after=mergeCompositeObservedDay(before,day,incoming);
 assert.equal(after.changed,true);
 assert.deepEqual(after.body.points.map(p=>p.score),[50,50]);
 // Characterize a policy/lineage gap, not a regression expectation to approve.
 // A change of method is real metadata, but the public point has no method field.
 assert.equal(Object.hasOwn(incoming,'methodologyVersion'),false);
 assert.equal(after.body.version,COMPOSITE_OBSERVED_VERSION);
});

test('KNOWN GAP: changed CM modelVersion alone does not alter the archived source signature',()=>{
 const original=current(),migrated={...structuredClone(original),modelVersion:'CM-R2'};
 assert.equal(original.modelVersion,'CM-R1');
 assert.equal(migrated.modelVersion,'CM-R2');
 const previous=firstArchive(original);
 const next=sample(migrated,'12:20');
 assert.equal(next.signature,previous.points[0].signature);
 assert.equal(mergeCompositeObservedDay(previous,day,next).changed,false);
 // The real method-version decision is delegated to the model/Writer owners.
});

test('same-score methodology update inside 15 minutes is suppressed by existing sampling even with changed signature',()=>{
 const first=firstArchive(current(creditVersion('CREDIT-R1')));
 const second=sample(current(creditVersion('CREDIT-R2'),'12:05'),'12:05');
 assert.notEqual(first.points[0].signature,second.signature);
 const after=mergeCompositeObservedDay(first,day,second);
 assert.equal(after.changed,false);
 assert.equal(after.body.points.length,1);
});
