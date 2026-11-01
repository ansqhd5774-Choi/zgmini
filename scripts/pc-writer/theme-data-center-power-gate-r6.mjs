// Tenth theme only: verify the exact live main Cloudflare Git Build check
// and public core feed before opting into a new D1 key. No credentials/writes.
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const REPO='ansqhd5774-Choi/zgmini';
const WORKER='zgmini-migration-candidate-r5';
const SHA_RE=/^[a-f0-9]{40}$/;
const need=(ok,reason)=>{if(!ok)throw Object.assign(new Error(reason),{reason});};

export async function inspectDcPowerR6({sha,fetchImpl=fetch,now=Date.now(),verifyPublic=false}={}){
 need(SHA_RE.test(sha??''),'SOURCE_SHA_INVALID');
 const response=async url=>{
  const res=await fetchImpl(url,{headers:{accept:'application/vnd.github+json',
   'user-agent':'zgmini-tenth-only-r6','cache-control':'no-cache'},
   signal:AbortSignal.timeout(20000),redirect:'error'});
  need(res.ok,'PUBLIC_READ_HTTP_'+res.status);
  return res.json();
 };
 const main=await response(`https://api.github.com/repos/${REPO}/commits/main`);
 need(main.sha===sha,'GITHUB_MAIN_SOURCE_DRIFT');
 const checks=await response(`https://api.github.com/repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
 const deployments=checks.check_runs?.filter(check=>
  check.name===`Workers Builds: ${WORKER}`&&
  check.app?.slug==='cloudflare-workers-and-pages'&&
  check.status==='completed'&&check.conclusion==='success'&&
  check.details_url?.includes(`/workers/services/view/${WORKER}/production/builds/`))??[];
 need(deployments.length===1,'EXACT_MAIN_CLOUDFLARE_PRODUCTION_CHECK_NOT_PASSED');
 const publicApi=await fetchImpl(`https://zgmini.kr/api/theme-fear-greed/?dc_power_r6=${now}`,{
  headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000),redirect:'error'});
 need(publicApi.ok,'PUBLIC_API_HTTP_'+publicApi.status);
 const doc=await publicApi.json();
 need(doc?.status==='READY'&&Array.isArray(doc.themes)&&doc.themes.length>=7&&
  doc.themes.slice(0,7).every(t=>Array.isArray(t.history)&&t.history.length===252),
  'CORE_SEVEN_NOT_READY');
 const tenth=doc.themes.find(x=>x.theme==='데이터센터·전력');
 if(verifyPublic)need(tenth?.history?.length===252&&Number.isFinite(tenth.score),
  'TENTH_PUBLIC_API_NOT_READY');
 return {report:'DATA_CENTER_POWER_R6_DEPLOYMENT_AND_API',status:verifyPublic?'PUBLIC_API_VERIFIED':'DEPLOYED_CORE_READY',
  githubMainSha:sha,worker:WORKER,cloudflareBuildUrl:deployments[0].details_url,
  coreThemeCount:7,visibleThemeCount:doc.themes.length,
  observationDate:doc.observationDate,optionalThemesPresent:doc.themes.length-7-(tenth?1:0),
  tenthVisible:!!tenth,...(tenth?{tenthObservationDate:tenth.observationDate??doc.observationDate,
   tenthScore:tenth.score,tenthHistoryDays:tenth.history.length}:{})};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),shaArg=args.find(x=>x.startsWith('--source-sha='));
 const verify=args.includes('--verify-public');
 try{
  need(args.length===(verify?3:2)&&args[0]==='--once'&&
   shaArg&&SHA_RE.test(shaArg.slice('--source-sha='.length)), 'R6_ARGS_INVALID');
  const result=await inspectDcPowerR6({sha:shaArg.slice('--source-sha='.length),verifyPublic:verify});
  console.log(JSON.stringify(result));
 }catch(error){
  console.log(JSON.stringify({report:'DATA_CENTER_POWER_R6_DEPLOYMENT_AND_API',status:'BLOCKED',
   reason:error?.reason??'R6_NETWORK_OR_FORMAT_ERROR'}));
  process.exitCode=1;
 }
}
