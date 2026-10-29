// R52: isolate the R50 failure phase using approved D1 SELECT calls only.
// Never runs D1.batch/request, publication, scheduler, or writer mutation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseIranNewsR46Evidence,preflightIranNewsR47} from './news-metadata-preflight-r47.mjs';
import {parseR49ApprovalEvidenceR50} from './news-metadata-publish-r50.mjs';
import {validateR50UncertainLogR51} from './news-metadata-readback-r51.mjs';
import {validIranMetadataRowR41} from '../../lib/iran-progress/news-metadata-r41.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const TABLE='iran_news_article_metadata_r41';
const R1_KEY='public:iran-progress:news:iran:r1';
const R1_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const ROW_SQL='SELECT article_id,source_id,source_url,title,published_at,body_verified,keywords_verified,checked_at FROM '+TABLE+' ORDER BY article_id LIMIT 250';
const R48_R1_HASH='051f1e8410a3ec4e1e870801030d2bfd03814e15cf165bbec42e71600edc3ece';
const R48_R1_TIME=1793242899922;
const sha=x=>createHash('sha256').update(x).digest('hex');
function exactLine(text,s){return text.split(/\r?\n/).filter(x=>x===s).length===1;}
export function verifyR51ZeroLogR52(text){
 if(typeof text!=='string'||text.length>30000||![
  'R51_READBACK_BEGIN=YES','SOURCE_FILES=13_VERIFIED','R51_TESTS=PASS',
  'R51_NODE_EXIT=2','FINAL_STATUS=R51_D1_READBACK_REVIEW_NO_WRITE'
 ].every(x=>exactLine(text,x)))throw Error('R52_R51_IDENTITY_INVALID');
 const objects=text.split(/\r?\n/).filter(x=>x.startsWith('{"version":"IRAN_NEWS_R51_READONLY"'));
 if(objects.length!==1)throw Error('R52_R51_RESULT_INVALID');
 let r;try{r=JSON.parse(objects[0])}catch{throw Error('R52_R51_RESULT_INVALID')}
 if(r.status!=='R50_ZERO_EXPECTED_STORED_NO_RETRY'||r.d1TotalRows!==41||
  r.original39Present!==39||r.original39Missing!==0||r.r50ExpectedNew!==8||
  r.r50StoredNew!==0||r.arabNewsTotalRows!==0||r.r1BaselinePreserved!==true||
  r.r1StoredAt!==R48_R1_TIME||r.d1Written!==false)
  throw Error('R52_R51_ZERO_STATE_UNVERIFIED');
 return {previousD1Rows:41,expectedNew:8,storedNew:0};
}
export async function diagnoseR50ReadOnlyR52({remote,db,r46,r49,r50,r51,now=Date.now(),onPhase=()=>{},
 preflight=preflightIranNewsR47,r1Baseline={hash:R48_R1_HASH,storedAt:R48_R1_TIME}}={}){
 if(!remote||typeof remote.query!=='function'||typeof remote.adapter!=='function'||
  typeof db!=='string'||!db)throw Error('R52_CONNECTION_INVALID');
 onPhase('R50_R51_EVIDENCE');
 validateR50UncertainLogR51(r50);
 const recorded=verifyR51ZeroLogR52(r51);
 onPhase('R46_R49_EVIDENCE');
 const probe=parseIranNewsR46Evidence(r46,{now});
 const rows=probe.rows;
 const gate=parseR49ApprovalEvidenceR50(r49);
 if(rows.length!==8||gate.newRows!==8||probe.checkedAt!==gate.evidenceCheckedAt)throw Error('R52_EIGHT_ARTICLE_EVIDENCE_MISMATCH');
 onPhase('R41_STAGING_INPUT');
 if(rows.some(row=>!validIranMetadataRowR41(row,{now})))
  throw Error('R52_STAGE_ROW_INVALID');
 const unique=new Set(rows.map(row=>row.articleId));
 if(unique.size!==8)throw Error('R52_STAGE_ROW_DUPLICATE');
 onPhase('R47_LIVE_PREFLIGHT');
 const r47=await preflight({remote,db,evidence:r46,now});
 if(r47.status!=='PREFLIGHT_READY_FOR_APPROVED_PUBLISH'||
  r47.baselineOriginal39!==39||r47.newArticleIds!==8||r47.existingVerified!==0||
  r47.baselineOriginal39Sha256!==gate.originalHash)
  throw Error('R52_R47_PREFLIGHT_CHANGED');
 onPhase('R50_SNAPSHOT_QUERY');
 const raw=(await remote.query(db,ROW_SQL))?.results;
 if(!Array.isArray(raw)||raw.length>=250||raw.length<39)
  throw Error('R52_SNAPSHOT_UNAVAILABLE');
 const ids=new Set(raw.map(x=>x.article_id));
 if(ids.size!==raw.length)throw Error('R52_SNAPSHOT_DUPLICATE');
 if(rows.some(x=>ids.has(x.articleId)))throw Error('R52_NEW_ROWS_ALREADY_STORED');
 onPhase('R50_R1_BASELINE_QUERY');
 const r1=(await remote.query(db,R1_SQL,[R1_KEY]))?.results;
 if(!Array.isArray(r1)||r1.length!==1||typeof r1[0].body!=='string'||
  sha(r1[0].body)!==r1Baseline.hash||Number(r1[0].stored_at)!==r1Baseline.storedAt)
  throw Error('R52_R1_BASELINE_CHANGED');
 onPhase('D1_ADAPTER_READBACK_COMPAT');
 const query='SELECT article_id,source_url,body_verified,keywords_verified,checked_at FROM '+
  TABLE+' WHERE article_id IN ('+rows.map(()=>'?').join(',')+')';
 const adapter=remote.adapter(db,{allowWrites:false});
 if(!adapter||typeof adapter.prepare!=='function')throw Error('R52_ADAPTER_MISSING');
 const candidates=await adapter.prepare(query).bind(...rows.map(x=>x.articleId)).all();
 if(!Array.isArray(candidates?.results)||candidates.results.length!==0)
  throw Error('R52_ADAPTER_READBACK_UNEXPECTED');
 onPhase('ALL_PREWRITE_CHECKS_PASSED');
 return {version:'IRAN_NEWS_R52_READONLY',
  status:'PREWRITE_CURRENTLY_PASS_R50_CAUSE_NOT_YET_PROVEN',
  historicalR51:recorded,currentD1Rows:raw.length,newArticlesValidated:8,
  archivedOriginal39Verified:39,r1BaselinePreserved:true,
  adapterReadbackUsable:true,lastPass:'ALL_PREWRITE_CHECKS_PASSED',
  next:'INVESTIGATE_WRITE_AUTH_OR_BATCH_RESPONSE_WITHOUT_AUTOMATIC_RETRY',
  d1Written:false,r1Modified:false,scoreModified:false,schedulerModified:false,
  retryAutomatically:false};
}
function readLog(p){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('R52_LOG_PATH_INVALID');
 const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size>150000)
  throw Error('R52_LOG_FILE_INVALID');
 return fs.readFileSync(p,'utf8');
}
function safeReason(err){
 const s=err?.message??'';
 if(/^(?:R(?:4[1579]|50|51|52)_[A-Z0-9_]+|D1_[A-Z0-9_]+|WRANGLER_LOGIN_REQUIRED|READ_ONLY_SQL_REQUIRED)$/.test(s))
  return s;
 return 'R52_UNCLASSIFIED_READ_DIAGNOSTIC_FAILURE';
}
async function main(){
 let phase='START';
 try{
  if(process.argv.length!==7||process.argv[2]!=='--diagnose')
   throw Error('R52_READONLY_MODE_REQUIRED');
  const [r46,r49,r50,r51]=process.argv.slice(3).map(readLog);
  phase='LOAD_APPROVED_PC_WRITER';
  const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const {client,credential}=await import('../pc-writer/d1.mjs');
  const remote=client(config,credential(ROOT));
  const out=await diagnoseR50ReadOnlyR52({remote,db:config.core,r46,r49,r50,r51,
   onPhase:x=>{phase=x}});
  console.log(JSON.stringify(out));
 }catch(e){
  console.log(JSON.stringify({version:'IRAN_NEWS_R52_READONLY',status:'STOP_READONLY',
   firstFail:phase,reason:safeReason(e),d1Written:false,retryAutomatically:false}));
  process.exitCode=1;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
