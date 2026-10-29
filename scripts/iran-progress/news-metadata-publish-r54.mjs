// R54: bounded, one-time Arab News publication after the R53 11-source D1 migration.
// Reads fresh membership before writing, never upserts existing articles, never auto-retries.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseIranNewsR46Evidence,preflightIranNewsR47} from './news-metadata-preflight-r47.mjs';
import {parseR49ApprovalEvidenceR50} from './news-metadata-publish-r50.mjs';
import {inspectIranNewsSchemaR53} from './news-metadata-schema-expand-r53.mjs';
import {validIranMetadataRowR41} from '../../lib/iran-progress/news-metadata-r41.mjs';

export const R54_VERSION='IRAN_NEWS_R54_EIGHT_ARTICLES_ONCE';
const TABLE='iran_news_article_metadata_r41';
const MANIFEST='docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json';
const INSERT=`INSERT INTO ${TABLE}
 (article_id,source_id,source,source_url,title,published_at,body_verified,
 keywords_verified,checked_at,stored_at) VALUES(?,?,?,?,?,?,1,1,?,?)`;

function sameArticle(actual,expected){
 return actual?.source_id===expected.sourceId&&actual.source_url===expected.sourceUrl&&
  actual.title===expected.title&&actual.published_at===expected.publishedAt&&
  Number(actual.body_verified)===1&&Number(actual.keywords_verified)===1&&
  Number(actual.checked_at)>=expected.checkedAt;
}
function publishedState(rows,expected){
 const byId=new Map(rows.map(x=>[x.article_id,x]));
 const existing=expected.filter(x=>byId.has(x.articleId));
 if(existing.some(x=>!sameArticle(byId.get(x.articleId),x)))
  throw Error('R54_EXISTING_NEW_ARTICLE_CONFLICT');
 return {stored:existing.length,missing:expected.length-existing.length};
}
function checkRows(rows,now){
 if(rows?.length!==8||new Set(rows.map(x=>x.articleId)).size!==8||
  rows.some(x=>x.sourceId!=='arabnews'||!validIranMetadataRowR41(x,{now})))
  throw Error('R54_EIGHT_VALIDATED_ARTICLES_REQUIRED');
}
export async function inspectIranNewsR54({remote,db,manifest,r46Evidence=null,r49Evidence=null,
 now=Date.now(),parseR46=parseIranNewsR46Evidence,parseR49=parseR49ApprovalEvidenceR50,
 preflight=preflightIranNewsR47}={}){
 const base=await inspectIranNewsSchemaR53({remote,db,manifest});
 if(base.state!=='ELEVEN')throw Error('R54_ELEVEN_SOURCE_SCHEMA_REQUIRED');
 const arabNewsRows=base.rows.filter(x=>x.source_id==='arabnews').length;
 if(r46Evidence===null&&r49Evidence===null)
  return {version:R54_VERSION,status:'SCHEMA_VERIFIED_EIGHT_IDS_UNCHECKED',
   existingRows:base.rowCount,arabNewsRows,archive39Verified:true,
   r1Preserved:true,d1Written:false,retryAutomatically:false};
 if(typeof r46Evidence!=='string'||typeof r49Evidence!=='string')
  throw Error('R54_BOTH_APPROVED_EVIDENCE_LOGS_REQUIRED');
 const parsed=parseR46(r46Evidence,{now});
 const gate=parseR49(r49Evidence);
 checkRows(parsed.rows,now);
 if(parsed.checkedAt!==gate.evidenceCheckedAt||gate.newRows!==8||
  gate.originalCount!==39)throw Error('R54_R46_R49_EVIDENCE_MISMATCH');
 const live=await preflight({remote,db,evidence:r46Evidence,now});
 if(live.newArticlesVerified!==8||live.baselineOriginal39!==39||
  live.historicalMetadataCorrections!==0||
  live.baselineOriginal39Sha256!==gate.originalHash||
  live.r1StoredAt!==base.r1StoredAt)
  throw Error('R54_CURRENT_ARCHIVE_OR_R1_GATE_FAILED');
 const state=publishedState(base.rows,parsed.rows);
 if(live.existingVerified!==state.stored||live.newArticleIds!==state.missing)
  throw Error('R54_MEMBERSHIP_DRIFT_DURING_PREFLIGHT');
 const status=state.stored===8?'ALREADY_EIGHT_STORED_NO_WRITE':
  state.stored>0?'PARTIAL_MEMBERSHIP_STOP_NO_WRITE':'READY_EIGHT_NOT_STORED';
 return {version:R54_VERSION,status,existingRows:base.rowCount,arabNewsRows,
  expectedEight:8,storedExpected:state.stored,missingExpected:state.missing,
  archive39Verified:true,r1Preserved:true,d1Written:false,retryAutomatically:false,
  _snapshot:base,_expected:parsed.rows};
}
function publicView(value){const {_snapshot,_expected,...safe}=value;return safe;}
const comparable=x=>JSON.stringify(x);
export async function publishIranNewsR54({remote,db,manifest,r46Evidence,r49Evidence,
 now=Date.now(),onPhase=()=>{},inspect=inspectIranNewsR54,inspectSchema=inspectIranNewsSchemaR53,
 parseR46,parseR49,preflight}={}){
 if(typeof remote?.request!=='function'||!Number.isSafeInteger(now))
  throw Error('R54_WRITE_CONNECTION_INVALID');
 const options={remote,db,manifest,r46Evidence,r49Evidence,now};
 if(parseR46)options.parseR46=parseR46;
 if(parseR49)options.parseR49=parseR49;
 if(preflight)options.preflight=preflight;
 onPhase('FIRST_READONLY_MEMBERSHIP');
 const first=await inspect(options);
 if(first.status==='ALREADY_EIGHT_STORED_NO_WRITE')return publicView(first);
 if(first.status!=='READY_EIGHT_NOT_STORED')
  throw Error('R54_NOT_ALL_EIGHT_MISSING_NO_WRITE');
 onPhase('FINAL_READONLY_MEMBERSHIP');
 const second=await inspect(options);
 const a=first._snapshot,b=second._snapshot;
 if(second.status!=='READY_EIGHT_NOT_STORED'||!a||!b||
  b.schemaHash!==a.schemaHash||b.rowsHash!==a.rowsHash||
  b.r1Hash!==a.r1Hash||b.r1StoredAt!==a.r1StoredAt||
  comparable(first._expected)!==comparable(second._expected))
  throw Error('R54_PREWRITE_STATE_DRIFT_NO_WRITE');
 const target=second._expected;
 checkRows(target,now);
 const statements=target.map(row=>({sql:INSERT,params:[row.articleId,row.sourceId,
  row.source,row.sourceUrl,row.title,row.publishedAt,row.checkedAt,now]}));
 // A single D1 batch: plain INSERT means a concurrent duplicate aborts instead
 // of rewriting an existing row. Never repeat an ambiguous write request.
 onPhase('ONE_TRANSACTION_D1_EIGHT_INSERTS');
 await remote.request(db,statements);
 onPhase('POSTWRITE_REMOTE_READBACK');
 const after=await inspectSchema({remote,db,manifest});
 if(after.state!=='ELEVEN'||after.schemaHash!==b.schemaHash||
  after.r1Hash!==b.r1Hash||after.r1StoredAt!==b.r1StoredAt||
  after.rowCount<b.rowCount+8)
  throw Error('R54_POSTWRITE_SCHEMA_R1_OR_COUNT_MISMATCH');
 const afterIds=new Map(after.rows.map(x=>[x.article_id,x]));
 if(b.rows.some(row=>comparable(afterIds.get(row.article_id))!==comparable(row))||
  target.some(row=>!sameArticle(afterIds.get(row.articleId),row)))
  throw Error('R54_POSTWRITE_IDENTITY_MISMATCH');
 return {version:R54_VERSION,status:after.rowCount===b.rowCount+8?
  'EIGHT_D1_ROWS_VERIFIED_PUBLIC_API_PENDING':'EIGHT_D1_ROWS_VERIFIED_CONCURRENT_ADDITIONS',
  beforeRows:b.rowCount,afterRows:after.rowCount,newRowsVerified:8,
  archive39Verified:true,r1Preserved:true,d1Written:true,
  r1Modified:false,schedulerModified:false,scoreModified:false,
  deployed:false,retryAutomatically:false};
}
function readSafe(file){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('R54_ABSOLUTE_LOG_PATH_REQUIRED');
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>150000)
  throw Error('R54_UNSAFE_EVIDENCE_FILE');
 return fs.readFileSync(file,'utf8');
}
function safeReason(e){
 const m=e?.message??'';
 return /^(?:R(?:4[579]|50|53|54)_[A-Z0-9_]+|D1_[A-Z0-9_]+|WRANGLER_LOGIN_REQUIRED)$/.test(m)?
  m:'R54_ERROR_REQUIRES_REVIEW';
}
async function main(){
 let phase='INITIALIZE';
 try{
  const mode=process.argv[2];
  const withLogs=mode==='--preflight'||mode==='--apply-approved';
  if((mode!=='--inspect'&&!withLogs)||process.argv.length!==(withLogs?5:3))
   throw Error('R54_EXPLICIT_MODE_REQUIRED');
  if(mode==='--apply-approved'&&process.env.ZGMINI_IRAN_NEWS_R54_APPROVED!=='YES')
   throw Error('R54_PUBLISH_APPROVAL_REQUIRED');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,MANIFEST),'utf8'));
  const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const {client,credential}=await import('../pc-writer/d1.mjs');
  const remote=client(config,credential(root));
  const opts={remote,db:config.core,manifest};
  if(withLogs){opts.r46Evidence=readSafe(process.argv[3]);opts.r49Evidence=readSafe(process.argv[4]);}
  if(mode==='--apply-approved'){
   const result=await publishIranNewsR54({...opts,onPhase:x=>{phase=x}});
   console.log(JSON.stringify(result));
  }else{
   phase='READONLY_INSPECTION';
   const result=publicView(await inspectIranNewsR54(opts));
   console.log(JSON.stringify(result));
   if(withLogs&&!['READY_EIGHT_NOT_STORED','ALREADY_EIGHT_STORED_NO_WRITE'].includes(result.status))
    process.exitCode=2;
  }
 }catch(e){
  console.log(JSON.stringify({version:R54_VERSION,status:'STOP_NO_AUTO_RETRY',phase,
   reason:safeReason(e),d1State:['ONE_TRANSACTION_D1_EIGHT_INSERTS','POSTWRITE_REMOTE_READBACK'].includes(phase)?
    'READBACK_REQUIRED':'NO_WRITE_INTENDED',retryAutomatically:false}));
  process.exitCode=1;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
