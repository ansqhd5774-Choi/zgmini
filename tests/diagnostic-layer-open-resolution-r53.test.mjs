import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRateContextGuardR53,buildFundFlowR53,buildFundFlowR54,FUND_FLOW_R54_WEIGHTS,buildDollarFxR53,coverageBoundaryR53,buildStressPulseR53
} from '../lib/diagnostic-layer/open-resolution-r53-components.mjs';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';

function daily(start,count,fn){const base=new Date(`${start}T00:00:00Z`);return Array.from({length:count},(_,i)=>{const d=new Date(base);d.setUTCDate(d.getUTCDate()+i);return {observationDate:d.toISOString().slice(0,10),value:fn(i)}})}
function monthly(startYear,count,fn){return Array.from({length:count},(_,i)=>{const y=startYear+Math.floor(i/12),m=i%12+1;return {observationDate:`${y}-${String(m).padStart(2,'0')}-01`,value:fn(i)}})}

test('R53.3 rate guard preserves normal low-rate friendliness',()=>{const o=applyRateContextGuardR53({baseRateScore:92,recessionScore:60,creditScore:65,persistent:true});assert.equal(o.score,92);assert.equal(o.crisisContext,false)});
test('R53.3 rate guard crisis cap 60',()=>{const o=applyRateContextGuardR53({baseRateScore:96,recessionScore:30,creditScore:70,persistent:false});assert.equal(o.score,60);assert.equal(o.cap,60)});
test('R53.3 rate guard persistent crisis cap 50',()=>{const o=applyRateContextGuardR53({baseRateScore:100,recessionScore:60,creditScore:20,persistent:true});assert.equal(o.score,50)});
test('R53.3 fund flow level and adverse shock',()=>{const rows=monthly(2000,30,i=>i<26?.01+i*.0003:.005-(i-26)*.01);const o=buildFundFlowR53(rows,{asOfDate:'2002-06-01',minValid:12});assert.equal(o.status,'READY');assert.ok(o.shock>50)});
test('R53.3 dollar FX multi-horizon stress',()=>{const rows=daily('2000-01-01',430,i=>{const calm=100+Math.sin(i/13)*.2;return i<390?calm:calm+(i-389)*.35});const o=buildDollarFxR53(rows,{asOfDate:'2001-03-05',minValid:252});assert.equal(o.status,'READY');assert.ok(o.stress>50)});
test('R53.3 coverage boundary forbids proxy/reweight',()=>{const o=coverageBoundaryR53({activeSourceExistsAtEvent:false,approvedBridgeCoversEvent:false,event:'2008 GFC',domain:'유동성'});assert.equal(o.status,'COVERAGE_BOUNDARY_CLOSED');assert.equal(o.proxySubstitutionAllowed,false);assert.equal(o.reweightAllowed,false)});
test('R53.3 Stress Pulse is hidden and no Overall penalty',()=>{const o=buildStressPulseR53([{id:'rate',stress:90,persistent:true},{id:'credit',stress:85,persistent:true},{id:'liquidity',stress:95,persistent:true},{id:'fundFlow',stress:40,persistent:false},{id:'breadth',stress:30,persistent:false},{id:'dollarFx',stress:20,persistent:false}]);assert.equal(o.state,'STRESS');assert.equal(o.overallPenaltyApplied,false)});
test('R53.3 registry has Broad Dollar',()=>{assert.ok(Object.hasOwn(DIAGNOSTIC_FRED_SERIES,'DTWEXBGS'));assert.equal(DIAGNOSTIC_FRED_SERIES.DTWEXBGS.frequency,'DAILY')});

test('R54 fund flow combines exactly four approved component scores',()=>{
 const rows=monthly(2000,36,i=>0).map((row,i)=>({observationDate:row.observationDate,value:-0.2+i*0.02,allNetRatio:-0.2+i*0.02,indexNetRatio:-0.1+i*0.025,nonIndexNetRatio:-0.3+i*0.018,allOutflowRatio:-(2.2+(i%7)*0.08)}));
 const out=buildFundFlowR54(rows,{asOfDate:'2002-12-01',minValid:12});
 assert.equal(out.status,'READY');
 const latest=out.rows.find(row=>row.observationDate===out.observationDate);
 assert.ok([latest.allNetScore,latest.momentumScore,latest.participationScore,latest.redemptionScore].every(Number.isFinite));
 const expected=FUND_FLOW_R54_WEIGHTS.allNet*latest.allNetScore+FUND_FLOW_R54_WEIGHTS.momentum*latest.momentumScore+FUND_FLOW_R54_WEIGHTS.participation*latest.participationScore+FUND_FLOW_R54_WEIGHTS.redemption*latest.redemptionScore;
 assert.ok(Math.abs(out.score-expected)<1e-12);
 assert.ok(Math.abs(out.shock-(100-latest.momentumScore))<1e-12);
});
test('R54 fund flow never reweights a missing required raw series',()=>{
 const rows=monthly(2000,24,i=>i).map((row,i)=>({observationDate:row.observationDate,value:i/100,allNetRatio:i/100,indexNetRatio:i/90,allOutflowRatio:-2}));
 const out=buildFundFlowR54(rows,{asOfDate:'2001-12-01',minValid:12});
 assert.equal(out.status,'PARTIAL');assert.equal(out.score,null);assert.equal(out.reason,'FUND_FLOW_R54_REQUIRED_SERIES_MISSING');
});
