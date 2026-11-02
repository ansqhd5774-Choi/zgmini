/** One persistent PC IEX input/output sidecar, isolated from confirmed breadth. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {loadLocalProviders} from './local-env.mjs';
import {createQuotaFetch} from './quota-fetch.mjs';
import {read,save} from './d1.mjs';
import {calculateUsIexProvisional,usProvisionalSlot,validUsIexProvisional} from '../../lib/market-breadth/us-provisional-r1.mjs';

export const US_PROVISIONAL_FILE='local-us-breadth-iex-provisional.json';
export const US_PROVISIONAL_MAX_REQUESTS=24;

function storedUniverse(base,priorDate){
  const file=path.join(base,'storage','core.sqlite');
  if(!fs.existsSync(file))throw Error('US_PROVISIONAL_DB_MISSING');
  const db=new DatabaseSync(file,{readOnly:true});
  try{
    const row=db.prepare('SELECT members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?').get(priorDate);
    if(!row)throw Error('US_PROVISIONAL_UNIVERSE_MISSING');
    const members=JSON.parse(row.members_json);
    if(!Array.isArray(members)||members.length!==row.member_count||members.length<490||
      members.length>520||members.some(s=>typeof s!=='string'||!s.trim())||
      new Set(members).size!==members.length)throw Error('US_PROVISIONAL_UNIVERSE_INVALID');
    return members;
  }finally{db.close();}
}

/** Full pagination or an explicit incomplete marker. Never infer coverage from a page. */
export async function fetchIexWindow({symbols,timeframe,start,end,auth,fetchImpl,maxRequests}){
  if(!Array.isArray(symbols)||!symbols.length||!Number.isInteger(maxRequests)||maxRequests<1)
    throw Error('US_PROVISIONAL_BUDGET_INVALID');
  const allowed=new Set(symbols),latest=Object.create(null);
  let token=null,requests=0,pageComplete=false;
  const seen=new Set();
  while(requests<maxRequests){
    const url=new URL('https://data.alpaca.markets/v2/stocks/bars');
    url.search=new URLSearchParams({symbols:symbols.join(','),timeframe,start,end,feed:'iex',
      adjustment:'split',limit:'10000',...(token?{page_token:token}:{})});
    requests++;
    const response=await fetchImpl(url,{headers:{'APCA-API-KEY-ID':auth.APCA_API_KEY_ID,
      'APCA-API-SECRET-KEY':auth.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('US_PROVISIONAL_HTTP_'+response.status);
    const body=await response.json();
    if(!body?.bars||typeof body.bars!=='object'||Array.isArray(body.bars))
      throw Error('US_PROVISIONAL_BARS_INVALID');
    let rows=0;
    for(const [symbol,bars] of Object.entries(body.bars)){
      if(!allowed.has(symbol)||!Array.isArray(bars))throw Error('US_PROVISIONAL_BARS_INVALID');
      for(const b of bars){
        if(typeof b?.t!=='string'||!Number.isFinite(Date.parse(b.t))||
          !Number.isFinite(b.c)||b.c<=0||!Number.isFinite(b.v)||b.v<0)
          throw Error('US_PROVISIONAL_BARS_INVALID');
        rows++;
        // Alpaca's `end` is inclusive. At a 15-minute boundary it can include
        // the *new*, unfinished interval; retaining that as "latest" would
        // hide the last completed bar for this symbol in the 15m calculation.
        if(timeframe==='15Min'&&(Date.parse(b.t)<Date.parse(start)||
          Date.parse(b.t)+15*60_000>Date.parse(end)))continue;
        if(!latest[symbol]||Date.parse(b.t)>Date.parse(latest[symbol].t))
          latest[symbol]={t:b.t,c:b.c,v:b.v};
        else if(Date.parse(b.t)===Date.parse(latest[symbol].t)&&
          (latest[symbol].c!==b.c||latest[symbol].v!==b.v))
          throw Error('US_PROVISIONAL_CONFLICTING_BAR');
      }
    }
    const next=body.next_page_token;
    if(next==null||next===''){pageComplete=true;break;}
    if(typeof next!=='string'||seen.has(next)||rows===0)throw Error('US_PROVISIONAL_PAGINATION_INVALID');
    seen.add(next);token=next;
  }
  return {bars:latest,requests,pageComplete};
}

export async function collectUsBreadthProvisional(base,{now=Date.now(),fetchImpl=fetch,
  maxRequests=US_PROVISIONAL_MAX_REQUESTS,membersOverride=null,authOverride=null}={}){
  const slot=usProvisionalSlot(now);
  if(!slot)return {status:'OUTSIDE_NY_SESSION',providerCalls:0};
  const file=path.join(base,US_PROVISIONAL_FILE);
  let old=null;
  try{if(fs.existsSync(file))old=read(file);}catch{return {status:'INVALID_SIDECAR_PRESERVED',providerCalls:0};}
  if(old?.lastAttemptSlot===slot.slotKey)return {status:'ALREADY_ATTEMPTED_THIS_SLOT',providerCalls:0,slotEndUtc:slot.slotEndUtc};
  let providerCalls=0;
  try{
    if(!Number.isInteger(maxRequests)||maxRequests<2||maxRequests>US_PROVISIONAL_MAX_REQUESTS)
      throw Error('US_PROVISIONAL_BUDGET_INVALID');
    const members=membersOverride??storedUniverse(base,slot.priorDate);
    const auth=authOverride??loadLocalProviders(base);
    if(!auth.APCA_API_KEY_ID||!auth.APCA_API_SECRET_KEY)throw Error('US_PROVISIONAL_CREDENTIALS_MISSING');
    // This collector is spawned as an independent Node process by Core.
    // Count only calls that reached the original fetch, not rejected reservations.
    const sharedFetch=createQuotaFetch({base,originalFetch:async(input,init)=>{
      providerCalls++;return fetchImpl(input,init);
    },mode:'enforce'}).fetch;
    const sameUniverse=old?.raw?.priorDate===slot.priorDate&&
      JSON.stringify(old.raw.members)===JSON.stringify(members);
    let reference;
    if(sameUniverse&&old.raw.referencePageComplete===true){
      reference={bars:old.raw.referenceBars,requests:0,pageComplete:true};
    }else{
      reference=await fetchIexWindow({symbols:members,timeframe:'1Day',
        start:slot.priorDate+'T00:00:00Z',end:slot.observationDate+'T00:00:00Z',
        auth,fetchImpl:sharedFetch,maxRequests:Math.min(8,maxRequests-1)});
    }
    const current=await fetchIexWindow({symbols:members,timeframe:'15Min',
      start:slot.sessionStartUtc,end:slot.slotEndUtc,auth,fetchImpl:sharedFetch,
      maxRequests:maxRequests-providerCalls});
    const raw={members,priorDate:slot.priorDate,observationDate:slot.observationDate,
      sessionStartUtc:slot.sessionStartUtc,slotEndUtc:slot.slotEndUtc,
      referenceBars:reference.bars,currentBars:current.bars,
      referencePageComplete:reference.pageComplete,currentPageComplete:current.pageComplete,
      collectedAt:new Date(now).toISOString()};
    // Save and verify the provider input BEFORE calculation, using one rolling file.
    save(file,{version:1,raw,output:old?.output??null,lastAttemptSlot:slot.slotKey,
      attemptedAt:new Date(now).toISOString(),attemptStatus:'RAW_STORED'});
    const verified=read(file);
    if(JSON.stringify(verified.raw)!==JSON.stringify(raw))throw Error('US_PROVISIONAL_INPUT_READBACK_FAILED');
    const output=calculateUsIexProvisional(verified.raw);
    if(!validUsIexProvisional(output))throw Error('US_PROVISIONAL_OUTPUT_INVALID');
    save(file,{...verified,output,attemptStatus:'LOCAL_READY'});
    if(!validUsIexProvisional(read(file).output))throw Error('US_PROVISIONAL_OUTPUT_READBACK_FAILED');
    return {status:'LOCAL_READY',providerCalls,slotEndUtc:slot.slotEndUtc,
      collectionStatus:output.collectionStatus,observedCount:output.observedCount,
      expectedCount:output.expectedCount,missingCount:output.missingCount};
  }catch(error){
    // Errors are retry-throttled to the next 15-minute slot, never an old confirmed overwrite.
    const deferred=error?.code==='PROVIDER_QUOTA_GUARD'||error?.message==='US_PROVISIONAL_HTTP_429';
    const current=fs.existsSync(file)?read(file):old;
    save(file,{...(current??{version:1}),lastAttemptSlot:slot.slotKey,
      attemptedAt:new Date(now).toISOString(),attemptStatus:deferred?'DEFERRED_QUOTA':'FAILED'});
    return {status:deferred?'DEFERRED_QUOTA':'FAILED_PREVIOUS_PROVISIONAL_PRESERVED',providerCalls,
      code:error?.code==='PROVIDER_QUOTA_GUARD'?
        (error.requestReserved?'US_PROVISIONAL_LEDGER_UPDATE_UNVERIFIED':'US_PROVISIONAL_QUOTA_GUARD'):
        /^US_PROVISIONAL_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'US_PROVISIONAL_COLLECTION_FAILED'};
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
  const result=await collectUsBreadthProvisional(base);
  process.stdout.write(JSON.stringify(result)+'\n');
}
