import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAB_SCHEMA,LAB_FIXTURE,VIEWPORTS,METRIC_NAMES,BASE} from '../scripts/ci-performance-lab.mjs';
import {
 BUDGET_STATUS,eligibleHistoricalRuns,compareBudgetObservations,
 reviewHistoricalBudget
} from '../scripts/ci-performance-budget-observation.mjs';

const metrics=(responseEndMs=200)=>({
 responseEndMs,domContentLoadedMs:240,fcpMs:300,lcpMs:320,
 cls:0,longTaskTotalMs:null
});
const sample=(version='141.0',end=200)=>({
 schemaVersion:LAB_SCHEMA,fixture:LAB_FIXTURE,
 reports:VIEWPORTS.map(viewport=>({
  schemaVersion:LAB_SCHEMA,fixture:LAB_FIXTURE,
  url:BASE+'/',browserVersion:version,viewport,metrics:metrics(end)
 }))
});
const run=(databaseId,overrides={})=>({
 databaseId,headSha:String(databaseId).padStart(40,'a'),
 event:'pull_request',status:'completed',conclusion:'success',...overrides
});
const context={currentRunId:999,currentHeadSha:'e'.repeat(40)};
test('same browser and local fixture yield signed deltas, with zero and missing separated',()=>{
 const report=compareBudgetObservations(sample('141.0',220),sample('141.0',200));
 assert.equal(report.state,'COMPARABLE_OBSERVATION');
 assert.equal(report.details.length,2);
 for(const item of report.details){
  assert.equal(item.deltas.responseEndMs,-20);
  assert.equal(item.deltas.cls,0);
  assert.equal(item.deltas.longTaskTotalMs,null);
  assert.equal(item.comparableMetrics,METRIC_NAMES.length-1);
  assert.equal(item.browserVersion,'141.0');
 }
});
test('different browser versions or fixture identity never become false budget regressions',()=>{
 assert.equal(compareBudgetObservations(sample('141.0'),sample('142.0')).state,
  'INCOMPARABLE_FIXTURE_OR_BROWSER');
 const different=sample();
 different.reports[0].url='http://127.0.0.1:5173/about/';
 assert.equal(compareBudgetObservations(different,sample()).state,
  'INCOMPARABLE_FIXTURE_OR_BROWSER');
 const wrong=sample();
 wrong.fixture='another-fixture';
 assert.throws(()=>compareBudgetObservations(wrong,sample()),
  /CI_BUDGET_LAB_REPORT_UNVERIFIED/);
});
test('candidate search excludes current, failed and future runs and limits downloads',()=>{
 const candidates=eligibleHistoricalRuns([
  run(999),run(998,{conclusion:'failure'}),run(1000),
  run(997,{headSha:context.currentHeadSha}),
  run(996),run(995),run(994),run(993)
 ],context);
 assert.deepEqual(candidates.map(x=>x.databaseId),[996,995,994]);
 assert.throws(()=>eligibleHistoricalRuns([run(10)],{
  currentRunId:2,currentHeadSha:'not-a-sha'
 }),/CI_BUDGET_HISTORY_INPUT_UNVERIFIED/);
});
test('prior compatible run generates non-gating historical observation only',async()=>{
 const calls=[];
 const out=await reviewHistoricalBudget({
  current:sample('141.0',200),runs:[run(998),run(997)],
  ...context,
  download:async record=>{
   calls.push(record.databaseId);
   return record.databaseId===998?sample('142.0'):sample('141.0',220);
  }
 });
 assert.deepEqual(calls,[998,997]);
 assert.equal(out.status,'NOT_CONFIGURED');
 assert.equal(out.approvedThresholds,false);
 assert.equal(out.mergeBlocking,false);
 assert.equal(out.comparisonState,'COMPARABLE_OBSERVATION');
 assert.equal(out.historicalBaselineStatus,'HISTORICAL_NOT_APPROVED');
 assert.equal(out.historical.runId,997);
 assert.equal(out.incomparableArtifacts,1);
 assert.equal(out.details[0].deltas.responseEndMs,-20);
});
test('expired artifacts never become synthetic zero or invented success',async()=>{
 const out=await reviewHistoricalBudget({
  current:sample(),runs:[run(998),run(997)],...context,download:async()=>null
 });
 assert.equal(out.status,BUDGET_STATUS);
 assert.equal(out.comparisonState,'NO_COMPARABLE_HISTORICAL_ARTIFACT');
 assert.equal(out.unavailableArtifacts,2);
 assert.equal(out.historical,null);
 assert.deepEqual(out.details,[]);
});
test('no prior historical run is unknown, not PASS',async()=>{
 const out=await reviewHistoricalBudget({
  current:sample(),runs:[],...context,
  download:async()=>{assert.fail('NO_DOWNLOAD_EXPECTED');}
 });
 assert.equal(out.comparisonState,'NO_PRIOR_SUCCESSFUL_RUN');
 assert.equal(out.historicalBaselineStatus,'UNVERIFIED');
 assert.equal(out.approvedThresholds,false);
});
test('corrupted JSON report or arbitrary download failure never silently passes',async()=>{
 const out=await reviewHistoricalBudget({
  current:sample(),runs:[run(998)],...context,
  download:async()=>({schemaVersion:1,fixture:LAB_FIXTURE,reports:[]})
 });
 assert.equal(out.incomparableArtifacts,1);
 assert.equal(out.comparisonState,'NO_COMPARABLE_HISTORICAL_ARTIFACT');
 await assert.rejects(reviewHistoricalBudget({
  current:sample(),runs:[run(998)],...context,
  download:async()=>{throw Error('GITHUB_HTTP_403');}
 }),/GITHUB_HTTP_403/);
});
test('existing browser workflow runs after lab in same job and keeps all browser tests',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const first=workflow.indexOf('      - name: Measure isolated Chromium performance laboratory');
 const comparison=workflow.indexOf('      - name: Compare historical local performance observations');
 const axe=workflow.indexOf('      - name: Measure local WCAG A/AA accessibility with axe-core');
 assert(first>0&&comparison>first&&axe>comparison);
 assert.match(workflow,/actions: read/);
 assert.match(workflow,/node scripts\/ci-performance-budget-observation\.mjs/);
 assert.match(workflow,/artifacts\/performance-lab\//);
 assert.match(workflow,/community-chat-browser-r1/);
 assert.match(workflow,/node scripts\/ci-cross-browser-core\.mjs/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
