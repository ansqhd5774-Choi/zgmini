/** SIP aggregate-only publisher, never touching IEX or confirmed keys. */
import fs from 'node:fs';
import path from 'node:path';
import {read} from './d1.mjs';
import {US_SIP_PREMARKET_FILE,US_SIP_PREMARKET_KEY,validUsSipPremarket,
  currentUsSipPremarket} from '../../lib/market-breadth/us-premarket-sip-r1.mjs';

export function prepareUsSipPremarket(base,{now=Date.now()}={}){
  const file=path.join(base,US_SIP_PREMARKET_FILE);
  if(!fs.existsSync(file))return {prepared:false,status:'SIP_NOT_COLLECTED'};
  let state;
  try{state=read(file);}catch{return {prepared:false,status:'INVALID_SIP_SIDECAR'};}
  const body=state?.output;
  if(!validUsSipPremarket(body))return {prepared:false,status:'NO_VALID_SIP_PREMARKET'};
  if(!currentUsSipPremarket(body,now))
    return {prepared:false,status:'STALE_SIP_PREMARKET_PRESERVED'};
  return {prepared:true,status:'PREPARED',body};
}

export async function publishUsSipPremarket(remote,database,prepared,{now=Date.now()}={}){
  if(prepared?.prepared!==true)return {status:'SKIPPED_NOT_READY'};
  const body=prepared.body;
  if(!validUsSipPremarket(body)||!currentUsSipPremarket(body,now))
    throw Error('US_SIP_PREMARKET_PUBLICATION_INVALID');
  const readRemote=()=>remote.query(database,
    'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
    [US_SIP_PREMARKET_KEY]);
  const prior=(await readRemote()).results?.[0]??null;
  let old=null;
  try{old=prior?.body?JSON.parse(prior.body):null;}catch{}
  if(validUsSipPremarket(old)&&old.slotEndUtc>body.slotEndUtc)
    return {status:'REMOTE_NEWER_SIP_PREMARKET_PRESERVED'};
  const encoded=JSON.stringify(body);
  if(prior?.body===encoded)return {status:'ALREADY_VERIFIED',slotEndUtc:body.slotEndUtc};
  if(prior&&Number(prior.stored_at)>now)
    return {status:'REMOTE_NEWER_PUBLICATION_PRESERVED'};
  const sql='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?';
  let failed=false;
  try{await remote.request(database,[{sql,params:[US_SIP_PREMARKET_KEY,
    encoded,now,prior?.stored_at??-1,prior?.body??'']}]);}catch{failed=true;}
  const after=(await readRemote()).results?.[0]??null;
  if(after?.body!==encoded)
    throw Error(failed?'US_SIP_PREMARKET_PUBLICATION_UNKNOWN':'US_SIP_PREMARKET_READBACK_MISMATCH');
  return {status:'VERIFIED',slotEndUtc:body.slotEndUtc,observedCount:body.observedCount};
}
