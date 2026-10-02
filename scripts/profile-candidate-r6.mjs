import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
const base='https://zgmini-migration-candidate-r5.ansqhd5774.workers.dev';
const routes=['/','/api/market-score','/inflation/','/recession/','/liquidity-crisis/','/credit-risk/','/earnings-recession/','/asset-bubble/','/debt-risk/','/supply-shock/','/api/inflation-detail','/api/session','/flags/us.svg'];
const tag=`r6-${Date.now()}`; const traces=[]; const requests=[];
const previous=process.argv.includes('--resume')?JSON.parse(readFileSync('docs/migration/r6/route-profile.json','utf8')).samples:[];
let parseErrors=0;
let buffer='',start=-1,depth=0,inString=false,escape=false;
const tail=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','zgmini-migration-candidate-r5','--format','json','--sampling-rate','0.999999'],{stdio:['ignore','pipe','pipe']});
tail.stdout.on('data',chunk=>{for(const c of chunk.toString()) {
 if(start<0){if(c!=='{')continue;start=0;buffer='';depth=0;}
 buffer+=c;
 if(inString){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inString=false;}
 else if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}')depth--;
 if(depth===0&&!inString){try {const e=JSON.parse(buffer);const url=new URL(e.event?.request?.url);if(url.searchParams.get('r6run')===tag)traces.push({id:url.searchParams.get('r6sample'),route:url.pathname,cpu_ms:e.cpuTime??null,wall_ms:e.wallTime??null,outcome:e.outcome,timestamp:e.eventTimestamp,status:e.event?.response?.status??null,exception_count:e.exceptions?.length??0,subrequests:null});}catch{parseErrors++;}start=-1;buffer='';}
}});
let tailFailed=false;tail.on('exit',()=>tailFailed=true);tail.stderr.on('data',()=>{});
mkdirSync('docs/migration/r6',{recursive:true});
try {
 await delay(8000);
 for(const route of routes){for(let i=0;i<85;i++){
  const covered=previous.filter(s=>s.route===route&&Number.isFinite(s.cpu_ms)).length+traces.filter(s=>s.route===route&&Number.isFinite(s.cpu_ms)).length;
  if(i>=1&&covered>=31)break;
  if(tailFailed)throw Error('Official log tail unavailable');
  const id=`${tag}-${routes.indexOf(route)}-${i}`;const u=new URL(route,base);u.searchParams.set('r6run',tag);u.searchParams.set('r6sample',id);
  const began=Date.now();const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(20000)});const body=await r.arrayBuffer();
  requests.push({id,route,phase:i===0?'first-observed-cold-state-unknown':'sequential-warm',timestamp:new Date(began).toISOString(),status:r.status,bytes:body.byteLength,client_elapsed_ms:Date.now()-began,cache_status:r.headers.get('cf-cache-status')});
  await delay(350);
 }console.log(`completed ${route}: CPU coverage ${previous.filter(s=>s.route===route&&Number.isFinite(s.cpu_ms)).length+traces.filter(s=>s.route===route&&Number.isFinite(s.cpu_ms)).length}`);}
 await delay(4000);
}finally{
 tail.kill();
 const samples=[...previous,...requests.map(r=>({...r,...traces.find(t=>t.id===r.id)}))];
 const percentile=(a,p)=>a.length?a.toSorted((x,y)=>x-y)[Math.ceil(a.length*p)-1]:null;
 const summary=routes.map(route=>{const s=samples.filter(s=>s.route===route),cpu=s.map(s=>s.cpu_ms).filter(Number.isFinite),wall=s.map(s=>s.wall_ms).filter(Number.isFinite);const p95=percentile(cpu,.95),p99=percentile(cpu,.99);return{route,requests:s.length,cpu_samples:cpu.length,statuses:[...new Set(s.map(s=>s.status))],cpu_p50:percentile(cpu,.5),cpu_p90:percentile(cpu,.9),cpu_p95:p95,cpu_p99:p99,cpu_max:cpu.length?Math.max(...cpu):null,wall_p50:percentile(wall,.5),wall_p95:percentile(wall,.95),size_min:Math.min(...s.map(s=>s.bytes)),size_max:Math.max(...s.map(s=>s.bytes)),over10:s.filter(s=>s.cpu_ms>10).length,runtime_errors:s.filter(s=>s.outcome&&s.outcome!=='ok').length,verdict:cpu.length<31?'NOT_PROVEN':p95>10||s.filter(s=>s.cpu_ms>10).length>1?'FAIL':p99<=10?'PASS':'NOT_PROVEN_WARN_CAUSE'};});
 const report={observed_at:new Date().toISOString(),tag,parseErrors,method:'Official wrangler tail cpuTime/wallTime; sanitized fields only; no cookies or auth used. Sampling0.999999,350ms pacing; resume missing CPU coverage until31 measured samples/route (max85 extra requests). First observation per run not proven cold. CPU integer milliseconds; no per-request subrequest field. Unobserved CPU excluded, not imputed0.',summary,samples,outliers:samples.filter(s=>s.cpu_ms>10)};
 writeFileSync('docs/migration/r6/route-profile.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}
