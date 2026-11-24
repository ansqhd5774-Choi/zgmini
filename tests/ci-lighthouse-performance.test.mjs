import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {summarizeLighthouseReport,evaluatePerformanceBudget,
 summarizeCollectedReports} from '../scripts/ci-lighthouse-performance.mjs';

const base=()=>({
 requestedUrl:'http://127.0.0.1:3000/about',
 finalUrl:'http://127.0.0.1:3000/about',
 categories:{performance:{score:0.72}},
 audits:{
  'first-contentful-paint':{numericValue:1000},
  'largest-contentful-paint':{numericValue:1800},
  'speed-index':{numericValue:1450},
  'total-blocking-time':{numericValue:200},
  'cumulative-layout-shift':{numericValue:0}
 }
});

test('real Lighthouse categories and audits yield only lab measurements, no synthetic budget',()=>{
 const summary=summarizeLighthouseReport(base());
 assert.equal(summary.method.includes('Lighthouse CI v0.16.1'),true);
 assert.equal(summary.scope,'LOCAL_PRODUCTION_PREVIEW_ABOUT');
 assert.equal(summary.performanceScore,0.72);
 assert.equal(summary.metrics.cumulativeLayoutShift,0);
 assert.equal(summary.budgetStatus,'UNSET_NO_GATING');
 assert.deepEqual(evaluatePerformanceBudget(summary),{status:'UNSET',violations:[],blocking:false});
});

test('invalid or remote URL, runtime errors and missing audits fail closed',()=>{
 for(const change of [
  {finalUrl:'https://zgmini.kr/about'},
  {requestedUrl:'http://127.0.0.1:3000/private'},
  {runtimeError:{code:'PAGE_HUNG'}},
  {audits:{}},
  {categories:{performance:{score:NaN}}}
 ]){
  assert.throws(()=>summarizeLighthouseReport({...base(),...change}),
   /CI_PERFORMANCE_/);
 }
});

test('valid zero is not mistaken for missing, negative and nonfinite metrics are rejected',()=>{
 const ok=base();
 ok.audits['total-blocking-time'].numericValue=0;
 assert.equal(summarizeLighthouseReport(ok).metrics.totalBlockingTime,0);
 for(const invalid of [-1,NaN,Infinity,undefined]){
  const bad=base();
  bad.audits['largest-contentful-paint'].numericValue=invalid;
  assert.throws(()=>summarizeLighthouseReport(bad),
   /CI_PERFORMANCE_METRIC_INVALID/);
 }
});

test('explicit budgets calculate clear excess but cannot silently turn on a CI gate',()=>{
 const s=summarizeLighthouseReport(base());
 assert.deepEqual(evaluatePerformanceBudget(s,{largestContentfulPaint:1500}),{
  status:'EXCEEDED',violations:['largestContentfulPaint'],blocking:false});
 assert.deepEqual(evaluatePerformanceBudget(s,{largestContentfulPaint:2000}),{
  status:'WITHIN',violations:[],blocking:false});
 for(const bad of [{}, {fakedMetric:10},{largestContentfulPaint:-1}]){
  assert.throws(()=>evaluatePerformanceBudget(s,bad),/CI_PERFORMANCE_BUDGET_INVALID/);
 }
});

test('exactly one bounded local report must exist to form a performance baseline',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'zgmini-lhci-test-'));
 try{
  await assert.rejects(summarizeCollectedReports(dir),/CI_PERFORMANCE_REPORT_COUNT_INVALID/);
  await writeFile(join(dir,'123.report.json'),JSON.stringify(base()));
  assert.equal((await summarizeCollectedReports(dir)).performanceScore,0.72);
  await writeFile(join(dir,'456.report.json'),JSON.stringify(base()));
  await assert.rejects(summarizeCollectedReports(dir),/CI_PERFORMANCE_REPORT_COUNT_INVALID/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('existing CI reuses built production output, saves local-only evidence without automatic threshold',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 const build=workflow.indexOf('      - name: Build');
 const perf=workflow.indexOf('      - name: Measure local production preview with Lighthouse');
 assert.ok(perf>build&&build>=0);
 assert.match(workflow,/node scripts\/ci-lighthouse-performance\.mjs/);
 assert.match(workflow,/@lhci\/cli@0\.16\.1/);
 assert.match(workflow,/vite preview --host 127\.0\.0\.1 --port 3000 --strictPort/);
 assert.doesNotMatch(workflow,/NODE_ENV=production npm run start/);
 assert.match(workflow,/artifacts\/ci-performance-lighthouse\/summary\.json/);
 assert.doesNotMatch(workflow,/temporary-public-storage/);
 assert.match(workflow,/retention-days: 7/);
});
