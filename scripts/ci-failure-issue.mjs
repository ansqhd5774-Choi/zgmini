// CI failure → existing/new Issue; metadata only, never fetch or publish job logs.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const REPO='ansqhd5774-Choi/zgmini';
export const WORKFLOWS=Object.freeze(["Node.js CI","CodeQL JavaScript TypeScript","Source Secret Scan","Community Chat Browser UI (Mocked API)","Community Chat Candidate Build (Read Only)"]);
const fail=code=>{throw Error('CI_INCIDENT_'+code);};
const goodId=value=>Number.isSafeInteger(value)&&value>0;
const clean=value=>String(value??'').replace(/[^A-Za-z0-9 ._():/\-]/g,' ').trim().slice(0,110);
export const keyFor=(workflow,job,step)=>createHash('sha256')
 .update(JSON.stringify([workflow,job,step])).digest('hex').slice(0,24);
export const markerFor=key=>'<!-- zgmini-ci-failure:'+key+' -->';

// A step locates a failed check; it does not prove the underlying cause.
// Unknown causes stay isolated by Run, Attempt, Job and Step.
export const caseKeyFor=(workflow,job,step,runId,attempt,jobId,stepNumber)=>
 createHash('sha256')
  .update(JSON.stringify([workflow,job,step,runId,attempt,jobId,stepNumber]))
  .digest('hex').slice(0,24);

// Exhaust the exact attempt inventory rather than silently ignoring later jobs.
// GitHub caps per_page at 100. Fail closed if a page is short or inconsistent.
const PAGE_SIZE=100;
const MAX_PAGES=10;
async function verifiedJobsForAttempt(request,run){
 const prefix='actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100';
 const first=await request(prefix);
 const total=first?.total_count;
 if(!Number.isSafeInteger(total)||total<0||total>PAGE_SIZE*MAX_PAGES||
    !Array.isArray(first?.jobs)||first.jobs.length!==Math.min(PAGE_SIZE,total))
   fail('JOB_INVENTORY_INCOMPLETE');
 const jobs=[...first.jobs];
 for(let page=2;jobs.length<total&&page<=MAX_PAGES;page++){
  const result=await request(prefix+'&page='+page);
  const expected=Math.min(PAGE_SIZE,total-jobs.length);
  if(result?.total_count!==total||!Array.isArray(result?.jobs)||
     result.jobs.length!==expected)fail('JOB_INVENTORY_INCOMPLETE');
  jobs.push(...result.jobs);
 }
 if(jobs.length!==total)fail('JOB_INVENTORY_INCOMPLETE');
 const identities=jobs.map(j=>j?.id);
 if(identities.some(id=>!goodId(id))||new Set(identities).size!==identities.length)
   fail('JOB_IDENTITY_INVALID');
 return jobs;
}

async function verifiedIssueComments(request,issueNumber){
 const comments=[];
 for(let page=1;page<=MAX_PAGES;page++){
  const path='issues/'+issueNumber+'/comments?per_page=100'+
   (page===1?'':'&page='+page);
  const batch=await request(path);
  if(!Array.isArray(batch)||batch.length>PAGE_SIZE)fail('COMMENTS_UNVERIFIED');
  comments.push(...batch);
  if(batch.length<PAGE_SIZE)return comments;
 }
 fail('COMMENTS_UNVERIFIED');
}

