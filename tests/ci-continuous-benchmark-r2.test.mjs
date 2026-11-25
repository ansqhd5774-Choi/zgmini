import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectBenchmark,describeJob,summarizeTrend,githubRequest,SCOPE}
 from '../scripts/ci-continuous-benchmark-r2.mjs';
const date=s=>new Date(Date.UTC(2026,10,24,21,0,s)).toISOString();
const job=(q,run,conclusion='success')=>({
 status:'completed',conclusion,created_at:date(0),
 started_at:date(q),completed_at:date(q+run)
});
const row=(id,q,run,conclusion='success')=>({
 id,attempt:1,conclusion,jobs:[describeJob(job(q,run,conclusion))]
});
test('ten recent runs report two five-run windows with clear queue and execution percentiles',()=>{
 const input=Array.from({length:10},(_,i)=>row(100+i,1+i,10*(i+1)));
 const result=summarizeTrend(input);
 assert.equal(result.scope,SCOPE);
 assert.equal(result.recent.runP50Seconds,30);
 assert.equal(result.previous.runP50Seconds,80);
 assert.equal(result.changeInMedianExecutionPercent,-62.5);
 assert.equal(result.recent.queueP90Seconds,5);
 assert.equal(result.previous.queueP50Seconds,8);
 assert.equal(result.autoBudgetGate,false);
});
test('few comparable historical samples stay unverified; no zero improvement invented',()=>{
 const summary=summarizeTrend([row(1,3,5),row(2,4,6)]);
 assert.equal(summary.sampledRuns,2);
 assert.equal(summary.baselineStatus,'INSUFFICIENT_COMPARABLE_HISTORY');
 assert.equal(summary.previous.runP50Seconds,null);
 assert.equal(summary.changeInMedianExecutionPercent,null);
});
test('cancelled before start and skipped jobs do not fabricate zero execution',()=>{
 const skip=describeJob({status:'completed',conclusion:'skipped',created_at:null,
  started_at:null,completed_at:null});
 const cancel=describeJob({status:'completed',conclusion:'cancelled',created_at:date(0),
  started_at:null,completed_at:date(10)});
 assert.equal(skip.durationSeconds,null);
 assert.equal(cancel.queueSeconds,null);
 const out=summarizeTrend([{id:10,attempt:1,conclusion:'cancelled',jobs:[cancel]}]);
 assert.equal(out.recent.timedJobs,0);
 assert.equal(out.recent.runP50Seconds,null);
});
test('invalid job timestamp, negative and missing completed time reject as unverified',()=>{
 assert.throws(()=>describeJob(job(12,-3)),/CI_BENCH_NEGATIVE_DURATION/);
 assert.throws(()=>describeJob({...job(1,4),started_at:null}),/CI_BENCH_TIMESTAMP_UNVERIFIED/);
 assert.throws(()=>describeJob({...job(1,4),completed_at:'later'}),/CI_BENCH_TIMESTAMP_UNVERIFIED/);
 assert.throws(()=>describeJob({...job(1,4),conclusion:'queued'}),/CI_BENCH_JOB_UNVERIFIED/);
});
test('collects exact bounded latest main push runs and their current job attempts',async()=>{
 const a={id:123,run_attempt:2,name:'Node.js CI',head_branch:'main',
  event:'push',status:'completed',conclusion:'failure'};
 const list='actions/workflows/node.js.yml/runs?branch=main&event=push&status=completed&per_page=10';
 const calls=[];
 const out=await collectBenchmark(async path=>{
  calls.push(path);
  if(path===list)return {total_count:1,workflow_runs:[a]};
  assert.equal(path,'actions/runs/123/attempts/2/jobs?per_page=100');
  return {total_count:1,jobs:[job(5,20,'failure')]};
 });
 assert.deepEqual(calls,[list,'actions/runs/123/attempts/2/jobs?per_page=100']);
 assert.equal(out.failedRuns,1);
 assert.equal(out.recent.runP50Seconds,20);
 assert.deepEqual(out.runIds,[{id:123,attempt:2,conclusion:'failure'}]);
});
test('malformed or incomplete API inventories do not silently become empty baseline',async()=>{
 await assert.rejects(collectBenchmark(async()=>({total_count:2,workflow_runs:[null]})),
  /CI_BENCH_RUN_INVALID/);
 const list='actions/workflows/node.js.yml/runs?branch=main&event=push&status=completed&per_page=10';
 await assert.rejects(collectBenchmark(async path=>path===list?
  {total_count:1,workflow_runs:[{id:9,run_attempt:1,name:'Node.js CI',
   head_branch:'main',event:'push',status:'completed',conclusion:'success'}]}:
  {total_count:1,jobs:[]}),/CI_BENCH_JOBS_INCOMPLETE/);
 await assert.rejects(collectBenchmark(async()=>({total_count:0,workflow_runs:[{}]})),
  /CI_BENCH_RUN_LIST_INCOMPLETE/);
});
test('GitHub API requests are GET only, allowlisted and fail on actual 403',async()=>{
 let request=null;
 const path='actions/workflows/node.js.yml/runs?branch=main&event=push&status=completed&per_page=10';
 await githubRequest(path,'fixture-token',async(url,options)=>{
  request={url,method:options.method,accept:options.headers.Accept};
  return {ok:true,json:async()=>({total_count:0,workflow_runs:[]})};
 });
 assert.equal(request.method,'GET');
 assert.equal(request.url,'https://api.github.com/repos/ansqhd5774-Choi/zgmini/'+path);
 assert.equal(request.accept,'application/vnd.github+json');
 await assert.rejects(githubRequest('issues?state=open','token',async()=>null),
  /CI_BENCH_RESOURCE_DENIED/);
 await assert.rejects(githubRequest(path,'token',async()=>({ok:false,status:403})),
  /CI_BENCH_HTTP_403/);
});
test('existing Node CI runs official bounded benchmarking on same job and uploads evidence',()=>{
 const y=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 assert.match(y,/actions: read/);
 assert.match(y,/node scripts\/ci-continuous-benchmark-r2\.mjs/);
 assert.match(y,/artifacts\/ci-continuous-benchmark\/report\.json/);
 assert.match(y,/node --test tests\/\*\.test\.mjs/);
 assert.match(y,/node scripts\/ci-supply-chain-review\.mjs/);
 assert.match(y,/npm audit --omit=dev --audit-level=high/);
 assert.doesNotMatch(y,/continue-on-error:\s*true/);
});
