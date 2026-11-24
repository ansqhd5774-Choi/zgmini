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
 const jobsResponse=await request('actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100');
 const jobs=jobsResponse?.jobs;
 if(!Array.isArray(jobs)||!Number.isSafeInteger(jobsResponse.total_count)||
    jobsResponse.total_count>100)fail('JOB_INVENTORY_INCOMPLETE');
 const broken=jobs.filter(j=>['failure','timed_out'].includes(j.conclusion))
   .sort((a,b)=>String(a.name).localeCompare(String(b.name)));
 const job=broken[0];
 const jobName=clean(job?.name||'WORKFLOW_LEVEL_FAILURE');
 const stepName=clean(job?.steps?.find(s=>s.conclusion==='failure')?.name||
    (job?.conclusion==='timed_out'?'JOB_TIMEOUT':'FAILURE_STEP_UNVERIFIED'));
 const key=keyFor(run.name,jobName,stepName),marker=markerFor(key);
 const receipt='<!-- zgmini-ci-run:'+run.id+':'+run.run_attempt+' -->';
 const runUrl='https://github.com/'+REPO+'/actions/runs/'+run.id;
 const evidence=[receipt,'**CI 실패 관측**', '- Workflow: '+clean(run.name),
  '- Job: '+jobName,'- Step: '+stepName,'- Conclusion: '+run.conclusion,
  '- Run: '+runUrl,'- Attempt: '+run.run_attempt,'- HEAD: `'+run.head_sha+'`',
  '- 이 기록은 실패 증거이며 근본 원인·운영 장애를 확정하지 않습니다.'].join('\n');
 let found=null;
 for(let page=1;page<=10;page++){
  const list=await request('issues?state=open&per_page=100&page='+page);
  if(!Array.isArray(list))fail('ISSUE_INVENTORY_INVALID');
  const matches=list.filter(i=>!i.pull_request&&typeof i.body==='string'&&
    i.body.includes(marker)&&i.user?.login==='github-actions[bot]');
  if(matches.length>1)fail('DUPLICATE_INCIDENT_ISSUES');
  if(matches.length){found=matches[0];break;}
  if(list.length<100)break;
  if(page===10)fail('ISSUE_INVENTORY_INCOMPLETE');
 }
 if(found){
  const comments=await request('issues/'+found.number+'/comments?per_page=100');
  if(!Array.isArray(comments)||comments.length===100)fail('COMMENTS_UNVERIFIED');
  if(comments.some(c=>c.body?.includes(receipt)))return {state:'REUSED',issue:found.number};
  await request('issues/'+found.number+'/comments',{method:'POST',body:{body:evidence}});
  return {state:'COMMENTED',issue:found.number};
 }
 const title='[CI] '+clean(run.name)+' / '+jobName+' / '+stepName;
 const created=await request('issues',{method:'POST',
  body:{title,body:[marker,evidence,'\n재발 시 이 Issue로 병합하며, 자동 재실행·자동 종료는 하지 않습니다.'].join('\n')}});
 if(!goodId(created?.number))fail('ISSUE_CREATE_RESULT_UNKNOWN');
 const check=await request('issues/'+created.number);
 if(check?.number!==created.number||!check?.body?.includes(marker))fail('ISSUE_CREATE_READBACK');
 return {state:'CREATED',issue:created.number};
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
