// R29: runs inside the existing PC Core cycle, private SQLite inputs only.
// The publisher selects kind='output'; this module never writes that kind.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {collectEarningsApiWindow,earningsApiWindow} from '../../lib/earnings-api-calendar.mjs';
import {readEarningsApiPrivateProjection,EARNINGS_API_R30_PRIVATE_KEY} from '../../lib/earnings-api-private-projection.mjs';
import {earningsDisplaySnapshot,EARNINGS_API_DISPLAY_KEY} from '../../lib/earnings-api-display.mjs';
import {r43ImportanceIndex} from '../../lib/market-calendar-r43-issuer-rank.mjs';

const KEY='release-calendar';
const STATUS_KEY=`${KEY}:earnings-api:status`;
const R43_LOCAL_OUTPUT='local-market-calendar-r43-ranked.json';
const rights=Object.freeze({
 automatedFetch:true,pcStorage:true,publicDisplay:false,redistribution:false,
 commercialUse:false,reviewedAt:'2026-10-28',
 evidenceUrl:'https://www.earningsapi.com/docs/examples/calendar-backfill-sync',
 evidenceNote:'Provider documentation explicitly describes daily sync and storing responses by date and reporting time bucket.'
});

// Only a complete, licensed, fresh PC-local full-universe rank can replace
// the interim static issuer importance. No network access or DB writes here.
export function readR43LocalImportance({
  base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
  now=Date.now(),
}={}){
 try{
  const file=path.join(base,R43_LOCAL_OUTPUT);
  if(!fs.existsSync(file)||fs.statSync(file).size>2_000_000)return null;
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(data?.sourceProvenance!=='APPROVED_PC_STORED_DATA'||
    data?.sourceRightsReviewed!==true||data?.marketCapApiUsed!==false)return null;
  return r43ImportanceIndex(data,{now});
 }catch{return null;}
}

// R33: derive a display-only output from a previously stored R30 private input.
// No provider API request, new table, public raw input or calendar promotion.
export async function replayCachedEarningsDisplay({store,now=Date.now(),sourceState,
 importanceIndex=readR43LocalImportance({now})}={}){
 if(!store||typeof store.readInput!=='function'||typeof store.readOutput!=='function'||
  typeof store.writeOutput!=='function'||!Number.isFinite(now))
  return {status:'CACHE_REPLAY_DEPENDENCY_INVALID',providerRequests:0};
 let projection,restoredProjection=false;
 try{
  projection=(await store.readInput(EARNINGS_API_R30_PRIVATE_KEY))?.body;
  const sourceTime=Date.parse(sourceState?.checkedAt);
  const oldTime=Date.parse(projection?.checkedAt);
  if(sourceState?.status==='READY'&&
   (!projection||!Number.isFinite(oldTime)||sourceTime>oldTime)){
   // A successful daily raw fetch supersedes yesterday's private snapshot.
   // Rebuild from the already stored inputs; never make a second API call.
   try{
    const refreshed=await readEarningsApiPrivateProjection({store,sourceState,feedKey:KEY,now});
    await store.writeInput(EARNINGS_API_R30_PRIVATE_KEY,refreshed,now);
    const saved=await store.readInput(EARNINGS_API_R30_PRIVATE_KEY);
    if(JSON.stringify(saved?.body)!==JSON.stringify(refreshed))throw Error('R33_PRIVATE_READBACK_FAILED');
    projection=refreshed;restoredProjection=true;
   }catch{if(!projection)throw Error('R33_PRIVATE_CACHE_MISSING');}
  }
  if(!projection)return {status:'CACHE_NOT_FOUND',providerRequests:0};
  const at=Date.parse(projection.checkedAt),days=earningsApiWindow(now);
  if(!Number.isFinite(at)||at>now+300000||now-at>48*3600000||
   !Array.isArray(projection.coveredDays)||!projection.coveredDays.includes(days[0]))
   return {status:'CACHE_EXPIRED_OR_OUT_OF_WINDOW',providerRequests:0};
  const display=earningsDisplaySnapshot(projection,{importanceIndex});
  const prior=(await store.readOutput(EARNINGS_API_DISPLAY_KEY))?.body;
  if(prior?.status==='READY_DISPLAY'&&JSON.stringify(prior)===JSON.stringify(display))
   return {status:'DISPLAY_ALREADY_READY',providerRequests:0,
    recordCount:display.recordCount,sourceCheckedAt:display.checkedAt,restoredProjection};
  await store.writeOutput(EARNINGS_API_DISPLAY_KEY,display,now);
  const saved=await store.readOutput(EARNINGS_API_DISPLAY_KEY);
  if(JSON.stringify(saved?.body)!==JSON.stringify(display))throw Error('R33_DISPLAY_READBACK_FAILED');
  return {status:'READY_CACHED_DISPLAY',providerRequests:0,
   recordCount:display.recordCount,sourceCheckedAt:display.checkedAt,restoredProjection};
 }catch{return {status:'CACHE_REPLAY_FAILED',providerRequests:0};}
}

export async function collectEarningsApiLocal({db,apiKey,now=Date.now(),fetchImpl=fetch,
 store=publicFeedStore(db)}={}){
 if(typeof apiKey!=='string'||apiKey.length<8)return {status:'SKIPPED_NO_KEY',providerRequests:0};
 const last=await store.readInput(STATUS_KEY);
 const result=await collectEarningsApiWindow({store,key:KEY,now,fetchImpl,apiKey,
  rights,scope:'pc_private',previous:last?{body:{sources:{earningsApi:last.body}}}:null});
 // This status is a local input, not a publishable output.
 if(!result.skipped)await store.writeInput(STATUS_KEY,result.state,now);
 let projectionStatus='SKIPPED_UNCHANGED';
 let projectionCount=null;
 let displayStatus='SKIPPED_UNCHANGED';
 if(!result.skipped&&result.state.status==='READY'){
  try{
   // No extra network calls: only the already persisted private R29 inputs.
   const projection=await readEarningsApiPrivateProjection({store,
    sourceState:result.state,feedKey:KEY,now});
   await store.writeInput(EARNINGS_API_R30_PRIVATE_KEY,projection,now);
   const saved=await store.readInput(EARNINGS_API_R30_PRIVATE_KEY);
   if(JSON.stringify(saved?.body)!==JSON.stringify(projection))throw Error('R30_PRIVATE_READBACK_FAILED');
   projectionStatus='READY_PRIVATE';projectionCount=projection.recordCount;
  }catch{projectionStatus='PRIVATE_PROJECTION_FAILED';}
 }
 const replay=await replayCachedEarningsDisplay({store,now,sourceState:result.state});
 if(replay.status==='READY_CACHED_DISPLAY'||replay.status==='DISPLAY_ALREADY_READY'){
  displayStatus='READY_DISPLAY';
  if(projectionStatus!=='READY_PRIVATE'&&replay.restoredProjection){
   projectionStatus='READY_PRIVATE';projectionCount=replay.recordCount;
  }
 }else if(replay.status==='CACHE_REPLAY_FAILED')displayStatus='DISPLAY_FAILED';
 else displayStatus=replay.status;
 return {status:result.state.status,recordCount:result.state.recordCount??0,
  providerRequests:result.providerRequests,skipped:result.skipped??false,
  publicationStatus:'HELD_UNCONFIRMED',projectionStatus,projectionCount,displayStatus};
}

