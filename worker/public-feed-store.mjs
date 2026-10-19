import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
// Public reads have no collector dependency and never initialize or write tables.
export const FEED_POLICY=Object.freeze({
 'fear-greed':{intervalMs:15*60000,maxAgeMs:PUBLIC_DISPLAY_MAX_AGE_MS},
 'market-data':{intervalMs:6*3600000,maxAgeMs:PUBLIC_DISPLAY_MAX_AGE_MS},
 'core-pce':{intervalMs:6*3600000,maxAgeMs:PUBLIC_DISPLAY_MAX_AGE_MS},
});
export function publicFeedStore(db){
 const read=async(kind,key)=>{
  const row=await db.prepare('SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind=? AND feed_key=? AND snapshot_key=?').bind(kind,key,'current').first();
  return row?{body:JSON.parse(row.body),storedAt:row.stored_at}:null;
 };
 const write=async(kind,key,body,now)=>{
  const encoded=JSON.stringify(body);if(new TextEncoder().encode(encoded).length>1800000)throw Error('FEED_STORAGE_LIMIT');
  const statements=[new Date(now).toISOString().slice(0,10),'current'].map(snapshot=>db.prepare('INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at').bind(kind,key,snapshot,encoded,now));
  await db.batch(statements);
 };
 return {
  async initialize(){await db.prepare('CREATE TABLE IF NOT EXISTS public_feed_snapshots_v1(kind TEXT NOT NULL,feed_key TEXT NOT NULL,snapshot_key TEXT NOT NULL,body TEXT NOT NULL,stored_at INTEGER NOT NULL,PRIMARY KEY(kind,feed_key,snapshot_key))').run()},
  readInput:key=>read('input',key), readOutput:key=>read('output',key),
  readAttempt:key=>read('attempt',key),writeAttempt:(key,now)=>write('attempt',key,{status:'ATTEMPTED'},now),
  writeInput:(key,body,now)=>write('input',key,body,now),writeOutput:(key,body,now)=>write('output',key,body,now),
 };
}
export async function readPublicFeedHealth(db){
 const store=publicFeedStore(db),feeds=[];
 for(const key of Object.keys(FEED_POLICY)){
  let row;try{row=await store.readOutput(key)}catch{}
  feeds.push({key,storedAt:row?new Date(row.storedAt).toISOString():null,status:!row?'PENDING':Date.now()-row.storedAt>=FEED_POLICY[key].maxAgeMs?'STALE':'STORED'});
 }
 return Response.json({status:feeds.every(x=>x.status==='STORED')?'STORED':'PARTIAL',providerCalls:0,feeds},{headers:{'cache-control':'no-store','x-data-source':'STORED'}});
}
export async function savedJson(response,store,key,now){
 const data=await response.json();await store.writeInput(key,data,now);
 const saved=await store.readInput(key);if(!saved||saved.storedAt!==now)throw Error('INPUT_READBACK_FAILED');return saved.body;
}
export async function readPublicFeed(db,key,{now=Date.now(),store}={}){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 let row;try{row=await(store??publicFeedStore(db)).readOutput(key)}catch{}
 if(!FEED_POLICY[key]||!row||row.storedAt>now||now-row.storedAt>=FEED_POLICY[key].maxAgeMs){
  return Response.json({status:'unavailable',reason:row?'STORED_DATA_STALE':'STORED_DATA_PENDING',score:null,rows:[],actual:[],indicators:{},summary:[]},{status:503,headers});
 }
 return Response.json(row.body,{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':new Date(row.storedAt).toISOString()}});
}
