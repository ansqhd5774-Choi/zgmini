import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';

const args=Object.fromEntries(process.argv.slice(2).map(x=>x.split('=')));
const base=args['--base'];
const worker=args['--worker'];
if(!base||!worker)throw Error('Usage: node scripts/profile-d1-apis-r13.mjs --base=https://... --worker=worker-name');

const routes=[
 '/api/market-score',
 '/api/inflation-detail',
 '/api/recession-detail',
 '/api/liquidity-crisis-detail',
 '/api/credit-risk-detail',
 '/api/earnings-recession-detail',
 '/api/asset-bubble-detail',
 '/api/debt-risk-detail',
 '/api/supply-shock-detail',
];
const tag=`r13-${Date.now()}`;
const traces=[],requests=[];let buffer='',depth=0,inString=false,escape=false,started=false,parseErrors=0;
const tail=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail',worker,'--format','json','--sampling-rate','0.999999'],{stdio:['ignore','pipe','pipe']});
tail.stdout.on('data',chunk=>{for(const c of chunk.toString()){
 if(!started){if(c!=='{')continue;started=true;buffer='';depth=0;}
 buffer+=c;
 if(inString){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inString=false;}
 else if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}')depth--;
 if(depth===0&&!inString){try{const e=JSON.parse(buffer);const url=new URL(e.event?.request?.url);if(url.searchParams.get('r13run')===tag)traces.push({id:url.searchParams.get('sample'),route:url.pathname,cpu_ms:e.cpuTime??null,wall_ms:e.wallTime??null,outcome:e.outcome,status:e.event?.response?.status??null,exception_count:e.exceptions?.length??0});}catch{parseErrors++;}started=false;buffer='';}
}});
let tailFailed=false;tail.on('exit',()=>tailFailed=true);

const percentile=(a,p)=>a.length?a.toSorted((x,y)=>x-y)[Math.ceil(a.length*p)-1]:null;
mkdirSync('docs/migration/r13',{recursive:true});
try{
 await delay(8000);
 for(const route of routes){
  for(let i=0;i<100;i++){
   const covered=traces.filter(x=>x.route===route&&Number.isFinite(x.cpu_ms)).length;
   if(i>0&&covered>=31)break;
   if(tailFailed)throw Error('Wrangler tail unavailable');
   const id=`${tag}-${routes.indexOf(route)}-${i}`;
   const url=new URL(route,base);url.searchParams.set('r13run',tag);url.searchParams.set('sample',id);
   const began=Date.now();const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});const body=await r.arrayBuffer();
   requests.push({id,route,status:r.status,bytes:body.byteLength,elapsed_ms:Date.now()-began});
   await delay(350);
  }
 }
 await delay(4000);
}finally{
 tail.kill();
 const samples=requests.map(r=>({...r,...traces.find(t=>t.id===r.id)}));
 const summary=routes.map(route=>{
  const s=samples.filter(x=>x.route===route),cpu=s.map(x=>x.cpu_ms).filter(Number.isFinite);
  const p95=percentile(cpu,.95),p99=percentile(cpu,.99),over10=s.filter(x=>x.cpu_ms>10).length;
  return {route,http_requests:s.length,cpu_samples:cpu.length,statuses:[...new Set(s.map(x=>x.status))],p50:percentile(cpu,.5),p90:percentile(cpu,.9),p95,p99,max:cpu.length?Math.max(...cpu):null,over10,runtime_errors:s.filter(x=>x.outcome&&x.outcome!=='ok').length,verdict:cpu.length<31?'NOT_PROVEN':p95>10||over10>1?'FAIL':p99<=10?'PASS':'WARN'};
 });
 const out={observedAt:new Date().toISOString(),worker,base,tag,parseErrors,method:'Official wrangler tail cpuTime, >=31 captured samples per API, 350ms pacing; missing samples excluded; integer ms precision.',summary,samples};
 writeFileSync('docs/migration/r13/d1-api-cpu.json',JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify(summary,null,2));
 if(summary.some(x=>x.verdict==='FAIL'||x.verdict==='NOT_PROVEN'))process.exitCode=1;
}
