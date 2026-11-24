import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 LAB_SCHEMA,LAB_FIXTURE,BASE,VIEWPORTS,METRIC_NAMES,
 normalizeRawMetrics,comparePerformanceLab,evaluateApprovedBudget,runLab
} from '../scripts/ci-performance-lab.mjs';

const sample=(viewport=VIEWPORTS[0],metrics={
 responseEndMs:180,domContentLoadedMs:230,fcpMs:300,
 lcpMs:1200,cls:0,longTaskTotalMs:70
})=>({schemaVersion:LAB_SCHEMA,fixture:LAB_FIXTURE,
 url:BASE+'/',browserVersion:'chromium-test',viewport,metrics});
const policy=s=>({status:'APPROVED',approvedSourceSha:'a'.repeat(40),
 fixture:s.fixture,url:s.url,browserVersion:s.browserVersion,
 viewport:s.viewport,limits:{lcpMs:1500,cls:0.1}});

test('missing performance observations stay null, genuine zero remains zero',()=>{
 const result=normalizeRawMetrics({fcpMs:0,lcpMs:undefined,
  cls:0,longTaskTotalMs:NaN,responseEndMs:-1,domContentLoadedMs:2.555});
 assert.deepEqual(result,{responseEndMs:null,domContentLoadedMs:2.56,
  fcpMs:0,lcpMs:null,cls:0,longTaskTotalMs:null});
 assert.deepEqual(Object.keys(result),[...METRIC_NAMES]);
});

test('same lab fixture and Chromium version produce exact signed deltas',()=>{
 const baseline=sample();
 const current=sample(VIEWPORTS[0],{...baseline.metrics,lcpMs:1300,
  cls:0.01,longTaskTotalMs:null});
 assert.deepEqual(comparePerformanceLab(baseline,current),{
  comparableMetrics:5,deltas:{responseEndMs:0,domContentLoadedMs:0,
   fcpMs:0,lcpMs:100,cls:0.01,longTaskTotalMs:null}
 });
});

test('different browser or viewport cannot be represented as performance regression',()=>{
 const baseline=sample();
 for(const alternate of [{...sample(),browserVersion:'other'},
  sample(VIEWPORTS[1]),{...sample(),fixture:'production'},null]){
  assert.throws(()=>comparePerformanceLab(baseline,alternate),
   /CI_PERFORMANCE_BASELINE_INCOMPARABLE/);
 }
});

test('budget cannot run without approved threshold and comparable source',()=>{
 const s=sample();
 assert.throws(()=>evaluateApprovedBudget(s,null),
  /CI_PERFORMANCE_BUDGET_NOT_APPROVED_OR_INCOMPARABLE/);
 assert.throws(()=>evaluateApprovedBudget(s,{...policy(s),status:'DRAFT'}),
  /CI_PERFORMANCE_BUDGET_NOT_APPROVED_OR_INCOMPARABLE/);
 assert.throws(()=>evaluateApprovedBudget(s,{...policy(s),browserVersion:'other'}),
  /CI_PERFORMANCE_BUDGET_NOT_APPROVED_OR_INCOMPARABLE/);
 assert.deepEqual(evaluateApprovedBudget(s,policy(s)),{
  lcpMs:{measured:1200,limit:1500,state:'PASS'},
  cls:{measured:0,limit:0.1,state:'PASS'}
 });
 assert.equal(evaluateApprovedBudget(sample(VIEWPORTS[0],{
  ...s.metrics,lcpMs:null}),policy(s)).lcpMs.state,'UNVERIFIED');
});

test('real observed budget exceed is reported without approving any CI global gate',()=>{
 const s=sample(VIEWPORTS[0],{responseEndMs:150,
  domContentLoadedMs:200,fcpMs:250,lcpMs:1600,
  cls:0.2,longTaskTotalMs:50});
 assert.equal(evaluateApprovedBudget(s,policy(s)).lcpMs.state,'EXCEEDED');
 assert.throws(()=>evaluateApprovedBudget(s,{...policy(s),
  limits:{lcpMs:-1}}),/CI_PERFORMANCE_BUDGET_INVALID_LIMIT/);
});

test('local-only lab blocks remote origins, non-CI invoke and mock data invention',async()=>{
 let launched=0;
 await assert.rejects(runLab({chromium:{launch:async()=>{
  launched++;throw Error('unexpected');
 }},base:'https://zgmini.kr'}),/CI_PERFORMANCE_LAB_SCOPE_INVALID/);
 assert.equal(launched,0);
 const src=readFileSync(new URL('../scripts/ci-performance-lab.mjs',import.meta.url),'utf8');
 assert.match(src,/url\.origin!==BASE/);
 assert.match(src,/return route\.abort\('blockedbyclient'\)/);
 assert.match(src,/status:503/);
 assert.match(src,/CI_PERFORMANCE_LAB_CI_ONLY/);
 assert.doesNotMatch(src,/lighthouseScore\s*:/);
});

test('existing Chromium browser workflow runs the bounded lab and uploads evidence',()=>{
 const y=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const start=y.indexOf('      - name: Start local dev UI');
 const perf=y.indexOf('      - name: Measure isolated Chromium performance laboratory');
 const last=y.indexOf('      - name: Verify CNN actual PC-check 1D curve');
 const upload=y.indexOf('      - name: Upload browser UI evidence');
 assert.ok(start>=0&&last>start&&perf>last&&upload>perf);
 assert.match(y,/run: node scripts\/ci-performance-lab\.mjs/);
 assert.match(y,/artifacts\/performance-lab\//);
 assert.match(y,/runs-on: ubuntu-24\.04/);
});
