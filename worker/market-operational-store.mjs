// Private normalized inputs and separately stored public projections.
// Public reads never call providers or compute scores.
import {gzipSync,gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {liquidityHistoryRow} from './market-score-response-store.mjs';
import {LIQUIDITY_ACTIVE_HISTORY_METHOD} from './liquidity-active-history-reader.mjs';
const decodeInput=text=>JSON.parse(text.startsWith('gzip:')?gunzipSync(Buffer.from(text.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):text);
const INPUT_TTL=36*3600000;
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
 let ready;
 const init=()=>ready??=Promise.all([
  db.prepare('CREATE TABLE IF NOT EXISTS market_input_batches_v1 (batch_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)').run(),
  db.prepare('CREATE TABLE IF NOT EXISTS market_public_snapshots_v1 (snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)').run(),
  db.prepare('CREATE TABLE IF NOT EXISTS market_collection_jobs_v1 (job TEXT PRIMARY KEY,lease_id TEXT,lease_until INTEGER NOT NULL DEFAULT 0,finished_at INTEGER NOT NULL DEFAULT 0,status TEXT)').run(),
  db.prepare('CREATE TABLE IF NOT EXISTS market_liquidity_active_history_v1 (as_of_date TEXT NOT NULL,methodology_version TEXT NOT NULL,score REAL NOT NULL,stored_at INTEGER NOT NULL,PRIMARY KEY(as_of_date,methodology_version))').run(),
 ]).catch(error=>{ready=null;throw error});
 const read=async(table,key)=>{const row=await db.prepare(`SELECT body,stored_at FROM ${table} WHERE ${table==='market_input_batches_v1'?'batch_key':'snapshot_key'}=?`).bind(key).first();return row?{body:JSON.parse(row.body),storedAt:row.stored_at}:null};
 return {
  initialize:init,
  async readInput(key){await init();const row=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').bind(key+':%').first();if(!row)return null;const latest={body:decodeInput(row.body),storedAt:row.stored_at};
   if(key==='macro'){
    const prior=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? AND stored_at < ? ORDER BY stored_at DESC LIMIT 1').bind(key+':%',row.stored_at).first();
    if(prior)latest.body=mergeStoredMacro({body:decodeInput(prior.body),storedAt:prior.stored_at},latest,row.stored_at);
   }
   return latest},
  readScore:()=>read('market_public_snapshots_v1','current'),
  async writeInput(key,body,now){await init();if(key==='macro')body=mergeStoredMacro(await this.readInput(key),{body,storedAt:now},now);const json=JSON.stringify(body);if(Buffer.byteLength(json)>32000000)throw Error('INPUT_STORAGE_LIMIT');const encoded='gzip:'+gzipSync(json).toString('base64');if(encoded.length>1800000)throw Error('INPUT_STORAGE_LIMIT');await db.prepare('INSERT INTO market_input_batches_v1 VALUES(?,?,?) ON CONFLICT(batch_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at').bind(key+':'+new Date(now).toISOString().slice(0,10),encoded,now).run()},
  async writeScore(body,now){
   await init();const encoded=JSON.stringify(body);
   const liquidity=liquidityHistoryRow(encoded,now);
   if(liquidity)await db.prepare('INSERT INTO market_liquidity_active_history_v1 VALUES(?,?,?,?) ON CONFLICT(as_of_date,methodology_version) DO UPDATE SET score=excluded.score,stored_at=excluded.stored_at').bind(liquidity.asOfDate,LIQUIDITY_ACTIVE_HISTORY_METHOD,liquidity.score,liquidity.storedAt).run();
   for(const key of [new Date(now).toISOString().slice(0,10),'current'])await db.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at').bind(key,encoded,now).run();
  },
  async claim(job,now){
   await init();const id=crypto.randomUUID();
   await db.prepare('INSERT OR IGNORE INTO market_collection_jobs_v1(job) VALUES(?)').bind(job).run();
   await db.prepare('UPDATE market_collection_jobs_v1 SET lease_id=?,lease_until=?,finished_at=?,status=? WHERE job=? AND lease_until<=?').bind(id,now+180000,now,'RUNNING',job,now).run();
   const row=await db.prepare('SELECT lease_id FROM market_collection_jobs_v1 WHERE job=?').bind(job).first();return row?.lease_id===id?id:null;
  },
  async next(jobs){await init();if(jobs.includes('growth')){const growth=await db.prepare('SELECT status FROM market_collection_jobs_v1 WHERE job=?').bind('growth').first();if(growth?.status==='COLLECT_FAILED')return 'growth'}const rows=[];for(const job of jobs){const row=await db.prepare('SELECT finished_at,status FROM market_collection_jobs_v1 WHERE job=?').bind(job).first();rows.push({job,time:row?.finished_at??0,status:row?.status??null})}const priority=x=>x.status==='BACKLOG'||(x.job==='breadth'&&x.status==='SOURCE_FAILED')||(x.job==='growth'&&x.status==='RUNNING')?0:1;return rows.sort((a,b)=>priority(a)-priority(b)||a.time-b.time)[0].job},
  async finish(job,id,now,status){await db.prepare('UPDATE market_collection_jobs_v1 SET lease_id=NULL,lease_until=0,finished_at=?,status=? WHERE job=? AND lease_id=?').bind(now,status,job,id).run()},
 };
}

export async function readStoredMarketInputs(store,now=Date.now()){
 const batches=await Promise.all(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'].map(key=>store.readInput(key)));
 const fresh=(x,i)=>x&&now>=x.storedAt&&now-x.storedAt<INPUT_TTL?(i===0?mergeStoredMacro(null,x,now):x.body):{};
 return batches.map(fresh).reduce((all,part)=>({...all,...part,series:{...all.series,...part.series},external:{...all.external,...part.external},providerSummary:{...all.providerSummary,...part.providerSummary}}),{series:{},external:{},providerSummary:{}});
}

export async function storedMarketResponse(request,{store,now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-market-cache':'STORED','vary':'Accept','x-content-type-options':'nosniff'};
 if(request.method!=='GET')return Response.json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},{status:405,headers});
 let snapshot;try{snapshot=await store.readScore()}catch{}
 if(!snapshot||now<snapshot.storedAt||now-snapshot.storedAt>=30*60000)return Response.json({status:'FAILED',reason:snapshot?'STORED_SCORE_STALE':'STORED_SCORE_PENDING',overall:{score:null,status:'UNAVAILABLE',trend:[]},domains:[],dataQuality:{overallComputable:false,reweighted:false}},{status:503,headers});
 headers['cache-control']='public, max-age=60, must-revalidate';
 headers['x-market-snapshot-at']=new Date(snapshot.storedAt).toISOString();
 if(request.headers.get('accept')?.includes('application/x-ndjson'))return new Response(JSON.stringify({type:'complete',body:snapshot.body,cacheControl:headers['cache-control']})+'\n',{headers:{...headers,'content-type':'application/x-ndjson; charset=utf-8','vary':'Accept'}});
 return Response.json(snapshot.body,{headers});
}
