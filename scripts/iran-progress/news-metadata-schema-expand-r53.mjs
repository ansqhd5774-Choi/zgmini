// R53: approved additive source-ID schema expansion for the existing R41 D1 table.
// The migration is a single D1 batch. Never automatically retry an uncertain write.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const R53_VERSION='IRAN_NEWS_R53_SCHEMA_11_SOURCES';
export const R53_TABLE='iran_news_article_metadata_r41';
const NEXT='iran_news_article_metadata_r53_new';
export const OLD_IDS=Object.freeze(['tasnim','govuk','guardian-iran','dw-world',
 'bbc-middle-east','aljazeera','un-middle-east']);
export const NEW_IDS=Object.freeze([...OLD_IDS,'reuters','ap','arabnews','anadolu']);
const ROW_COLUMNS='article_id,source_id,source,source_url,title,published_at,body_verified,keywords_verified,checked_at,stored_at';
const R1_KEY='public:iran-progress:news:iran:r1';
const ROW_SQL=`SELECT ${ROW_COLUMNS} FROM ${R53_TABLE} ORDER BY article_id LIMIT 500`;
const SCHEMA_SQL="SELECT type,name,sql FROM sqlite_master WHERE (tbl_name=? OR name=?) AND type IN ('table','index','trigger') ORDER BY type,name";
const VIEW_SQL="SELECT name,sql FROM sqlite_master WHERE type='view'";
const R1_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const sha=s=>createHash('sha256').update(s).digest('hex');

