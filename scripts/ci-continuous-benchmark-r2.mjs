// R2 #36 Continuous CI Benchmarking. Uses official Actions metadata only.
// This is descriptive telemetry, never a release gate or cost/improvement claim.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const SCOPE='ZGMINI_MAIN_PUSH_NODE_CI_LAST_10_COMPLETED';
const REPO='ansqhd5774-Choi/zgmini';
const LIST='actions/workflows/node.js.yml/runs?branch=main&event=push&status=completed&per_page=10';
const FINAL=new Set(['success','failure','cancelled','timed_out','neutral','skipped']);
const round=n=>Math.round(n*10)/10;
function time(value){
 if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value))
  throw Error('CI_BENCH_TIMESTAMP_UNVERIFIED');
 const t=Date.parse(value);
 if(!Number.isFinite(t))throw Error('CI_BENCH_TIMESTAMP_UNVERIFIED');
 return t;
}
const median=arr=>{
 if(!arr.length)return null;
 const a=[...arr].sort((x,y)=>x-y),i=Math.floor(a.length/2);
 return round(a.length%2?a[i]:(a[i-1]+a[i])/2);
};
const p90=arr=>arr.length?round([...arr].sort((x,y)=>x-y)[Math.ceil(.9*arr.length)-1]):null;
export function summarizeWindow(rows){
 if(!Array.isArray(rows))throw Error('CI_BENCH_ROWS_INVALID');
 const measured=rows.flatMap(row=>row.jobs.filter(j=>j.durationSeconds!==null));
 const queues=measured.map(j=>j.queueSeconds);
 const runs=measured.map(j=>j.durationSeconds);
 return {runs:rows.length,jobs:rows.reduce((n,r)=>n+r.jobs.length,0),
  timedJobs:measured.length,queueP50Seconds:median(queues),
  queueP90Seconds:p90(queues),runP50Seconds:median(runs),
  runP90Seconds:p90(runs)};
}
export function describeJob(job){
 if(!job||job.status!=='completed'||!FINAL.has(job.conclusion))
  throw Error('CI_BENCH_JOB_UNVERIFIED');
 if(job.conclusion==='skipped'||(job.conclusion==='cancelled'&&!job.started_at))
  return {conclusion:job.conclusion,queueSeconds:null,durationSeconds:null};
 const created=time(job.created_at),start=time(job.started_at),done=time(job.completed_at);
 if(start<created||done<start)throw Error('CI_BENCH_NEGATIVE_DURATION');
 return {conclusion:job.conclusion,queueSeconds:round((start-created)/1000),
  durationSeconds:round((done-start)/1000)};
}
export function summarizeTrend(rows){
 if(!Array.isArray(rows)||rows.length>10||rows.some(r=>!Array.isArray(r?.jobs)))
  throw Error('CI_BENCH_RUNS_INVALID');
 const recent=summarizeWindow(rows.slice(0,5)),previous=summarizeWindow(rows.slice(5,10));
 const comparable=recent.timedJobs>=3&&previous.timedJobs>=3;
 const baseline=previous.runP50Seconds;
 const delta=comparable&&baseline!==null&&baseline>0
  ?round((recent.runP50Seconds/baseline-1)*100):null;
 const failures=rows.filter(r=>r.conclusion==='failure').length;
 return {schemaVersion:1,scope:SCOPE,readOnly:true,autoBudgetGate:false,
  baselineStatus:comparable?'OBSERVED_UNADJUSTED':'INSUFFICIENT_COMPARABLE_HISTORY',
  sampledRuns:rows.length,failedRuns:failures,
  recent,previous,changeInMedianExecutionPercent:delta,
  runIds:rows.map(r=>({id:r.id,attempt:r.attempt,conclusion:r.conclusion}))};
}
export async function collectBenchmark(request){
 if(typeof request!=='function')throw Error('CI_BENCH_REQUEST_REQUIRED');
 const page=await request(LIST);
 if(!page||!Array.isArray(page.workflow_runs)||page.workflow_runs.length>10||
    !Number.isSafeInteger(page.total_count)||
    page.total_count<page.workflow_runs.length)
  throw Error('CI_BENCH_RUN_LIST_INCOMPLETE');
 const input=page.workflow_runs;
 const runs=[];
 for(const run of input){
  if(!run||run.name!=='Node.js CI'||run.head_branch!=='main'||
     run.event!=='push'||run.status!=='completed'||!FINAL.has(run.conclusion)||
     !Number.isSafeInteger(run.id)||run.id<1||
     !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1)
   throw Error('CI_BENCH_RUN_INVALID');
  const path='actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100';
  const response=await request(path);
  if(!response||!Array.isArray(response.jobs)||
     !Number.isSafeInteger(response.total_count)||response.total_count>100||
     response.total_count!==response.jobs.length)
   throw Error('CI_BENCH_JOBS_INCOMPLETE');
  runs.push({id:run.id,attempt:run.run_attempt,conclusion:run.conclusion,
   jobs:response.jobs.map(describeJob)});
 }
 return summarizeTrend(runs);
}
export async function githubRequest(resource,token,fetcher=fetch){
 if(typeof token!=='string'||!token.trim())throw Error('CI_BENCH_TOKEN_MISSING');
 if(resource!==LIST&&!/^actions\/runs\/[1-9]\d*\/attempts\/[1-9]\d*\/jobs\?per_page=100$/.test(resource))
  throw Error('CI_BENCH_RESOURCE_DENIED');
 const response=await fetcher('https://api.github.com/repos/'+REPO+'/'+resource,{
  method:'GET',headers:{Authorization:'Bearer '+token,
   Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
  signal:AbortSignal.timeout(15000)});
 if(!response?.ok)throw Error('CI_BENCH_HTTP_'+(response?.status??'UNKNOWN'));
 return response.json();
}
async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')
  throw Error('CI_BENCH_CI_ONLY');
 const report=await collectBenchmark(path=>githubRequest(path,process.env.GITHUB_TOKEN));
 const dir=resolve('artifacts/ci-continuous-benchmark');
 await mkdir(dir,{recursive:true});
 await writeFile(resolve(dir,'report.json'),JSON.stringify(report,null,2)+'\n','utf8');
 console.log('CI_CONTINUOUS_BENCHMARK '+JSON.stringify({
  scope:report.scope,status:report.baselineStatus,
  sampledRuns:report.sampledRuns,failedRuns:report.failedRuns,
  recent:report.recent,previous:report.previous,
  changeInMedianExecutionPercent:report.changeInMedianExecutionPercent
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
