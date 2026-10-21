import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectDashboardRiskDisplay} from '../lib/market-score/dashboard-risk-provisional-display.mjs';

const asOf='2026-10-21T09:36:38.761Z';
const st={status:'READY',phase:'PROVISIONAL',score:76.7,methodologyVersion:'STAGFLATION_LATEST_PUBLISHED_R1',evaluationMode:'LATEST_PUBLISHED_INPUTS_NOT_COMMON_MONTH_OR_FORECAST',inputCount:8,observedAt:asOf,history:[{observedAt:asOf,score:76.7}]};
const er={status:'READY',phase:'PROVISIONAL',score:80.125,methodologyVersion:'E1-R4',quarterEnd:'2026-09-30',universeCount:500,observedAt:asOf,history:[{observedAt:asOf,score:80.125,observed:{epsGrowth:25},coverage:{epsGrowth:.05}}]};

test('two verified provisional risk streams become primary card numbers, rounded as before',()=>{
 assert.deepEqual(selectDashboardRiskDisplay({key:'stagflationSafety',confirmed:89,stagflation:st,earnings:er}),{score:76.7,provisional:true});
 assert.deepEqual(selectDashboardRiskDisplay({key:'earningsRecessionDefense',confirmed:84.6875,stagflation:st,earnings:er}),{score:80.125,provisional:true});
 assert.equal(Math.round(selectDashboardRiskDisplay({key:'stagflationSafety',confirmed:89,stagflation:st}).score),77);
 assert.equal(Math.round(selectDashboardRiskDisplay({key:'earningsRecessionDefense',confirmed:84.6875,earnings:er}).score),80);
});

test('every other risk card keeps its published number and provisional streams cannot override unrelated cards',()=>{
 for(const key of ['inflationStability','recessionDefense','creditRiskDefense','assetBubbleSafety','debtRiskSafety','supplyShockSafety']){
  assert.deepEqual(selectDashboardRiskDisplay({key,confirmed:42.5,stagflation:st,earnings:er}),{score:42.5,provisional:false});
 }
 assert.deepEqual(selectDashboardRiskDisplay({key:'earningsRecessionDefense',confirmed:null,earnings:null}),{score:null,provisional:false});
});

test('no READY/PROVISIONAL or mismatching observation: fail closed to published confirmed score',()=>{
 assert.deepEqual(selectDashboardRiskDisplay({key:'stagflationSafety',confirmed:62,stagflation:{...st,status:'UNAVAILABLE'}}),{score:62,provisional:false});
 assert.deepEqual(selectDashboardRiskDisplay({key:'stagflationSafety',confirmed:62,stagflation:{...st,history:[{observedAt:asOf,score:74}]}}),{score:62,provisional:false});
 assert.deepEqual(selectDashboardRiskDisplay({key:'earningsRecessionDefense',confirmed:84.6875,earnings:{...er,score:80.6}}),{score:84.6875,provisional:false});
 assert.deepEqual(selectDashboardRiskDisplay({key:'earningsRecessionDefense',confirmed:84.6875,earnings:{...er,phase:'CONFIRMED'}}),{score:84.6875,provisional:false});
 assert.deepEqual(selectDashboardRiskDisplay({key:'earningsRecessionDefense',confirmed:84.6875,earnings:{...er,history:[{...er.history[0],coverage:{epsGrowth:.5}}]}}),{score:84.6875,provisional:false});
});

test('dashboard uses selected numbers for risk meter and main label, omits extra tags and cross-method arrows',()=>{
 const s=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(s,/selectDashboardRiskDisplay\(\{key:diagnosticKeys\[index\]/);
 assert.match(s,/const score=selected\.score/);
 assert.match(s,/data-score-source=\{selected\.provisional/);
 assert.match(s,/Math\.round\(score\)/);
 assert.match(s,/selected\.provisional\?null:<StoredScoreDirection/);
 assert.doesNotMatch(s,/<(?:EarningsProvisionalSummary|StagflationLatestSummary)\s*\/>/);
 assert.match(s,/r55DomainIds\[index\]/);
});
