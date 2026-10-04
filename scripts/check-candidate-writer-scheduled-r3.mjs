// Exercise the final entry's scheduled handler against isolated, local-only D1.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {FEED_POLICY} from '../worker/public-feed-store.mjs';
import {checkWriterLinkage} from './check-candidate-writer-linkage-r3.mjs';
checkWriterLinkage();
const dir=mkdtempSync(join(tmpdir(),'zgmini-writer-r3-')),persist=join(dir,'state');
// No inherited credentials or .dev.vars. Wrangler --local is mandatory on every command.
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(?:KEY|TOKEN|SECRET|PASSWORD)/i.test(k)));
env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV='false';env.WRANGLER_SEND_METRICS='false';
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
config.main=resolve('dist/server/index.js');config.assets.directory=resolve('dist/client');
delete config.configPath;delete config.userConfigPath;delete config.account_id;
config.name='zgmini-writer-r3-local';config.vars={};
// Match the pinned local Workerd binary, as in the existing prerender gate.
// The deployable config's compatibility date is untouched.
config.compatibility_date='2026-05-22';
// Pinned Wrangler does not inject --test-scheduled middleware into no_bundle.
// A temporary local-only adapter calls the UNMODIFIED final entry's scheduled export.
const adapter=resolve('dist/server/__writer_r3_local.mjs');
writeFileSync(adapter,`import worker from './index.js';export default {...worker,async fetch(request,env,ctx){const u=new URL(request.url);if(u.pathname==='/__scheduled'){await worker.scheduled({cron:u.searchParams.get('cron'),scheduledTime:Date.now()},env,ctx);return new Response('local scheduled complete')}return worker.fetch(request,env,ctx)}};`);
config.main=adapter;
config.d1_databases=config.d1_databases.map((x,i)=>({...x,database_id:`00000000-0000-0000-0000-00000000000${i+1}`,remote:false}));
const configPath=join(dir,'wrangler.json');writeFileSync(configPath,JSON.stringify(config));
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
const run=args=>execFileSync(process.execPath,[wrangler,...args,'--config',configPath],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const now=Date.now();
const core=`CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL);
INSERT INTO market_public_snapshots_v1 VALUES('current','{}',${now});
CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER,PRIMARY KEY(kind,feed_key,snapshot_key));
${Object.keys(FEED_POLICY).map(k=>`INSERT INTO public_feed_snapshots_v1 VALUES('output','${k}','current','{}',${now});`).join('\n')}
CREATE TABLE market_collection_jobs_v1(job TEXT PRIMARY KEY,lease_id TEXT,lease_until INTEGER NOT NULL DEFAULT 0,finished_at INTEGER NOT NULL DEFAULT 0,status TEXT);
INSERT INTO market_collection_jobs_v1 VALUES('pipeline','local-test-lease',${now+3600000},0,'RUNNING');`;
const history=`CREATE TABLE kfg_rev7_snapshots(date TEXT,calculated_at TEXT);INSERT INTO kfg_rev7_snapshots VALUES('20260101','2026-01-01T00:00:00.000Z');`;
for(const [binding,sql] of [['DB_CORE',core],['DB_HISTORY',history]]){const file=join(dir,binding+'.sql');writeFileSync(file,sql);run(['d1','execute',binding,'--local','--persist-to',persist,'--file',file]);}
let output='';
const local=spawn(process.execPath,[wrangler,'dev','--local','--test-scheduled','--persist-to',persist,'--ip','127.0.0.1','--port','8798','--config',configPath],{env,stdio:['ignore','pipe','pipe']});
for(const stream of [local.stdout,local.stderr])stream.on('data',b=>{output+=b.toString()});
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:8798/flags/us.svg',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}await delay(250)}assert(ready,'local final worker unavailable');
 for(const [cron,lane,status] of [['*/5 * * * *','market','ALREADY_RUNNING'],['37 * * * *','korea','CONFIGURATION_MISSING']]){
  // Wrangler 4.92's official --test-scheduled endpoint (before /cdn-cgi/local/scheduled).
  const start=output.length;const response=await fetch('http://127.0.0.1:8798/__scheduled?'+new URLSearchParams({cron}));assert(response.ok,'local scheduled request failed');
  let result;for(let i=0;i<60;i++){for(const line of output.slice(start).split('\n')){const match=line.match(/CANDIDATE_WRITER_R2\s+(\{.*\})/);if(match)try{result=JSON.parse(match[1])}catch{}}if(result)break;await delay(250)}
  assert.equal(result?.lane,lane,'writer target was not reached');assert.equal(result?.status,status,'compiled writer target result differs');
  console.log(`PASS: final compiled scheduled ${cron}: ${lane}/${status}`);
 }
 assert(!/WRITER_EXECUTION_FAILED|is not a function|SOURCE_CHECKPOINT_MISSING/.test(output),'compiled writer linkage failed');
 mkdirSync('work',{recursive:true});writeFileSync('work/writer-r3-local-scheduled.json',JSON.stringify({localOnly:true,productionData:false,providerCalls:0,market:'ALREADY_RUNNING: actual target reached with local lease',korea:'CONFIGURATION_MISSING: actual target reached without secrets'},null,2));
}finally{
 mkdirSync('work',{recursive:true});writeFileSync('work/writer-r3-local-scheduled.log',output);
 if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(local.pid),'/T','/F'],{stdio:'ignore'})}catch{}}else local.kill('SIGTERM');
 unlinkSync(adapter);
}
