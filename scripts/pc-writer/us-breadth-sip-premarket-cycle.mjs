/** Independent historical SIP premarket sidecar; regular IEX never reads it. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {loadLocalProviders} from './local-env.mjs';
import {createQuotaFetch} from './quota-fetch.mjs';
import {read,save} from './d1.mjs';
import {storedUniverse,fetchIexWindow,US_PROVISIONAL_MAX_REQUESTS} from './us-breadth-provisional-cycle.mjs';
import {US_SIP_PREMARKET_FILE,usSipPremarketSlot,calculateUsSipPremarket,
  validUsSipPremarket} from '../../lib/market-breadth/us-premarket-sip-r1.mjs';

/** The membership snapshot can predate the prior closing-price session.
 * Reuse the exact-date IEX validator and only fall back on an absent snapshot.
 * Do not change the priorDate used for SIP reference prices.
 */
export function storedSipPremarketUniverse(base,priorDate){
  try{
    return {members:storedUniverse(base,priorDate),universeAsOfDate:priorDate};
  }catch(error){
    if(error?.message!=='US_PROVISIONAL_UNIVERSE_MISSING')throw error;
  }
  const file=path.join(base,'storage','core.sqlite');
  const db=new DatabaseSync(file,{readOnly:true});
  let row;
  try{
    row=db.prepare('SELECT trade_date FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date<=? ORDER BY trade_date DESC LIMIT 1').get(priorDate);
  }finally{db.close();}
  if(!row)throw Error('US_PROVISIONAL_UNIVERSE_MISSING');
  if(typeof row.trade_date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.trade_date)||
    row.trade_date>=priorDate)throw Error('US_PROVISIONAL_UNIVERSE_INVALID');
  return {members:storedUniverse(base,row.trade_date),universeAsOfDate:row.trade_date};
}

export async function collectUsSipPremarket(base,{now=Date.now(),fetchImpl=fetch,
  maxRequests=US_PROVISIONAL_MAX_REQUESTS,membersOverride=null,authOverride=null}={}){
  const slot=usSipPremarketSlot(now);
  if(!slot)return {status:'OUTSIDE_NY_SIP_PREMARKET',providerCalls:0};
  const file=path.join(base,US_SIP_PREMARKET_FILE);
  let old=null;
  try{if(fs.existsSync(file))old=read(file);}catch{
    return {status:'INVALID_SIP_SIDECAR_PRESERVED',providerCalls:0};
  }
  if(old?.lastAttemptSlot===slot.slotKey)return {status:'ALREADY_ATTEMPTED_THIS_SLOT',
    phase:'SIP_PREMARKET',providerCalls:0,slotEndUtc:slot.slotEndUtc};
  let providerCalls=0;
  try{
    if(!Number.isInteger(maxRequests)||maxRequests<2||maxRequests>US_PROVISIONAL_MAX_REQUESTS)
      throw Error('US_PROVISIONAL_BUDGET_INVALID');
    const {members,universeAsOfDate}=membersOverride!==null?
      {members:membersOverride,universeAsOfDate:null}:
      storedSipPremarketUniverse(base,slot.priorDate);
    const auth=authOverride??loadLocalProviders(base);
    if(!auth.APCA_API_KEY_ID||!auth.APCA_API_SECRET_KEY)
      throw Error('US_PROVISIONAL_CREDENTIALS_MISSING');
    const sharedFetch=createQuotaFetch({base,originalFetch:async(input,init)=>{
      providerCalls++;return fetchImpl(input,init);
    },mode:'enforce'}).fetch;
    const sameUniverse=old?.raw?.priorDate===slot.priorDate&&
      JSON.stringify(old.raw.members)===JSON.stringify(members);
    const reference=sameUniverse&&old.raw.referencePageComplete===true?
      {bars:old.raw.referenceBars,pageComplete:true}:
      await fetchIexWindow({symbols:members,timeframe:'1Day',feed:'sip',
        start:slot.priorDate+'T00:00:00Z',end:slot.observationDate+'T00:00:00Z',
        auth,fetchImpl:sharedFetch,maxRequests:Math.min(8,maxRequests-1)});
    const current=await fetchIexWindow({symbols:members,timeframe:'15Min',feed:'sip',
      start:slot.sessionStartUtc,end:slot.slotEndUtc,auth,fetchImpl:sharedFetch,
      maxRequests:maxRequests-providerCalls});
    const raw={members,universeAsOfDate,priorDate:slot.priorDate,observationDate:slot.observationDate,
      sessionStartUtc:slot.sessionStartUtc,slotEndUtc:slot.slotEndUtc,
      referenceBars:reference.bars,currentBars:current.bars,
      referencePageComplete:reference.pageComplete,currentPageComplete:current.pageComplete,
      collectedAt:new Date(now).toISOString()};
    save(file,{version:1,raw,output:old?.output??null,lastAttemptSlot:slot.slotKey,
      attemptedAt:new Date(now).toISOString(),attemptStatus:'RAW_STORED'});
    const verified=read(file);
    if(JSON.stringify(verified.raw)!==JSON.stringify(raw))
      throw Error('US_PROVISIONAL_INPUT_READBACK_FAILED');
    const output=calculateUsSipPremarket(verified.raw);
    if(!validUsSipPremarket(output))throw Error('US_PROVISIONAL_OUTPUT_INVALID');
    save(file,{...verified,output,attemptStatus:'LOCAL_READY'});
    if(!validUsSipPremarket(read(file).output))
      throw Error('US_PROVISIONAL_OUTPUT_READBACK_FAILED');
    return {status:'LOCAL_READY',phase:'SIP_PREMARKET',providerCalls,
      slotEndUtc:slot.slotEndUtc,collectionStatus:output.collectionStatus,
      universeAsOfDate,
      observedCount:output.observedCount,expectedCount:output.expectedCount,
      missingCount:output.missingCount};
  }catch(error){
    const accessDenied=error?.message==='US_PROVISIONAL_HTTP_403';
    const deferred=error?.code==='PROVIDER_QUOTA_GUARD'||
      error?.message==='US_PROVISIONAL_HTTP_429';
    const current=fs.existsSync(file)?read(file):old;
    save(file,{...(current??{version:1}),lastAttemptSlot:slot.slotKey,
      attemptedAt:new Date(now).toISOString(),attemptStatus:accessDenied?'ACCESS_DENIED':deferred?'DEFERRED_QUOTA':'FAILED'});
    return {status:accessDenied?'SIP_ACCESS_DENIED':deferred?'DEFERRED_QUOTA':'FAILED_PREVIOUS_PROVISIONAL_PRESERVED',
      phase:'SIP_PREMARKET',providerCalls,
      code:error?.code==='PROVIDER_QUOTA_GUARD'?
        (error.requestReserved?'US_PROVISIONAL_LEDGER_UPDATE_UNVERIFIED':'US_PROVISIONAL_QUOTA_GUARD'):
        /^US_PROVISIONAL_[A-Z0-9_]+$/.test(error?.message??'')?
          error.message:'US_SIP_PREMARKET_COLLECTION_FAILED'};
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
  process.stdout.write(JSON.stringify(await collectUsSipPremarket(base))+'\n');
}
