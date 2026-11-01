import os from 'node:os';
import path from 'node:path';
import {localDatabase} from './local-db.mjs';
import {save} from './d1.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';
import {SECTOR_FEAR_GREED_R3_FEED_KEY} from '../../worker/sector-fear-greed-r3-public.mjs';
import {buildSectorFearGreedR3Public} from '../../lib/market-score/sector-fear-greed-r3-public.mjs';
import {buildSectorFearGreedR3RollingLocalSource,SECTOR_FEAR_GREED_R3_ROLLING_FILE} from './sector-fear-greed-r3-rolling-local.mjs';

const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const sourceFile=path.join(base,SECTOR_FEAR_GREED_R3_ROLLING_FILE);
const reportFile=path.join(base,'local-sector-fear-greed-r3-last-run.json');
const writeLocal=process.argv.includes('--write-local');

const canonical=body=>JSON.stringify({
 version:body?.version??null,
 observationDate:body?.observationDate??null,
 methodologyVersion:body?.methodologyVersion??null,
 referenceObservations:body?.referenceObservations??null,
 sourceVersion:body?.sourceVersion??null,
 sectors:body?.sectors??[],
 history:body?.history??[],
});
const displayCanonical=body=>JSON.stringify({
 version:body?.version??null,
 observationDate:body?.observationDate??null,
 methodologyVersion:body?.methodologyVersion??null,
 referenceObservations:body?.referenceObservations??null,
 sectors:body?.sectors??[],
 history:body?.history??[],
});
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);

const report={
 at:new Date().toISOString(),
 mode:writeLocal?'WRITE_LOCAL':'CHECK_ONLY',
 providerCalls:0,
 networkCalls:0,
 dbWrites:0,
 d1Writes:0,
 sourceFile,
 status:'FAILED',
};
let core,store,existing;
try{
 if(writeLocal){
  core=localDatabase(path.join(base,'storage','core.sqlite'));
  store=publicFeedStore(core);
  existing=await store.readOutput(SECTOR_FEAR_GREED_R3_FEED_KEY);
 }
 let source;
 try{
  source=buildSectorFearGreedR3RollingLocalSource(base,{now:new Date(),write:true});
 }catch(error){
  report.error=/^[A-Z0-9_:.-]+$/.test(error?.message??'')?error.message:'SECTOR_FEAR_GREED_R3_ROLLING_INPUT_FAILED';
  if(existing){
   report.status='ROLLING_INPUT_NOT_READY_PREVIOUS_RELEASE_PRESERVED';
   report.observationDate=existing.body?.observationDate??null;
   report.storedAt=existing.storedAt;
  }else throw error;
 }
 if(source){
  const now=Date.now(),payload=buildSectorFearGreedR3Public(source,{now});
  const observationAt=Date.parse(`${payload.observationDate}T23:59:59Z`),ageMs=now-observationAt;
  report.observationDate=payload.observationDate;
  report.sourceVersion=payload.sourceVersion;
  report.historyPoints=payload.history.length;
  report.sectors=payload.sectors.length;
  report.ageMs=ageMs;
  report.stockLastDate=source.inputDiagnostics?.stockLastDate??null;
  report.benchmarkLastDates=source.inputDiagnostics?.benchmarkLastDates??null;
  if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=PUBLIC_DISPLAY_MAX_AGE_MS){
   report.status='STALE_INPUT_PREVIOUS_RELEASE_PRESERVED';
  }else if(!writeLocal){
   report.status='CHECK_READY';
  }else{
   const oldDate=existing?.body?.observationDate;
   if(validDate(oldDate)&&oldDate>payload.observationDate){
    report.status='NEWER_PREVIOUS_RELEASE_PRESERVED';
    report.storedAt=existing.storedAt;
   }else if(existing&&oldDate===payload.observationDate){
    if(displayCanonical(existing.body)!==displayCanonical(payload))throw Error('SECTOR_FEAR_GREED_R3_SAME_DATE_SCORE_DRIFT');
    report.status=canonical(existing.body)===canonical(payload)?'UNCHANGED':'UNCHANGED_EQUIVALENT_SOURCE';
    report.storedAt=existing.storedAt;
   }else{
    await store.writeOutput(SECTOR_FEAR_GREED_R3_FEED_KEY,payload,now);
    const check=await store.readOutput(SECTOR_FEAR_GREED_R3_FEED_KEY);
    if(!check||canonical(check.body)!==canonical(payload))throw Error('SECTOR_FEAR_GREED_R3_LOCAL_READBACK_FAILED');
    report.status='LOCAL_READY';
    report.dbWrites=2;
    report.storedAt=check.storedAt;
   }
  }
 }
}catch(error){
 report.status='FAILED';
 report.error=/^[A-Z0-9_:.-]+$/.test(error?.message??'')?error.message:'SECTOR_FEAR_GREED_R3_LOCAL_CYCLE_FAILED';
 process.exitCode=1;
}finally{
 try{core?.close();}catch{}
 save(reportFile,report);
 console.log(JSON.stringify(report));
}
