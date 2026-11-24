import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REPO,WORKFLOWS,triage,keyFor,markerFor} from '../scripts/ci-failure-issue.mjs';

const event=(overrides={})=>({
 action:'completed',repository:{full_name:REPO,private:false},
 workflow_run:{id:123456,run_attempt:1,name:WORKFLOWS[0],
  status:'completed',conclusion:'failure',event:'pull_request',
  head_sha:'a'.repeat(40),head_repository:{full_name:REPO},...overrides}
});
const failureJob={id:87,name:'source-check',conclusion:'failure',steps:[
 {name:'checkout',conclusion:'success'},{name:'Regression tests',conclusion:'failure'}]};
function fixture({existing=false,comments=[]}={}){
 const calls=[];
 const hash=keyFor(WORKFLOWS[0],'source-check','Regression tests');
 const marker=markerFor(hash);
 const issue={number:6200,body:marker+'\nold failure',
  user:{login:'github-actions[bot]'}};
 const request=async(resource,{method='GET',body}={})=>{
  calls.push({resource,method,body});
  if(resource==='actions/runs/123456/attempts/1/jobs?per_page=100')
   return {total_count:1,jobs:[failureJob]};
  if(resource==='issues?state=open&per_page=100&page=1')
   return existing?[issue]:[];
  if(resource==='issues/6200/comments?per_page=100')return comments;
  if(resource==='issues/6200/comments'&&method==='POST')return {id:1};
  if(resource==='issues'&&method==='POST')return {...issue,body:body.body};
  if(resource==='issues/6200')return {...issue,body:marker+'\ncreated'};
  throw Error('unexpected route '+method+' '+resource);
 };
 return {request,calls,hash,marker};
}

test('exact failed job and step produce one metadata-only Issue with verified identity',async()=>{
 const f=fixture();
 const result=await triage({event:event(),request:f.request});
 assert.deepEqual(result,{state:'CREATED',issue:6200});
 const post=f.calls.find(x=>x.resource==='issues'&&x.method==='POST');
 assert.match(post.body.title,/\[CI\]/);
 assert.ok(post.body.body.includes(f.marker));
 assert.match(post.body.body,/actions\/runs\/123456/);
 assert.match(post.body.body,/HEAD: /);
 assert.doesNotMatch(post.body.body,/secret value|job log|raw trace/i);
 assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
});
test('same failure class links to existing Issue and repeated run is idempotent',async()=>{
 const f=fixture({existing:true});
 const result=await triage({event:event(),request:f.request});
 assert.deepEqual(result,{state:'COMMENTED',issue:6200});
 assert.equal(f.calls.filter(x=>x.method==='POST'&&x.resource==='issues').length,0);
 assert.equal(f.calls.filter(x=>x.method==='POST'&&x.resource.endsWith('/comments')).length,1);
 const duplicate=fixture({existing:true,comments:[
  {body:'<!-- zgmini-ci-run:123456:1 -->\nalready reported'}]});
 assert.deepEqual(await triage({event:event(),request:duplicate.request}),
  {state:'REUSED',issue:6200});
 assert.equal(duplicate.calls.filter(x=>x.method==='POST').length,0);
});
test('success, cancelled, unknown workflow and fork origin cause no GitHub API calls',async()=>{
 for(const changed of [{conclusion:'success'},{conclusion:'cancelled'},
  {name:'unlisted workflow'},{head_repository:{full_name:'outsider/fork'}}]){
  let calls=0;
  const r=await triage({event:event(changed),request:async()=>{calls++;throw Error('must not call');}});
  assert.deepEqual(r,{state:'IGNORED'});assert.equal(calls,0);
 }
});
test('public source repository is accepted and private event is rejected',async()=>{
 const f=fixture();
 assert.deepEqual(await triage({event:event(),request:f.request}),{state:'CREATED',issue:6200});
 let called=false;
 const privateEvent=event();privateEvent.repository.private=true;
 const ignored=await triage({event:privateEvent,request:async()=>{called=true;throw Error('unexpected');}});
 assert.deepEqual(ignored,{state:'IGNORED'});
 assert.equal(called,false);
});
test('incomplete GitHub evidence fails closed without Issue writes',async()=>{
 const request=async(resource)=>{
  if(resource.startsWith('actions/runs/'))return {total_count:101,jobs:[]};
  throw Error('must not write or enumerate');
 };
 await assert.rejects(triage({event:event(),request}),/CI_INCIDENT_JOB_INVENTORY_INCOMPLETE/);
});
test('tracked workflows and intake permission are fixed, without schedule or PC operations',()=>{
 const yml=readFileSync(new URL('../.github/workflows/ci-failure-issue-intake.yml',import.meta.url),'utf8');
 for(const name of WORKFLOWS)assert.ok(yml.includes("'"+name+"'"));
 assert.match(yml,/workflow_run:/);
 assert.match(yml,/issues: write/);
 assert.match(yml,/actions: read/);
 assert.match(yml,/ref: main/);
 assert.doesNotMatch(yml,/schedule:|issue_comment:|workflow_dispatch:|pc-job\.yml/);
});

