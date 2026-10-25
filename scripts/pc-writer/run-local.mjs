import {assertCompleteMarket} from './market-publication-safety.mjs';
import {updateDataAlert} from './local-data-alert.mjs';
import {prepareStagflation,publishStagflation} from './stagflation-publication.mjs';
import {prepareLatestStagflation,publishLatestStagflation} from './stagflation-latest-publication.mjs';
import {validDegradedMarket} from './collection-publication-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {localDatabase} from './local-db.mjs';
import {installLocalRuntime} from './local-env.mjs';
import {client,credential,read,save,hash} from './d1.mjs';
import {mergeStoredCompositeTrend,oneYearHistoryStart} from '../../worker/composite-history.mjs';
import {attachStoredDomainScoreComparisons,sameVerifiedLineage} from './market-snapshot-comparisons.mjs';
import {publicationCompatibility,recoverPublication,appendPublicationEvent} from './publication-guard.mjs';
import {koreaPublicationPlan} from './korea-publication.mjs';
import {readAssetR10Projection} from './asset-r10-projection.mjs';
import {buildSupplyR10} from './supply-r10.mjs';
import {acceptsStoredUpdate} from '../../lib/market-score/live-refresh.mjs';
import {publishCoreArrowState} from './score-arrow-publication.mjs';
import {requiresRecessionR3DisplayRefresh} from './recession-r3-refresh.mjs';
import {requiresLiquidityR2DisplayRefresh} from './liquidity-r2-refresh.mjs';
import {requiresCreditR2DisplayRefresh} from './credit-r2-refresh.mjs';
import {requiresDebtHistoryRefresh} from './debt-history-refresh.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const publish=process.argv.includes('--publish');
const config=read(path.join(base,'config.json'));
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(publish){
 if(config.collectionTarget!=='pc'||config.enabled!==true)throw Error('LOCAL_PUBLICATION_NOT_APPROVED');
 const main=execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const blocked=publicationCompatibility(root,config.source,source,main);
 if(blocked)throw Error(blocked.status);
 execFileSync('git',['diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{cwd:root,stdio:'pipe',windowsHide:true});
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
 // Reuse the published daily score history already read for the overall chart.
 const storedHistory=await marketOperationalStore(core).readScoreHistory({sinceDate:oneYearHistoryStart(now),limit:370});
 const currentInflation=body.domains?.find(d=>d.id==='inflation')??null;
 // An R2 inflation composite is not a valid historic value for the restored R7 four-factor model.
 // Keep old snapshots in SQLite, but never splice them into the new-model public curve.
 const comparableCompositeHistory=storedHistory.filter(snapshot=>
  sameVerifiedLineage(currentInflation,snapshot?.body?.domains?.find(d=>d.id==='inflation'))
 );
 if(body?.overall?.status==='READY'){
  body.overall.trend=mergeStoredCompositeTrend({
   legacyTrend:body.overall.trend,
   storedSnapshots:comparableCompositeHistory,
   currentScore:body.overall.score,
   currentDate:body.asOfDate??new Date(now).toISOString().slice(0,10),
  });
 }
 attachStoredDomainScoreComparisons(body,storedHistory);
 // Compare published-calculation snapshots from distinct dates, not reconstructed curves.
 const priorRows=(await core.prepare("SELECT snapshot_key,body FROM market_public_snapshots_v1 WHERE snapshot_key!='current' AND snapshot_key<? ORDER BY snapshot_key DESC LIMIT 30").bind(body.asOfDate).all()).results;
 const priorMarket=priorRows.find(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.snapshot_key)&&JSON.parse(row.body).status==='SUCCESS');
 if(priorMarket){
  const previous=JSON.parse(priorMarket.body);
  for(const domain of body.domains){
   const old=previous.domains?.find(item=>item.id===domain.id);
   if(old?.status==='READY'&&typeof old.score==='number'&&Number.isFinite(old.score)
     &&sameVerifiedLineage(domain,old))
    domain.previousObservation={date:priorMarket.snapshot_key,currentDate:body.asOfDate,score:old.score};
  }
 }
 assertCompleteMarket(body);
 await marketOperationalStore(core).writeScore(body,now);
 save(path.join(base,'local-market-result.json'),body);
 // Rate sentiment is a separate stored-data score; never modify the approved Rate R3 domain.
 const {preparePublicRateSentiment,publishPublicRateSentiment}=await import('./rate-sentiment-publication.mjs');
 const rateSentiment=await preparePublicRateSentiment(core,now);
 report.rateSentiment={status:rateSentiment.status,observationDate:rateSentiment.observationDate??null,reason:rateSentiment.reason??null};
 let stagflation={status:'DISABLED',prepared:false};
 try{stagflation=await prepareStagflation(core,{enabled:config.stagflationS21Publication===true,now});}catch{stagflation={status:'PARTIAL',prepared:false};}
 report.stagflation={status:stagflation.status,observationMonth:stagflation.body?.observationMonth??null};
 let stagflationLatest={status:'DISABLED',prepared:false};
 try{stagflationLatest=await prepareLatestStagflation(core,{enabled:config.latestStagflationPublication===true,now});}catch{stagflationLatest={status:'PARTIAL',prepared:false};}
 report.stagflationLatest={status:stagflationLatest.status,score:stagflationLatest.body?.score??null};
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
  // Recompute only from saved inputs when the R10 input set is installed.
  // No provider fetch, and failure preserves the previous valid release file.
  if(id==='assetBubble'&&fs.existsSync(path.join(base,'local-asset-bubble-r10-breadth-research.json'))){
   try{execFileSync(process.execPath,[path.join(root,'scripts/pc-writer/build-asset-r10-release.mjs')],{cwd:root,stdio:'pipe',windowsHide:true});}
   catch{report.assetR10Calculation={status:'FAILED_PREVIOUS_RELEASE_PRESERVED'};}
  }
  const scope={...env,DB:id==='koreaFearGreed'?history:core};
  let r10=null;
  if(id==='assetBubble')r10=readAssetR10Projection(base);
  if(id==='supplyShock'){
   try{r10=buildSupplyR10(base);}catch{r10={status:'FAILED',reason:'SUPPLY_R10_CALCULATION_FAILED'};}
  }
  if(id==='supplyShock'&&r10)report.supplyR10={status:r10.status,reason:r10.reason??null,score:r10.payload?.score??null,scoreObservationMonth:r10.payload?.scoreObservationMonth??null};
  if(id==='assetBubble'&&r10)report.assetR10={status:r10.status,reason:r10.reason??null,reasons:r10.reasons??[]};
  if(id==='supplyShock'&&r10?.status!=='READY'){
   report.projections.push({id,status:'PREVIOUS_RELEASE_PRESERVED'});
   continue;
  }
  const coreCheckpoint=await readProjectionCheckpoint(scope,id);
  // Preserve the operational checkpoint's monotonic clock. The payload keeps
  // its separate input timestamps; the hash invalidates changed R10 results.
  const checkpoint=r10?.status==='READY'?{...coreCheckpoint,sourceVersion:coreCheckpoint.sourceVersion+':'+r10.checkpoint.sourceVersion}:coreCheckpoint;
  const existing=await core.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(PUBLIC_PROJECTION_KEYS[id]).first('body');
  const envelope=existing?JSON.parse(existing):null;
  const p=envelope?.projection;
  const recessionR3Refresh=id==='recession'&&requiresRecessionR3DisplayRefresh(envelope);
  const liquidityR2Refresh=id==='liquidityCrisis'&&requiresLiquidityR2DisplayRefresh(envelope);
  const creditR2Refresh=id==='creditRisk'&&requiresCreditR2DisplayRefresh(envelope);
  if(p?.status!=='READY'||p.sourceVersion!==checkpoint.sourceVersion||p.sourceStoredAt!==checkpoint.sourceStoredAt||recessionR3Refresh||liquidityR2Refresh||creditR2Refresh||(id==='debtRisk'&&requiresDebtHistoryRefresh(envelope))){
   const input=r10?.status==='READY'?null:await loadProjectionSource(id,scope,{now:checkpoint.sourceStoredAt});
   const payload=r10?.status==='READY'?r10.payload:await builders[id](input);
   await projectionWriter(core).write(id,payload,Date.now(),checkpoint);
  }
  report.projections.push({id,status:'LOCAL_READY'});
 }
 const {enrichLocalBeginnerProjections}=await import('./beginner-projection-cycle.mjs');
 report.beginnerCopy=await enrichLocalBeginnerProjections({core,fetcher:originalFetch,now:Date.now()});
 if(report.providerCalls)throw Error('CALCULATION_ATTEMPTED_NETWORK');
 globalThis.fetch=originalFetch;
 const {storeLocalCollectionHealth}=await import('./collection-health.mjs');
 const health=await storeLocalCollectionHealth(core,history,now,base);
 report.collectionHealth={normal:health.normal,total:health.total,status:health.status};
 if(publish){
  if(process.argv.includes('--collection-degraded')&&!validDegradedMarket(body))throw Error('STORED_MARKET_NOT_READY_AFTER_COLLECTION_FAILURE');
  const remote=client(config,credential(root));
  report.recovery=await recoverPublication(remote,config.core,base);
  save(path.join(base,'local-publication-ledger.json'),{status:'SUBMITTING',source,at:Date.now()});
  const {claimMarket,releaseMarket,publishMarket}=await import('./publish.mjs');
  const lease=await claimMarket(remote,config.core);if(!lease)throw Error('REMOTE_MARKET_LEASE_BUSY');
  try{
   const previous=(await remote.query(config.core,"SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results[0]?.stored_at;
   report.market={...report.market,...(previous>now?{status:'REMOTE_NEWER_PRESERVED',storedAt:previous}:await publishMarket(remote,config.core,read(path.join(base,'local-market-result.json')),now,lease,previous,path.join(base,'local-market-ledger.json')))};
  }finally{await releaseMarket(remote,config.core,lease);}
  // Explicit allowlist: publish display outputs only, never provider input/history rows.
  for(const {id,status} of report.projections){
   if(status==='PREVIOUS_RELEASE_PRESERVED')continue;
   const row=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(PUBLIC_PROJECTION_KEYS[id]).first();
   const envelope=JSON.parse(row.body);
   const current=(await remote.query(config.core,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results[0];
   if(current&&(JSON.parse(current.body).projection?.sourceStoredAt>envelope.projection.sourceStoredAt||current.stored_at>row.stored_at)){report.projections.find(x=>x.id===id).status='REMOTE_NEWER_PRESERVED';continue;}
   if(current&&hash(JSON.parse(current.body))===hash(envelope))continue;
   await projectionWriter(remote.adapter(config.core,{allowWrites:true})).write(id,envelope.payload,row.stored_at,envelope.projection);
   const check=(await remote.query(config.core,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results[0];
   if(!check||hash(JSON.parse(check.body).payload)!==hash(envelope.payload))throw Error('LOCAL_PROJECTION_PUBLICATION_MISMATCH');
  }
  // Reuse the existing public snapshot table; publish only the bounded display score.
  report.rateSentiment.publication=(await publishPublicRateSentiment(remote,config.core,rateSentiment)).status;
  try{report.stagflation.publication=(await publishStagflation(remote,config.core,stagflation)).status;}catch{report.stagflation.publication='UNVERIFIED';}
  try{report.stagflationLatest.publication=await publishLatestStagflation(remote,config.core,stagflationLatest);}catch{report.stagflationLatest.publication={status:'UNVERIFIED'};}
  const koreaOutput=await history.prepare('SELECT * FROM kfg_rev7_snapshots ORDER BY date DESC LIMIT 1').first();
  if(koreaOutput){
   const existing=(await remote.query(config.history,'SELECT * FROM kfg_rev7_snapshots WHERE date=?',[koreaOutput.date])).results[0];
   if(!existing){
    const checkpoint=await history.prepare('SELECT * FROM kfg_rev7_market_dates WHERE date=?').bind(koreaOutput.date).first();
    await remote.request(config.history,koreaPublicationPlan(koreaOutput,checkpoint));
    const check=(await remote.query(config.history,'SELECT * FROM kfg_rev7_snapshots WHERE date=?',[koreaOutput.date])).results[0];
    if(check?.composite_json!==koreaOutput.composite_json||check?.factors_json!==koreaOutput.factors_json)throw Error('LOCAL_KOREA_PUBLICATION_MISMATCH');
   }
  }
  const outputs=(await core.prepare("SELECT * FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current'").all()).results;
  for(const row of outputs){
   const existing=(await remote.query(config.core,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[row.feed_key])).results[0];
   if(existing?.stored_at>=row.stored_at)continue;
   if(existing&&!acceptsStoredUpdate(JSON.parse(existing.body),JSON.parse(row.body)))continue;
   await remote.request(config.core,[{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",params:[row.feed_key,row.body,row.stored_at]}]);
   const check=(await remote.query(config.core,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[row.feed_key])).results[0];
   if(check?.stored_at!==row.stored_at||check?.body!==row.body)throw Error('LOCAL_FEED_PUBLICATION_MISMATCH');
  }
  report.scoreArrows=await publishCoreArrowState(remote,config.core);
  report.remote=remote.stats;
  save(path.join(base,'local-publication-ledger.json'),{status:'VERIFIED',source,at:Date.now()});
 }
 report.status=publish?'VERIFIED':'DRY_RUN_PASS';
}catch(error){report.status='FAILED';report.error=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:error.code??'LOCAL_WRITER_FAILED';process.exitCode=1;}
finally{globalThis.fetch=originalFetch;console.warn=originalWarn;hook.deregister();core.close();history.close();save(path.join(base,'local-writer-last-run.json'),report);if(publish)appendPublicationEvent(base,{at:report.at,source,status:report.status,error:report.error??null,recovery:report.recovery?.outcome??null});if(publish)try{updateDataAlert(base,{key:'publication',failed:report.status!=='VERIFIED'});}catch{console.warn('LOCAL_DATA_ALERT_RECORD_FAILED');}console.log(JSON.stringify(report));}