import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAB_SCHEMA,LAB_FIXTURE,BASE,VIEWPORTS} from '../scripts/ci-performance-lab.mjs';
import {WEB_SPEED_GOOD,STANDARD_SOURCES,MEASURED_LAB_METRICS,
 assessWebSpeedGoodLab} from '../scripts/ci-web-speed-good-r2.mjs';

function sample({lcpMs=2500,cls=0.1,fcpMs=1800}={}){
 return {schemaVersion:LAB_SCHEMA,fixture:LAB_FIXTURE,
  scope:'local mock browser laboratory only',
  reports:VIEWPORTS.map(viewport=>({
   schemaVersion:LAB_SCHEMA,fixture:LAB_FIXTURE,
   url:BASE+'/',browserVersion:'141.0.7390.37',viewport,
   metrics:{responseEndMs:200,domContentLoadedMs:250,fcpMs,lcpMs,
    cls,longTaskTotalMs:100}
  }))};
}
test('Google official Good metrics and optional Lighthouse Good are exact units',()=>{
 assert.deepEqual(WEB_SPEED_GOOD,{
  lcpMs:2500,inpMs:200,cls:0.1,fcpMs:1800,lighthousePerformanceScore:90
 });
 assert.deepEqual(MEASURED_LAB_METRICS,['lcpMs','cls','fcpMs']);
 assert.equal(STANDARD_SOURCES.coreWebVitals,'https://web.dev/articles/vitals');
 assert.equal(STANDARD_SOURCES.fcp,'https://web.dev/articles/fcp');
 assert.match(STANDARD_SOURCES.lighthouse,/developer.chrome.com/);
});
test('inclusive Good boundaries are observed only as lab targets, not field PASS',()=>{
 const report=assessWebSpeedGoodLab(sample());
 assert.equal(report.targetState,'OFFICIAL_GOOD_TARGETS_CONFIGURED');
 assert.equal(report.devices.length,2);
 assert(report.devices.every(r=>r.labReferenceState==='LAB_MEASURED_TARGETS_MET'));
 for(const r of report.devices)
  assert(Object.values(r.metrics).every(m=>m.state==='AT_OR_BELOW_GOOD_TARGET'));
 assert.equal(report.coreWebVitalsSiteGood,'UNVERIFIED');
 assert.equal(report.productionFieldP75,'UNVERIFIED');
 assert.deepEqual(report.inp,{value:null,limit:200,state:'NOT_MEASURED'});
 assert.deepEqual(report.lighthousePerformanceScore,{value:null,minimum:90,state:'NOT_MEASURED'});
 assert.equal(report.mergeBlocking,false);
 assert.equal(report.automaticReleaseGate,false);
});
test('above threshold is a lab warning and does not falsify production score',()=>{
 for(const params of [{lcpMs:2500.01},{cls:0.101},{fcpMs:1800.01}]){
  const out=assessWebSpeedGoodLab(sample(params));
  assert(out.devices.every(d=>d.labReferenceState==='LAB_GOOD_TARGET_EXCEEDED'));
  assert.equal(out.productionFieldP75,'UNVERIFIED');
  assert.equal(out.coreWebVitalsSiteGood,'UNVERIFIED');
 }
});
test('missing LCP or CLS observations never count as 0 or Good',()=>{
 for(const params of [{lcpMs:null},{cls:null},{fcpMs:NaN},{lcpMs:-1}]){
  const out=assessWebSpeedGoodLab(sample(params));
  assert(out.devices.every(d=>d.labReferenceState==='LAB_METRICS_INCOMPLETE'));
  assert.equal(out.devices[0].metrics.lcpMs.state,
   params.lcpMs===null||params.lcpMs===-1?'UNVERIFIED':'AT_OR_BELOW_GOOD_TARGET');
 }
});
test('measured zero CLS is a valid observed zero and Good reference',()=>{
 const result=assessWebSpeedGoodLab(sample({cls:0}));
 assert.equal(result.devices[0].metrics.cls.observed,0);
 assert.equal(result.devices[0].metrics.cls.state,'AT_OR_BELOW_GOOD_TARGET');
});
test('unknown/mismatched fixture, URL or duplicate viewport fail closed',()=>{
 for(const modified of [
  r=>{r.fixture='unknown';},
  r=>{r.scope='production';},
  r=>{r.reports[0].url='https://zgmini.kr/';},
  r=>{r.reports[1].viewport=r.reports[0].viewport;},
  r=>{delete r.reports[0].metrics.fcpMs;},
  r=>{r.reports[0].browserVersion='';},
  r=>{r.reports=[];}
 ]){
  const r=sample();modified(r);
  assert.throws(()=>assessWebSpeedGoodLab(r),/CI_WEB_SPEED_LAB_UNVERIFIED/);
 }
});
test('browser CI integrates exact official Good reference after old history comparison',()=>{
 const y=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const a=y.indexOf('      - name: Measure isolated Chromium performance laboratory');
 const b=y.indexOf('      - name: Compare historical local performance observations');
 const c=y.indexOf('      - name: Evaluate official Google Good web-speed reference');
 const d=y.indexOf('      - name: Measure local WCAG A/AA accessibility with axe-core');
 assert(a>0&&b>a&&c>b&&d>c);
 assert.match(y,/node scripts\/ci-web-speed-good-r2\.mjs/);
 assert.match(y,/artifacts\/performance-lab\//);
 assert.match(y,/node scripts\/ci-cross-browser-core\.mjs/);
 assert.doesNotMatch(y,/continue-on-error:\s*true/);
});
test('official Good rules are descriptive and do not invent INP or Lighthouse output',()=>{
 const src=readFileSync(new URL('../scripts/ci-web-speed-good-r2.mjs',import.meta.url),'utf8');
 assert.match(src,/productionFieldP75:'UNVERIFIED'/);
 assert.match(src,/coreWebVitalsSiteGood:'UNVERIFIED'/);
 assert.match(src,/automaticReleaseGate:false/);
 assert.match(src,/mergeBlocking:false/);
 assert.doesNotMatch(src,/lighthouseScore\s*:\s*(?:9\d|100)/);
});
