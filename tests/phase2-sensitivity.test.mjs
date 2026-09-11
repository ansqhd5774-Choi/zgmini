import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {phase2cInput,legacyView} from './fixtures/phase2c-input.mjs';
import {trailingMean,smoothedScores,commonDates,alignedPoints,evaluation,jumpAttribution,signalLagRelativeToRaw,missingBreakdown} from '../worker/phase2-sensitivity.mjs';
import {rollingScores,scoreQuality,compositeScores,runMethodologyResearch} from '../worker/phase2-methodology.mjs';
const date=i=>new Date(Date.UTC(2021,0,1+i)).toISOString().slice(0,10).replaceAll('-','');
const pts=(values)=>values.map((value,i)=>({date:date(i),value}));
const series=(n=600)=>Array.from({length:n},(_,i)=>({date:date(i),value:100+i%43+i/100}));
const input=()=>({leverage:{points:series()},liquidation:{points:series()},creditSpread:{points:series()},usdkrw:{points:series()}});
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9,`${a} != ${b}`);

test('three-observation arithmetic average matches hand calculation',()=>{
  assert.deepEqual(trailingMean(pts([0,3,6,9]),3).map(p=>p.value),[null,null,3,6]);
});
test('five-observation arithmetic average matches hand calculation',()=>{
  assert.deepEqual(trailingMean(pts([0,5,10,15,20,25]),5).map(p=>p.value),[null,null,null,null,10,15]);
});
test('unsupported smoothing windows cannot expand research scope',()=>assert.throws(()=>trailingMean(pts([1]),7)));
test('smoothing keeps numeric zero and propagates null without filling',()=>{
  assert.equal(trailingMean(pts([0,0,0]),3)[2].value,0);
  assert.equal(trailingMean(pts([0,null,0]),3)[2].value,null);
});
test('L3 and L5 require combined full warm-up',()=>{
  for(const [n,first] of [[3,253],[5,255]]) {
    const s=smoothedScores(series(),n,rollingScores);
    assert.ok(s.slice(0,first).every(p=>p.value===null));assert.notEqual(s[first].value,null);
    assert.equal(s.length,600);
  }
});
test('interior missing mean inputs do not disappear before percentile windows',()=>{
  const p=series();p[270].value=null;const s=smoothedScores(p,3,rollingScores);
  assert.ok(s.slice(270,524).every(p=>p.value===null));assert.notEqual(s[524].value,null);
});
test('future append and replacement leave past smoothed scores unchanged',()=>{
  const a=series(300),b=[...a,...series(50).map((p,i)=>({date:date(300+i),value:1e10}))];
  for(const n of [3,5])assert.deepEqual(smoothedScores(a,n,rollingScores),smoothedScores(b,n,rollingScores).slice(0,300));
});
test('smoothed percentile independently matches sorted tied-rank calculation',()=>{
  const a=series(280),s=smoothedScores(a,3,rollingScores);
  for(let i=253;i<a.length;i++) {
    const means=[];for(let j=i-251;j<=i;j++)means.push((a[j].value+a[j-1].value+a[j-2].value)/3);
    const sorted=[...means].sort((x,y)=>x-y),current=means.at(-1);
    const lo=sorted.findIndex(v=>Math.abs(v-current)<1e-10),hi=sorted.findLastIndex(v=>Math.abs(v-current)<1e-10);
    near(s[i].value,100-100*(lo+hi)/2/251);
  }
});
test('common dates are intersection of finite scores only',()=>{
  assert.deepEqual([...commonDates([pts([1,null,3]),pts([2,4,6])])],[date(0),date(2)]);
});
test('excluded dates break change pairs rather than joining distant valid scores',()=>{
  const a=pts([1,50,100]),dates=new Set([date(0),date(2)]);
  const e=evaluation(a,'test',scoreQuality,dates);
  assert.equal(e.evaluationObservationCount,2);assert.equal(e.quality.maxDailyJump,null);
  assert.equal(alignedPoints(a,dates).length,3);
});
test('contributions independently reconcile hand-computed weighted change',()=>{
  const a=pts([10,40]),b=pts([20,10]),c=pts([30,60]);
  const r=jumpAttribution(compositeScores([a,b,c],[40,35,25]),[40,35,25],['a','b','c'],[a,b,c]).intervals[0];
  near(r.compositeChange,16);assert.deepEqual(r.components.map(c=>c.weightedContribution),[12,-3.5,7.5]);near(r.residual,0);
});
test('inconsistent supplied composite fails closed on reconciliation',()=>{
  const p=compositeScores([pts([1,2]),pts([1,2]),pts([1,2])],[1,1,1]);p[1].value=99;
  assert.throws(()=>jumpAttribution(p,[1,1,1],['a','b','c']),/RECONCILIATION/);
});
test('jump diagnostics preserve long calendar gaps and zero without causal claims',()=>{
  const a=[{date:date(0),value:0},{date:date(10),value:100}];
  const r=jumpAttribution(compositeScores([a,a,a],[1,1,1]),[1,1,1],['a','b','c'],[a,a,a]).intervals[0];
  assert.equal(r.calendarGapDays,10);assert.equal(r.rawInputChecks[0].zeroAtEitherEndpoint,true);
  assert.equal(r.rawInputCausality,'UNCONFIRMED_ZERO_IS_NOT_AN_ERROR');
});
test('missing composite slot is not bridged for attribution',()=>{
  const p=pts([1,null,100]);const r=jumpAttribution(compositeScores([p,p,p],[1,1,1]),[1,1,1],['a','b','c']);
  assert.equal(r.intervals.length,0);assert.equal(r.unmeasurableAdjacentIntervals,2);
});
test('single dominant and multiple contributor labels use absolute contributions',()=>{
  const a=pts([0,100]),b=pts([50,50]);
  assert.equal(jumpAttribution(compositeScores([a,b,b],[1,1,1]),[1,1,1],['a','b','c']).intervals[0].attribution,'SINGLE_COMPONENT_DOMINANT');
});
test('signal lag counts actual delayed crossing and reports fixed search bound',()=>{
  const r=signalLagRelativeToRaw(pts([50,10,10,10]),pts([50,40,30,10]));
  assert.equal(r.delayedEntry,1);assert.equal(r.meanLagObservations,2);assert.equal(r.meanCalendarLagDays,2);
  assert.equal(r.maxSearchObservations,20);
});
test('signal lag separates same-date and already-below states',()=>{
  assert.equal(signalLagRelativeToRaw(pts([50,10]),pts([50,10])).sameObservationEntry,1);
  assert.equal(signalLagRelativeToRaw(pts([50,10]),pts([10,10])).alreadyBelow,1);
});
test('signal non-entry requires complete horizon, short tail is censored',()=>{
  const raw=pts([50,...Array(22).fill(10)]),smooth=pts(Array(23).fill(50));
  assert.equal(signalLagRelativeToRaw(raw,smooth).notEnteredWithinHorizon,1);
  assert.equal(signalLagRelativeToRaw(raw.slice(0,4),smooth.slice(0,4)).rightCensored,1);
});
test('missing signal horizon is not falsely counted as non-entry',()=>{
  const r=signalLagRelativeToRaw(pts([50,10,10]),pts([50,30,null]));assert.equal(r.missingEvaluation,1);assert.equal(r.notEnteredWithinHorizon,0);
});
test('missing reason counts are exclusive and distinguish warm-up from current absence',()=>{
  const src=pts([1,2,3,null,5]),part=pts([null,null,50,null,null]);
  const comp=compositeScores([part,part,part],[1,1,1]);const r=missingBreakdown(comp,[src,src,src],[3,3,3]);
  assert.deepEqual(r.counts,{SOURCE_HISTORY_NOT_STARTED:0,WARMUP:2,CURRENT_INPUT_LAG_OR_MISSING:1,MISSING_COMPONENT_AFTER_WARMUP:1,OTHER_UNRESOLVED:0});
  assert.equal(Object.values(r.counts).reduce((a,b)=>a+b),r.missingScoreCount);
  assert.equal(r.afterCommonWarmupCoverage.denominator,3);assert.equal(r.afterCommonWarmupCoverage.usable,1);
});
test('not-started source outranks warm-up, missing entire history stays unresolved coverage',()=>{
  const src=pts([1,2,3]),later=src.slice(1),p=pts([null,null,null]);
  const r=missingBreakdown(p,[src,later,src],[3,3,3]);assert.equal(r.counts.SOURCE_HISTORY_NOT_STARTED,1);
  assert.equal(r.counts.WARMUP,2);assert.equal(r.afterCommonWarmupCoverage.commonWarmupEnd,null);
});
test('new sensitivity has only two smoothings and six equal-weight combinations',()=>{
  const r=runMethodologyResearch(input());assert.equal(r.normalizationCandidates.length,13);assert.equal(r.models.length,39);
  assert.equal(r.sensitivity.smoothing.length,3);assert.equal(r.sensitivity.combinations.length,6);
  for(const c of r.sensitivity.combinations)assert.deepEqual(c.weights,[1/3,1/3,1/3]);
  assert.equal(new Set(r.sensitivity.combinations.map(c=>c.commonPeriod.evaluationObservationCount)).size,1);
});
test('legacy B/C duplicates share quality calculation and log ranks reuse only strict ordering',()=>{
  const r=runMethodologyResearch(input());const byId=id=>r.models.find(m=>m.id===id);
  assert.strictEqual(byId('MODEL_B_MARKET_DIRECT').quality,byId('GRID_40_35_25').quality);
  assert.strictEqual(byId('MODEL_C_STRESS_BALANCED').quality,byId('GRID_35_35_30').quality);
  assert.equal(r.sensitivity.modelReuse.uniqueCalculations,37);assert.equal(r.logPercentileComparison.calculationReused,true);
  assert.equal(r.sensitivity.candidateComparisons.find(c=>c.id==='LIQ_LOG1P_P252').independentCandidate,false);
});
test('log floating point collisions retain legacy computation',()=>{
  const data=input();data.liquidation.points=series().map((p,i)=>({...p,value:i%2?1e100:1e100+1e85}));
  const r=runMethodologyResearch(data);assert.equal(r.logPercentileComparison.strictOrderVerified,false);
  assert.equal(r.logPercentileComparison.calculationReused,false);
});
test('rights, publication and vintage gates never claim point-in-time verification',()=>{
  const r=runMethodologyResearch(input());assert.equal(r.rights.creditSpread.productionEligible,false);assert.equal(r.rights.usdkrw.productionEligible,false);
  assert.equal(r.sensitivity.pointInTimeVerified,false);assert.equal(r.sensitivity.publicationLagStatus,'UNCONFIRMED');assert.equal(r.sensitivity.finalWeights,null);
  assert.ok(r.sensitivity.combinations.every(c=>c.productionEligible===false));
});
test('summary does not emit raw values, source metadata, secrets or full arrays',()=>{
  const data=input();data.leverage.points[0].credential='private-credential';data.leverage.raw='raw-secret';
  const s=JSON.stringify(runMethodologyResearch(data));
  for(const x of ['private-credential','raw-secret','"points":','"rawSources":','Authorization','serviceKey'])assert.ok(!s.includes(x));
});
test('sensitivity reports no finite results from absent history',()=>{
  const s=runMethodologyResearch({}).sensitivity;assert.ok(s.combinations.every(c=>c.commonPeriod.evaluationObservationCount===0));
  assert.equal(s.baselineJumpAttribution[0].intervals.length,0);
});
test('all V69 candidate qualities models and correlations match immutable synthetic baseline',()=>{
  const golden=JSON.parse(readFileSync(new URL('./fixtures/phase2c-v69-digest.json',import.meta.url),'utf8'));
  const actual=createHash('sha256').update(JSON.stringify(legacyView(runMethodologyResearch(phase2cInput())))).digest('hex');
  assert.equal(actual,golden.sha256);
});
