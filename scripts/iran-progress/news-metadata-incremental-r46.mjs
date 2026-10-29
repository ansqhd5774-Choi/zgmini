// R46: optional, bounded Arab News metadata-only increment to the existing R41 D1 table.
// No changes to the R1 snapshot or score/schedule. Never auto-retry a D1 write.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareIranNewsIncrementalR46} from './news-r46-incremental-core.mjs';
import {IRAN_NEWS_METADATA_SOURCES_R41,validIranMetadataRowR41}
 from '../../lib/iran-progress/news-metadata-r41.mjs';
import {stageIranNewsMetadataR41} from './news-metadata-stage-r41.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const R1_KEY='public:iran-progress:news:iran:r1';
const R1_READ='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const R41_READ='SELECT article_id,source_id,source,source_url,title,published_at, '+
 'checked_at FROM iran_news_article_metadata_r41 ORDER BY article_id';
const OLD_SOURCE_IDS=Object.freeze(['tasnim','govuk','guardian-iran','dw-world',
 'bbc-middle-east','aljazeera','un-middle-east']);

export function r46Prepare(report,{now=Date.now()}={}){
 return prepareIranNewsIncrementalR46(report,{now,
  sourceSpecs:IRAN_NEWS_METADATA_SOURCES_R41,validateRow:validIranMetadataRowR41});
}
function rowIdentity(row){
 return [row.article_id,row.source_id,row.source,row.source_url,row.title,row.published_at].join('\u0000');
}
async function readR1(remote,db){
 const result=await remote.query(db,R1_READ,[R1_KEY]);
 const raw=result?.results?.[0];
 if(result?.results?.length!==1||typeof raw.body!=='string'||
  !Number.isSafeInteger(Number(raw.stored_at)))throw Error('R46_R1_IDENTITY_UNVERIFIED');
 try{if(JSON.parse(raw.body)?.version!=='IRAN_NEWS_DISPLAY_R1')
  throw Error('R46_R1_VERSION_INVALID');}
 catch{throw Error('R46_R1_VERSION_INVALID');}
 return {body:raw.body,storedAt:Number(raw.stored_at)};
}
async function readR41(remote,db){
 const value=await remote.query(db,R41_READ);
 const rows=value?.results;
 if(!Array.isArray(rows)||rows.length<39||rows.length>10000||
  new Set(rows.map(x=>x?.article_id)).size!==rows.length||
  rows.some(x=>typeof x?.source_url!=='string'||typeof x?.title!=='string'))
  throw Error('R46_R41_BASELINE_INVALID');
 if(OLD_SOURCE_IDS.some(id=>!rows.some(r=>r.source_id===id)))
  throw Error('R46_ORIGINAL_SEVEN_SOURCES_MISSING');
 return rows;
}
function checkExistingConflict(before,newRows){
 const map=new Map(before.map(r=>[r.article_id,r]));
 for(const r of newRows){
  const old=map.get(r.articleId);
  if(old&&rowIdentity(old)!==[r.articleId,r.sourceId,r.source,
   r.sourceUrl,r.title,r.publishedAt].join('\u0000'))
   throw Error('R46_EXISTING_ARTICLE_IDENTITY_DRIFT');
 }
 return newRows.filter(r=>!map.has(r.articleId)).length;
}
export async function r46Preflight({remote,db,report,now=Date.now()}={}){
 if(!remote||typeof remote.query!=='function'||typeof db!=='string'||!db)
  throw Error('R46_D1_CONNECTION_INVALID');
 const prepared=r46Prepare(report,{now});
 const r1=await readR1(remote,db);
 const before=await readR41(remote,db);
 const newRows=checkExistingConflict(before,prepared.rows);
 return {status:'PREFLIGHT_READ_ONLY',prepared,r1,before,newRows,
  summary:{version:'IRAN_NEWS_R46',status:'PREFLIGHT_READ_ONLY',
   baselineRows:before.length,newRows,verifiedRows:prepared.rows.length,
   sourceIds:prepared.sourceIds,d1Written:false,r1Modified:false,
   schedulerModified:false,scoreLedgerModified:false}};
}
export async function r46StoreOnce({remote,db,report,now=Date.now()}={}){
 if(!remote||typeof remote.adapter!=='function')
  throw Error('R46_D1_CONNECTION_INVALID');
 const pre=await r46Preflight({remote,db,report,now});
 const stage=await stageIranNewsMetadataR41(remote.adapter(db,{allowWrites:true}),
  pre.prepared.rows,{now});
 const after=await readR41(remote,db);
 if(after.length!==pre.before.length+pre.newRows)
  throw Error('R46_D1_COUNT_READBACK_MISMATCH');
 const saved=new Map(after.map(r=>[r.article_id,r]));
 for(const row of pre.prepared.rows){
  const found=saved.get(row.articleId);
  if(!found||rowIdentity(found)!==[row.articleId,row.sourceId,row.source,
    row.sourceUrl,row.title,row.publishedAt].join('\u0000'))
   throw Error('R46_D1_ARTICLE_READBACK_MISMATCH');
 }
 const addedIds=new Set(pre.prepared.rows.map(r=>r.articleId));
 for(const prior of pre.before){
  const afterRow=saved.get(prior.article_id);
  if(!afterRow||(!addedIds.has(prior.article_id)&&rowIdentity(afterRow)!==rowIdentity(prior)))
   throw Error('R46_EXISTING_ROWS_CHANGED');
 }
 const r1=await readR1(remote,db);
 if(r1.body!==pre.r1.body||r1.storedAt!==pre.r1.storedAt)
  throw Error('R46_R1_CHANGED_STOP');
 return {version:'IRAN_NEWS_R46',status:'D1_READBACK_VERIFIED_PUBLIC_API_UNVERIFIED',
  baselineRows:pre.before.length,addedRows:pre.newRows,
  verifiedRows:stage.readbackVerified,totalRows:after.length,
  r1Modified:false,schedulerModified:false,scoreLedgerModified:false,
  d1Written:true,retryAutomatically:false};
}

