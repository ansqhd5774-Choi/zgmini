import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE,ORIGIN,API,STRATEGIES,CRUX_KEYS,FIELD_SCOPE,
 evaluatePsiFieldResponse,unavailablePsiResult,queryPsiField,summarizePsiDevices
} from '../scripts/ci-pagespeed-real-user-field-r1.mjs';

const fields=(lcp=2500,inp=200,cls=10)=>({
 LARGEST_CONTENTFUL_PAINT_MS:{percentile:lcp},
 INTERACTION_TO_NEXT_PAINT:{percentile:inp},
 CUMULATIVE_LAYOUT_SHIFT_SCORE:{percentile:cls}
});
const base=(overrides={})=>({id:PAGE,analysisUTCTimestamp:'2026-11-25T06:00:00Z',
 loadingExperience:{id:PAGE,metrics:fields()},
 originLoadingExperience:{id:ORIGIN,metrics:fields(2550,210,11)},
 lighthouseResult:{categories:{performance:{score:.90}}},
 ...overrides});

test('API is strictly public Google PSI route and fixed production origin',()=>{
 assert.equal(API,'https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
 assert.equal(PAGE,'https://zgmini.kr/');
 assert.deepEqual(STRATEGIES,['mobile','desktop']);
 assert.deepEqual(CRUX_KEYS,{
  lcpMs:'LARGEST_CONTENTFUL_PAINT_MS',
  inpMs:'INTERACTION_TO_NEXT_PAINT',
  cls:'CUMULATIVE_LAYOUT_SHIFT_SCORE'
 });
 assert.equal(FIELD_SCOPE,'PUBLIC_GOOGLE_PSI_CRUX_ROLLING_28_DAY_P75');
});
test('three P75 Core Vitals at Good boundaries must all be measured',()=>{
 const r=evaluatePsiFieldResponse('mobile',base());
 assert.equal(r.sourceStatus,'PSI_RECEIVED');
 assert.equal(r.dataScope,'PAGE_URL');
 assert.equal(r.fieldState,'FIELD_ALL_THREE_GOOD');
 assert.deepEqual(Object.fromEntries(Object.entries(r.metrics).map(([k,m])=>[k,m.p75])),
  {lcpMs:2500,inpMs:200,cls:0.1});
 assert.equal(r.lighthouse.score,90);
 assert.equal(r.lighthouse.state,'GOOD');
 assert.equal(r.approvedBlockingGate,false);
});
test('PSI CLS percentile is 100x native CLS, never compared directly',()=>{
 const r=evaluatePsiFieldResponse('desktop',base({
  loadingExperience:{id:PAGE,metrics:fields(2400,180,11)}
 }));
 assert.equal(r.metrics.cls.p75,0.11);
 assert.equal(r.metrics.cls.state,'EXCEEDS_GOOD');
 assert.equal(r.fieldState,'FIELD_GOOD_TARGET_EXCEEDED');
});
test('missing INP is not zero and never becomes full Good site',()=>{
 const r=base();delete r.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT;
 const v=evaluatePsiFieldResponse('mobile',r);
 assert.equal(v.fieldState,'FIELD_METRICS_INCOMPLETE');
 assert.equal(v.metrics.inpMs.p75,null);
 assert.equal(v.metrics.inpMs.state,'UNVERIFIED');
 assert.equal(v.metrics.cls.p75,0.1);
});
test('origin fallback always carries an ORIGIN_AGGREGATE label, no page claim',()=>{
 const r=evaluatePsiFieldResponse('mobile',base({
  loadingExperience:{id:PAGE,origin_fallback:true,metrics:fields(2400,190,5)}
 }));
 assert.equal(r.dataScope,'ORIGIN_AGGREGATE');
 assert.equal(r.metrics.lcpMs.p75,2550);
 assert.equal(r.fieldState,'FIELD_GOOD_TARGET_EXCEEDED');
 const missingOrigin=evaluatePsiFieldResponse('mobile',base({
  loadingExperience:{id:PAGE,origin_fallback:true,metrics:fields()},
  originLoadingExperience:{id:'https://attacker.example',metrics:fields()}
 }));
 assert.equal(missingOrigin.fieldState,'NO_CRUX_FIELD_DATA');
 assert.equal(missingOrigin.metrics.cls.p75,null);
});
test('insufficient traffic leaves all P75 metrics missing and field unverified',()=>{
 const r=evaluatePsiFieldResponse('mobile',base({
  loadingExperience:{id:PAGE,metrics:{}},
  originLoadingExperience:{id:ORIGIN,metrics:{}}
 }));
 assert.equal(r.fieldState,'NO_CRUX_FIELD_DATA');
 assert(Object.values(r.metrics).every(x=>x.p75===null&&x.state==='UNVERIFIED'));
});
test('production destination mismatch does not evaluate a different website',()=>{
 assert.throws(()=>evaluatePsiFieldResponse('mobile',base({id:'https://other.example/'})),
  /CI_PSI_FIELD_UNEXPECTED_TARGET/);
 assert.throws(()=>evaluatePsiFieldResponse('tablet',base()),
  /CI_PSI_FIELD_INVALID_RESPONSE/);
});
test('rate limit and provider HTTP 403 never become site PASS',async()=>{
 const requested=[];
 const f=async (url,options)=>{
  requested.push({url,options});
  return {ok:false,status:429};
 };
 const r=await queryPsiField('mobile',{fetchFn:f});
 assert.equal(r.sourceStatus,'HTTP_429');
 assert.equal(r.fieldState,'UNVERIFIED');
 assert.equal(r.metrics.inpMs.p75,null);
 assert.equal(requested.length,1);
 const u=new URL(requested[0].url);
 assert.equal(u.origin,'https://www.googleapis.com');
 assert.equal(u.searchParams.get('url'),PAGE);
 assert.equal(u.searchParams.get('strategy'),'mobile');
 assert.equal(u.searchParams.get('category'),'performance');
 assert.equal(requested[0].options.method,'GET');
 assert.equal(requested[0].options.redirect,'error');
 assert.equal(requested[0].options.headers.accept,'application/json');
 assert.equal((await queryPsiField('desktop',{
  fetchFn:async()=>({ok:false,status:403})
 })).sourceStatus,'HTTP_403');
});
test('transport or invalid PSI JSON reports UNVERIFIED without inventing lab data',async()=>{
 assert.equal((await queryPsiField('mobile',{
  fetchFn:async()=>{throw Error('connection reset');}
 })).sourceStatus,'TIMEOUT_OR_NETWORK');
 assert.equal((await queryPsiField('mobile',{
  fetchFn:async()=>({ok:true,json:async()=>{throw Error('bad JSON');}})
 })).sourceStatus,'INVALID_RESPONSE');
 assert.equal((await queryPsiField('mobile',{
  fetchFn:async()=>({ok:true,json:async()=>({id:'https://wrong.example'})})
 })).sourceStatus,'INVALID_RESPONSE');
});
test('site-level verdict requires both devices with all 3 real P75 values',()=>{
 const mobile=evaluatePsiFieldResponse('mobile',base());
 const desktop=evaluatePsiFieldResponse('desktop',base());
 assert.equal(summarizePsiDevices([mobile,desktop]).classification,'HOMEPAGE_BOTH_DEVICES_GOOD');
 const originPsi=base({loadingExperience:{id:PAGE,origin_fallback:true,metrics:fields(2000,100,5)},originLoadingExperience:{id:ORIGIN,metrics:fields(2000,100,5)}});
 const originMobile=evaluatePsiFieldResponse('mobile',originPsi);
 const originDesktop=evaluatePsiFieldResponse('desktop',originPsi);
 assert.equal(summarizePsiDevices([originMobile,originDesktop]).classification,'ORIGIN_BOTH_DEVICES_GOOD');
 assert.equal(summarizePsiDevices([mobile,originDesktop]).classification,'MIXED_SCOPE_GOOD_SITE_UNVERIFIED');
 const missing=unavailablePsiResult('desktop','HTTP_429');
 const partial=summarizePsiDevices([mobile,missing]);
 assert.equal(partial.classification,'SITE_FIELD_GOOD_UNVERIFIED');
 assert.equal(partial.automaticReleaseGate,false);
 assert.equal(partial.mergeBlocking,false);
 const poor=evaluatePsiFieldResponse('desktop',base({
  loadingExperience:{id:PAGE,metrics:fields(2501,200,10)}
 }));
 assert.equal(summarizePsiDevices([mobile,poor]).classification,'OBSERVED_SCOPE_GOOD_TARGET_EXCEEDED');
 assert.throws(()=>summarizePsiDevices([desktop,mobile]),
  /CI_PSI_DEVICE_INVENTORY_INVALID/);
});
test('existing browser workflow collects bounded PSI evidence with other UI tests unchanged',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const a=workflow.indexOf('      - name: Evaluate official Google Good web-speed reference');
 const b=workflow.indexOf('      - name: Observe Google public PSI real-user field vitals');
 const c=workflow.indexOf('      - name: Measure local WCAG A/AA accessibility with axe-core');
 assert(a>0&&b>a&&c>b);
 assert.match(workflow,/node scripts\/ci-pagespeed-real-user-field-r1\.mjs/);
 assert.match(workflow,/run_psi_field:\s*\n\s*description:/);
 assert.match(workflow,/default: false/);
 assert.match(workflow,/github\.event_name == 'workflow_dispatch' && inputs\.run_psi_field == true/);
 assert.match(workflow,/artifacts\/performance-lab\//);
 assert.match(workflow,/node scripts\/ci-cross-browser-core\.mjs/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
