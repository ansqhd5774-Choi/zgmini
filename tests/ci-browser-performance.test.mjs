import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeObservation,evaluatePerformanceBudget,PROFILES,SCOPE}
 from '../scripts/ci-browser-performance.mjs';

const example=()=>({
 origin:'http://127.0.0.1:3000',path:'/about',
 httpStatus:200,mainPresent:true,title:'ZGMINI 소개',
 metrics:{ttfbMs:120,fcpMs:210,lcpMs:510,cls:0}
});

test('reports actual browser lab timing by viewport, preserves valid zero',()=>{
 const x=normalizeObservation(example(),'mobile-390');
 assert.equal(x.profile,'mobile-390');
 assert.equal(x.metrics.cls,0);
 assert.equal(x.metrics.lcpMs,510);
 assert.deepEqual(x.unavailable,[]);
 assert.equal(PROFILES.length,2);
 assert.equal(SCOPE,'LOCAL_PRODUCTION_PREVIEW_ABOUT');
});

test('null is unavailable, never a passing zero',()=>{
 const input=example();
 input.metrics.lcpMs=null;
 input.metrics.fcpMs=undefined;
 const x=normalizeObservation(input,'desktop-1440');
 assert.equal(x.metrics.lcpMs,null);
 assert.deepEqual(x.unavailable,['fcpMs','lcpMs']);
 assert.deepEqual(evaluatePerformanceBudget(x,{lcpMs:500}),{
  status:'UNVERIFIED',violations:[],unverified:['lcpMs'],blocking:false
 });
});

test('not-localhost, HTTP error, missing page and unsupported profile fail closed',()=>{
 for(const patch of [
  {origin:'https://zgmini.kr'},
  {path:'/private'},
  {httpStatus:500},
  {mainPresent:false},
  {title:'Unrelated'},
 ]){
  assert.throws(()=>normalizeObservation({...example(),...patch},'mobile-390'),
   /CI_PERFORMANCE_PAGE_UNVERIFIED/);
 }
 assert.throws(()=>normalizeObservation(example(),'tablet-999'),
  /CI_PERFORMANCE_PAGE_UNVERIFIED/);
});

test('negative and invalid numbers cannot be marked as measured, missing TTFB rejected',()=>{
 for(const bad of [-1,NaN,Infinity,'1']){
  const x=example();x.metrics.fcpMs=bad;
  assert.throws(()=>normalizeObservation(x,'desktop-1440'),
   /CI_PERFORMANCE_METRIC_INVALID/);
 }
 const x=example();x.metrics.ttfbMs=null;
 assert.throws(()=>normalizeObservation(x,'mobile-390'),
  /CI_PERFORMANCE_TTFB_MISSING/);
});

test('performance budget stays observational until measured stable baseline is approved',()=>{
 const x=normalizeObservation(example(),'mobile-390');
 assert.deepEqual(evaluatePerformanceBudget(x),{
  status:'UNSET',violations:[],unverified:[],blocking:false});
 assert.deepEqual(evaluatePerformanceBudget(x,{lcpMs:450,cls:0}),{
  status:'EXCEEDED',violations:['lcpMs'],unverified:[],blocking:false});
 assert.deepEqual(evaluatePerformanceBudget(x,{lcpMs:510}),{
  status:'WITHIN',violations:[],unverified:[],blocking:false});
 for(const invalid of [{},{unknownMetric:10},{lcpMs:-1}]){
  assert.throws(()=>evaluatePerformanceBudget(x,invalid),
   /CI_PERFORMANCE_BUDGET_INVALID/);
 }
});

test('existing Playwright CI reuses its browser and separately builds a production preview',()=>{
 const y=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 assert.match(y,/npx playwright install --with-deps chromium/);
 assert.match(y,/name: Build isolated local production preview for browser performance/);
 assert.match(y,/vite preview --host 127\.0\.0\.1 --port 3000 --strictPort/);
 assert.match(y,/node scripts\/ci-browser-performance\.mjs/);
 const script=readFileSync(new URL('../scripts/ci-browser-performance.mjs',import.meta.url),'utf8');
 assert.match(script,/waitUntil:'commit'/);
 assert.match(script,/locator\('main'\)\.waitFor/);
 assert.match(y,/artifacts\/ci-performance-browser\/summary\.json/);
 assert.doesNotMatch(y,/lhci collect|temporary-public-storage/);
});
