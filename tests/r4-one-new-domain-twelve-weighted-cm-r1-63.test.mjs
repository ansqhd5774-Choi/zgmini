import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 COMPOSITE_MODEL_VERSION,DOMAIN_WEIGHTS,buildCompositeMarketScore,buildCompositeTrend,
} from '../lib/market-score/composite-model-r1.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';

// R4 #63: The approved active CM-R1 has TWELVE domains, not ten.
// Ten existing fixed domains + one newly observed domain + one other fixed
// domain explicitly exercise the requested 10/1 simulation WITHOUT creating
// a fake 10-domain approved composite or changing production weights.
const baseDate='2026-11-13',nextDate='2026-11-17';
const weightOf=id=>DOMAIN_WEIGHTS.find(item=>item.id===id)?.weight;
const domainIds=DOMAIN_WEIGHTS.map(item=>item.id);
const updatedId='rates';
const unchangedTen=domainIds.filter(id=>id!==updatedId&&id!=='commodities');
const extraUnchanged='commodities';
const baseline=()=>DOMAIN_WEIGHTS.map(spec=>({
 id:spec.id,status:'READY',score:50,
 updatedAt:baseDate,
 trend:[{label:'2026-11-10',value:50},{label:baseDate,value:50}],
 indicators:[],freshness:'STORED_OLDER_VALID',
 missingFactors:[],
}));
const newObservation=(before,score=70,id=updatedId)=>before.map(domain=>
 domain.id===id?{
  ...domain,score,updatedAt:nextDate,freshness:'NEW_ELIGIBLE_OBSERVATION',
  trend:[...domain.trend,{label:nextDate,value:score}],
 }:domain
);
const calc=(rows,when)=>buildCompositeMarketScore(rows,{updatedAt:when});
const score=(rows)=>rows.reduce((total,domain)=>
 total+domain.score*weightOf(domain.id),0)/100;
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-10,`expected ${a} to equal ${b}`);

test('CM-R1 production contract is 12 domain weights totaling 100, not ten placeholder inputs',()=>{
 assert.equal(COMPOSITE_MODEL_VERSION,'CM-R1');
 assert.equal(DOMAIN_WEIGHTS.length,12);
 assert.deepEqual(DOMAIN_WEIGHTS.map(x=>x.weight),[8,7,10,10,8,7,13,10,8,8,5,6]);
 assert.equal(DOMAIN_WEIGHTS.reduce((sum,x)=>sum+x.weight,0),100);
 assert.equal(unchangedTen.length,10);
 assert.equal(new Set([...unchangedTen,updatedId,extraUnchanged]).size,12);
});

test('initial 50 points are simulated baseline only, not a current Production observation',()=>{
 const before=calc(baseline(),baseDate+'T10:00:00Z');
 assert.equal(before.modelVersion,'CM-R1');
 assert.equal(before.overall.status,'READY');
 assert.equal(before.dataQuality.readyDomains,12);
 assert.equal(before.dataQuality.coverageWeight,100);
 near(before.overall.score,50);
 assert.equal(before.overall.trend.at(-1).label,baseDate);
});

test('ten existing values unchanged + one eligible new rate score 70 + twelfth unchanged produces exactly 52',()=>{
 const original=baseline(),changed=newObservation(original);
 const after=calc(changed,nextDate+'T09:00:00Z');
 assert.equal(after.overall.status,'READY');
 assert.equal(after.dataQuality.reweighted,false);
 assert.equal(after.dataQuality.readyDomains,12);
 near(after.overall.score,52); // 50 + 10% * (70-50)
 near(after.overall.score,score(changed));
 assert.equal(after.domains.find(x=>x.id===updatedId).score,70);
 assert.equal(after.overall.trend.at(-1).label,nextDate);
 near(after.overall.trend.at(-1).value,after.overall.score);
});

