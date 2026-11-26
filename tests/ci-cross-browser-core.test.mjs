import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {finalizeCrossBrowser,ENGINES,ROUTES,VIEWPORTS,FIXTURE}
 from '../scripts/ci-cross-browser-core.mjs';

const matrix=()=>ENGINES.flatMap(engine=>VIEWPORTS.flatMap(viewport=>
 ROUTES.map(route=>({engine,viewport:viewport.name,route,
  httpStatus:200,mainPresent:true,titlePresent:true,
  overflowPx:0,javascriptErrors:0}))));

test('exact two engines, two routes and two viewports produce eight observations',()=>{
 const report=finalizeCrossBrowser(matrix());
 assert.equal(report.observations.length,8);
 assert.deepEqual(report.engines,['firefox','webkit']);
 assert.deepEqual(report.routes,['/','/about/']);
 assert.equal(report.fixture,FIXTURE);
 assert.equal(report.productionVerified,false);
 assert.equal(report.baselineStatus,'NOT_APPROVED');
});
test('missing or duplicated browser observations fail closed',()=>{
 const rows=matrix();
 assert.throws(()=>finalizeCrossBrowser(rows.slice(1)),/MATRIX_INCOMPLETE/);
 rows[7]={...rows[0]};
 assert.throws(()=>finalizeCrossBrowser(rows),/RESULT_INVALID/);
});
test('document failures and corrupt measurements fail closed',()=>{
 const cases=[
  {httpStatus:503},{mainPresent:false},{overflowPx:null},
  {overflowPx:-1},{javascriptErrors:null},{engine:'chromium'},
  {route:'/api/private'}, {viewport:'unknown'}
 ];
 for(const altered of cases){
  const rows=matrix();rows[0]={...rows[0],...altered};
  assert.throws(()=>finalizeCrossBrowser(rows),/RESULT_INVALID/);
 }
});
test('browser-specific layout and pageerror counts remain observations, not invented PASS',()=>{
 const rows=matrix();rows[0].overflowPx=14;rows[0].javascriptErrors=2;
 const report=finalizeCrossBrowser(rows);
 assert.equal(report.observations[0].overflowPx,14);
 assert.equal(report.observations[0].javascriptErrors,2);
 assert.equal(report.baselineStatus,'NOT_APPROVED');
});
test('existing CI installs Firefox and WebKit without replacing 19 Chromium checks',()=>{
 const y=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 assert.match(y,/npx playwright install --with-deps chromium firefox webkit/);
 assert.match(y,/node scripts\/ci-cross-browser-core\.mjs/);
 assert.match(y,/artifacts\/ci-cross-browser\//);
 assert.match(y,/'scripts\/ci-cross-browser-core\.mjs'/);
 assert.match(y,/'tests\/ci-cross-browser-core\.test\.mjs'/);
 assert.equal([...y.matchAll(/run:\s+node\s+(tests\/[^\s'"]+\.mjs)/g)].length,19);
 assert.match(y,/node scripts\/ci-performance-lab\.mjs/);
 assert.doesNotMatch(y,/continue-on-error:\s*true/);
});
