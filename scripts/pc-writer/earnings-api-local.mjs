// R29: runs inside the existing PC Core cycle, private SQLite inputs only.
// The publisher selects kind='output'; this module never writes that kind.
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {collectEarningsApiWindow} from '../../lib/earnings-api-calendar.mjs';

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
 return {status:result.state.status,recordCount:result.state.recordCount??0,
  providerRequests:result.providerRequests,skipped:result.skipped??false,
  publicationStatus:'HELD_UNCONFIRMED'};
}
