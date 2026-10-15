import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {publicFeedStore} from './public-feed-store.mjs';
import {SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,SECTOR_FEAR_GREED_R3_SECTORS,SECTOR_FEAR_GREED_R3_REQUIRED_HISTORY} from '../lib/market-score/sector-fear-greed-r3-public.mjs';

export const SECTOR_FEAR_GREED_R3_FEED_KEY='sector-fear-greed-r3';

const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const finite=x=>typeof x==='number'&&Number.isFinite(x);

export function validateSectorFearGreedR3Payload(body){
 if(body?.version!==SECTOR_FEAR_GREED_R3_PUBLIC_VERSION||body?.status!=='READY')return false;
 if(!validDate(body.observationDate)||!Array.isArray(body.history)||body.history.length!==SECTOR_FEAR_GREED_R3_REQUIRED_HISTORY)return false;
 if(!Array.isArray(body.sectors)||body.sectors.length!==SECTOR_FEAR_GREED_R3_SECTORS.length)return false;
 const expectedIds=SECTOR_FEAR_GREED_R3_SECTORS.map(x=>x.id);
 if(body.sectors.some((x,i)=>x?.id!==expectedIds[i]||!finite(x.score)||x.score<0||x.score>100))return false;
 if(body.history.some(row=>!validDate(row?.date)||expectedIds.some(id=>!finite(row?.[id])||row[id]<0||row[id]>100)))return false;
 return true;
}

export async function readSectorFearGreedR3(db,{now=Date.now(),store=publicFeedStore(db)}={}){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 let row;try{row=await store.readOutput(SECTOR_FEAR_GREED_R3_FEED_KEY);}catch{}
 const body=row?.body;
 const observationAt=validDate(body?.observationDate)?Date.parse(`${body.observationDate}T23:59:59Z`):NaN;
 const stale=!Number.isFinite(observationAt)||now-observationAt>=PUBLIC_DISPLAY_MAX_AGE_MS;
 if(!row||!validateSectorFearGreedR3Payload(body)||row.storedAt>now||stale){
  return Response.json({status:'unavailable',reason:!row?'STORED_DATA_PENDING':stale?'STORED_DATA_STALE':'STORED_DATA_INVALID',observationDate:validDate(body?.observationDate)?body.observationDate:null,sectors:[],history:[]},{status:503,headers});
 }
 return Response.json(body,{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':new Date(row.storedAt).toISOString()}});
}
