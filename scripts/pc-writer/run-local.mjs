import {attemptOutput,isER1MonthlyFeedKey,er1MonthlyD1Readback,retainRecentER1Readback,assertER1ReadbackConsistent,canReuseER1VintageEvidence} from './independent-publication.mjs';
import {publishER1MonthlyVintages} from './er1-monthly-vintage-publication.mjs';
import {appendD1Diagnostic} from './d1-diagnostics.mjs';
import {r44D1Readback} from './market-calendar-r44-d1-readback.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {localDatabase} from './local-db.mjs';
import {installLocalRuntime} from './local-env.mjs';
import {client,credential,read,save,hash} from './d1.mjs';
import {mergeStoredCompositeTrend,oneYearHistoryStart} from '../../worker/composite-history.mjs';
import {attachStoredDomainScoreComparisons,attachStoredEarningsFactorTrends,sameVerifiedLineage} from './market-snapshot-comparisons.mjs';
import {attachStoredGrowthFactorTrends} from './growth-r2-saved-factor-history.mjs';
import {publicationCompatibility,recoverPublication,appendPublicationEvent} from './publication-guard.mjs';
import {koreaPublicationPlan} from './korea-publication.mjs';
import {readAssetR10Projection} from './asset-r10-projection.mjs';
import {preservePreviousR10,R10_RECALCULATED_STATUS} from './asset-r10-refresh-gate.mjs';
import {buildSupplyR10} from './supply-r10.mjs';
import {acceptsStoredUpdate} from '../../lib/market-score/live-refresh.mjs';
import {publishCoreArrowState} from './score-arrow-publication.mjs';
import {requiresRecessionR3DisplayRefresh} from './recession-r3-refresh.mjs';
import {requiresInflationR2TrendDateRefresh} from './inflation-r2-trend-date-refresh.mjs';
import {requiresLiquidityR2DisplayRefresh} from './liquidity-r2-refresh.mjs';
import {requiresCreditR2DisplayRefresh} from './credit-r2-refresh.mjs';
import {requiresDebtHistoryRefresh} from './debt-history-refresh.mjs';
import {prepareStagflation,publishStagflation} from './stagflation-publication.mjs';
import {assertCompleteMarket} from './market-publication-safety.mjs';
import {updateDataAlert} from './local-data-alert.mjs';
import {prepareLatestStagflation,publishLatestStagflation} from './stagflation-latest-publication.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const publish=process.argv.includes('--publish');
// Candidate only: recurring inflation research sidecar writes require their own
// approved publication scope and exact installed-source manifest before enablement.
const INFLATION_19_AUTO_PUBLICATION_APPROVED=true;
// W05 recurring scope: the three saved-only sidecars, no provider or SQLite writes.
// Deployment of this activation candidate requires the exact Writer B source CAS.
const W05_SAVED_SIDECARS_AUTO_PUBLICATION_APPROVED=true;
const config=read(path.join(base,'config.json'));
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(publish){
 if(config.collectionTarget!=='pc'||config.enabled!==true)throw Error('LOCAL_PUBLICATION_NOT_APPROVED');
 const main=execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const blocked=publicationCompatibility(root,config.source,source,main);
 if(blocked)throw Error(blocked.status);
 execFileSync('git',['diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{cwd:root,stdio:'pipe',windowsHide:true});
}
// Explicit saved-only W06 lane; no Core calculation, provider fetch, history DB,
// Core ledger overwrite, or installation/scheduler effect.
if(process.argv.includes('--cnn-minute')){
 if(!publish||process.argv.slice(2).some(arg=>!['--cnn-minute','--publish'].includes(arg)))throw Error('CNN_MINUTE_PUBLICATION_SCOPE_STOP');
 if(config.source!==source)throw Error('CNN_MINUTE_SOURCE_NOT_APPROVED');
 const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--','lib','worker','scripts/pc-writer'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 if(dirty)throw Error('CNN_MINUTE_SOURCE_NOT_APPROVED');
 const file=path.join(base,'storage','core.sqlite');
 if(!fs.existsSync(file))throw Error('CNN_MINUTE_CORE_DB_MISSING');
 const core=localDatabase(file);
 const receipt={at:new Date().toISOString(),source,lane:'cnn-minute',providerCalls:0};
 try{
  const remote=client(config,()=>credential(root),{onDiagnostic:diagnostic=>appendD1Diagnostic(base,{runAt:receipt.at,source},diagnostic)});
  const {publishCnnMinute}=await import('./cnn-observed-archive-publication-r1.mjs');
  Object.assign(receipt,await publishCnnMinute(core,remote,config.core));
  if(receipt.status!=='VERIFIED')process.exitCode=1;
 }catch(error){
  receipt.status='FAILED';
  receipt.error=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'CNN_MINUTE_PUBLICATION_FAILED';
  process.exitCode=1;
 }finally{core.close();console.log(JSON.stringify(receipt));}
}else{
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
 // Reuse the already-owned local-cycle lock; never acquire a new Core lease.
 let d05Writer=null,d05Captured=null,d05CaptureCount=0,d05MarketBody=null;
 if(publish){
  try{
   const {createD05LocalCycleExclusiveWriter}=await import('../../lib/score-history/d05-lineage-event-append-r1.mjs');
   d05Writer=createD05LocalCycleExclusiveWriter({pcHome:base});
  }catch{}
 }
 // Independent US breadth count from already stored and verified source rows.
 await attemptOutput(report,'us-breadth-calculation',async()=>{
  const {prepareUsBreadth}=await import('./market-breadth-us-r1.mjs');
  report.usBreadth=await prepareUsBreadth(core,{now:new Date(now)});
 });
 const marketReady=await attemptOutput(report,'market',async()=>{
 const body=await calculateMarket(root,core,now,d05Writer?{onInputEvidence:e=>{
  d05CaptureCount++;
  d05Captured=d05CaptureCount===1?e:null;
 }}:undefined);
 // Reuse the published daily score history already read for the overall chart.
 const storedHistory=await marketOperationalStore(core).readScoreHistory({sinceDate:oneYearHistoryStart(now),limit:370});
 const currentInflation=body.domains?.find(d=>d.id==='inflation')??null;
 // An R2 inflation composite is not a valid historic value for the restored R7 four-factor model.
 // Keep old snapshots in SQLite, but never splice them into the new-model public curve.
 const comparableCompositeHistory=storedHistory.filter(snapshot=>
  sameVerifiedLineage(currentInflation,snapshot?.body?.domains?.find(d=>d.id==='inflation'))
 );
 // Old unverified provider snapshots are not a paid-history source.
 const {isValidatedPaidBreadthDomain}=await import('../../worker/breadth-paid-contract.mjs');
 if(isValidatedPaidBreadthDomain(body.domains?.find(d=>d.id==='breadth'))){
  for(let i=comparableCompositeHistory.length-1;i>=0;i--)if(!isValidatedPaidBreadthDomain(comparableCompositeHistory[i]?.body?.domains?.find(d=>d.id==='breadth')))comparableCompositeHistory.splice(i,1);
 }
 if(body?.overall?.status==='READY'){
  body.overall.trend=mergeStoredCompositeTrend({
   legacyTrend:body.overall.trend,
   storedSnapshots:comparableCompositeHistory,
   currentScore:body.overall.score,
   currentDate:body.asOfDate??new Date(now).toISOString().slice(0,10),
  });
 }
 attachStoredDomainScoreComparisons(body,storedHistory);
 attachStoredEarningsFactorTrends(body,storedHistory);
 attachStoredGrowthFactorTrends(body,storedHistory);
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
 // Validate before replacing even the local current/day snapshot or result file.
 assertCompleteMarket(body);
 await marketOperationalStore(core).writeScore(body,now);
 save(path.join(base,'local-market-result.json'),body);
 if(d05Writer)d05MarketBody=body;
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
 });
 if(!marketReady)report.market={status:'PREVIOUS_RELEASE_PRESERVED'};
 // D05 final OUTPUT validation reuses the already committed market score/day
 // snapshots. No indicator collection, new SQLite key or additional write.
 // This is independent of the legacy composite archive signature/no-op gate.
 // Any optional evidence failure must preserve the approved market publisher.
 if(marketReady){
  try{
   const {readVerifiedMarketFinalOutputs}=await import('../../lib/score-history/d05-final-score-local-readback-r1.mjs');
   report.d05FinalOutputReadback=await readVerifiedMarketFinalOutputs(core,{
    calculatedAtMs:now,now:Date.now(),
   });
  }catch{report.d05FinalOutputReadback={status:'UNPROVEN_LOCAL_FINAL_OUTPUT'};}
 }
 if(marketReady)await attemptOutput(report,'composite-archive-local',async()=>{
  const {appendCompositeObservedFromCurrent}=await import('./composite-observed-archive-r1.mjs');
  report.compositeObserved=await appendCompositeObservedFromCurrent(core,now);
 });
 // Private selected-input metadata only, following an existing saved archive.
 // Failure must not block the already approved market calculation or publisher.
 if(marketReady&&d05Writer&&report.compositeObserved?.status==='LOCAL_STORED'){
  try{
   const {recordD05LineageFromStoredArchive}=await import('../../lib/score-history/d05-lineage-local-record-r1.mjs');
   const result=await recordD05LineageFromStoredArchive({
    db:core,now,marketBody:d05MarketBody,capture:d05Captured,
    archiveResult:report.compositeObserved,runtimeSourceSha:source,
    approvedSourceSha:config.source,recordedAt:new Date().toISOString(),
    ledgerPath:path.join(base,'score-lineage','d05-composite-events-v1.jsonl'),
    exclusiveWriter:d05Writer,initializeApprovedDirectory:true,
   });
   report.d05PrivateLineageStatus=['APPENDED_VERIFIED_LOCAL_ONLY','NOOP_SAME_EVENT'].includes(result?.status)
    ?result.status:'UNPROVEN';
  }catch{report.d05PrivateLineageStatus='UNPROVEN';}
 }
 // Rate sentiment is a separate stored-data score; never modify the approved Rate R3 domain.
 const {preparePublicRateSentiment,publishPublicRateSentiment}=await import('./rate-sentiment-publication.mjs');
 let rateSentiment={status:'UNAVAILABLE'};await attemptOutput(report,'rate-sentiment-calculation',async()=>{rateSentiment=await preparePublicRateSentiment(core,now);});
 report.rateSentiment={status:rateSentiment.status,observationDate:rateSentiment.observationDate??null,reason:rateSentiment.reason??null};
 // Separate opt-in projection. Failure does not interrupt existing market/Korea publication.
 let stagflation={status:'DISABLED',prepared:false};
 try{stagflation=await prepareStagflation(core,{enabled:config.stagflationS21Publication===true,now});}catch{stagflation={status:'PARTIAL',prepared:false,reason:'STAGFLATION_PREPARATION_FAILED'};}
 report.stagflation={status:stagflation.status,observationMonth:stagflation.body?.observationMonth??null,reason:stagflation.reason??null};
 let stagflationLatest={status:'DISABLED',prepared:false};
 try{stagflationLatest=await prepareLatestStagflation(core,{enabled:config.latestStagflationPublication===true,now});}catch{stagflationLatest={status:'PARTIAL',prepared:false};}
 report.stagflationLatest={status:stagflationLatest.status,score:stagflationLatest.body?.score??null};
 await attemptOutput(report,'korea-calculation',async()=>{
 const koreaStore=new Rev7D1Store(history,{leaseMs:600000});
 const latest=await koreaStore.getLatestCompleteDate();
 const prior=await koreaStore.getLatestSnapshot();
 if(latest>prior?.date||!prior){
  if(!await koreaStore.acquireLease())throw Error('LOCAL_KOREA_LEASE_BUSY');
  try{const result=await calculateKorea({query:(_db,sql,params=[])=>history.prepare(sql).bind(...params).all()},'local',path.join(base,'korea-inputs'));await koreaStore.saveSnapshot(result);report.korea={status:'LOCAL_STORED',date:result.observationDate};}
  finally{await koreaStore.releaseLease();}
 }else report.korea={status:'UNCHANGED',date:prior.date};
 });
 for(const id of Object.keys(PUBLIC_PROJECTION_KEYS)){
  await attemptOutput(report,'projection:'+id,async()=>{
  // Recompute only from saved inputs when the R10 input set is installed.
  // No provider fetch, and failure preserves the previous valid release file.
  const r10InputInstalled=id==='assetBubble'&&fs.existsSync(path.join(base,'local-asset-bubble-r10-breadth-research.json'));
  if(r10InputInstalled){
   try{
    const releaseOutput=execFileSync(process.execPath,[path.join(root,'scripts/pc-writer/build-asset-r10-release.mjs'),'--run-r10-release'],{cwd:root,stdio:'pipe',windowsHide:true,encoding:'utf8'}).trim();
    const receipt=JSON.parse(releaseOutput.split(/\r?\n/).at(-1));
    if(receipt.status!=='LOCAL_RELEASE_READY'||receipt.gate!=='PASS')throw Error('R10_RELEASE_RECEIPT_NOT_READY');
    if(readAssetR10Projection(base).status!=='READY')throw Error('R10_RELEASE_LOCAL_READBACK_NOT_READY');
    report.assetR10Calculation={status:R10_RECALCULATED_STATUS};
   }catch{report.assetR10Calculation={status:'FAILED_PREVIOUS_RELEASE_PRESERVED'};}
  }
  const scope={...env,DB:id==='koreaFearGreed'?history:core};
  let r10=null;
  if(id==='assetBubble')r10=readAssetR10Projection(base);
  if(id==='supplyShock'){
   try{r10=buildSupplyR10(base);}catch{r10={status:'FAILED',reason:'SUPPLY_R10_CALCULATION_FAILED'};}
  }
  if(id==='supplyShock'&&r10)report.supplyR10={status:r10.status,reason:r10.reason??null,score:r10.payload?.score??null,scoreObservationMonth:r10.payload?.scoreObservationMonth??null};
  if(id==='assetBubble'&&r10)report.assetR10={status:r10.status,reason:r10.reason??null,reasons:r10.reasons??[]};
  // A valid *previous* release is not proof that the current R10 calculation
  // succeeded. Keep it intact, but never stamp or republish it as fresh.
  if(id==='assetBubble'&&preservePreviousR10({inputInstalled:r10InputInstalled,calculationStatus:report.assetR10Calculation?.status,projectionStatus:r10?.status})){
   report.assetR10={status:'PREVIOUS_RELEASE_PRESERVED',reason:report.assetR10Calculation?.status==='FAILED_PREVIOUS_RELEASE_PRESERVED'?'R10_RELEASE_CALCULATION_FAILED':'R10_RELEASE_NOT_READY'};
   report.projections.push({id,status:'PREVIOUS_RELEASE_PRESERVED'});
   return;
  }
  if(id==='supplyShock'&&r10?.status!=='READY'){
   report.projections.push({id,status:'PREVIOUS_RELEASE_PRESERVED'});
   return;
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
  const debtHistoryRefresh=id==='debtRisk'&&requiresDebtHistoryRefresh(envelope);
  // Repair only the legacy future-month-end evaluation label using saved PIT
  // inputs; unchanged checkpoints and unrelated projections remain untouched.
  const inflationR2DateRefresh=id==='inflation'&&requiresInflationR2TrendDateRefresh(envelope);
  if(p?.status!=='READY'||p.sourceVersion!==checkpoint.sourceVersion||p.sourceStoredAt!==checkpoint.sourceStoredAt||recessionR3Refresh||liquidityR2Refresh||creditR2Refresh||debtHistoryRefresh||inflationR2DateRefresh){
   const input=r10?.status==='READY'?null:await loadProjectionSource(id,scope,{now:checkpoint.sourceStoredAt});
   const payload=r10?.status==='READY'?r10.payload:await builders[id](input);
   await projectionWriter(core).write(id,payload,Date.now(),checkpoint);
  }
  report.projections.push({id,status:'LOCAL_READY'});
  });
 }
 const {enrichLocalBeginnerProjections}=await import('./beginner-projection-cycle.mjs');
 report.beginnerCopy=await enrichLocalBeginnerProjections({core,fetcher:originalFetch,now:Date.now()});
 if(report.providerCalls)throw Error('CALCULATION_ATTEMPTED_NETWORK');
 globalThis.fetch=originalFetch;
 const {storeLocalCollectionHealth}=await import('./collection-health.mjs');
 const health=await storeLocalCollectionHealth(core,history,now,base);
 report.collectionHealth={normal:health.normal,total:health.total,status:health.status};
 await attemptOutput(report,'api-connection-health-snapshot',async()=>{
  const {storeLocalApiConnectionHealth}=await import('./api-connection-health.mjs');
  report.apiConnectionHealth=await storeLocalApiConnectionHealth(core,base,now);
 });
 // Score only complete future monthly cohorts from already-saved PC inputs.
 // This local calculation also runs without --publish; an unavailable D1
 // cannot prevent the derived score from being stored for a later publication.
 await attemptOutput(report,'market-calendar-er1-future',async()=>{
  const {publicFeedStore}=await import('../../worker/public-feed-store.mjs');
  const {refreshSavedER1MonthlyOutputs}=await import('./market-calendar-er1-auto-output.mjs');
  report.er1Future=await refreshSavedER1MonthlyOutputs({store:publicFeedStore(core),now});
 });
 // Derived R44 grades from the pinned private source + stored calendar days.
 // No supplier GET during calculation and no change to ER1 calculation.
 await attemptOutput(report,'market-calendar-r44-delta',async()=>{
  const {publicFeedStore}=await import('../../worker/public-feed-store.mjs');
  const {refreshSavedDeltaR44Output}=await import('./market-calendar-deltascreener-output.mjs');
  report.deltaR44=await refreshSavedDeltaR44Output({store:publicFeedStore(core),now,pcHome:base});
 });
 // Separate taxonomy only; R44 grades remain exactly as published and validated.
 await attemptOutput(report,'market-calendar-taxonomy',async()=>{
  const {publicFeedStore}=await import('../../worker/public-feed-store.mjs');
  const {refreshSavedMarketCalendarTaxonomy}=await import('./market-calendar-taxonomy-output.mjs');
  report.marketCalendarTaxonomy=await refreshSavedMarketCalendarTaxonomy({
   store:publicFeedStore(core),now,
  });
 });
 if(publish){
  // Each output below owns its validation and readback; marketReady never gates peers.
  const remote=client(config,()=>credential(root),{onDiagnostic:diagnostic=>appendD1Diagnostic(base,{runAt:report.at,source},diagnostic)});
  report.remote=remote.stats;
  report.recovery=await recoverPublication(remote,config.core,base);
  // Capture the last verified PIT evidence before the SUBMITTING ledger is
  // overwritten; reading it later would always return an empty archive list.
  let previousVintageEvidence=[];
  try{
   const priorLedger=read(path.join(base,'local-publication-ledger.json'));
   if(['VERIFIED','PARTIAL'].includes(priorLedger.status)&&
    Array.isArray(priorLedger.er1VintageReadbacks))
    previousVintageEvidence=priorLedger.er1VintageReadbacks;
  }catch{}
  save(path.join(base,'local-publication-ledger.json'),{status:'SUBMITTING',source,at:Date.now()});
  const {claimMarket,releaseMarket,publishMarket}=await import('./publish.mjs');
  if(marketReady)await attemptOutput(report,'market-publication',async()=>{
  const lease=await claimMarket(remote,config.core);if(!lease)throw Error('REMOTE_MARKET_LEASE_BUSY');
  try{
   const previous=(await remote.query(config.core,"SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results[0]?.stored_at;
   report.market={...report.market,...(previous>now?{status:'REMOTE_NEWER_PRESERVED',storedAt:previous}:await publishMarket(remote,config.core,read(path.join(base,'local-market-result.json')),now,lease,previous,path.join(base,'local-market-ledger.json')))};
  }finally{await releaseMarket(remote,config.core,lease);}
  });
  await attemptOutput(report,'composite-observed-publication',async()=>{
   const {publishCompositeObservedArchive}=await import('./composite-observed-archive-r1.mjs');
   report.compositeObservedPublication=await publishCompositeObservedArchive(core,remote,config.core);
  });
  // US-only stored display counts; source gaps preserve the prior verified record.
  if(report.usBreadth?.prepared)await attemptOutput(report,'us-breadth-publication',async()=>{
   const {publishUsBreadth}=await import('./market-breadth-us-r1.mjs');
   report.usBreadth.publication=await publishUsBreadth(remote,config.core,report.usBreadth,{now});
  });
  else report.usBreadth={...(report.usBreadth??{status:'UNAVAILABLE'}),publication:'SKIPPED_NOT_READY'};
  // Explicit allowlist: publish display outputs only, never provider input/history rows.
  for(const {id,status} of report.projections){
   if(status!=='LOCAL_READY')continue;
   await attemptOutput(report,'projection-publication:'+id,async()=>{
   const row=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(PUBLIC_PROJECTION_KEYS[id]).first();
   const envelope=JSON.parse(row.body);
   const current=(await remote.query(config.core,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results[0];
   if(current&&(JSON.parse(current.body).projection?.sourceStoredAt>envelope.projection.sourceStoredAt||current.stored_at>row.stored_at)){report.projections.find(x=>x.id===id).status='REMOTE_NEWER_PRESERVED';return;}
   if(current&&hash(JSON.parse(current.body))===hash(envelope))return;
   await projectionWriter(remote.adapter(config.core,{allowWrites:true})).write(id,envelope.payload,row.stored_at,envelope.projection);
   const check=(await remote.query(config.core,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[PUBLIC_PROJECTION_KEYS[id]])).results[0];
   if(!check||hash(JSON.parse(check.body).payload)!==hash(envelope.payload))throw Error('LOCAL_PROJECTION_PUBLICATION_MISMATCH');
   });
  }
  // Independently publish the two already-approved R10 display-only D1 sidecars.
  // The scored R10 projection must have passed its own publication/readback;
  // missing/stale content aborts this side lane, not other domains.
  if(report.assetR10?.status==='READY'){
   await attemptOutput(report,'asset-r10-sidecars-publication',async()=>{
    const r10=readAssetR10Projection(base);
    if(r10.status!=='READY')throw Error('ASSET_R10_SIDECAR_RELEASE_NOT_READY');
    const {publishAssetR10Sidecars}=await import('./asset-r10-sidecar-auto-publication-r1.mjs');
    report.assetR10Sidecars=await publishAssetR10Sidecars({
     pcHome:base,remote,coreDb:config.core,scored:r10.payload,
    });
   });
  }
  if(INFLATION_19_AUTO_PUBLICATION_APPROVED){
   await attemptOutput(report,'inflation-19-publication',async()=>{
    const {publishInflation19Auto}=await import('./inflation-causal-public-auto-publication-r1.mjs');
    report.inflation19=await publishInflation19Auto({pcHome:base,remote,coreDb:config.core});
   });
  }
  // Approved seven-row research sidecar; isolated from the legacy 19 and scores.
  await attemptOutput(report,'inflation-7-publication',async()=>{
   const {publishInflationCandidates7Auto}=await import('./inflation-causal-candidates-public-7-auto-publication-r1.mjs');
   report.inflation7=await publishInflationCandidates7Auto({pcHome:base,remote,coreDb:config.core});
  });
  // W05 saved-only informational sidecars. Activation candidate for the
  // three-key recurring D1 scope; install only through exact Writer B CAS.
  // Reuse the existing run-local Writer lane and its attemptOutput isolation;
  // never create a second Task, scheduler, provider call or DB writer.
  if(W05_SAVED_SIDECARS_AUTO_PUBLICATION_APPROVED){
   const {W05_SAVED_IDS,publishW05StoredSidecar}=await import(
    './w05-stored-sidecar-publication-r1.mjs');
   report.w05SavedSidecars={};
   for(const id of W05_SAVED_IDS){
    await attemptOutput(report,'w05-saved-sidecar:'+id,async()=>{
     report.w05SavedSidecars[id]=await publishW05StoredSidecar({
      id,pcHome:base,remote,coreDb:config.core,now,
     });
    });
   }
  }
  // Reuse the existing public snapshot table; publish only the bounded display score.
  await attemptOutput(report,'rate-sentiment-publication',async()=>{report.rateSentiment.publication=(await publishPublicRateSentiment(remote,config.core,rateSentiment)).status;});
  try{report.stagflation.publication=(await publishStagflation(remote,config.core,stagflation)).status;}catch(error){report.stagflation.publication='UNVERIFIED';report.stagflation.reason=/^STAGFLATION_[A-Z_]+$/.test(error.message??'')?error.message:'STAGFLATION_PUBLICATION_FAILED';}
  try{report.stagflationLatest.publication=await publishLatestStagflation(remote,config.core,stagflationLatest);}catch{report.stagflationLatest.publication={status:'UNVERIFIED'};}
  await attemptOutput(report,'korea-publication',async()=>{
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
  });
  const outputs=(await core.prepare("SELECT * FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current'").all()).results;
  const er1FeedReadbacks=[];
  const r44FeedReadbacks=[];
  const recordR44Readback=(row,d1Row)=>{
   const evidence=r44D1Readback(row,d1Row);
   if(evidence)r44FeedReadbacks.push(evidence);
  };
  const er1VintageReadbacks=[];
  const recordER1Readback=(row,d1Row)=>{
   if(!isER1MonthlyFeedKey(row.feed_key))return null;
   return retainRecentER1Readback(er1FeedReadbacks,er1MonthlyD1Readback(row,d1Row));
  };
  for(const row of outputs){
   await attemptOutput(report,'feed:'+row.feed_key,async()=>{
   if(row.feed_key==='fear-greed'){
    const {publishCnnCurrent}=await import('./cnn-observed-archive-publication-r1.mjs');
    report.cnnCurrentPublication=await publishCnnCurrent(core,remote,config.core);
    return;
   }
   const existing=(await remote.query(config.core,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[row.feed_key])).results[0];
   if(isER1MonthlyFeedKey(row.feed_key)){
    const evidence=er1MonthlyD1Readback(row,existing);
    const previous=Array.isArray(previousVintageEvidence)?previousVintageEvidence.find(item=>
     item?.key===row.feed_key):null;
    if(canReuseER1VintageEvidence(evidence,previous)){
     // Unchanged, authenticated current output plus previously verified dated
     // archives: reuse existing evidence instead of rescanning old months.
     er1VintageReadbacks.push({...previous,reused:true});
     assertER1ReadbackConsistent(recordER1Readback(row,existing));
     return;
    }
    // Publish/read back every PIT vintage before replacing this month's
    // current D1 cohort. Failures preserve current and leave other feeds free.
    const vintage=await publishER1MonthlyVintages(core,remote,config.core,row.feed_key,{current:row});
    er1VintageReadbacks.push({key:row.feed_key,...vintage,
     localStoredAt:evidence.localStoredAt,localBodySha256:evidence.localBodySha256});
    if(vintage.status!=='VERIFIED')throw Error('ER1_VINTAGE_BACKLOG_PENDING');
   }
   if(existing?.stored_at>=row.stored_at){
    assertER1ReadbackConsistent(recordER1Readback(row,existing));
    recordR44Readback(row,existing);return;
   }
   if(existing&&!acceptsStoredUpdate(JSON.parse(existing.body),JSON.parse(row.body))){
    recordER1Readback(row,existing);
    recordR44Readback(row,existing);return;
   }
   await remote.request(config.core,[{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",params:[row.feed_key,row.body,row.stored_at]}]);
   const check=(await remote.query(config.core,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[row.feed_key])).results[0];
   recordER1Readback(row,check);
   recordR44Readback(row,check);
   if(check?.stored_at!==row.stored_at||check?.body!==row.body)throw Error('LOCAL_FEED_PUBLICATION_MISMATCH');
   });
  }
  report.deltaR44D1=r44FeedReadbacks[0]??{status:'R44_OUTPUT_NOT_SEEN'};
  // Independent, bounded publication lane for PC-archived real CNN scores.
  // A missing archive is valid until a new verified observation is collected.
  await attemptOutput(report,'cnn-observed-archive',async()=>{
   const {publishCnnObservedArchive}=await import('./cnn-observed-archive-publication-r1.mjs');
   report.cnnObservedArchive=await publishCnnObservedArchive(core,remote,config.core);
  });
  // Explicit opt-in only. R6 reads the approved Core and publishes a separate
  // stored 1Y snapshot; its failure cannot interrupt existing market outputs.
  report.employmentR6OneYear={status:'DISABLED'};
  if(config.employmentR6OneYearAutoPublication===true){
   await attemptOutput(report,'employment-r6-one-year-publication',async()=>{
    const {runEmploymentR6AutoPublication}=await import('./employment-r6-auto-publication.mjs');
    report.employmentR6OneYear=await runEmploymentR6AutoPublication({
     enabled:true,pcHome:base,approvedSource:config.source,runningSource:source,
     remote,dbId:config.core,now,
    });
   });
  }
  await attemptOutput(report,'arrows',async()=>{report.scoreArrows=await publishCoreArrowState(remote,config.core);});
  report.remote=remote.stats;
  save(path.join(base,'local-publication-ledger.json'),{status:report.failures?.length?'PARTIAL':'VERIFIED',
   source,at:Date.now(),er1FeedReadbacks,er1VintageReadbacks:er1VintageReadbacks
    .sort((a,b)=>b.key.localeCompare(a.key))});
 }
 report.status=report.failures?.length?(publish?'VERIFIED_WITH_GAPS':'DRY_RUN_PARTIAL'):publish?'VERIFIED':'DRY_RUN_PASS';
 if(report.failures?.length)process.exitCode=1;
}catch(error){report.status='FAILED';report.error=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:error.code??'LOCAL_WRITER_FAILED';process.exitCode=1;}
finally{globalThis.fetch=originalFetch;console.warn=originalWarn;hook.deregister();core.close();history.close();save(path.join(base,'local-writer-last-run.json'),report);if(publish){appendPublicationEvent(base,{at:report.at,source,status:report.status,error:report.error??null,recovery:report.recovery?.outcome??null});try{updateDataAlert(base,{key:'publication',failed:report.status!=='VERIFIED'});}catch{console.warn('LOCAL_DATA_ALERT_RECORD_FAILED');}}console.log(JSON.stringify(report));}


}
