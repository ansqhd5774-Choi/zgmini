// R51: read-only recovery after R50 ambiguous D1 outcome. Never issues a mutation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseIranNewsR46Evidence} from './news-metadata-preflight-r47.mjs';
import {parseR49ApprovalEvidenceR50} from './news-metadata-publish-r50.mjs';
import {validateArchiveR48} from './news-metadata-baseline-diagnose-r48.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const R48_R1_HASH='051f1e8410a3ec4e1e870801030d2bfd03814e15cf165bbec42e71600edc3ece';
const R48_R1_STORED_AT=1793242899922;
const R1_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const ROW_SQL='SELECT article_id,source_id,source_url,title,published_at,body_verified,keywords_verified,checked_at FROM iran_news_article_metadata_r41 ORDER BY article_id LIMIT 250';
const OLD_IDS=new Set(['tasnim','govuk','guardian-iran','dw-world','bbc-middle-east','aljazeera','un-middle-east']);
const sha256=raw=>createHash('sha256').update(raw).digest('hex');
function safeFile(filename,max=150000){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('R51_FILE_PATH_INVALID');
 const st=fs.lstatSync(filename);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('R51_FILE_UNSAFE');
 return fs.readFileSync(filename,'utf8');
}
function lineOnce(raw,exact){return raw.split(/\r?\n/).filter(line=>line===exact).length===1;}
export function validateR50UncertainLogR51(log){
 if(typeof log!=='string'||log.length>25000||
  !['R50_ONE_TIME_PUBLISH_BEGIN=YES',
    'PINNED_SOURCE=35af18a7f1033b54867890944e66edf18348bdd0',
    'R50_PRIOR_SAFE_PREWRITE_STOP=VERIFIED','SOURCE_FILES=12_VERIFIED',
    'R50_TESTS=PASS','STEP_2=ONE_TIME_APPROVED_R41_D1_INCREMENTAL_PUBLISH',
    'R50_NODE_EXIT=1','FINAL_STATUS=R50_WRITE_OUTCOME_REQUIRES_D1_READBACK'].every(x=>lineOnce(log,x)))
  throw Error('R51_PREVIOUS_R50_OUTCOME_NOT_VERIFIED');
 const entries=log.split(/\r?\n/).filter(x=>x.startsWith('{"version":"IRAN_NEWS_R50_PUBLISH_ONCE"'));
 if(entries.length!==1)throw Error('R51_PREVIOUS_R50_RECORD_INVALID');
 let r;try{r=JSON.parse(entries[0]);}catch{throw Error('R51_PREVIOUS_R50_RECORD_INVALID')}
 if(r.status!=='STOP_NO_AUTO_RETRY'||r.reason!=='R50_WRITE_OR_READBACK_OUTCOME_UNKNOWN'||
  r.retryAutomatically!==false)throw Error('R51_PREVIOUS_R50_RECORD_INVALID');
 return true;
}
export async function diagnoseIranNewsR51({remote,db,r46Evidence,r49Evidence,r50Outcome,archiveRows,now=Date.now(),
 r1Baseline={sha256:R48_R1_HASH,storedAt:R48_R1_STORED_AT}}={}){
 if(!remote||typeof remote.query!=='function'||!db||!Number.isSafeInteger(now))
  throw Error('R51_READONLY_CONNECTION_INVALID');
 validateR50UncertainLogR51(r50Outcome);
 const gate=parseR49ApprovalEvidenceR50(r49Evidence);
 const candidates=parseIranNewsR46Evidence(r46Evidence,{now});
 if(candidates.rows.length!==8||candidates.checkedAt!==gate.evidenceCheckedAt)
  throw Error('R51_R46_R49_MISMATCH');
 const archive=validateArchiveR48(JSON.stringify({version:'IRAN_NEWS_R41_STAGING_ROWS',rows:archiveRows}));
 const r1=(await remote.query(db,R1_SQL,['public:iran-progress:news:iran:r1']))?.results;
 if(!Array.isArray(r1)||r1.length!==1||typeof r1[0].body!=='string')
  throw Error('R51_R1_READ_UNAVAILABLE');
 let parsed;try{parsed=JSON.parse(r1[0].body)}catch{throw Error('R51_R1_JSON_INVALID')}
 const r1Hash=sha256(r1[0].body),r1Time=Number(r1[0].stored_at);
 const r1Valid=parsed?.version==='IRAN_NEWS_DISPLAY_R1'&&
  r1Hash===r1Baseline.sha256&&r1Time===r1Baseline.storedAt;
 const raw=(await remote.query(db,ROW_SQL))?.results;
 if(!Array.isArray(raw)||raw.length>=250)throw Error('R51_D1_ROWS_UNAVAILABLE');
 const byId=new Map(raw.map(x=>[x.article_id,x]));
 if(byId.size!==raw.length)throw Error('R51_DUPLICATE_D1_ARTICLE_ID');
 const missingArchived=archive.filter(x=>!byId.has(x.articleId));
 const driftArchived=archive.filter(x=>{
  const stored=byId.get(x.articleId);
  return stored&&(stored.source_id!==x.sourceId||stored.source_url!==x.sourceUrl);
 });
 const storedNew=candidates.rows.filter(x=>byId.has(x.articleId));
 const changedNew=storedNew.filter(x=>{
  const r=byId.get(x.articleId);
  return r.source_id!==x.sourceId||r.source_url!==x.sourceUrl||
   r.title!==x.title||r.published_at!==x.publishedAt||
   Number(r.body_verified)!==1||Number(r.keywords_verified)!==1||
   Number(r.checked_at)<x.checkedAt;
 });
 const countedOld=raw.filter(x=>OLD_IDS.has(x.source_id)).length;
 const newSourceRows=raw.filter(x=>x.source_id==='arabnews').length;
 let status;
 if(!r1Valid)status='R1_BASELINE_DRIFT_STOP';
 else if(missingArchived.length||driftArchived.length)status='ORIGINAL_39_IDENTITY_DRIFT_STOP';
 else if(changedNew.length)status='R50_NEW_ARTICLE_CONFLICT_STOP';
 else if(storedNew.length===8)status='R50_EIGHT_STORED_READBACK_VERIFIED';
 else if(storedNew.length===0)status='R50_ZERO_EXPECTED_STORED_NO_RETRY';
 else status='R50_PARTIAL_STORED_NO_RETRY';
 return {version:'IRAN_NEWS_R51_READONLY',status,readOnly:true,
  d1TotalRows:raw.length,originalSourceRows:countedOld,
  previousOriginal39:archive.length,original39Present:archive.length-missingArchived.length,
  original39Missing:missingArchived.length,original39IdentityChanged:driftArchived.length,
  r50ExpectedNew:8,r50StoredNew:storedNew.length,r50MissingNew:8-storedNew.length,
  r50NewConflict:changedNew.length,arabNewsTotalRows:newSourceRows,
  r1BaselinePreserved:r1Valid,r1StoredAt:r1Time,
  d1Written:false,r1Modified:false,schedulerModified:false,scoreLedgerModified:false,
  retryAutomatically:false};
}
async function main(){
 if(process.argv.length!==6||process.argv[2]!=='--readback')
  throw Error('R51_READONLY_MODE_REQUIRED');
 const r46Evidence=safeFile(process.argv[3]);
 const r49Evidence=safeFile(process.argv[4]);
 const r50Outcome=safeFile(process.argv[5]);
 const manifest=JSON.parse(safeFile(path.join(ROOT,'docs','IRAN_NEWS_R41_STAGING_ROWS_20261029.json')));
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 const result=await diagnoseIranNewsR51({remote:client(config,credential(ROOT)),
  db:config.core,r46Evidence,r49Evidence,r50Outcome,archiveRows:manifest.rows});
 console.log(JSON.stringify(result));
 if(result.status!=='R50_EIGHT_STORED_READBACK_VERIFIED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{
  const reason=/^R51_[A-Z0-9_]+$/.test(err?.message??'')?err.message:'R51_REMOTE_READ_FAILED';
  console.error(JSON.stringify({version:'IRAN_NEWS_R51_READONLY',status:'STOP',reason,
   d1Written:false,retryAutomatically:false}));process.exitCode=1;
 });
