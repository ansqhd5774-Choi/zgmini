import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {localDatabase} from './local-db.mjs';
import {save} from './d1.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';
import {SECTOR_FEAR_GREED_R3_FEED_KEY} from '../../worker/sector-fear-greed-r3-public.mjs';
import {buildSectorFearGreedR3Public} from '../../lib/market-score/sector-fear-greed-r3-public.mjs';

const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const sourceFile=path.join(base,'local-sector-fear-greed-r21332-full-252-historical-validation.json');
const reportFile=path.join(base,'local-sector-fear-greed-r3-last-run.json');
const writeLocal=process.argv.includes('--write-local');

const readJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const canonical=body=>JSON.stringify({version:body?.version??null,observationDate:body?.observationDate??null,methodologyVersion:body?.methodologyVersion??null,referenceObservations:body?.referenceObservations??null,sourceVersion:body?.sourceVersion??null,sectors:body?.sectors??[],history:body?.history??[]});

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
let core;
try{
 const source=readJson(sourceFile);
 if(!source)throw Error('SECTOR_FEAR_GREED_R3_SOURCE_FILE_MISSING');
 const now=Date.now();
 const payload=buildSectorFearGreedR3Public(source,{now});
 const observationAt=Date.parse(`${payload.observationDate}T23:59:59Z`);
 const ageMs=now-observationAt;
 report.observationDate=payload.observationDate;
 report.sourceVersion=payload.sourceVersion;
 report.historyPoints=payload.history.length;
 report.sectors=payload.sectors.length;
 report.ageMs=ageMs;
 if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=PUBLIC_DISPLAY_MAX_AGE_MS){
  report.status='STALE_INPUT_PREVIOUS_RELEASE_PRESERVED';
 }else if(!writeLocal){
  report.status='CHECK_READY';
 }else{
  core=localDatabase(path.join(base,'storage','core.sqlite'));
  const store=publicFeedStore(core);
  const existing=await store.readOutput(SECTOR_FEAR_GREED_R3_FEED_KEY);
  if(existing&&canonical(existing.body)===canonical(payload)){
   report.status='UNCHANGED';
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
}catch(error){
 report.status='FAILED';
 report.error=/^[A-Z0-9_:.-]+$/.test(error?.message??'')?error.message:'SECTOR_FEAR_GREED_R3_LOCAL_CYCLE_FAILED';
 process.exitCode=1;
}finally{
 try{core?.close();}catch{}
 save(reportFile,report);
 console.log(JSON.stringify(report));
}
