import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,readdirSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {shellRoutes,shellArtifact} from '../worker/candidate-shell-r7.mjs';
import {extractRscPayloadFromPrerenderedHtml} from '../node_modules/vinext/dist/build/prerender.js';
import {candidateBranchGate} from './candidate-branch-gate.mjs';

candidateBranchGate();
const env={...process.env,CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'};
mkdirSync('work',{recursive:true});
const run=(args,log)=>new Promise((resolve,reject)=>{
 const fd=openSync(log,'w');
 const p=spawn(process.execPath,args,{env,stdio:['ignore',fd,fd]});
 p.on('exit',code=>{closeSync(fd);code===0?resolve():reject(Error(`Build step failed; see ${log}`));});
});
await run(['node_modules/vite/bin/vite.js','build','--config','vite.candidate-prerender-r7.config.ts'],'work/r6-render-build.log');
const hashes=()=>Object.fromEntries(readdirSync('dist/client/assets').map(n=>[n,createHash('sha256').update(readFileSync('dist/client/assets/'+n)).digest('hex')]));
const before=hashes();
const fd=openSync('work/r6-local-render.log','w');
const local=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--compatibility-date','2026-09-01','--ip','127.0.0.1','--port','8798','--config','dist/server/wrangler.json'],{env,stdio:['ignore',fd,fd]});
const shells=[];
try{
 let ready=false;
 for(let i=0;i<40;i++){
  try{const r=await fetch('http://127.0.0.1:8798/flags/us.svg',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
  await delay(500);
 }
 if(!ready)throw Error('Local renderer unavailable');
 for(const route of shellRoutes){
  const r=await fetch('http://127.0.0.1:8798'+route,{redirect:'manual'});
  if(r.status!==200||!r.headers.get('content-type')?.includes('text/html'))throw Error(`Local render failed ${route}`);
  const html=await r.text();
  const rsc=extractRscPayloadFromPrerenderedHtml(html);
  if(!rsc||html.includes('zg-r55-gauge-ring'))throw Error('Missing RSC or stale UI contract');
  shells.push({route,html,rsc});
 }
}finally{
 if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(local.pid),'/T','/F'],{stdio:'ignore'});}catch{}}
 else local.kill('SIGTERM');
 closeSync(fd);
}
await run(['node_modules/vite/bin/vite.js','build','--config','vite.production-r6.config.ts'],'work/r6-production-build.log');
const after=hashes();
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Renderer/client asset identity drift');
mkdirSync('dist/client/__candidate_shells',{recursive:true});
for(const {route,html,rsc} of shells){
 writeFileSync('dist/client'+shellArtifact(route),html);
 writeFileSync('dist/client'+shellArtifact(route,true),rsc);
}
execFileSync(process.execPath,['scripts/check-production-r6.mjs'],{stdio:'inherit'});
console.log('PASS R6 production build: 9 static shells + dual D1 production contract');
