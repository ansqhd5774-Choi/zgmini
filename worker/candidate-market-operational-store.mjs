import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
// Candidate-only SELECT-only operational store.
// Mirrors the public read contract without schema initialization or write methods.
import {gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {projectionMacroKey} from './projection-input-manifest-r60.mjs';
import {bisInputField,BIS_INPUT_TTL,readLastValidBis} from './bis-input-policy.mjs';

const INPUT_TTL=36*3600000;
const decodeInput=text=>JSON.parse(text.startsWith('gzip:')?gunzipSync(Buffer.from(text.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):text);

export function mergeStoredMacro(previous,next,now){
 const series={},seriesStoredAt={};
 for(const batch of [previous,next]){
  for(const [id,rows] of Object.entries(batch?.body?.series??{})){
   const at=batch.body.seriesStoredAt?.[id]??batch.storedAt;
   if(!Array.isArray(rows)||!rows.length||!Number.isFinite(at)||now<at||now-at>=INPUT_TTL)continue;
   series[id]=rows;seriesStoredAt[id]=at;
  }
 }
 return {...next?.body,series,seriesStoredAt};
}

export function marketOperationalStore(db){
 if(!db)throw Error('STORAGE_UNAVAILABLE');
 const read=async(table,key)=>{
  const keyColumn=table==='market_input_batches_v1'?'batch_key':'snapshot_key';
  const row=await db.prepare(`SELECT body,stored_at FROM ${table} WHERE ${keyColumn}=?`).bind(key).first();
  return row?{body:JSON.parse(row.body),storedAt:row.stored_at}:null;
 };
 const deny=()=>{throw Error('CANDIDATE_WRITE_DISABLED')};
 return Object.freeze({
  initialize:async()=>true,
  async readInput(key){
   if(bisInputField(key))return readLastValidBis(db,key,decodeInput);
   const row=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').bind(key+':%').first();
   if(!row)return null;
   const latest={body:decodeInput(row.body),storedAt:row.stored_at};
   if(key==='macro'){
    const prior=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? AND stored_at < ? ORDER BY stored_at DESC LIMIT 1').bind(key+':%',row.stored_at).first();
    if(prior)latest.body=mergeStoredMacro({body:decodeInput(prior.body),storedAt:prior.stored_at},latest,row.stored_at);
   }
   return latest;
  },
  readScore:()=>read('market_public_snapshots_v1','current'),
  async readProjectionMacro(id,onMetadata){
   const prefix=projectionMacroKey(id);
   const row=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').bind(prefix+':%').first();
   const latest=await db.prepare('SELECT stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').bind('macro:%').first();
   const decoded=row?decodeInput(row.body):null;
   const completeSlice=id!=='recession'||Object.hasOwn(decoded?.series??{},'NFCICREDIT');
   if(row&&row.stored_at===latest?.stored_at&&completeSlice){
    onMetadata?.({sourcePath:'SLICE',batch:prefix,encodedBytes:Buffer.byteLength(row.body)});
    return {body:decoded,storedAt:row.stored_at};
   }
   onMetadata?.({sourcePath:'LEGACY_FULL_MACRO',batch:'macro',reason:row?'SLICE_SOURCE_CHANGED':'SLICE_MISSING'});
   return this.readInput('macro');
  },
  writeInput:deny,
  writeScore:deny,
  claim:deny,
  next:deny,
  finish:deny,
 });
}

export async function readStoredMarketInputs(store,now=Date.now()){
 const batches=await Promise.all(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'].map(key=>store.readInput(key)));
 const fresh=(x,i)=>x&&now>=x.storedAt&&now-x.storedAt<(i===4||i===5?BIS_INPUT_TTL:INPUT_TTL)?(i===0?mergeStoredMacro(null,x,now):x.body):{};
 return batches.map(fresh).reduce((all,part)=>({...all,...part,series:{...all.series,...part.series},external:{...all.external,...part.external},providerSummary:{...all.providerSummary,...part.providerSummary}}),{series:{},external:{},providerSummary:{}});
}

export async function readStoredMarketInputsSelected(store,keys,now=Date.now(),{anchorToLatestBatch=false,projectionId,onMetadata}={}){
 if(!Array.isArray(keys)||!keys.length)return {series:{},external:{},providerSummary:{}};
 const unique=[...new Set(keys)];
 for(const key of unique)if(!['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'].includes(key))throw Error('INVALID_INPUT_BATCH_KEY');
 const batches=await Promise.all(unique.map(key=>key==='macro'&&projectionId&&store.readProjectionMacro?store.readProjectionMacro(projectionId,onMetadata):store.readInput(key)));
 const storedTimes=batches.map(x=>Number(x?.storedAt)).filter(Number.isFinite);
 const referenceNow=anchorToLatestBatch&&storedTimes.length?Math.max(...storedTimes):now;
 const fresh=(x,key)=>x&&referenceNow>=x.storedAt&&referenceNow-x.storedAt<(bisInputField(key)?BIS_INPUT_TTL:INPUT_TTL)?(key==='macro'?mergeStoredMacro(null,x,referenceNow):x.body):{};
 return batches.map((batch,index)=>fresh(batch,unique[index])).reduce((all,part)=>({...all,...part,series:{...all.series,...part.series},external:{...all.external,...part.external},providerSummary:{...all.providerSummary,...part.providerSummary}}),{series:{},external:{},providerSummary:{}});
}

export async function storedMarketResponse(request,{store,now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-market-cache':'STORED','vary':'Accept','x-content-type-options':'nosniff'};
 if(request.method!=='GET')return Response.json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},{status:405,headers});
 let snapshot;try{snapshot=await store.readScore()}catch{}
 if(!snapshot||now<snapshot.storedAt||now-snapshot.storedAt>=PUBLIC_DISPLAY_MAX_AGE_MS)return Response.json({status:'FAILED',reason:snapshot?'STORED_SCORE_STALE':'STORED_SCORE_PENDING',overall:{score:null,status:'UNAVAILABLE',trend:[]},domains:[],dataQuality:{overallComputable:false,reweighted:false}},{status:503,headers});
 headers['cache-control']='public, max-age=60, must-revalidate';
 headers['x-market-snapshot-at']=new Date(snapshot.storedAt).toISOString();
 if(request.headers.get('accept')?.includes('application/x-ndjson'))return new Response(JSON.stringify({type:'complete',body:snapshot.body,cacheControl:headers['cache-control']})+'\n',{headers:{...headers,'content-type':'application/x-ndjson; charset=utf-8','vary':'Accept'}});
 return Response.json(snapshot.body,{headers});
}
