// R50: explicitly approved one-time, additive R41 D1 publication, never R1/score/scheduler.
// Reuses the existing PC writer credential and D1 adapter. No automatic retries on writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseIranNewsR46Evidence,preflightIranNewsR47} from './news-metadata-preflight-r47.mjs';
import {stageIranNewsMetadataR41} from './news-metadata-stage-r41.mjs';

export const R50_VERSION='IRAN_NEWS_R50_PUBLISH_ONCE';
const R49_PIN='1c36f385d55d4fb97d380f33105b7e930ba6efe1';
const SQL_ROWS='SELECT article_id,source_id,source_url,title,published_at,body_verified,keywords_verified,checked_at FROM iran_news_article_metadata_r41 ORDER BY article_id LIMIT 250';
const SQL_R1='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const R1_KEY='public:iran-progress:news:iran:r1';
const ARCHIVE_HASH='f89e556e424db3b9bddbdfdad7c2e84597b8f1bbfd7a388015b6b1807fb55c03';

function lineOnce(input,line){return input.split(/\r?\n/).filter(x=>x===line).length===1;}
export function parseR49ApprovalEvidenceR50(text){
 if(typeof text!=='string'||text.length>30000)throw Error('R50_R49_LOG_FORMAT_INVALID');
 const required=['R49_MEMBERSHIP_PREFLIGHT_BEGIN=YES','PINNED_SOURCE='+R49_PIN,
  'D1_WRITES_SCHEDULER_SCORE_DEPLOY=DISABLED','SOURCE_FILES=11_VERIFIED',
  'MEMBERSHIP_TESTS=PASS','FINAL_STATUS=R49_MEMBERSHIP_PREFLIGHT_READY_NO_WRITE'];
 if(required.some(x=>!lineOnce(text,x)))throw Error('R50_R49_LOG_IDENTITY_INVALID');
 const records=text.split(/\r?\n/).filter(x=>x.startsWith('{"version":"IRAN_NEWS_R47"'));
 if(records.length!==1)throw Error('R50_R49_RECORD_MISSING');
 let r;try{r=JSON.parse(records[0]);}catch{throw Error('R50_R49_JSON_INVALID')}
 if(r.version!=='IRAN_NEWS_R47'||r.status!=='PREFLIGHT_READY_FOR_APPROVED_PUBLISH'||
  r.readOnly!==true||r.d1Written!==false||r.r1Modified!==false||
  r.schedulerModified!==false||r.publicCacheModified!==false||
  r.newArticlesVerified!==8||r.newArticleIds!==8||r.existingVerified!==0||
  r.baselineOriginal39!==39||r.baselineOriginal39Sha256!==ARCHIVE_HASH||
  r.currentOriginalSourceRows!==41||r.extraOriginalSourceRows!==2||
  r.historicalMetadataCorrections!==0||r.r1Version!=='IRAN_NEWS_DISPLAY_R1'||
  !Number.isSafeInteger(r.r1StoredAt)||!Number.isFinite(Date.parse(r.evidenceCheckedAt)))
  throw Error('R50_R49_GATE_UNVERIFIED');
 return {evidenceCheckedAt:r.evidenceCheckedAt,originalCount:r.baselineOriginal39,
  originalHash:r.baselineOriginal39Sha256,r1StoredAt:r.r1StoredAt,newRows:r.newArticleIds};
}
function r1Identity(result){
 const x=result?.results;
 if(!Array.isArray(x)||x.length!==1||typeof x[0].body!=='string'||
  !Number.isSafeInteger(Number(x[0].stored_at)))throw Error('R50_R1_READ_FAILED');
 let obj;try{obj=JSON.parse(x[0].body)}catch{throw Error('R50_R1_BODY_INVALID')}
 if(obj?.version!=='IRAN_NEWS_DISPLAY_R1')throw Error('R50_R1_VERSION_MISMATCH');
 return {storedAt:Number(x[0].stored_at),sha256:createHash('sha256').update(x[0].body).digest('hex')};
}
async function snapshot(remote,db){
 const x=await remote.query(db,SQL_ROWS);
 if(!Array.isArray(x?.results)||x.results.length>=250)throw Error('R50_R41_SNAPSHOT_UNAVAILABLE');
 const rows=x.results;
 const byId=new Map(rows.map(x=>[x.article_id,x]));
 if(byId.size!==rows.length)throw Error('R50_R41_DUPLICATE_ID');
 return {rows,byId};
}
export async function publishIranNewsR50({remote,db,r46Evidence,r49Evidence,now=Date.now(),
 preflight=preflightIranNewsR47,stage=stageIranNewsMetadataR41}={}){
 if(!remote||typeof remote.query!=='function'||typeof remote.adapter!=='function'||
  typeof db!=='string'||!db||!Number.isSafeInteger(now))throw Error('R50_CONNECTION_INVALID');
 const r49=parseR49ApprovalEvidenceR50(r49Evidence);
 const parsed=parseIranNewsR46Evidence(r46Evidence,{now});
 if(parsed.rows.length!==r49.newRows||parsed.checkedAt!==r49.evidenceCheckedAt)
  throw Error('R50_R46_R49_EVIDENCE_MISMATCH');
 // Preflight checks all historic 39 archive identities against current D1.
 const gate=await preflight({remote,db,evidence:r46Evidence,now});
 if(gate.status!=='PREFLIGHT_READY_FOR_APPROVED_PUBLISH'||gate.baselineOriginal39!==39||
  gate.newArticlesVerified!==8||gate.newArticleIds!==8||gate.existingVerified!==0||
  gate.historicalMetadataCorrections!==0||gate.baselineOriginal39Sha256!==r49.originalHash)
  throw Error('R50_LIVE_PREFLIGHT_CHANGED');
 const before=await snapshot(remote,db);
 const expected=parsed.rows;
 if(expected.some(row=>before.byId.has(row.articleId)))throw Error('R50_NEW_ARTICLE_ALREADY_STORED');
 const r1Before=r1Identity(await remote.query(db,SQL_R1,[R1_KEY]));
 // Beyond this point a partial or ambiguous write outcome MUST NOT be retried.
 const write=await stage(remote.adapter(db,{allowWrites:true}),expected,{now});
 if(write.status!=='STAGED_READBACK_VERIFIED'||write.rows!==8||
  write.readbackVerified!==8||write.d1Written!==true)
  throw Error('R50_D1_WRITE_OUTCOME_UNCERTAIN');
 const after=await snapshot(remote,db);
 if(after.rows.length<before.rows.length+8)throw Error('R50_D1_COUNT_READBACK_MISMATCH');
 for(const [id,row] of before.byId){
  const x=after.byId.get(id);
  if(!x||x.source_id!==row.source_id||x.source_url!==row.source_url)
   throw Error('R50_EXISTING_ROW_IDENTITY_CHANGED');
 }
 for(const row of expected){
  const x=after.byId.get(row.articleId);
  if(!x||x.source_id!==row.sourceId||x.source_url!==row.sourceUrl||
   x.title!==row.title||x.published_at!==row.publishedAt||
   Number(x.body_verified)!==1||Number(x.keywords_verified)!==1||
   Number(x.checked_at)<row.checkedAt)
   throw Error('R50_NEW_ROW_READBACK_MISMATCH');
 }
 const r1After=r1Identity(await remote.query(db,SQL_R1,[R1_KEY]));
 if(r1Before.sha256!==r1After.sha256||r1Before.storedAt!==r1After.storedAt)
  throw Error('R50_R1_CHANGED_DURING_PUBLISH');
 return {version:R50_VERSION,status:after.rows.length===before.rows.length+8?
  'D1_EIGHT_ROWS_VERIFIED_API_DEPLOY_PENDING':'D1_EIGHT_VERIFIED_CONCURRENT_ADDITIONS_REVIEW',
  baseRows:before.rows.length,newRowsVerified:8,remoteRows:after.rows.length,
  originalsPreserved:gate.baselineOriginal39,r1Preserved:true,
  r1StoredAt:r1After.storedAt,d1Written:true,r1Modified:false,
  scoreLedgerModified:false,schedulerModified:false,cloudflareDeployed:false,
  retryAutomatically:false};
}
function readSafe(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('R50_LOG_PATH_INVALID');
 const info=fs.lstatSync(filename);
 if(!info.isFile()||info.isSymbolicLink()||info.size>150000)
  throw Error('R50_LOG_FILE_UNSAFE');
 return fs.readFileSync(filename,'utf8');
}
async function main(){
 if(process.argv.length!==5||process.argv[2]!=='--apply-approved')
  throw Error('R50_EXPLICIT_ONE_TIME_MODE_REQUIRED');
 if(process.env.ZGMINI_IRAN_NEWS_R50_APPROVED!=='YES')
  throw Error('R50_PUBLISH_APPROVAL_REQUIRED');
 const r46Evidence=readSafe(process.argv[3]);
 const r49Evidence=readSafe(process.argv[4]);
 const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 const result=await publishIranNewsR50({remote:client(config,credential(ROOT)),
  db:config.core,r46Evidence,r49Evidence});
 console.log(JSON.stringify(result));
 if(result.status!=='D1_EIGHT_ROWS_VERIFIED_API_DEPLOY_PENDING')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(err=>{
  const reason=/^R50_[A-Z0-9_]+$/.test(err?.message??'')?err.message:'R50_WRITE_OR_READBACK_OUTCOME_UNKNOWN';
  console.error(JSON.stringify({version:R50_VERSION,status:'STOP_NO_AUTO_RETRY',reason,
   d1State:'READBACK_REQUIRED_BEFORE_RETRY',retryAutomatically:false}));
  process.exitCode=1;
 });
}
