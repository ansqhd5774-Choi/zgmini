import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {localDatabase} from './local-db.mjs';
import {installLocalRuntime} from './local-env.mjs';
import {client,credential,read,save,hash} from './d1.mjs';
import {mergeStoredCompositeTrend,oneYearHistoryStart} from '../../worker/composite-history.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const publish=process.argv.includes('--publish');
const config=read(path.join(base,'config.json'));
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(publish){
 if(config.source!==source||config.collectionTarget!=='pc'||config.enabled!==true)throw Error('LOCAL_PUBLICATION_NOT_APPROVED');
 execFileSync('git',['diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{cwd:root,stdio:'pipe',windowsHide:true});
 const ledger=path.join(base,'local-publication-ledger.json');
 if(fs.existsSync(ledger)&&read(ledger).status==='SUBMITTING')throw Error('LOCAL_PUBLICATION_REQUIRES_READBACK');
}
const seed=read(path.join(base,'local-seed-progress.json'));
if(!Object.keys(seed).length||Object.values(seed).some(x=>!x.complete))throw Error('LOCAL_SEED_INCOMPLETE');
const core=localDatabase(path.join(base,'storage','core.sqlite'));
const history=localDatabase(path.join(base,'storage','history.sqlite'));
const env={DB:core,DB_CORE:core,DB_HISTORY:history};
const hook=installLocalRuntime(env);
const report={at:new Date().toISOString(),source,mode:publish?'PUBLISH':'DRY_RUN',inputLocation:'LOCAL_SQLITE',providerCalls:0,projections:[]};
const originalFetch=globalThis.fetch;
const originalWarn=console.warn;
let liquidityCoverage=null;
try{
 console.warn=(...args)=>{
  if(args[0]==="LIQUIDITY_1Y_COVERAGE"&&typeof args[1]==="string"){
   try{liquidityCoverage=JSON.parse(args[1]);}catch{}
  }
  return originalWarn(...args);
 };
 // Calculation has no API keys and cannot fetch provider data or remote inputs.
 globalThis.fetch=async()=>{report.providerCalls++;throw Error('CALCULATION_NETWORK_FORBIDDEN')};
 const {calculateMarket}=await import('./market.mjs');
 const {calculateKorea}=await import('./korea.mjs');
 const {marketOperationalStore}=await import('../../worker/market-operational-store.mjs');
 const {Rev7D1Store}=await import('../../worker/korea-rev7-d1.mjs');
 const {loadProjectionSource}=await import('../../worker/projection-source-r52.mjs');
 const {readProjectionCheckpoint}=await import('../../worker/projection-checkpoint-r52.mjs');
 const {builders}=await import('../../worker/projection-builders.ts');
 const {projectionWriter}=await import('../../worker/projection-runtime-r52.mjs');
 const {PUBLIC_PROJECTION_KEYS}=await import('../../worker/market-public-projection-store.mjs');
 const now=Date.now();
 const body=await calculateMarket(root,core,now);
 if(body?.overall?.status==='READY'){
  const storedHistory=await marketOperationalStore(core).readScoreHistory({sinceDate:oneYearHistoryStart(now),limit:370});
  body.overall.trend=mergeStoredCompositeTrend({
   legacyTrend:body.overall.trend,
   storedSnapshots:storedHistory,
   currentScore:body.overall.score,
   currentDate:body.asOfDate??new Date(now).toISOString().slice(0,10),
  });
 }
 await marketOperationalStore(core).writeScore(body,now);
 save(path.join(base,'local-market-result.json'),body);
 const liquidityTrend=body.domains.find(x=>x.id==='liquidity')?.trend??[];
 const liquidityDates=liquidityTrend.map(x=>x?.label??x?.date).filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
 report.market={
  status:'LOCAL_STORED',
  readyDomains:body.domains.filter(x=>x.status==='READY').length,
  trendPoints:body.overall?.trend?.length??0,
  liquidityTrend:{
   points:liquidityTrend.length,
   first:liquidityDates.at(0)??null,
   last:liquidityDates.at(-1)??null,
   spanDays:liquidityDates.length>1?Math.floor((Date.parse(liquidityDates.at(-1)+'T00:00:00Z')-Date.parse(liquidityDates.at(0)+'T00:00:00Z'))/86400000):0,
  },
  liquidityCoverage,
 };
 const koreaStore=new Rev7D1Store(history,{leaseMs:600000});
 const latest=await koreaStore.getLatestCompleteDate();
 const prior=await koreaStore.getLatestSnapshot();
 if(latest>prior?.date||!prior){
  if(!await koreaStore.acquireLease())throw Error('LOCAL_KOREA_LEASE_BUSY');
  try{const result=await calculateKorea({query:(_db,sql,params=[])=>history.prepare(sql).bind(...params).all()},'local',path.join(base,'korea-inputs'));await koreaStore.saveSnapshot(result);report.korea={status:'LOCAL_STORED',date:result.observationDate};}
  finally{await koreaStore.releaseLease();}
 }else report.korea={status:'UNCHANGED',date:prior.date};
 for(const id of Object.keys(PUBLIC_PROJECTION_KEYS)){
  const scope={...env,DB:id==='koreaFearGreed'?history:core};
  const checkpoint=await readProjectionCheckpoint(scope,id);
  const existing=await core.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(PUBLIC_PROJECTION_KEYS[id]).first('body');
  const p=existing?JSON.parse(existing).projection:null;
  if(p?.status!=='READY'||p.sourceVersion!==checkpoint.sourceVersion||p.sourceStoredAt!==checkpoint.sourceStoredAt){
   const input=await loadProjectionSource(id,scope,{now:checkpoint.sourceStoredAt});
   const payload=await builders[id](input);
   await projectionWriter(core).write(id,payload,Date.now(),checkpoint);
  }
  report.projections.push({id,status:'LOCAL_READY'});
 }
 if(report.providerCalls)throw Error('CALCULATION_ATTEMPTED_NETWORK');
 globalThis.fetch=originalFetch;
 if(publish){
  const remote=client(config,credential(root));
  save(path.join(base,'local-publication-ledger.json'),{status:'SUBMITTING',source,at:Date.now()});
  const {claimMarket,releaseMarket,publishMarket}=await import('./publish.mjs');
  const lease=await claimMarket(remote,config.core);if(!lease)throw Error('REMOTE_MARKET_LEASE_BUSY');
  try{
   const previous=(await remote.query(config.core,"SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results[0]?.stored_at;
   report.market={...report.market,...await publishMarket(remote,config.core,read(path.join(base,'local-market-result.json')),now,lease,previous,path.join(base,'local-market-ledger.json'))};
  }finally{await releaseMarket(remote,config.core,lease);}
  // Explicit allowlist: publish display outputs only, never provider input/history rows.
  for(const {id} of report.projections){
   const row=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(PUBLIC_PROJECTION_KEYS[id]).first();
   const envelope=JSON.parse(row.body);
   const current=(await remote.query(config.core,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results[0];
   if(current&&JSON.parse(current.body).projection?.sourceStoredAt>envelope.projection.sourceStoredAt)throw Error('REMOTE_PROJECTION_NEWER_THAN_LOCAL');
   if(current&&hash(JSON.parse(current.body))===hash(envelope))continue;
   await projectionWriter(remote.adapter(config.core,{allowWrites:true})).write(id,envelope.payload,row.stored_at,envelope.projection);
   const check=(await remote.query(config.core,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results[0];
   if(!check||hash(JSON.parse(check.body).payload)!==hash(envelope.payload))throw Error('LOCAL_PROJECTION_PUBLICATION_MISMATCH');
  }
  const koreaOutput=await history.prepare('SELECT * FROM kfg_rev7_snapshots ORDER BY date DESC LIMIT 1').first();
  if(koreaOutput){
   const existing=(await remote.query(config.history,'SELECT * FROM kfg_rev7_snapshots WHERE date=?',[koreaOutput.date])).results[0];
   if(!existing){
    const columns=Object.keys(koreaOutput);
    await remote.request(config.history,[{sql:`INSERT INTO kfg_rev7_snapshots(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')}) ON CONFLICT(date) DO NOTHING`,params:columns.map(k=>koreaOutput[k])}]);
    const check=(await remote.query(config.history,'SELECT * FROM kfg_rev7_snapshots WHERE date=?',[koreaOutput.date])).results[0];
    if(check?.composite_json!==koreaOutput.composite_json||check?.factors_json!==koreaOutput.factors_json)throw Error('LOCAL_KOREA_PUBLICATION_MISMATCH');
   }
  }
  const outputs=(await core.prepare("SELECT * FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current'").all()).results;
  for(const row of outputs){
   const existing=(await remote.query(config.core,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[row.feed_key])).results[0];
   if(existing?.stored_at>=row.stored_at)continue;
   await remote.request(config.core,[{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",params:[row.feed_key,row.body,row.stored_at]}]);
   const check=(await remote.query(config.core,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[row.feed_key])).results[0];
   if(check?.stored_at!==row.stored_at||check?.body!==row.body)throw Error('LOCAL_FEED_PUBLICATION_MISMATCH');
  }
  report.remote=remote.stats;
  save(path.join(base,'local-publication-ledger.json'),{status:'VERIFIED',source,at:Date.now()});
 }
 report.status=publish?'VERIFIED':'DRY_RUN_PASS';
}catch(error){report.status='FAILED';report.error=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:error.code??'LOCAL_WRITER_FAILED';process.exitCode=1;}
finally{globalThis.fetch=originalFetch;console.warn=originalWarn;hook.deregister();core.close();history.close();save(path.join(base,'local-writer-last-run.json'),report);console.log(JSON.stringify(report));}
