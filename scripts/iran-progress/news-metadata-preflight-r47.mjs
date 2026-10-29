// R47: one-shot READ ONLY preflight for R46 verified Arab News metadata.
// No D1 write, queue, scheduler, score, R1, or deployment changes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareIranNewsIncrementalR45} from './news-metadata-incremental-r45.mjs';

const R46_SOURCE='485c9a08b37270b5cc35260829e81adda3e19bc7';
const R1_KEY='public:iran-progress:news:iran:r1';
const R1_QUERY='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const R41_QUERY='SELECT article_id,source_id,source_url,title,published_at,body_verified,keywords_verified,checked_at FROM iran_news_article_metadata_r41 ORDER BY article_id LIMIT 250';
const ORIGINAL_IDS=['tasnim','govuk','guardian-iran','dw-world','bbc-middle-east','aljazeera','un-middle-east'];

function exactLine(text,line){return text.split(/\r?\n/).filter(x=>x===line).length===1;}
export function parseIranNewsR46Evidence(text,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||typeof text!=='string'||text.length>150000)
  throw Error('R47_EVIDENCE_FORMAT_INVALID');
 const mandatory=['R46_READ_ONLY_TEST_BEGIN=YES','PINNED_SOURCE='+R46_SOURCE,
  'PC_CORE_D1_SCHEDULER_PUBLIC_WRITES=DISABLED','SOURCE_FILES=20_VERIFIED',
  'NODE_TESTS=PASS','FINAL_STATUS=R46_TESTS_PASS_PROBE_RECORDED'];
 if(mandatory.some(line=>!exactLine(text,line)))throw Error('R47_EVIDENCE_IDENTITY_INVALID');
 const records=text.split(/\r?\n/).filter(s=>s.startsWith('{"version":"IRAN_NEWS_R45_OPTIONAL_PRIVATE_PROBE"'));
 if(records.length!==1)throw Error('R47_EVIDENCE_RECORD_INVALID');
 let probe;
 try{probe=JSON.parse(records[0]);}catch{throw Error('R47_EVIDENCE_JSON_INVALID')}
 if(probe.version!=='IRAN_NEWS_R45_OPTIONAL_PRIVATE_PROBE'||
  !['PARTIAL','READ_ONLY_REVIEW_REQUIRED'].includes(probe.status)||
  probe.pcCacheWritten!==false||probe.remoteD1Written!==false||
  probe.publicSnapshotModified!==false||probe.schedulerModified!==false||
  probe.scoreLedgerModified!==false||
  !Array.isArray(probe.sources)||probe.sources.length!==1||
  probe.sources[0].sourceId!=='arabnews'||probe.sources[0].status!=='READ'||
  !Array.isArray(probe.articles)||!Number.isInteger(probe.metadataReviewed)||
  probe.articles.length!==probe.metadataReviewed||probe.articles.length===0||
  probe.articles.length>100||!Number.isInteger(probe.eligible14Day)||
  probe.eligible14Day!==probe.articles.length||!Number.isInteger(probe.candidatesDiscovered)||
  probe.candidatesDiscovered<probe.articles.length)
  throw Error('R47_EVIDENCE_COVERAGE_INVALID');
 if(probe.articles.some(x=>x.sourceId!=='arabnews'||x.bodyVerified!==true||
  x.twoStageKeywordsVerified!==true||x.rightsVerified!==false||
  x.displayEligible!==false||typeof x.originalTitle!=='string'||
  typeof x.sourceUrl!=='string'||typeof x.publisherDeclaredPublishedAt!=='string'))
  throw Error('R47_EVIDENCE_ARTICLE_INVALID');
 const checkedAt=Date.parse(probe.checkedAt);
 if(!Number.isSafeInteger(checkedAt)||checkedAt>now||checkedAt<1)
  throw Error('R47_EVIDENCE_TIME_INVALID');
 const report={version:'IRAN_ARTICLE_DETAIL_AUDIT_R25',mode:'READ_ONLY',
  checkedAt:probe.checkedAt,articles:probe.articles.map(a=>({
   sourceId:a.sourceId,sourceUrl:a.sourceUrl,originalTitle:a.originalTitle,
   publisherDeclaredPublishedAt:a.publisherDeclaredPublishedAt,
   articleBodyAccessible:a.bodyVerified,
   scopeVerifiedFromArticle:a.twoStageKeywordsVerified,
   status:'ARTICLE_METADATA_REVIEWED'}))};
 const rows=prepareIranNewsIncrementalR45(report,{now});
 if(rows.length!==probe.metadataReviewed)throw Error('R47_PREPARED_ROW_COUNT_MISMATCH');
 return {checkedAt:probe.checkedAt,rows,reportedCandidates:probe.candidatesDiscovered,
  reportedArticleFailures:Number(probe.articleOutcomes?.ARTICLE_FETCH_FAILED??0)};
}
export async function preflightIranNewsR47({remote,db,evidence,now=Date.now()}={}){
 if(!remote||typeof remote.query!=='function'||typeof db!=='string')
  throw Error('R47_D1_CONNECTION_INVALID');
 const e=parseIranNewsR46Evidence(evidence,{now});
 const r1=await remote.query(db,R1_QUERY,[R1_KEY]);
 if(r1?.results?.length!==1||typeof r1.results[0].body!=='string')
  throw Error('R47_R1_IDENTITY_UNAVAILABLE');
 let parsed;
 try{parsed=JSON.parse(r1.results[0].body)}catch{throw Error('R47_R1_BODY_INVALID')}
 if(parsed?.version!=='IRAN_NEWS_DISPLAY_R1'||
  !Number.isSafeInteger(Number(r1.results[0].stored_at)))
  throw Error('R47_R1_VERSION_OR_TIME_MISMATCH');
 const raw=await remote.query(db,R41_QUERY);
 if(!Array.isArray(raw?.results)||raw.results.length>=250)
  throw Error('R47_R41_READBACK_UNAVAILABLE');
 const existing=raw.results;
 const existingIds=new Set(existing.map(row=>row.article_id));
 if(existingIds.size!==existing.length)throw Error('R47_R41_DUPLICATE_STORAGE');
 const original=existing.filter(row=>ORIGINAL_IDS.includes(row.source_id));
 if(original.length!==39||new Set(original.map(x=>x.source_id)).size!==7)
  throw Error('R47_ORIGINAL_39_BASELINE_MISMATCH');
 const checksum=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>[
  r.article_id,r.source_id,r.source_url,r.title,r.published_at,r.body_verified,
  r.keywords_verified,r.checked_at]))).digest('hex');
 const baselineHash=checksum(original);
 const duplicates=e.rows.filter(row=>existingIds.has(row.articleId));
 const novel=e.rows.filter(row=>!existingIds.has(row.articleId));
 const conflicting=duplicates.filter(row=>{
  const x=existing.find(r=>r.article_id===row.articleId);
  return x.source_id!==row.sourceId||x.source_url!==row.sourceUrl||
   x.title!==row.title||x.published_at!==row.publishedAt;
 });
 if(conflicting.length)throw Error('R47_EXISTING_ARTICLE_CONFLICT');
 const state=duplicates.length===e.rows.length?'ALREADY_PRESENT':
  duplicates.length?'PARTIAL_EXISTING_REVIEW_REQUIRED':'PREFLIGHT_READY_FOR_APPROVED_PUBLISH';
 return {version:'IRAN_NEWS_R47',status:state,readOnly:true,
  evidenceCheckedAt:e.checkedAt,reportedCandidates:e.reportedCandidates,
  newArticlesVerified:e.rows.length,existingVerified:duplicates.length,
  newArticleIds:novel.length,failedArticleFetches:e.reportedArticleFailures,
  baselineOriginal39:original.length,baselineOriginal39Sha256:baselineHash,
  r1Version:parsed.version,r1StoredAt:Number(r1.results[0].stored_at),
  d1Written:false,r1Modified:false,schedulerModified:false,
  publicCacheModified:false};
}
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--preflight'||!path.isAbsolute(args[1]))
  throw Error('R47_EXPLICIT_PREFLIGHT_FILE_REQUIRED');
 const source=args[1];
 const st=fs.lstatSync(source);
 if(!st.isFile()||st.isSymbolicLink()||st.size>150000)
  throw Error('R47_EVIDENCE_FILE_UNSAFE');
 const evidence=fs.readFileSync(source,'utf8');
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 const result=await preflightIranNewsR47({
  remote:client(config,credential(ROOT)),db:config.core,evidence,now:Date.now()});
 console.log(JSON.stringify(result));
 if(result.status!=='PREFLIGHT_READY_FOR_APPROVED_PUBLISH')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{
  const reason=/^R47_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'R47_PREFLIGHT_UNAVAILABLE';
  console.error(JSON.stringify({version:'IRAN_NEWS_R47',status:'STOP_READONLY',reason,
   d1Written:false,manualReadbackRequired:false}));process.exitCode=1;
 });
