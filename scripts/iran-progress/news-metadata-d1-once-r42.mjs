// R42: one-off 39-row D1 publication through the ALREADY configured PC Writer.
// No new tokens, schedules, Workers or R1 snapshot writes. A failed write must
// never be retried automatically: the remote result may already be committed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {stageIranNewsMetadataR41} from './news-metadata-stage-r41.mjs';
import {visibleIranMetadataRowsR41,validIranMetadataRowR41,
 IRAN_NEWS_METADATA_SOURCE_IDS_R41} from '../../lib/iran-progress/news-metadata-r41.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const R1_KEY='public:iran-progress:news:iran:r1';
const TABLE='iran_news_article_metadata_r41';
const SQL_PATH=path.join(ROOT,'db','migrations','iran-news-r41','0001_article_metadata.sql');
const ROWS_PATH=path.join(ROOT,'docs','IRAN_NEWS_R41_STAGING_ROWS_20261029.json');
const R1_READ='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const TABLE_READ=`SELECT article_id,source_id,source,source_url,title,published_at,
 body_verified,keywords_verified,checked_at FROM ${TABLE} ORDER BY published_at DESC,article_id`;

export function r42VerifiedRows({now=Date.now(),readFile=fs.readFileSync}={}){
 const manifest=JSON.parse(readFile(ROWS_PATH,'utf8'));
 const rows=manifest?.rows;
 if(manifest?.version!=='IRAN_NEWS_R41_STAGING_ROWS'||!Array.isArray(rows)||
  rows.length!==39||rows.some(row=>!validIranMetadataRowR41(row,{now})||
   createHash('sha256').update(row.sourceUrl).digest('hex')!==row.articleId)||
  new Set(rows.map(row=>row.articleId)).size!==39||
  new Set(rows.map(row=>row.sourceUrl)).size!==39||
  ['tasnim','govuk','guardian-iran','dw-world','bbc-middle-east',
   'aljazeera','un-middle-east'].some(id=>!rows.some(row=>row.sourceId===id)))
  throw Error('R42_STAGING_MANIFEST_INVALID');
 return rows;
}

function migrationSql(readFile=fs.readFileSync){
 const raw=readFile(SQL_PATH,'utf8');
 const sql=raw.replace(/^\s*--[^\n]*$/gm,'').split(';').map(x=>x.trim()).filter(Boolean);
 if(sql.length!==2||!/^CREATE TABLE IF NOT EXISTS iran_news_article_metadata_r41\s*\(/i.test(sql[0])||
  !/^CREATE INDEX IF NOT EXISTS idx_iran_news_r41_published_at\s+ON iran_news_article_metadata_r41\s*\(/i.test(sql[1]))
  throw Error('R42_SCHEMA_FILE_MISMATCH');
 return sql;
}

async function r1Identity(remote,db){
 const result=await remote.query(db,R1_READ,[R1_KEY]);
 const row=result?.results?.[0];
 if(result?.results?.length!==1||typeof row.body!=='string'||
  !Number.isSafeInteger(Number(row.stored_at)))throw Error('R42_R1_IDENTITY_UNVERIFIED');
 let parsed;
 try{parsed=JSON.parse(row.body);}catch{throw Error('R42_R1_BODY_INVALID')}
 if(parsed?.version!=='IRAN_NEWS_DISPLAY_R1')throw Error('R42_R1_VERSION_MISMATCH');
 return {body:row.body,storedAt:Number(row.stored_at)};
}

// Separately readable preflight does not write D1. The actual one-shot call
// starts by validating the same R1 identity against the exact target D1 DB.
export async function r42Preflight({remote,db,now=Date.now(),readFile=fs.readFileSync}={}){
 if(!remote||typeof remote.query!=='function'||typeof db!=='string')
  throw Error('R42_D1_CONNECTION_INVALID');
 const rows=r42VerifiedRows({now,readFile});
 migrationSql(readFile);
 await r1Identity(remote,db);
 const visible=visibleIranMetadataRowsR41(rows,{now});
 if(new Set(visible.map(x=>x.sourceId)).size!==7)
  throw Error('R42_CURRENT_DISPLAY_COVERAGE_INCOMPLETE');
 return {version:'IRAN_NEWS_R42',status:'PREFLIGHT_READ_ONLY',rows:rows.length,
  displayRows:visible.length,sources:new Set(visible.map(x=>x.sourceId)).size,
  d1Written:false,r1Modified:false,schedulerModified:false};
}

export async function r42StoreOnce({remote,db,now=Date.now(),readFile=fs.readFileSync,
 fetcher=fetch,publicUrl='https://zgmini.kr/api/outbreak-news/iran/r41'}={}){
 if(!remote||typeof remote.query!=='function'||typeof remote.request!=='function'||
  typeof remote.adapter!=='function'||typeof db!=='string')
  throw Error('R42_D1_CONNECTION_INVALID');
 const rows=r42VerifiedRows({now,readFile});
 const ddl=migrationSql(readFile);
 if(new Set(visibleIranMetadataRowsR41(rows,{now}).map(x=>x.sourceId)).size!==7)
  throw Error('R42_CURRENT_DISPLAY_COVERAGE_INCOMPLETE');
 const original=await r1Identity(remote,db);
 // R41 writes go to their own table only. One DDL attempt and bounded UPSERT;
 // a possible partial commit on error is preserved for manual read-only triage.
 for(const sql of ddl)await remote.request(db,[{sql,params:[]}]);
 const stage=await stageIranNewsMetadataR41(remote.adapter(db,{allowWrites:true}),rows,{now});
 const raw=(await remote.query(db,TABLE_READ)).results??[];
 const stored=new Map(raw.map(row=>[row.article_id,row]));
 if(rows.some(row=>stored.get(row.articleId)?.source_url!==row.sourceUrl))
  throw Error('R42_D1_FINAL_READBACK_MISMATCH');
 const after=await r1Identity(remote,db);
 if(after.body!==original.body||after.storedAt!==original.storedAt)
  throw Error('R42_R1_CHANGED_DURING_WRITE_STOP');
 const visible=visibleIranMetadataRowsR41(raw.map(row=>({
  articleId:row.article_id,sourceId:row.source_id,source:row.source,
  sourceUrl:row.source_url,title:row.title,publishedAt:row.published_at,
  bodyVerified:Number(row.body_verified)===1,
  twoStageKeywordsVerified:Number(row.keywords_verified)===1,
  checkedAt:Number(row.checked_at),
 })),{now});
 const sourceCount=new Set(visible.map(row=>row.sourceId)).size;
 if(sourceCount!==7)throw Error('R42_D1_SOURCE_COVERAGE_INCOMPLETE');
 let publicStatus='API_UNVERIFIED',apiCount=null;
 try{
  const response=await fetcher(publicUrl,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const payload=await response.json();
  if(response.ok&&payload?.status==='READY'&&payload?.sourceCount===7&&
   payload?.itemCount===visible.length&&Array.isArray(payload.items)){
   publicStatus='API_READY';apiCount=payload.itemCount;
  }else publicStatus='API_NOT_READY';
 }catch{publicStatus='API_UNAVAILABLE'}
 return {version:'IRAN_NEWS_R42',status:publicStatus==='API_READY'?
  'D1_AND_PUBLIC_API_VERIFIED':'D1_STORED_PUBLIC_API_PENDING',
  d1Written:true,d1RowsVerified:stage.readbackVerified,
  displayRows:visible.length,sourceCount,publicStatus,apiCount,
  r1Modified:false,schedulerModified:false,scoreLedgerModified:false,
  retryAutomatically:false};
}

async function commandLine(){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--preflight','--apply-approved'].includes(mode))
  throw Error('R42_EXPLICIT_MODE_REQUIRED');
 if(mode==='--apply-approved'&&process.env.IRAN_NEWS_R42_APPROVED!=='YES')
  throw Error('R42_EXPLICIT_APPROVAL_REQUIRED');
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 const token=credential(ROOT);
 const remote=client(config,token);
 const options={remote,db:config.core,now:Date.now()};
 const result=mode==='--preflight'?await r42Preflight(options):await r42StoreOnce(options);
 console.log(JSON.stringify(result));
 if(result.status==='D1_STORED_PUBLIC_API_PENDING')process.exitCode=2;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await commandLine()}
 catch(error){
  // Do not print arbitrary provider diagnostics, URLs, payloads or credentials.
  const reason=/^R4[12]_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'R42_D1_OPERATION_FAILED_OUTCOME_UNKNOWN';
  console.error(JSON.stringify({version:'IRAN_NEWS_R42',status:'STOP_NO_AUTO_RETRY',reason,
   manualReadbackRequired:true}));process.exitCode=1;
 }
}