export function r53TableSql(name,ids){
 return `CREATE TABLE ${name} (
 article_id TEXT PRIMARY KEY NOT NULL CHECK(length(article_id)=64),
 source_id TEXT NOT NULL CHECK(source_id IN (
  ${ids.map(x=>`'${x}'`).join(',')}
 )),
 source TEXT NOT NULL,
 source_url TEXT NOT NULL UNIQUE CHECK(source_url LIKE 'https://%'),
 title TEXT NOT NULL CHECK(length(title)>0 AND length(title)<=500),
 published_at TEXT NOT NULL,
 body_verified INTEGER NOT NULL DEFAULT 1 CHECK(body_verified=1),
 keywords_verified INTEGER NOT NULL DEFAULT 1 CHECK(keywords_verified=1),
 checked_at INTEGER NOT NULL CHECK(checked_at>0),
 stored_at INTEGER NOT NULL CHECK(stored_at>0)
)`;
}
const canonical=s=>typeof s==='string'?s.replace(/^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i,'CREATE TABLE ')
 .replace(/"/g,'').replace(/\s*([(),=<>])\s*/g,'$1').replace(/\s+/g,' ').replace(/;\s*$/,'').trim().toLowerCase():'';
const expected=(ids)=>canonical(r53TableSql(R53_TABLE,ids));
const sourceIds=sql=>{
 const match=sql?.match(/CHECK\s*\(\s*source_id\s+IN\s*\(([^)]+)\)\s*\)/i);
 if(!match||match[1].replace(/'[^']+'|[,\s]/g,'')!=='')return [];
 return [...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
};
function schemaState(sql){
 if(canonical(sql)===expected(OLD_IDS))return 'SEVEN';
 if(canonical(sql)===expected(NEW_IDS))return 'ELEVEN';
 return 'UNKNOWN';
}
function requireManifest(rows,manifest){
 if(manifest?.version!=='IRAN_NEWS_R41_STAGING_ROWS'||!Array.isArray(manifest.rows)||
  manifest.rows.length!==39||new Set(manifest.rows.map(x=>x.articleId)).size!==39)
  throw Error('R53_ARCHIVE_MANIFEST_INVALID');
 const byId=new Map(rows.map(x=>[x.article_id,x]));
 for(const item of manifest.rows){
  const old=byId.get(item.articleId);
  if(!old||old.source_id!==item.sourceId||old.source_url!==item.sourceUrl||
   old.title!==item.title||old.published_at!==item.publishedAt)
   throw Error('R53_ARCHIVE_39_CHANGED');
 }
}
export async function inspectIranNewsSchemaR53({remote,db,manifest}={}){
 if(!remote||typeof remote.query!=='function'||typeof db!=='string'||!db)
  throw Error('R53_CONNECTION_INVALID');
 const schema=(await remote.query(db,SCHEMA_SQL,[R53_TABLE,R53_TABLE]))?.results;
 if(!Array.isArray(schema))throw Error('R53_SCHEMA_READ_FAILED');
 const table=schema.filter(x=>x.type==='table'&&x.name===R53_TABLE);
 if(table.length!==1)throw Error('R53_TABLE_MISSING');
 const state=schemaState(table[0].sql);
 if(state==='UNKNOWN')throw Error('R53_UNRECOGNIZED_SCHEMA_STOP');
 const custom=schema.filter(x=>x.type==='index'&&x.sql!=null);
 if(schema.some(x=>x.type==='trigger')||custom.length!==1||
  custom[0].name!=='idx_iran_news_r41_published_at'||
  !/^CREATE INDEX (?:IF NOT EXISTS )?idx_iran_news_r41_published_at\s+ON iran_news_article_metadata_r41\s*\(published_at DESC,article_id\)$/i.test(custom[0].sql.replace(/\s+/g,' ').trim()))
  throw Error('R53_UNRECOGNIZED_SCHEMA_DEPENDENCY');
 const views=(await remote.query(db,VIEW_SQL))?.results;
 if(!Array.isArray(views)||views.some(v=>new RegExp('\\b'+R53_TABLE+'\\b','i').test(v.sql??'')))
  throw Error('R53_VIEW_DEPENDENCY_STOP');
 const pending=(await remote.query(db,'SELECT name FROM sqlite_master WHERE name=?',[NEXT]))?.results;
 if(!Array.isArray(pending)||pending.length)throw Error('R53_PENDING_TABLE_EXISTS_STOP');
 const rows=(await remote.query(db,ROW_SQL))?.results;
 if(!Array.isArray(rows)||rows.length<39||rows.length>=500||
  new Set(rows.map(x=>x.article_id)).size!==rows.length)
  throw Error('R53_ROWS_INVALID');
 if(rows.some(x=>!NEW_IDS.includes(x.source_id)))throw Error('R53_UNEXPECTED_SOURCE_ID');
 requireManifest(rows,manifest);
 const r1=(await remote.query(db,R1_SQL,[R1_KEY]))?.results;
 if(!Array.isArray(r1)||r1.length!==1||typeof r1[0].body!=='string'||
  !Number.isSafeInteger(Number(r1[0].stored_at)))throw Error('R53_R1_IDENTITY_UNAVAILABLE');
 return {state,sourceIds:sourceIds(table[0].sql),schemaHash:sha(table[0].sql),
  rowCount:rows.length,rowsHash:sha(JSON.stringify(rows)),rows,r1Body:r1[0].body,
  r1Hash:sha(r1[0].body),r1StoredAt:Number(r1[0].stored_at),archive39Verified:true};
}
export function r53MigrationStatements(){
 return [
  {sql:r53TableSql(NEXT,NEW_IDS),params:[]},
  {sql:`INSERT INTO ${NEXT} (${ROW_COLUMNS}) SELECT ${ROW_COLUMNS} FROM ${R53_TABLE}`,params:[]},
  {sql:`DROP TABLE ${R53_TABLE}`,params:[]},
  {sql:`ALTER TABLE ${NEXT} RENAME TO ${R53_TABLE}`,params:[]},
  {sql:`CREATE INDEX idx_iran_news_r41_published_at ON ${R53_TABLE}(published_at DESC,article_id)`,params:[]}
 ];
}
export async function expandIranNewsSchemaR53({remote,db,manifest,backup,onPhase=()=>{}}={}){
 if(typeof remote?.request!=='function'||typeof backup!=='function')throw Error('R53_BACKUP_HANDLER_REQUIRED');
 onPhase('READONLY_PREFLIGHT');
 const before=await inspectIranNewsSchemaR53({remote,db,manifest});
 if(before.state==='ELEVEN')return {version:R53_VERSION,status:'ALREADY_11_SOURCE_SCHEMA_NO_WRITE',
  rows:before.rowCount,archive39Verified:true,d1Written:false,retryAutomatically:false};
 if(before.state!=='SEVEN')throw Error('R53_SEVEN_SCHEMA_REQUIRED');
 onPhase('PC_BACKUP');
 await backup({version:R53_VERSION,schemaHash:before.schemaHash,rows:before.rows,
  r1Body:before.r1Body,r1StoredAt:before.r1StoredAt,rowsHash:before.rowsHash});
 onPhase('FINAL_READONLY_PREFLIGHT');
 const latest=await inspectIranNewsSchemaR53({remote,db,manifest});
 if(latest.state!=='SEVEN'||latest.rowsHash!==before.rowsHash||
  latest.schemaHash!==before.schemaHash||latest.r1Hash!==before.r1Hash||
  latest.r1StoredAt!==before.r1StoredAt)throw Error('R53_PREWRITE_STATE_DRIFT');
 onPhase('ONE_TRANSACTION_SCHEMA_MIGRATION');
 await remote.request(db,r53MigrationStatements());
 onPhase('POSTWRITE_READBACK');
 const after=await inspectIranNewsSchemaR53({remote,db,manifest});
 const beforeMap=new Map(before.rows.map(x=>[x.article_id,JSON.stringify(x)]));
 const afterMap=new Map(after.rows.map(x=>[x.article_id,JSON.stringify(x)]));
 if(after.state!=='ELEVEN'||after.rowCount<before.rowCount||
  [...beforeMap].some(([id,value])=>afterMap.get(id)!==value)||
  before.r1Hash!==after.r1Hash||before.r1StoredAt!==after.r1StoredAt)
  throw Error('R53_POSTWRITE_PRESERVATION_REVIEW');
 return {version:R53_VERSION,status:'ELEVEN_SOURCE_SCHEMA_VERIFIED',
  beforeRows:before.rowCount,afterRows:after.rowCount,archive39Verified:true,
  sourceIds:NEW_IDS,r1Preserved:true,d1Written:true,retryAutomatically:false};
}
export function writeR53Backup(payload){
 const directory='E:\\ZGmini\\data\\pc-writer\\schema-backups';
 fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,`iran-r41-r53-${payload.rowsHash.slice(0,16)}.json`);
 fs.writeFileSync(file,JSON.stringify(payload),{flag:'wx',mode:0o600});
 return file;
}
function safeError(e){return /^(?:R53_[A-Z0-9_]+|D1_HTTP_\d+|D1_BATCH_FAILED|D1_OUTCOME_UNKNOWN|WRANGLER_LOGIN_REQUIRED)$/.test(e?.message??'')?e.message:'R53_UNCLASSIFIED_NO_RETRY';}
async function main(){
 let phase='INITIALIZE';
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||!['--preflight','--apply-approved'].includes(mode))throw Error('R53_EXPLICIT_MODE_REQUIRED');
  if(mode==='--apply-approved'&&process.env.ZGMINI_IRAN_NEWS_R53_APPROVED!=='YES')throw Error('R53_APPROVAL_REQUIRED');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs','IRAN_NEWS_R41_STAGING_ROWS_20261029.json'),'utf8'));
  const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const {client,credential}=await import('../pc-writer/d1.mjs');
  const remote=client(config,credential(root));
  if(mode==='--preflight'){
   const out=await inspectIranNewsSchemaR53({remote,db:config.core,manifest});
   console.log(JSON.stringify({version:R53_VERSION,status:out.state==='SEVEN'?'SEVEN_SCHEMA_CONFIRMED':'ALREADY_ELEVEN',
    sourceIds:out.sourceIds,rows:out.rowCount,archive39Verified:out.archive39Verified,
    schemaHash:out.schemaHash,r1Preserved:true,d1Written:false}));
  }else{
   const out=await expandIranNewsSchemaR53({remote,db:config.core,manifest,backup:writeR53Backup,onPhase:p=>{phase=p}});
   console.log(JSON.stringify(out));
  }
 }catch(e){
  console.log(JSON.stringify({version:R53_VERSION,status:'STOP_NO_AUTO_RETRY',phase,reason:safeError(e),
   d1State:phase==='ONE_TRANSACTION_SCHEMA_MIGRATION'||phase==='POSTWRITE_READBACK'?'READBACK_REQUIRED':'NO_WRITE_INTENDED',retryAutomatically:false}));
  process.exitCode=1;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
