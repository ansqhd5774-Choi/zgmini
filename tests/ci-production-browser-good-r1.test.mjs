import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WEB_SPEED_GOOD} from '../scripts/ci-web-speed-good-r2.mjs';
import {
 PROD_ORIGIN,PROD_ROUTES,PROD_VIEWPORTS,PROD_FIXTURE,PROD_SCHEMA,
 classifyProductionPage,summarizeProductionLab,runProductionLab
} from '../scripts/ci-production-browser-good-r1.mjs';

const sample=(route='/',viewport=PROD_VIEWPORTS[0],metrics={
 responseEndMs:130,domContentLoadedMs:190,
 fcpMs:350,lcpMs:900,cls:0,longTaskTotalMs:60
})=>({schemaVersion:PROD_SCHEMA,fixture:PROD_FIXTURE,route,
 url:PROD_ORIGIN+route,viewport,browserVersion:'Chrome-test',
 documentStatus:200,mainFound:true,blockedWriteRequests:0,
 blockedThirdPartyRequests:1,pageErrors:[],error:null,metrics});
const all=()=>PROD_ROUTES.flatMap(route=>PROD_VIEWPORTS.map(v=>sample(route,v)));

test('production read-only lab tracks exactly homepage and economic overview',()=>{
 assert.equal(PROD_ORIGIN,'https://zgmini.kr');
 assert.deepEqual(PROD_ROUTES,['/','/economic-indicators/']);
 assert.deepEqual(PROD_VIEWPORTS,[{width:390,height:844},{width:1440,height:900}]);
 assert.equal(PROD_SCHEMA,1);
});
test('observed Good laboratory metrics do not claim actual user field P75',()=>{
 const report=summarizeProductionLab(all());
 assert.equal(report.scope,'PRODUCTION_HEADLESS_FIRST_PARTY_ONLY');
 assert.equal(report.source,PROD_ORIGIN);
 assert.equal(report.coreWebVitalsFieldP75,'UNVERIFIED');
 assert.equal(report.inpFieldP75,'NOT_MEASURED');
 assert.equal(report.lighthousePerformanceScore,'NOT_MEASURED');
 assert.equal(report.siteGoodVerified,false);
 assert.equal(report.mergeBlocking,false);
 assert.equal(report.observations.length,4);
 assert(report.observations.every(v=>v.state==='PRODUCTION_LAB_MEASURED_TARGETS_MET'));
});
test('a genuine zero CLS is not a missing observation',()=>{
 const r=classifyProductionPage(sample());
 assert.equal(r.metrics.cls.observed,0);
 assert.equal(r.metrics.cls.state,'AT_OR_BELOW_GOOD_TARGET');
 assert.equal(r.metrics.cls.limit,WEB_SPEED_GOOD.cls);
});
test('just above Good CLS boundary cannot pass a production browser measurement',()=>{
 const s=sample();s.metrics.cls=0.10001;
 const out=classifyProductionPage(s);
 assert.equal(out.state,'PRODUCTION_LAB_GOOD_EXCEEDED');
 assert.equal(out.metrics.cls.observed,0.10001);
 assert.equal(out.metrics.cls.state,'EXCEEDS_GOOD_TARGET');
});
test('missing paint, missing page main or network failure cannot be Good',()=>{
 const missing=sample();missing.metrics.lcpMs=null;
 assert.equal(classifyProductionPage(missing).state,'PRODUCTION_LAB_METRICS_UNVERIFIED');
 assert.equal(classifyProductionPage(missing).metrics.lcpMs.state,'UNVERIFIED');
 const missingMain=sample();missingMain.mainFound=false;
 assert.equal(classifyProductionPage(missingMain).state,'PRODUCTION_LOAD_UNVERIFIED');
 const network=sample();network.documentStatus=null;network.error='timeout';
 assert.equal(classifyProductionPage(network).state,'PRODUCTION_LOAD_UNVERIFIED');
});
test('source or viewport mismatch and duplicate measurements reject false evidence',()=>{
 for(const patch of [
  s=>{s.fixture='other';},
  s=>{s.url='https://attacker.example/';},
  s=>{s.route='/api/market-score';},
  s=>{s.viewport={width:100,height:100};},
  s=>{s.blockedWriteRequests=-1;},
  s=>{s.schemaVersion=0;}
 ]){
  const value=sample();patch(value);
  assert.throws(()=>classifyProductionPage(value),/CI_PRODUCTION_SPEED_SAMPLE_INVALID/);
 }
 const rows=all();rows[1]=rows[0];
 assert.throws(()=>summarizeProductionLab(rows),/CI_PRODUCTION_SPEED_DUPLICATE_VIEWPORT/);
 assert.throws(()=>summarizeProductionLab([rows[0]]),
  /CI_PRODUCTION_SPEED_INCOMPLETE_SAMPLES/);
});
test('runtime JS exceptions or blocked writes cannot falsely certify laboratory Good',()=>{
 const jsError=sample();
 jsError.pageErrors=['uncaught render exception'];
 assert.equal(classifyProductionPage(jsError).state,'PRODUCTION_LAB_RUNTIME_UNVERIFIED');
 const blockedWrite=sample();
 blockedWrite.blockedWriteRequests=1;
 assert.equal(classifyProductionPage(blockedWrite).state,'PRODUCTION_LAB_RUNTIME_UNVERIFIED');
 const badEvidence=sample();
 delete badEvidence.pageErrors;
 assert.throws(()=>classifyProductionPage(badEvidence),
  /CI_PRODUCTION_SPEED_SAMPLE_INVALID/);
 const slow=sample();
 slow.pageErrors=['uncaught render exception'];
 slow.metrics.cls=0.12;
 assert.equal(classifyProductionPage(slow).state,'PRODUCTION_LAB_GOOD_EXCEEDED');
});
test('browser start rejects arbitrary origins and unauthorized measurement options',async()=>{
 let launched=false;
 const stub={launch:async()=>{launched=true;throw Error('DO_NOT_START');}};
 for(const options of [{origin:'http://zgmini.kr'}, {origin:'https://evil.example'},
  {delayMs:0},{delayMs:999999}]){
  await assert.rejects(runProductionLab({chromium:stub,...options}),
   /CI_PRODUCTION_SPEED_SCOPE_INVALID/);
 }
 assert.equal(launched,false);
});
test('actual browser lab blocks third-party origins and all write methods',()=>{
 const src=readFileSync(new URL('../scripts/ci-production-browser-good-r1.mjs',import.meta.url),'utf8');
 assert.match(src,/sameOrigin=new URL\(request.url\(\)\)\.origin===PROD_ORIGIN/);
 assert.match(src,/if\(!sameOrigin\)/);
 assert.match(src,/\['GET','HEAD'\]\.includes\(request.method\(\)\)/);
 assert.match(src,/return network\.abort\('blockedbyclient'\)/);
 assert.match(src,/serviceWorkers:'block'/);
 assert.match(src,/CI_PRODUCTION_SPEED_CI_ONLY/);
 assert.doesNotMatch(src,/page\.click\(|page\.fill\(/);
});
test('CI reuses existing browser and artifact path without new workflows',()=>{
 const y=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const prior=y.indexOf('      - name: Evaluate official Google Good web-speed reference');
 const step=y.indexOf('      - name: Observe production first-party read-only page speed');
 const axe=y.indexOf('      - name: Measure local WCAG A/AA accessibility with axe-core');
 assert(prior>=0&&step>prior&&axe>step);
 assert.match(y,/run: node scripts\/ci-production-browser-good-r1\.mjs/);
 assert.match(y,/artifacts\/performance-lab\//);
 assert.match(y,/node scripts\/ci-pagespeed-real-user-field-r1\.mjs/);
 assert.match(y,/node scripts\/ci-cross-browser-core\.mjs/);
 assert.match(y,/node scripts\/ci-accessibility-axe\.mjs/);
});