test('timed out second attempt records the exact attempt and timeout metadata',async()=>{
 const calls=[];
 const issue={number:6201,user:{login:'github-actions[bot]'}};
 const request=async(resource,{method='GET',body}={})=>{
  calls.push({resource,method,body});
  if(resource==='actions/runs/123456/attempts/2/jobs?per_page=100')
   return {total_count:1,jobs:[{name:'CI timeout',conclusion:'timed_out',steps:[]}]};
  if(resource==='issues?state=open&per_page=100&page=1')return [];
  if(resource==='issues'&&method==='POST')return {...issue,body:body.body};
  if(resource==='issues/6201')return {...issue,body:markerFor(keyFor(WORKFLOWS[0],'CI timeout','JOB_TIMEOUT'))};
  throw Error('unexpected route '+resource);
 };
 assert.deepEqual(await triage({event:event({run_attempt:2,conclusion:'timed_out'}),request}),
  {state:'CREATED',issue:6201});
 assert.equal(calls.some(x=>x.resource==='actions/runs/123456/attempts/1/jobs?per_page=100'),false);
 const created=calls.find(x=>x.resource==='issues'&&x.method==='POST');
 assert.match(created.body.body,/Attempt: 2/);
 assert.match(created.body.body,/Conclusion: timed_out/);
 assert.match(created.body.title,/JOB_TIMEOUT/);
});
test('invalid run identity fails closed without GitHub API requests',async()=>{
 for(const changed of [{id:0},{run_attempt:0},{head_sha:'invalid'}]){
  let calls=0;
  await assert.rejects(triage({event:event(changed),request:async()=>{calls++;throw Error('unexpected');}}),
   /CI_INCIDENT_RUN_IDENTITY_INVALID/);
  assert.equal(calls,0);
 }
});
test('GitHub job retrieval errors are propagated with zero issue writes',async()=>{
 const calls=[];
 await assert.rejects(triage({event:event(),request:async(resource,{method='GET'}={})=>{
  calls.push({resource,method});throw Error('CI_INCIDENT_GITHUB_HTTP_403');
 }}),/CI_INCIDENT_GITHUB_HTTP_403/);
 assert.deepEqual(calls.map(x=>x.method),['GET']);
});
test('full comment inventory blocks writes rather than duplicating an incident',async()=>{
 const f=fixture({existing:true,comments:Array.from({length:100},()=>({body:'other run'}))});
 await assert.rejects(triage({event:event(),request:f.request}),/CI_INCIDENT_COMMENTS_UNVERIFIED/);
 assert.equal(f.calls.some(x=>x.method==='POST'),false);
});
test('an incorrect Issue creation readback is rejected',async()=>{
 let wrote=0;
 const request=async(resource,{method='GET',body}={})=>{
  if(resource==='actions/runs/123456/attempts/1/jobs?per_page=100')
   return {total_count:1,jobs:[failureJob]};
  if(resource==='issues?state=open&per_page=100&page=1')return [];
  if(resource==='issues'&&method==='POST'){wrote++;return {number:6202};}
  if(resource==='issues/6202')return {number:6202,body:'missing marker'};
  throw Error('unexpected route '+resource);
 };
 await assert.rejects(triage({event:event(),request}),/CI_INCIDENT_ISSUE_CREATE_READBACK/);
 assert.equal(wrote,1);
});

test('failure intake queues overlapping events instead of replacing earlier pending failures',()=>{
 const yml=readFileSync(new URL('../.github/workflows/ci-failure-issue-intake.yml',import.meta.url),'utf8');
 assert.match(yml,/concurrency:\n  group: ci-failure-issue-intake\n  queue: max\n  cancel-in-progress: false/);
 assert.match(yml,/workflow_run:/);
});

test('nonempty GitHub job count with omitted jobs fails closed before Issue writes',async()=>{
 const calls=[];
 const request=async(resource,{method='GET'}={})=>{
  calls.push({resource,method});
  if(resource==='actions/runs/123456/attempts/1/jobs?per_page=100')
   return {total_count:1,jobs:[]};
  throw Error('must not enumerate or write Issues');
 };
 await assert.rejects(triage({event:event(),request}),/CI_INCIDENT_JOB_INVENTORY_INCOMPLETE/);
 assert.deepEqual(calls.map(c=>c.method),['GET']);
});
test('created Issue says grouping is by CI step, not by confirmed root cause',async()=>{
 const f=fixture();
 assert.deepEqual(await triage({event:event(),request:f.request}),{state:'CREATED',issue:6200});
 const created=f.calls.find(x=>x.resource==='issues'&&x.method==='POST');
 assert.match(created.body.body,/묶음 기준: 같은 Workflow\\/Job\\/Step/);
 assert.match(created.body.body,/근본 원인이 같다는 뜻은 아닙니다/);
});
