// R29: runs inside the existing PC Core cycle, private SQLite inputs only.
// The publisher selects kind='output'; this module never writes that kind.
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {collectEarningsApiWindow} from '../../lib/earnings-api-calendar.mjs';
import {readEarningsApiPrivateProjection,EARNINGS_API_R30_PRIVATE_KEY} from '../../lib/earnings-api-private-projection.mjs';

const KEY='release-calendar';
const STATUS_KEY=`${KEY}:earnings-api:status`;
const rights=Object.freeze({
 automatedFetch:true,pcStorage:true,publicDisplay:false,redistribution:false,
 commercialUse:false,reviewedAt:'2026-10-28',
 evidenceUrl:'https://www.earningsapi.com/docs/examples/calendar-backfill-sync',
 evidenceNote:'Provider documentation explicitly describes daily sync and storing responses by date and reporting time bucket.'
});

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
 return {status:result.state.status,recordCount:result.state.recordCount??0,
  providerRequests:result.providerRequests,skipped:result.skipped??false,
  publicationStatus:'HELD_UNCONFIRMED',projectionStatus,projectionCount};
}
