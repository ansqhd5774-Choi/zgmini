// R2 #29 optional baseline discovery using the existing read-only Actions API.
// Do not fetch logs, alter Actions, deploy, or introduce bundle-size thresholds.
import {appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO='ansqhd5774-Choi/zgmini';
export const RUNS_RESOURCE='actions/workflows/node.js.yml/runs?branch=main&event=push&status=success&per_page=10';
const LIMIT=10;

export async function findExistingBundleBaseline({read,currentRunId=null}){
 if(typeof read!=='function')throw Error('CI_BUNDLE_BASELINE_READER_REQUIRED');
 const response=await read(RUNS_RESOURCE);
 if(!response||!Array.isArray(response.workflow_runs)||
    response.workflow_runs.length>LIMIT)
  throw Error('CI_BUNDLE_BASELINE_RUNS_UNVERIFIED');
 for(const run of response.workflow_runs){
  if(!run||!Number.isSafeInteger(run.id)||run.id<1)
   throw Error('CI_BUNDLE_BASELINE_RUN_ID_UNVERIFIED');
  if(String(run.id)===String(currentRunId))continue;
  if(run.name!=='Node.js CI'||run.head_branch!=='main'||
     run.event!=='push'||run.conclusion!=='success')continue;
  const resource='actions/runs/'+run.id+'/artifacts?name=client-bundle-size-report&per_page=100';
  const artifacts=await read(resource);
  if(!artifacts||!Array.isArray(artifacts.artifacts)||
     artifacts.artifacts.length>100||
     !Number.isSafeInteger(artifacts.total_count)||
     artifacts.total_count<artifacts.artifacts.length)
   throw Error('CI_BUNDLE_BASELINE_ARTIFACTS_UNVERIFIED');
  const candidates=artifacts.artifacts.filter(a=>
   a?.name==='client-bundle-size-report'&&a.expired===false);
  if(candidates.length===0)continue;
  if(candidates.length!==1||!Number.isSafeInteger(candidates[0].id)||
     candidates[0].id<1)
   throw Error('CI_BUNDLE_BASELINE_ARTIFACT_AMBIGUOUS');
  return {runId:run.id,artifactId:candidates[0].id};
 }
 return null;
}

export async function githubRead(resource,token,fetcher=fetch){
 if(typeof token!=='string'||!token.trim())
  throw Error('CI_BUNDLE_BASELINE_TOKEN_REQUIRED');
 if(resource!==RUNS_RESOURCE&&
    !/^actions\/runs\/[1-9]\d*\/artifacts\?name=client-bundle-size-report&per_page=100$/.test(resource))
  throw Error('CI_BUNDLE_BASELINE_RESOURCE_NOT_ALLOWED');
 const res=await fetcher('https://api.github.com/repos/'+REPO+'/'+resource,{
  method:'GET',
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'},
  signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error('CI_BUNDLE_BASELINE_HTTP_'+res.status);
 return res.json();
}

export async function main(){
 if(process.argv.length!==2)throw Error('CI_BUNDLE_BASELINE_NO_ARGUMENTS');
 if(process.env.GITHUB_REPOSITORY!==REPO||!process.env.GITHUB_OUTPUT||
    !process.env.GITHUB_TOKEN){
  console.log('CI_BUNDLE_BASELINE=UNVERIFIED_ENV');return;
 }
 try{
  const result=await findExistingBundleBaseline({
   currentRunId:process.env.GITHUB_RUN_ID,
   read:resource=>githubRead(resource,process.env.GITHUB_TOKEN)
  });
  if(!result){console.log('CI_BUNDLE_BASELINE=UNAVAILABLE_NO_ARTIFACT');return;}
  await appendFile(process.env.GITHUB_OUTPUT,'run_id='+result.runId+'\n','utf8');
  console.log('CI_BUNDLE_BASELINE=AVAILABLE_RUN_'+result.runId);
 }catch(e){
  // Optional historical comparison must never turn a primary build PASS into FAIL.
  // Expose lack of evidence explicitly, not a synthetic "zero change" result.
  const code=typeof e?.message==='string'&&/^CI_BUNDLE_BASELINE_[A-Z0-9_]+$/.test(e.message)?
   e.message:'CI_BUNDLE_BASELINE_READ_UNVERIFIED';
  console.log('CI_BUNDLE_BASELINE=UNVERIFIED '+code);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