export async function triage({event,repository=REPO,request}){
 if(typeof request!=='function')fail('IO_MISSING');
 const run=event?.workflow_run;
 if(event?.action!=='completed'||event.repository?.full_name!==REPO||
    event.repository.private!==false||
    repository!==REPO||!run||!WORKFLOWS.includes(run.name)||
    !['pull_request','push','workflow_dispatch'].includes(run.event)||
    run.head_repository?.full_name!==REPO||
    run.status!=='completed'||!['failure','timed_out'].includes(run.conclusion))
  return {state:'IGNORED'};
 if(!goodId(run.id)||!goodId(run.run_attempt)||
    !/^[a-f0-9]{40}$/.test(run.head_sha??''))fail('RUN_IDENTITY_INVALID');
 const jobs=await verifiedJobsForAttempt(request,run);
 const broken=jobs.filter(j=>['failure','timed_out'].includes(j.conclusion))
   .sort((a,b)=>String(a.name).localeCompare(String(b.name))||a.id-b.id);
 if(broken.some(j=>!goodId(j.id)))fail('JOB_IDENTITY_INVALID');
 const cases=[];
 for(const job of broken){
  const steps=Array.isArray(job.steps)?job.steps:[];
  const failedSteps=steps.map((step,index)=>({step,index}))
   .filter(({step})=>['failure','timed_out'].includes(step?.conclusion));
  if(!failedSteps.length)failedSteps.push({step:null,index:-1});
  for(const {step,index} of failedSteps){
   const jobName=clean(job.name||'FAILED_JOB_UNNAMED');
   const stepName=clean(step?.name||
    (job.conclusion==='timed_out'?'JOB_TIMEOUT':'FAILURE_STEP_UNVERIFIED'));
   const stepNumber=step?.number??(index<0?0:index+1);
   if(!Number.isSafeInteger(stepNumber)||stepNumber<0)fail('STEP_IDENTITY_INVALID');
   cases.push({job,jobName,stepName,stepNumber,
    key:caseKeyFor(run.name,jobName,stepName,run.id,run.run_attempt,job.id,stepNumber),
    legacyMarker:markerFor(keyFor(run.name,jobName,stepName))});
  }
 }
 if(!cases.length)cases.push({job:{id:0},jobName:'WORKFLOW_LEVEL_FAILURE',
  stepName:'FAILURE_STEP_UNVERIFIED',stepNumber:0,
  key:caseKeyFor(run.name,'WORKFLOW_LEVEL_FAILURE','FAILURE_STEP_UNVERIFIED',run.id,run.run_attempt,0,0),
  legacyMarker:markerFor(keyFor(run.name,'WORKFLOW_LEVEL_FAILURE','FAILURE_STEP_UNVERIFIED'))});
 const openIssues=[];
 for(let page=1;page<=10;page++){
  const list=await request('issues?state=open&per_page=100&page='+page);
  if(!Array.isArray(list))fail('ISSUE_INVENTORY_INVALID');
  openIssues.push(...list.filter(i=>!i.pull_request&&typeof i.body==='string'&&
    i.user?.login==='github-actions[bot]'));
  if(list.length<100)break;
  if(page===10)fail('ISSUE_INVENTORY_INCOMPLETE');
 }
 const results=[];
 for(const incident of cases){
  const marker=markerFor(incident.key);
  const receipt='<!-- zgmini-ci-run:'+run.id+':'+run.run_attempt+
    ':job:'+incident.job.id+':step:'+incident.stepNumber+' -->';
  const runUrl='https://github.com/'+REPO+'/actions/runs/'+run.id;
  const legacy=openIssues.find(i=>i.body.includes(incident.legacyMarker));
  const evidence=[receipt,'**CI 실패 관측 (원인 미확정, 실행별 독립 사건)**',
   '- Workflow: '+clean(run.name),'- Job: '+incident.jobName,
   '- Job ID: '+incident.job.id,'- Step: '+incident.stepName,
   '- Step number: '+incident.stepNumber,'- Conclusion: '+run.conclusion,
   '- Run: '+runUrl,'- Attempt: '+run.run_attempt,
   '- HEAD: '+String.fromCharCode(96)+run.head_sha+String.fromCharCode(96),
   '- 분류: 실행·Job·Step 위치만 확인됨. 동일 근본 원인으로 추정하거나 로그를 게시하지 않음.'
  ].join('\n');
  const matches=openIssues.filter(i=>i.body.includes(marker));
  if(matches.length>1)fail('DUPLICATE_INCIDENT_ISSUES');
  if(matches.length){
   const found=matches[0];
   const comments=await verifiedIssueComments(request,found.number);
   if(comments.some(c=>c.body?.includes(receipt))||found.body.includes(receipt)){
    results.push({state:'REUSED',issue:found.number});continue;
   }
   const posted=await request('issues/'+found.number+'/comments',
    {method:'POST',body:{body:evidence}});
   if(!goodId(posted?.id))fail('ISSUE_COMMENT_RESULT_UNKNOWN');
   const confirmed=await request('issues/comments/'+posted.id);
   if(confirmed?.id!==posted.id||typeof confirmed.body!=='string'||
      !confirmed.body.includes(receipt)||!confirmed.body.includes(runUrl))
     fail('ISSUE_COMMENT_READBACK');
   results.push({state:'COMMENTED',issue:found.number});continue;
  }
  const title='[CI] '+clean(run.name)+' / '+incident.jobName+' / '+incident.stepName+
   ' / Run '+run.id+' Attempt '+run.run_attempt;
  const crossLink=legacy?'\n이전 Step 묶음 이력: #'+legacy.number+
    ' (동일 원인이라는 뜻이 아님).':'';
  const created=await request('issues',{method:'POST',
   body:{title,body:[marker,evidence,crossLink,
    '\n근본 원인이 확인되기 전에는 다른 Run과 합치지 않으며 자동 재실행·자동 종료하지 않습니다.'].join('\n')}});
  if(!goodId(created?.number))fail('ISSUE_CREATE_RESULT_UNKNOWN');
  const check=await request('issues/'+created.number);
  if(check?.number!==created.number||!check?.body?.includes(marker))fail('ISSUE_CREATE_READBACK');
  openIssues.push({number:created.number,body:check.body,user:{login:'github-actions[bot]'}});
  results.push({state:'CREATED',issue:created.number});
 }
 return results.length===1?results[0]:{state:'MULTIPLE_INCIDENTS',incidents:results};
}

export async function main(env=process.env,fetcher=fetch){
 if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_EVENT_NAME!=='workflow_run')fail('EVENT_SCOPE');
 if(!env.GITHUB_TOKEN||!env.GITHUB_EVENT_PATH)fail('AUTH_OR_EVENT_MISSING');
 const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
 const request=async(resource,{method='GET',body}={})=>{
  const response=await fetcher('https://api.github.com/repos/'+REPO+'/'+resource,{
   method,headers:{accept:'application/vnd.github+json',
    authorization:'Bearer '+env.GITHUB_TOKEN,
    'x-github-api-version':'2022-11-28','content-type':'application/json'},
   body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000)});
  if(!response.ok)fail('GITHUB_HTTP_'+response.status);
  return response.json();
 };
 const result=await triage({event,request});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
