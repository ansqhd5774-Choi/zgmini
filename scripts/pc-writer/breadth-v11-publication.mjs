/** V11 public-score-only PC publisher. D1: one NEW bounded public output key.
 * No provider calls, local SQLite writes, B1-R5 writes or schedule changes.
 * Existing V9 D1 output is preserved for verified fallback.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {runShadow} from './breadth-r10-v9-shadow/engine.mjs';
import {buildV11PublicRecord} from './breadth-v11-public-record.mjs';
import {V11_PUBLIC_KEY,projectV11PublicDomain} from '../../worker/breadth-v11-public-view.mjs';
import {client,credential,read,save} from './d1.mjs';
const BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const parse=x=>{try{return JSON.parse(x)}catch{return null}};
const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const comparable=(a,b)=>a?.observationDate===b?.observationDate&&a?.score===b?.score
 &&a?.sourceStoredAt===b?.sourceStoredAt&&a?.asOfDate===b?.asOfDate&&a?.phase===b?.phase
 &&JSON.stringify(a?.trend)===JSON.stringify(b?.trend)
 &&JSON.stringify(a?.factors)===JSON.stringify(b?.factors)
 &&JSON.stringify(a?.annualValidation)===JSON.stringify(b?.annualValidation)
 &&JSON.stringify(a?.factorHistory)===JSON.stringify(b?.factorHistory);
export function publicationDecisionV11(next,previous){
 if(!projectV11PublicDomain(next))return 'INVALID_CANDIDATE';
 if(previous!==null&&!projectV11PublicDomain(previous))return 'EXISTING_OUTPUT_UNRECOGNIZED';
 if(!previous)return 'PUBLISH';
 if(previous.observationDate>next.observationDate)return 'REMOTE_OBSERVATION_NEWER';
 if(previous.observationDate===next.observationDate){
  if(previous.asOfDate>next.asOfDate)return 'REMOTE_ASOF_NEWER';
  if(previous.sourceStoredAt&&next.sourceStoredAt&&validTime(previous.sourceStoredAt)&&validTime(next.sourceStoredAt)&&Date.parse(previous.sourceStoredAt)>Date.parse(next.sourceStoredAt))return 'REMOTE_SOURCE_NEWER';
 }
 return comparable(next,previous)?'UNCHANGED':'PUBLISH';
}
const selectSql='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
export async function publishV11({remote,db,record,now=Date.now()}){
 const first=(await remote.query(db,selectSql,[V11_PUBLIC_KEY])).results?.[0]??null;
 const decision=publicationDecisionV11(record,first?parse(first.body):null);
 if(decision!=='PUBLISH')return {status:decision,observationDate:record.observationDate};
 if(first&&!projectV11PublicDomain(parse(first.body)))throw Error('V11_REMOTE_BODY_NOT_VERIFIED');
 if(first?.stored_at>now)throw Error('V11_REMOTE_STORED_AT_NEWER');
 const encoded=JSON.stringify(record);
 const sql="INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM market_public_snapshots_v1 WHERE snapshot_key=?) OR EXISTS(SELECT 1 FROM market_public_snapshots_v1 WHERE snapshot_key=? AND body=?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.body=?";
 let err=null;
 try{await remote.request(db,[{sql,params:[V11_PUBLIC_KEY,encoded,now,V11_PUBLIC_KEY,V11_PUBLIC_KEY,first?.body??'',first?.body??'']}]);}
 catch(e){err=e}
 let row;
 try{row=(await remote.query(db,selectSql,[V11_PUBLIC_KEY])).results?.[0]??null;}
 catch{throw Error('V11_PUBLICATION_STATE_UNKNOWN')}
 if(row?.body!==encoded||Number(row.stored_at)!==now)throw Error(err?'V11_PUBLICATION_STATE_UNKNOWN':'V11_PUBLICATION_CAS_OR_READBACK_FAILED');
 return {status:'VERIFIED',asOfDate:record.asOfDate,observationDate:record.observationDate,score:record.score,phase:record.phase};
}
export async function main(args=process.argv.slice(2),now=new Date()){
 if(args.some(a=>a!=='--publish')||args.filter(a=>a==='--publish').length>1)throw Error('V11_UNKNOWN_ARGUMENT');
 const publish=args.includes('--publish'),started=Date.now();
 const result={task:'ZGMINI_BREADTH_V11_PUBLIC_DISPLAY',mode:publish?'PUBLISH':'PREVIEW',
   status:'RUNNING',providerCalls:0,localDBWrites:0,productionB1R5Modified:false,existingV9KeyModified:false};
 const reportPath=path.join(BASE,'local-breadth-v11-publication-last-run.json');
 let lockFd=null,lock=null;
 try{
  if(publish){
   lock=path.join(BASE,'local-breadth-r10-v9-publication.lock'); // same lane as existing V9
   try{lockFd=fs.openSync(lock,'wx');}catch{throw Error('V11_PUBLICATION_ALREADY_RUNNING_OR_LOCK_PRESENT')}
  }
  const latest=runShadow({base:BASE,now,writeLocal:false,historySessions:311,includeFactorHistory:true});
  const last=latest.evaluation?.perDay?.findLast(x=>x.status==='CANDIDATE_READY'&&Number.isFinite(x.ema3));
  if(!last)throw Error('V11_NO_LOCAL_VERIFIED_OBSERVATION');
  const verified=runShadow({base:BASE,now,asOf:last.date,writeLocal:false});
  const record=buildV11PublicRecord({latest,verified});
  if(!record)throw Error('V11_PUBLIC_RECORD_INVALID');
  Object.assign(result,{asOfDate:record.asOfDate,observationDate:record.observationDate,
    score:record.score,phase:record.phase,historyPoints:record.trend.length,
    methodologyVersion:record.methodologyVersion,annualValidation:record.annualValidation,
    sourceStoredAt:record.sourceStoredAt,status:'PREVIEW_READY'});
  if(publish){
   const config=read(path.join(BASE,'config.json'));
   if(config?.collectionTarget!=='pc'||config?.enabled!==true||!config?.account||!config?.core||!config?.history)throw Error('V11_PC_PUBLICATION_CONFIG_INVALID');
   const root=process.env.ZGMINI_PC_CREDENTIAL_ROOT;
   if(!root||!fs.existsSync(path.join(root,'node_modules','wrangler')))throw Error('V11_CREDENTIAL_RUNTIME_UNAVAILABLE');
   const auth=credential(root),remote=client(config,auth);
   result.publication=await publishV11({remote,db:config.core,record,now:Date.now()});
   result.status=['VERIFIED','UNCHANGED','REMOTE_OBSERVATION_NEWER','REMOTE_ASOF_NEWER','REMOTE_SOURCE_NEWER'].includes(result.publication.status)?'PUBLICATION_VERIFIED_OR_PRESERVED':'NOT_VERIFIED';
  }
 }catch(e){result.status=String(e?.message??'V11_PUBLICATION_FAILED');process.exitCode=1;}
 finally{
  result.elapsedMs=Date.now()-started;result.at=new Date().toISOString();
  if(lockFd!==null){try{fs.closeSync(lockFd);fs.unlinkSync(lock);}catch{result.lockCleanup='FAILED';process.exitCode=1}}
  save(reportPath,result);
 }
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(String(e?.message??e));process.exitCode=1});
}
