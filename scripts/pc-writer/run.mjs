import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {registerHooks} from 'node:module';
import {execFileSync} from 'node:child_process';
import {client,credential,hash,save,read} from './d1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const config=read(path.join(base,'config.json')),publish=process.argv.includes('--publish');
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(config.source!==source)throw Error('PC_SOURCE_NOT_APPROVED');
if(publish&&config.enabled!==true)throw Error('PC_PUBLICATION_DISABLED');
if(publish){try{execFileSync('git',['diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer','scripts/candidate-2db-import-boundary.mjs'],{cwd:root,windowsHide:true,stdio:'pipe'});}catch{throw Error('PC_SOURCE_DIRTY');}}
// Match the existing candidate's read-only earnings initialization boundary.
const {candidate2dbImportBoundary}=await import('../candidate-2db-import-boundary.mjs');
registerHooks({load(url,context,next){const result=next(url,context);if(url.startsWith('file:')&&url.endsWith('/lib/market-score/earnings-e1-r3-d1-store.mjs')){const file=fileURLToPath(url);return {...result,source:candidate2dbImportBoundary(root).transform(String(result.source),file).code};}return result;}});
const {calculateMarket}=await import('./market.mjs');
const {calculateKorea}=await import('./korea.mjs');
const {claimMarket,releaseMarket,publishMarket}=await import('./publish.mjs');
const {Rev7D1Store}=await import('../../worker/korea-rev7-d1.mjs');
const {loadProjectionSource}=await import('../../worker/projection-source-r52.mjs');
const {readProjectionCheckpoint}=await import('../../worker/projection-checkpoint-r52.mjs');
const {builders}=await import('../../worker/projection-builders.ts');
const {projectionWriter}=await import('../../worker/projection-runtime-r52.mjs');
const {PUBLIC_PROJECTION_KEYS}=await import('../../worker/market-public-projection-store.mjs');

