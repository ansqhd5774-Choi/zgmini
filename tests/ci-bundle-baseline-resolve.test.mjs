import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findExistingBundleBaseline,githubRead,RUNS_RESOURCE}
 from '../scripts/ci-bundle-baseline-resolve.mjs';

const run=(id,extra={})=>({
 id,name:'Node.js CI',event:'push',head_branch:'main',
 conclusion:'success',...extra
});
const artifacts=(list=[])=>({total_count:list.length,artifacts:list});
const target=(id)=>'actions/runs/'+id+'/artifacts?name=client-bundle-size-report&per_page=100';

test('finds existing main-push artifact and skips current run without repo-wide logs',async()=>{
 const calls=[];
 const result=await findExistingBundleBaseline({currentRunId:'100',read:async path=>{
  calls.push(path);
  if(path===RUNS_RESOURCE)return {workflow_runs:[run(100),run(101),run(102)]};
  if(path===target(101))return artifacts([{id:301,name:'unrelated',expired:false}]);
  if(path===target(102))return artifacts([{id:302,name:'client-bundle-size-report',expired:false}]);
  throw Error('unexpected resource '+path);
 }});
 assert.deepEqual(result,{runId:102,artifactId:302});
 assert.deepEqual(calls,[RUNS_RESOURCE,target(101),target(102)]);
});
test('absent or expired artifact stays unavailable, never a zero delta',async()=>{
 const result=await findExistingBundleBaseline({read:async path=>
  path===RUNS_RESOURCE?{workflow_runs:[run(22)]}:
   artifacts([{id:111,name:'client-bundle-size-report',expired:true}])
 });
 assert.equal(result,null);
});
test('bad API inventory, ids or duplicate artifacts fail closed',async()=>{
 await assert.rejects(findExistingBundleBaseline({read:async()=>({workflow_runs:new Array(11).fill(run(1))})}),
  /CI_BUNDLE_BASELINE_RUNS_UNVERIFIED/);
 await assert.rejects(findExistingBundleBaseline({read:async()=>({workflow_runs:[run(-1)]})}),
  /CI_BUNDLE_BASELINE_RUN_ID_UNVERIFIED/);
 await assert.rejects(findExistingBundleBaseline({read:async path=>
  path===RUNS_RESOURCE?{workflow_runs:[run(12)]}:
   artifacts([{id:1,name:'client-bundle-size-report',expired:false},
    {id:2,name:'client-bundle-size-report',expired:false}])
 }),/CI_BUNDLE_BASELINE_ARTIFACT_AMBIGUOUS/);
 await assert.rejects(findExistingBundleBaseline({read:async path=>
  path===RUNS_RESOURCE?{workflow_runs:[run(12)]}:
   {total_count:2,artifacts:[]}
 }),/CI_BUNDLE_BASELINE_ARTIFACTS_UNVERIFIED/);
});
test('Actions client uses only bounded official GET resources',async()=>{
 let called=0;
 const response=await githubRead(target(4),'fixture-token',async(url,options)=>{
  called++;
  assert.ok(url.endsWith('/'+target(4)));
  assert.equal(options.method,'GET');
  return {ok:true,json:async()=>artifacts()};
 });
 assert.equal(called,1);
 assert.equal(response.total_count,0);
 await assert.rejects(githubRead('issues?per_page=100','fixture-token',async()=>{
  called++;return {ok:true};
 }),/CI_BUNDLE_BASELINE_RESOURCE_NOT_ALLOWED/);
 await assert.rejects(githubRead(RUNS_RESOURCE,'fixture-token',async()=>{
  called++;return {ok:false,status:403};
 }),/CI_BUNDLE_BASELINE_HTTP_403/);
 assert.equal(called,2);
});
test('existing Node workflow only adds optional read-only compare steps',()=>{
 const yaml=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 assert.match(yaml,/actions: read/);
 assert.match(yaml,/node scripts\/ci-bundle-baseline-resolve\.mjs/);
 assert.match(yaml,/actions\/download-artifact@v4/);
 assert.match(yaml,/node scripts\/ci-bundle-size\.mjs --compare-baseline/);
 assert.match(yaml,/artifacts\/ci-bundle-size\/\*\.json/);
 assert.doesNotMatch(yaml,/CI_BUNDLE_BUDGET_MANDATORY/);
});
