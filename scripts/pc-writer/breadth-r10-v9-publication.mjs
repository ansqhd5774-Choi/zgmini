/**
 * Independent PC-only, stored-result publisher for V9 display output.
 * Default is preview. --publish is an explicit operations action.
 * Never writes local core.sqlite or public market 'current'; only one
 * existing D1 public-snapshot key, guarded by body compare-and-swap.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {runShadow} from './breadth-r10-v9-shadow/engine.mjs';
import {buildV9PublicRecord} from './breadth-r10-v9-public-record.mjs';
import {V9_PUBLIC_KEY,projectV9PublicDomain} from '../../worker/breadth-v9-public-view.mjs';
import {client,credential,read,save} from './d1.mjs';

const BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const comparable=(a,b)=>a?.observationDate===b?.observationDate&&a?.score===b?.score
 &&a?.sourceStoredAt===b?.sourceStoredAt&&a?.asOfDate===b?.asOfDate&&a?.phase===b?.phase;
const parse=x=>{try{return JSON.parse(x)}catch{return null}};
export function publicationDecision(next,previous){
 if(!projectV9PublicDomain(next))return 'INVALID_CANDIDATE';
 if(previous!==null&&!projectV9PublicDomain(previous))return 'EXISTING_OUTPUT_UNRECOGNIZED';
 if(!previous)return 'PUBLISH';
 if(previous.observationDate>next.observationDate)return 'REMOTE_OBSERVATION_NEWER';
 if(previous.observationDate===next.observationDate){
  if(previous.asOfDate>next.asOfDate)return 'REMOTE_ASOF_NEWER';
  if(previous.sourceStoredAt&&next.sourceStoredAt&&validTime(previous.sourceStoredAt)&&validTime(next.sourceStoredAt)&&Date.parse(previous.sourceStoredAt)>Date.parse(next.sourceStoredAt))return 'REMOTE_SOURCE_NEWER';
 }
 return comparable(next,previous)?'UNCHANGED':'PUBLISH';
}
const selectSql='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
export async function publishRecord({remote,db,record,now=Date.now()}){
 const first=(await remote.query(db,selectSql,[V9_PUBLIC_KEY])).results?.[0]??null;
 const decision=publicationDecision(record,first?parse(first.body):null);
 if(decision!=='PUBLISH')return {status:decision,observationDate:record.observationDate};
 if(first&&!projectV9PublicDomain(parse(first.body)))throw Error('V9_REMOTE_BODY_NOT_VERIFIED');
 if(first?.stored_at>now)throw Error('V9_REMOTE_STORED_AT_NEWER');
 const encoded=JSON.stringify(record);
 // Reuse the existing D1 public-snapshot table; only update if remote has not changed.
 const sql="INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM market_public_snapshots_v1 WHERE snapshot_key=?) OR EXISTS(SELECT 1 FROM market_public_snapshots_v1 WHERE snapshot_key=? AND body=?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.body=?";
 let err=null;
 try{await remote.request(db,[{sql,params:[V9_PUBLIC_KEY,encoded,now,V9_PUBLIC_KEY,V9_PUBLIC_KEY,first?.body??'',first?.body??'']}]);}
 catch(e){err=e}
 // Unknown submit outcome must be resolved by readback before any retry.
 let row;
 try{row=(await remote.query(db,selectSql,[V9_PUBLIC_KEY])).results?.[0]??null;}
 catch{throw Error('V9_PUBLICATION_STATE_UNKNOWN')}
 if(row?.body!==encoded||row.stored_at!==now)throw Error(err?'V9_PUBLICATION_STATE_UNKNOWN':'V9_PUBLICATION_CAS_OR_READBACK_FAILED');
 return {status:'VERIFIED',asOfDate:record.asOfDate,observationDate:record.observationDate,score:record.score,phase:record.phase};
}
export async function main(args=process.argv.slice(2),now=new Date()){
 const publish=args.includes('--publish');
 const result={task:'ZGMINI_BREADTH_R10_V9_PUBLIC_DISPLAY',mode:publish?'PUBLISH':'PREVIEW',
  status:'RUNNING',readOnlyDB:true,providerCalls:0,productionB1R5Modified:false,asOfDate:null,observationDate:null};
 const reportPath=path.join(BASE,'local-breadth-r10-v9-publication-last-run.json');
 const started=Date.now();
 let locked=false,lockFd=null;
 try{
  if(publish){
   const lock=path.join(BASE,'local-breadth-r10-v9-publication.lock');
   try{lockFd=fs.openSync(lock,'wx');locked=lock;}catch{throw Error('V9_PUBLICATION_ALREADY_RUNNING_OR_LOCK_PRESENT')}
  }
  const latest=runShadow({base:BASE,now,writeLocal:false});
  const last=latest.evaluation?.perDay?.findLast(x=>x.status==='CANDIDATE_READY'&&Number.isFinite(x.ema3));
  if(!last)throw Error('V9_NO_LOCAL_VERIFIED_OBSERVATION');
  const verified=runShadow({base:BASE,now,asOf:last.date,writeLocal:false});
  const publicRecord=buildV9PublicRecord({latest,verified});
  if(!publicRecord)throw Error('V9_PUBLIC_RECORD_INVALID');
  result.asOfDate=publicRecord.asOfDate;result.observationDate=publicRecord.observationDate;
  result.score=publicRecord.score;result.phase=publicRecord.phase;
  result.historyPoints=publicRecord.trend.length;result.methodologyVersion=publicRecord.methodologyVersion;
  result.sourceStoredAt=publicRecord.sourceStoredAt;result.status='PREVIEW_READY';
  if(publish){
   const config=read(path.join(BASE,'config.json'));
   if(config?.collectionTarget!=='pc'||config?.enabled!==true||!config?.account||!config?.core||!config?.history)throw Error('V9_PC_PUBLICATION_CONFIG_INVALID');
   const root=process.env.ZGMINI_PC_CREDENTIAL_ROOT;
   if(!root||!fs.existsSync(path.join(root,'node_modules','wrangler')))throw Error('V9_CREDENTIAL_RUNTIME_UNAVAILABLE');
   const auth=credential(root),remote=client(config,auth);
   result.publication=await publishRecord({remote,db:config.core,record:publicRecord,now:Date.now()});
   result.status=['VERIFIED','UNCHANGED','REMOTE_OBSERVATION_NEWER','REMOTE_ASOF_NEWER','REMOTE_SOURCE_NEWER'].includes(result.publication.status)?'PUBLICATION_VERIFIED_OR_PRESERVED':'NOT_VERIFIED';
  }
 }catch(e){result.status=String(e?.message??'V9_PUBLICATION_FAILED');process.exitCode=1;}
 finally{
  result.elapsedMs=Date.now()-started;result.at=new Date().toISOString();
  if(locked!==false){
   try{fs.closeSync(lockFd);fs.unlinkSync(locked);}catch{result.lockCleanup='FAILED';}
  }
  save(reportPath,result);
 }
 return result;
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){main().then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(String(e?.message??e));process.exitCode=1});}
