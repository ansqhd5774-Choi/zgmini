// Mirror the already-proven tenth-theme Cloudflare Git-Build deployment gate.
// A branch-only commit or a main commit without a successful exact production
// build is NOT sufficient authority to write the nine-theme public D1 feed.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO='ansqhd5774-Choi/zgmini';
const WORKER='zgmini-migration-candidate-r5';
const source='worker/theme-nine-r37-public.mjs';
const need=(ok,code)=>{
 if(!ok)throw Object.assign(new Error('THEME_NINE_R54_'+code),
  {code:'THEME_NINE_R54_'+code});
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function verifyNineR54Production({readerBytes,fetchImpl=fetch}={}){
 need(readerBytes instanceof Uint8Array&&readerBytes.length>100,
  'PUBLIC_READER_BYTES_REQUIRED');
 const api=async url=>{
  const response=await fetchImpl(url,{method:'GET',redirect:'error',
   headers:{accept:'application/vnd.github+json',
    'user-agent':'zgmini-theme-nine-r54','cache-control':'no-cache'},
   signal:AbortSignal.timeout(20000)});
  need(response.ok,'GITHUB_GATE_HTTP_'+response.status);
  return response.json();
 };
 const head=await api(`https://api.github.com/repos/${REPO}/commits/main`);
 need(/^[a-f0-9]{40}$/.test(head.sha??''),'GITHUB_MAIN_SHA_MISSING');
 const remote=await fetchImpl(`https://raw.githubusercontent.com/${REPO}/${head.sha}/${source}`,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(20000),
  headers:{'cache-control':'no-cache'}});
 need(remote.ok,'MAIN_NINE_PUBLIC_READER_NOT_FOUND');
 need(sha(Buffer.from(await remote.arrayBuffer()))===sha(readerBytes),
  'MAIN_NINE_PUBLIC_READER_NOT_MATCHED');
 const checks=await api(`https://api.github.com/repos/${REPO}/commits/${head.sha}/check-runs?per_page=100`);
 const complete=checks.check_runs?.filter(c=>
  c.name===`Workers Builds: ${WORKER}`&&
  c.app?.slug==='cloudflare-workers-and-pages'&&
  c.status==='completed'&&c.conclusion==='success'&&
  c.details_url?.includes(`/workers/services/view/${WORKER}/production/builds/`))??[];
 need(complete.length===1,'MAIN_CLOUDFLARE_PRODUCTION_BUILD_NOT_VERIFIED');
 return {status:'MAIN_CLOUDFLARE_PRODUCTION_VERIFIED',mainSha:head.sha,
  readerSha256:sha(readerBytes),buildUrl:complete[0].details_url};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--once'){
  console.error('Usage: theme-nine-r54-deployment-gate.mjs --once');
  process.exitCode=2;
 }else{
  try{
   const readerBytes=fs.readFileSync(path.resolve(path.dirname(
    fileURLToPath(import.meta.url)),'../../worker/theme-nine-r37-public.mjs'));
   console.log(JSON.stringify(await verifyNineR54Production({readerBytes}),null,2));
  }catch(e){
   console.error(JSON.stringify({status:'STOP_R54_DEPLOYMENT_GATE',
    error:e?.code??'R54_DEPLOYMENT_GATE_UNEXPECTED'}));
   process.exitCode=1;
  }
 }
}