test('the ten frozen domains retain score, provenance and stored history with no backfill',()=>{
 const before=baseline(),after=newObservation(before);
 for(const id of unchangedTen){
  const a=before.find(x=>x.id===id),b=after.find(x=>x.id===id);
  assert.equal(a,b,`unchanged domain object: ${id}`);
  assert.equal(b.score,50);
  assert.equal(b.updatedAt,baseDate);
  assert.equal(b.trend.length,2);
  assert.equal(b.trend.at(-1).label,baseDate);
  assert.equal(b.freshness,'STORED_OLDER_VALID');
 }
 assert.equal(extraUnchanged, 'commodities');
 assert.equal(after.find(x=>x.id===extraUnchanged),before.find(x=>x.id===extraUnchanged));
});

test('new source changes only its own observation month/date and does not rewrite any prior observations',()=>{
 const old=baseline(),copy=structuredClone(old);
 const updated=newObservation(old);
 const result=calc(updated,nextDate+'T09:00:00Z');
 assert.deepEqual(old,copy);
 assert.equal(updated.find(x=>x.id===updatedId).updatedAt,nextDate);
 for(const id of domainIds.filter(id=>id!==updatedId)){
  const actual=result.domains.find(x=>x.id===id);
  assert.deepEqual(actual.trend,copy.find(x=>x.id===id).trend);
  assert.equal(actual.updatedAt,baseDate);
 }
});

test('two older composite historical dates remain unchanged after only one new observation',()=>{
 const before=calc(baseline(),baseDate+'T09:00:00Z');
 const after=calc(newObservation(baseline()),nextDate+'T09:00:00Z');
 const existingDates=[...new Set(before.overall.trend.map(x=>x.label))];
 for(const date of existingDates){
  assert.equal(after.overall.trend.find(x=>x.label===date)?.value,
   before.overall.trend.find(x=>x.label===date)?.value);
 }
 assert.deepEqual(after.overall.trend.map(x=>x.label),
  ['2026-11-10',baseDate,nextDate]);
});

test('requesting the exact same stored inputs/observation time twice is idempotent',()=>{
 const input=newObservation(baseline());
 const a=calc(input,nextDate+'T09:00:00Z');
 const b=calc(input,nextDate+'T09:00:00Z');
 assert.deepEqual(a,b);
 assert.equal(a.overall.trend.filter(x=>x.label===nextDate).length,1);
});

test('all 12 approved domains are individually weighted by the actual CM-R1 calculator, not an invented average',()=>{
 for(const spec of DOMAIN_WEIGHTS){
  const old=baseline(),updated=newObservation(old,61,spec.id);
  const before=calc(old,baseDate+'T10:00:00Z');
  const after=calc(updated,nextDate+'T09:00:00Z');
  const expectedDelta=11*spec.weight/100;
  near(after.overall.score-before.overall.score,expectedDelta);
  assert.equal(after.domains.filter((x)=>x.score!==50).length,1);
  assert.equal(after.domains.find(x=>x.id===spec.id).score,61);
  assert.equal(after.dataQuality.reweighted,false);
 }
});

test('a new valid negative score delta uses the same existing approved weight',()=>{
 const before=calc(baseline(),baseDate+'T09:00:00Z');
 const after=calc(newObservation(baseline(),30),nextDate+'T09:00:00Z');
 near(after.overall.score-before.overall.score,-2);
 assert.equal(after.overall.status,'READY');
});

test('a genuine new 0 point is valid, never treated as missing or a fake neutral fifty',()=>{
 const input=newObservation(baseline(),0);
 const after=calc(input,nextDate+'T09:00:00Z');
 assert.equal(after.overall.status,'READY');
 assert.equal(after.domains.find(x=>x.id==='rates').score,0);
 near(after.overall.score,45);
 assert.equal(after.overall.trend.at(-1).label,nextDate);
});

