import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,readdirSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {shellRoutes,shellArtifact} from '../worker/candidate-shell-r7.mjs';
import {extractRscPayloadFromPrerenderedHtml} from '../node_modules/vinext/dist/build/prerender.js';
import {candidateBranchGate} from './candidate-branch-gate.mjs';
candidateBranchGate();
execFileSync(process.execPath,['--test','tests/candidate-writer-linkage-r3.test.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--test','tests/projection-input-r60.test.mjs','tests/fred-auth-probe-r61.test.mjs'],{stdio:'inherit'});
const env={...process.env,CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'};
mkdirSync('work',{recursive:true});mkdirSync('docs/migration/d1-r52',{recursive:true});
const run=(args,log)=>new Promise((resolve,reject)=>{const fd=openSync(log,'w');const p=spawn(process.execPath,args,{env,stdio:['ignore',fd,fd]});p.on('exit',code=>{closeSync(fd);code===0?resolve():reject(Error(`Build step failed; see ${log}`));});});
const begin=Date.now();
await run(['node_modules/vite/bin/vite.js','build','--config','vite.candidate-prerender-r7.config.ts'],'work/r7-render-build.log');
const hashes=()=>Object.fromEntries(readdirSync('dist/client/assets').map(n=>[n,createHash('sha256').update(readFileSync('dist/client/assets/'+n)).digest('hex')]));
const before=hashes();const fd=openSync('work/r7-local-render.log','w');
const local=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--compatibility-date','2026-05-22','--ip','127.0.0.1','--port','8797','--config','dist/server/wrangler.json'],{env,stdio:['ignore',fd,fd]});
const shells=[];
try{
 let ready=false;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:8797/flags/us.svg',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await delay(500);}
 if(!ready)throw Error('Local compiled renderer unavailable');
 for(const route of shellRoutes){
  const r=await fetch('http://127.0.0.1:8797'+route,{redirect:'manual'});
  if(r.status!==200||!r.headers.get('content-type')?.includes('text/html'))throw Error(`Local render failed ${route}`);
  const html=await r.text();const rsc=extractRscPayloadFromPrerenderedHtml(html);
  if(!rsc||html.includes('zg-r55-gauge-ring'))throw Error('Missing RSC or stale UI contract');
  shells.push({route,html,rsc});console.log('Rendered '+route);
 }
}finally{
 if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(local.pid),'/T','/F'],{stdio:'ignore'});}catch{}}
 else local.kill('SIGTERM');closeSync(fd);
}
await run(['node_modules/vite/bin/vite.js','build','--config','vite.candidate-r52.config.ts'],'work/r7-candidate-build.log');
const after=hashes();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Renderer/client asset identity drift across candidate builds');
mkdirSync('dist/client/__candidate_shells',{recursive:true});
const manifest=shells.map(({route,html,rsc})=>{for(const [data,isRsc] of [[html,false],[rsc,true]])writeFileSync('dist/client'+shellArtifact(route,isRsc),data);return {route,html:shellArtifact(route),rsc:shellArtifact(route,true),html_bytes:Buffer.byteLength(html),rsc_bytes:Buffer.byteLength(rsc),sha256:createHash('sha256').update(html).digest('hex')};});
writeFileSync('docs/migration/d1-r52/shell-artifacts.json',JSON.stringify({generated_at:new Date().toISOString(),duration_seconds:(Date.now()-begin)/1000,method:'Build-time allowlisted rendering of compiled local Workerd/Vinext bundle, official Vinext RSC extraction; no public runtime snapshot or API static export.',client_assets_identical:true,routes:manifest},null,2)+'\n');
execFileSync(process.execPath,['scripts/check-candidate-r52.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/check-candidate-writer-scheduled-r3.mjs'],{stdio:'inherit',env});
console.log('PASS:9 HTML/RSC shells, identical client assets, final candidate contract');