fs.mkdirSync(base,{recursive:true});const lock=path.join(base,'running.lock');
if(fs.existsSync(lock)){let alive=true;try{process.kill(read(lock).pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}if(alive){console.log('PC_ALREADY_RUNNING');process.exit(1);}fs.renameSync(lock,lock+'.interrupted-'+Date.now());}
try{fs.writeFileSync(lock,JSON.stringify({pid:process.pid,at:Date.now()}),{flag:'wx'});}catch{console.log('PC_ALREADY_RUNNING');process.exit(1);}
const started=Date.now(),report={at:new Date().toISOString(),source,mode:publish?'PUBLISH':'DRY_RUN',providerCalls:0,market:null,korea:null,projections:[]};
let c;
try{
 c=client(config,credential(root));
 // Refuse to blindly repeat a publication interrupted in a previous invocation.
 for(const name of ['market-ledger.json','korea-ledger.json']){
  const file=path.join(base,name);if(!fs.existsSync(file))continue;const pending=read(file);if(pending.status!=='SUBMITTING')continue;
  if(name==='market-ledger.json'){
   const row=(await c.query(config.core,"SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results?.[0];
   if(row?.stored_at===pending.storedAt&&hash(JSON.parse(row.body))===pending.bodyHash)save(file,{...pending,status:'VERIFIED'});
   else if(row?.stored_at>pending.storedAt)save(file,{...pending,status:'SUPERSEDED'});
   else throw Error('PREVIOUS_PUBLICATION_REQUIRES_READBACK');
  }else{
   const row=(await c.query(config.history,'SELECT composite_json,factors_json FROM kfg_rev7_snapshots WHERE date=?',[pending.date])).results?.[0];
   if(row&&JSON.parse(row.composite_json).score===pending.score&&hash(JSON.parse(row.factors_json))===pending.factorsHash)save(file,{...pending,status:'VERIFIED'});
   else throw Error('PREVIOUS_PUBLICATION_REQUIRES_READBACK');
  }
 }
 const current=(await c.query(config.core,"SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results?.[0];
 if(!publish||!current||Date.now()-current.stored_at>=20*60000){
  const lease=publish?await claimMarket(c,config.core):null;if(publish&&!lease)throw Error('MARKET_LEASE_BUSY');
  try{
   const now=Date.now(),before=(await c.query(config.core,"SELECT job,finished_at,status FROM market_collection_jobs_v1 WHERE job<>'pipeline' ORDER BY job")).results;
   const db=c.adapter(config.core,{directory:path.join(base,'market-inputs')});
   const body=await calculateMarket(root,db,now);
   if(c.stats.readFailures)throw Error('STORED_INPUT_READ_FAILED');
   const after=(await c.query(config.core,"SELECT job,finished_at,status FROM market_collection_jobs_v1 WHERE job<>'pipeline' ORDER BY job")).results;
   if(hash(before)!==hash(after))throw Error('MARKET_SOURCE_CHANGED');
   save(path.join(base,'market-result.json'),body);
   report.market={status:'CALCULATED',readyDomains:body.domains.filter(x=>x.status==='READY').length};
   if(publish)Object.assign(report.market,await publishMarket(c,config.core,read(path.join(base,'market-result.json')),now,lease,current?.stored_at,path.join(base,'market-ledger.json')));
  }finally{if(lease)await releaseMarket(c,config.core,lease);}
 }else report.market={status:'UNCHANGED_RECENT_SNAPSHOT'};

 const latest=(await c.query(config.history,"SELECT MAX(date) AS date FROM kfg_rev7_market_dates WHERE status='COMPLETE'")).results?.[0]?.date;
 const snapshot=(await c.query(config.history,'SELECT date FROM kfg_rev7_snapshots ORDER BY date DESC LIMIT 1')).results?.[0]?.date;
 if(!publish||latest>snapshot){
  const store=new Rev7D1Store(c.adapter(config.history,{allowWrites:publish}),{leaseMs:600000});
  const leased=publish?await store.acquireLease():false;if(publish&&!leased)throw Error('KOREA_LEASE_BUSY');
  try{
   const result=await calculateKorea(c,config.history,path.join(base,'korea-inputs'));
   report.korea={status:'CALCULATED',date:result.observationDate};
   if(publish){
    const file=path.join(base,'korea-ledger.json');save(file,{status:'SUBMITTING',date:result.observationDate,score:result.score,factorsHash:hash(result.history.at(-1).factors)});
    let error;try{await store.saveSnapshot(result);}catch(e){error=e;}
    const row=(await c.query(config.history,'SELECT composite_json,factors_json FROM kfg_rev7_snapshots WHERE date=?',[result.observationDate])).results?.[0];
    if(!row||JSON.parse(row.composite_json).score!==result.score||hash(JSON.parse(row.factors_json))!==hash(result.history.at(-1).factors))throw Error(error?'KOREA_PUBLISH_OUTCOME_UNKNOWN':'KOREA_READBACK_MISMATCH');
    save(file,{status:'VERIFIED',date:result.observationDate});report.korea.status='VERIFIED';
   }
  }finally{if(leased)await store.releaseLease();}
 }else report.korea={status:'UNCHANGED',date:snapshot};

 // One projection at a time, with the existing builders and checkpoint contract.
 for(const id of Object.keys(PUBLIC_PROJECTION_KEYS)){
  const core=c.adapter(config.core,{directory:path.join(base,'projection-inputs',id)}),history=c.adapter(config.history,{directory:path.join(base,'projection-inputs',id)});
  const env={DB:id==='koreaFearGreed'?history:core,DB_CORE:core,DB_HISTORY:history};
  const checkpoint=await readProjectionCheckpoint(env,id);
  const existing=(await c.query(config.core,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results?.[0];
  const p=existing?JSON.parse(existing.body).projection:null;
  if(p?.status==='READY'&&p.sourceVersion===checkpoint.sourceVersion&&p.sourceStoredAt===checkpoint.sourceStoredAt){report.projections.push({id,status:'UNCHANGED_READY'});continue;}
  const input=await loadProjectionSource(id,env,{now:checkpoint.sourceStoredAt});
  const body=await builders[id](input);
  if(c.stats.readFailures)throw Error('PROJECTION_INPUT_READ_FAILED');
  const after=await readProjectionCheckpoint({DB_CORE:c.adapter(config.core),DB_HISTORY:c.adapter(config.history)},id);
  if(hash(after)!==hash(checkpoint))throw Error('PROJECTION_SOURCE_CHANGED');
  save(path.join(base,'projection-results',id+'.json'),{body,checkpoint});
  if(publish){
   await projectionWriter(c.adapter(config.core,{allowWrites:true})).write(id,body,Date.now(),checkpoint);
   const stored=(await c.query(config.core,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results?.[0];
   const readback=stored?JSON.parse(stored.body):null;
   if(hash(readback?.payload)!==hash(body)||readback?.projection?.sourceVersion!==checkpoint.sourceVersion)throw Error('PROJECTION_READBACK_MISMATCH');
  }
  report.projections.push({id,status:publish?'VERIFIED':'CALCULATED',payloadStatus:body.status??body.composite?.status??null});
 }
 report.status=publish?'VERIFIED':'DRY_RUN_PASS';
}catch(error){report.status='FAILED';report.error=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'PC_WRITER_FAILED';process.exitCode=1;}
finally{report.elapsedMs=Date.now()-started;report.d1=c?.stats;save(path.join(base,'last-run.json'),report);fs.unlinkSync(lock);console.log(JSON.stringify(report,null,2));}