test('a ten-domain-only draft MUST remain PARTIAL: 10 valid scores do not justify renormalization to 100',()=>{
 const tenOnly=baseline().filter(x=>unchangedTen.includes(x.id));
 const result=calc(tenOnly,nextDate+'T09:00:00Z');
 assert.equal(result.overall.status,'PARTIAL');
 assert.equal(result.overall.score,null);
 assert.equal(result.dataQuality.readyDomains,10);
 assert.equal(result.dataQuality.totalDomains,12);
 assert.equal(result.dataQuality.coverageWeight,84); // 100 minus rates 10 and commodities 6
 assert.equal(result.dataQuality.reweighted,false);
 assert.deepEqual(result.overall.trend,[]);
 assert.ok(result.dataQuality.missingDomains.includes('rates'));
 assert.ok(result.dataQuality.missingDomains.includes('commodities'));
});

test('one missing old component cannot be silently carried as numeric zero or excluded from the denominator',()=>{
 const input=newObservation(baseline()).map(x=>x.id==='commodities'?{...x,score:null,status:'PARTIAL'}:x);
 const result=calc(input,nextDate+'T09:00:00Z');
 assert.equal(result.overall.score,null);
 assert.equal(result.overall.status,'PARTIAL');
 assert.equal(result.dataQuality.readyDomains,11);
 assert.equal(result.dataQuality.coverageWeight,94);
 assert.equal(result.dataQuality.reweighted,false);
 assert.deepEqual(result.overall.trend,[]);
});

test('out-of-bounds, nonnumeric and nonfinite new input never produces a READY overall',()=>{
 for(const bad of [null,undefined,NaN,Infinity,'70',-1,101]){
  const changed=newObservation(baseline(),bad);
  const result=calc(changed,nextDate+'T09:00:00Z');
  assert.equal(result.overall.status,'PARTIAL');
  assert.equal(result.overall.score,null);
  assert.equal(result.dataQuality.reweighted,false);
  assert.equal(result.domains.find(x=>x.id===updatedId).score,null);
 }
});

test('new source that explicitly reports PARTIAL is not upgraded to READY by a numeric candidate',()=>{
 const changed=newObservation(baseline(),70).map(x=>x.id===updatedId?{...x,status:'PARTIAL'}:x);
 const result=calc(changed,nextDate+'T09:00:00Z');
 assert.equal(result.overall.status,'PARTIAL');
 assert.equal(result.overall.score,null);
 assert.equal(result.domains.find(x=>x.id===updatedId).score,null);
 assert.equal(result.dataQuality.reweighted,false);
});

test('real CM-R1 domain adapter does not silently create 12 ready domains from diagnostic-only defaults',()=>{
 const rows=buildCmR1DomainResults();
 assert.deepEqual(rows.map(x=>x.id),domainIds);
 const output=calc(rows,nextDate+'T09:00:00Z');
 assert.equal(output.overall.status,'PARTIAL');
 assert.equal(output.overall.score,null);
 assert.equal(output.dataQuality.overallComputable,false);
 assert.equal(output.dataQuality.reweighted,false);
});

test('a simulated new observation cannot change the approved model definition',()=>{
 const baselineWeights=structuredClone(DOMAIN_WEIGHTS);
 const old=calc(baseline(),baseDate+'T09:00:00Z');
 const newer=calc(newObservation(baseline(),70),nextDate+'T09:00:00Z');
 assert.deepEqual(DOMAIN_WEIGHTS,baselineWeights);
 assert.equal(old.modelVersion,newer.modelVersion);
 assert.deepEqual(old.domains.map(x=>[x.id,x.weight]),newer.domains.map(x=>[x.id,x.weight]));
});

test('composite calculator is imported from the real active market-score Worker, not a test-only made-up scorer',()=>{
 const actualWorker=readFileSync(new URL('../worker/market-score-r1.mjs',import.meta.url),'utf8');
 const actualModel=readFileSync(new URL('../lib/market-score/composite-model-r1.mjs',import.meta.url),'utf8');
 assert.match(actualWorker,/import \{buildCompositeMarketScore\} from/);
 assert.match(actualModel,/export function buildCompositeMarketScore\(/);
 assert.match(actualModel,/const overallComputable=ready.length===DOMAIN_WEIGHTS.length&&coverageWeight===100/);
 assert.doesNotMatch(actualModel,/reweighted:true/);
});
