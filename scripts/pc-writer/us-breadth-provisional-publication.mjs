/** Public output is counts only. Confirmed MarketParquet keys are never touched. */
import fs from 'node:fs';
import path from 'node:path';
import {read} from './d1.mjs';
import {US_PROVISIONAL_FILE} from './us-breadth-provisional-cycle.mjs';
import {US_BREADTH_PROVISIONAL_KEY,currentUsIexProvisional,validUsIexProvisional} from '../../lib/market-breadth/us-provisional-r1.mjs';

export function prepareUsProvisional(base,{now=Date.now()}={}){
  const file=path.join(base,US_PROVISIONAL_FILE);
  if(!fs.existsSync(file))return {prepared:false,status:'NOT_COLLECTED'};
  let state;
  try{state=read(file);}catch{return {prepared:false,status:'INVALID_SIDECAR'};}
  const body=state?.output;
  if(!validUsIexProvisional(body))return {prepared:false,status:'NO_VALID_PROVISIONAL'};
  if(!currentUsIexProvisional(body,now))return {prepared:false,status:'STALE_PROVISIONAL_PRESERVED'};
  // Raw input stays on PC. Returning a separate output copy is intentional.
  return {prepared:true,status:'PREPARED',body};
}

export async function publishUsProvisional(remote,database,prepared,{now=Date.now()}={}){
  if(prepared?.prepared!==true)return {status:'SKIPPED_NOT_READY'};
  const body=prepared.body;
  if(!validUsIexProvisional(body)||!currentUsIexProvisional(body,now))
    throw Error('US_PROVISIONAL_PUBLICATION_INVALID');
  const readRemote=()=>remote.query(database,
    'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[US_BREADTH_PROVISIONAL_KEY]);
  const prior=(await readRemote()).results?.[0]??null;
  let old=null;
  try{old=prior?.body?JSON.parse(prior.body):null;}catch{}
  if(validUsIexProvisional(old)&&old.slotEndUtc>body.slotEndUtc)
    return {status:'REMOTE_NEWER_PROVISIONAL_PRESERVED'};
  const encoded=JSON.stringify(body);
  if(prior?.body===encoded)return {status:'ALREADY_VERIFIED',slotEndUtc:body.slotEndUtc};
  if(prior&&Number(prior.stored_at)>now)return {status:'REMOTE_NEWER_PUBLICATION_PRESERVED'};
  const sql='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?';
  let failed=false;
  try{await remote.request(database,[{sql,params:[US_BREADTH_PROVISIONAL_KEY,encoded,now,
    prior?.stored_at??-1,prior?.body??'']}]);}catch{failed=true;}
  const after=(await readRemote()).results?.[0]??null;
  if(after?.body!==encoded)throw Error(failed?'US_PROVISIONAL_PUBLICATION_UNKNOWN':'US_PROVISIONAL_READBACK_MISMATCH');
  return {status:'VERIFIED',slotEndUtc:body.slotEndUtc,observedCount:body.observedCount};
}
