// R48: read-only D1 baseline membership diagnostic. Never modifies writer, D1, R1 or scheduler.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const BASE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const R1_KEY='public:iran-progress:news:iran:r1';
const R1_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const COUNTS_SQL='SELECT source_id,COUNT(*) AS n FROM iran_news_article_metadata_r41 GROUP BY source_id ORDER BY source_id';
const ARCHIVE_SQL='SELECT article_id,source_id,source_url,title,published_at FROM iran_news_article_metadata_r41 WHERE article_id IN ('+Array(39).fill('?').join(',')+')';
const OLD=new Set(['tasnim','govuk','guardian-iran','dw-world','bbc-middle-east','aljazeera','un-middle-east']);
const NEW=new Set(['reuters','ap','arabnews','anadolu']);
const digest=x=>createHash('sha256').update(x).digest('hex');
export function validateArchiveR48(text){
 let m;
 try{m=JSON.parse(text)}catch{throw Error('R48_MANIFEST_INVALID')}
 if(m?.version!=='IRAN_NEWS_R41_STAGING_ROWS'||!Array.isArray(m.rows)||m.rows.length!==39)
  throw Error('R48_MANIFEST_INVALID');
 const ids=new Set();
 for(const row of m.rows){
  if(!/^[a-f0-9]{64}$/.test(row.articleId??'')||!OLD.has(row.sourceId)||
   typeof row.sourceUrl!=='string'||!row.sourceUrl.startsWith('https://')||
   digest(row.sourceUrl)!==row.articleId||ids.has(row.articleId))
   throw Error('R48_ARCHIVE_ID_INVALID');
  ids.add(row.articleId);
 }
 if(new Set(m.rows.map(x=>x.sourceId)).size!==7)throw Error('R48_ARCHIVE_SOURCE_INVALID');
 return m.rows;
}
export async function diagnoseIranNewsD1R48({remote,db,archiveRows}={}){
 if(!remote||typeof remote.query!=='function'||typeof db!=='string'||
  !Array.isArray(archiveRows)||archiveRows.length!==39)
  throw Error('R48_INPUT_INVALID');
 const r1=await remote.query(db,R1_SQL,[R1_KEY]);
 if(r1?.results?.length!==1||typeof r1.results[0].body!=='string'||
  !Number.isSafeInteger(Number(r1.results[0].stored_at)))
  throw Error('R48_R1_UNAVAILABLE');
 let parsed;try{parsed=JSON.parse(r1.results[0].body)}catch{throw Error('R48_R1_INVALID')}
 if(parsed?.version!=='IRAN_NEWS_DISPLAY_R1')throw Error('R48_R1_VERSION_UNEXPECTED');
 const grouped=await remote.query(db,COUNTS_SQL);
 if(!Array.isArray(grouped?.results))throw Error('R48_COUNTS_UNAVAILABLE');
 const counts=[];const sourceIds=new Set();
 for(const row of grouped.results){
  const n=Number(row.n);
  if(typeof row.source_id!=='string'||sourceIds.has(row.source_id)||
   !Number.isSafeInteger(n)||n<0)throw Error('R48_COUNTS_INVALID');
  sourceIds.add(row.source_id);counts.push({sourceId:row.source_id,count:n});
 }
 const result=await remote.query(db,ARCHIVE_SQL,archiveRows.map(x=>x.articleId));
 if(!Array.isArray(result?.results))throw Error('R48_ARCHIVE_READBACK_UNAVAILABLE');
 const map=new Map();
 for(const item of result.results){
  if(typeof item.article_id!=='string'||map.has(item.article_id))
   throw Error('R48_ARCHIVE_READBACK_INVALID');
  map.set(item.article_id,item);
 }
 const missing=archiveRows.filter(row=>!map.has(row.articleId));
 const identityDrift=archiveRows.filter(row=>{
  const existing=map.get(row.articleId);
  return existing&&(existing.source_id!==row.sourceId||existing.source_url!==row.sourceUrl);
 });
 const titleOrDateChanged=archiveRows.filter(row=>{
  const existing=map.get(row.articleId);
  return existing&&(existing.title!==row.title||existing.published_at!==row.publishedAt);
 });
 const sum=predicate=>counts.filter(x=>predicate(x.sourceId)).reduce((a,x)=>a+x.count,0);
 const oldTotal=sum(x=>OLD.has(x));
 const newTotal=sum(x=>NEW.has(x));
 const unknownTotal=sum(x=>!OLD.has(x)&&!NEW.has(x));
 const total=counts.reduce((a,x)=>a+x.count,0);
 const found=archiveRows.length-missing.length;
 const state=missing.length?'ARCHIVE_39_MISSING_ROWS':identityDrift.length?'ARCHIVE_IDENTITY_CHANGED':
  oldTotal>39||newTotal>0||unknownTotal>0?'ARCHIVE_39_PRESERVED_WITH_ADDITIONS':
  titleOrDateChanged.length?'ARCHIVE_39_PRESERVED_METADATA_UPDATED':'ARCHIVE_39_PRESERVED_EXACT_COUNT';
 return {version:'IRAN_NEWS_R48_D1_READONLY',status:state,
  totalD1Rows:total,oldSourceRows:oldTotal,newSourceRows:newTotal,unrecognizedSourceRows:unknownTotal,
  original39Present:found,original39Missing:missing.length,original39IdentityChanged:identityDrift.length,
  original39TitleOrDateChanged:titleOrDateChanged.length,
  extraOldSourceRows:Math.max(0,oldTotal-found),
  sources:counts,r1Version:parsed.version,r1StoredAt:Number(r1.results[0].stored_at),
  r1BodySha256:digest(r1.results[0].body),
  d1Written:false,r1Modified:false,schedulerModified:false,scoreLedgerModified:false,
  nextAction:missing.length||identityDrift.length?'INVESTIGATE_BASELINE_DO_NOT_PUBLISH':'RECONCILE_R47_GATE_NO_WRITE'};
}
async function main(){
 if(process.argv.length!==3||process.argv[2]!=='--diagnose')throw Error('R48_EXPLICIT_READONLY_MODE_REQUIRED');
 const manifestPath=path.join(BASE,'docs','IRAN_NEWS_R41_STAGING_ROWS_20261029.json');
 const info=fs.lstatSync(manifestPath);
 if(!info.isFile()||info.isSymbolicLink()||info.size>100000)
  throw Error('R48_ARCHIVE_FILE_UNSAFE');
 const archiveRows=validateArchiveR48(fs.readFileSync(manifestPath,'utf8'));
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 const diagnostic=await diagnoseIranNewsD1R48({remote:client(config,credential(BASE)),db:config.core,archiveRows});
 console.log(JSON.stringify(diagnostic));
 if(diagnostic.original39Missing||diagnostic.original39IdentityChanged)process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{const reason=/^R48_[A-Z0-9_]+$/.test(err?.message??'')?err.message:'R48_REMOTE_DIAGNOSTIC_UNAVAILABLE';
  console.error(JSON.stringify({status:'R48_READONLY_STOP',reason,d1Written:false}));process.exitCode=1;});