export function r46ReportFromLog(log){
 if(typeof log!=='string'||!log.includes('R45_GIT_BLOB_IDENTITY=PASS')||
  !log.includes('FINAL_STATUS=READ_ONLY_PROBE_FINISHED')||
  !log.includes('SOURCE_COMMIT=50115a57bfde25f9f8681a0a28dde9b525f0d174'))
  throw Error('R46_R45_LOG_IDENTITY_UNVERIFIED');
 const records=log.split(/\r?\n/).filter(line=>line.startsWith('{'));
 if(records.length!==1)throw Error('R46_R45_LOG_FORMAT_INVALID');
 try{return JSON.parse(records[0]);}
 catch{throw Error('R46_R45_LOG_FORMAT_INVALID');}
}
async function commandLine(){
 const mode=process.argv[2],reportPath=process.argv[3];
 if(!['--preflight','--apply-approved'].includes(mode)||process.argv.length!==4)
  throw Error('R46_EXPLICIT_MODE_REQUIRED');
 if(mode==='--apply-approved'&&process.env.IRAN_NEWS_R46_APPROVED!=='YES')
  throw Error('R46_APPLY_APPROVAL_MISSING');
 const report=r46ReportFromLog(fs.readFileSync(reportPath,'utf8'));
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 const remote=client(config,credential(ROOT));
 const options={remote,db:config.core,report,now:Date.now()};
 const result=mode==='--preflight'?(await r46Preflight(options)).summary:
  await r46StoreOnce(options);
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await commandLine()}
 catch(error){
  const reason=/^R46_[A-Z0-9_]+$/.test(error?.message??'')?error.message:
   'R46_OPERATION_FAILED_OUTCOME_UNKNOWN';
  console.error(JSON.stringify({version:'IRAN_NEWS_R46',status:'STOP_NO_AUTO_RETRY',
   reason,manualReadbackRequired:true}));process.exitCode=1;
 }
}
