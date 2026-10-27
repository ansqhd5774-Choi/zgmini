// R13: no-write gate for adding newly rights-checked GOV.UK news to the
// existing PC display cache and isolated D1 public-news snapshot.
// The old, manually reviewed version of any duplicate URL takes precedence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewSafeIranNewsR12} from './news-display-safe-preview-r12.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {previewIranNewsRetention,previewIranNewsPublic,toDisplayNewsItem,
 RIGHTS_SOURCE,RIGHTS_POLICY_URL} from './news-display-r1.mjs';
import {IRAN_NEWS_DISPLAY_KEY,validIranNewsSnapshot,visibleIranNewsItems,
 validNewsDisplayItem} from '../../lib/iran-progress/news-display-r1.mjs';

function requireOperationalCache(dataDirectory,now){
 const ledger=path.join(dataDirectory,'iran.sqlite');
 if(!fs.existsSync(ledger)||!fs.lstatSync(ledger).isFile())
  throw Error('R13_OPERATIONAL_LEDGER_IDENTITY_MISSING');
 const cache=readNewsDisplayCache(dataDirectory);
 if(!cache.items.every(item=>validNewsDisplayItem(item,now)))
  throw Error('R13_EXISTING_CACHE_ITEM_INVALID');
 return cache;
}

async function inspectRemoteNews(remote,db,now){
 if(!remote||typeof remote.query!=='function'||!db)throw Error('R13_REMOTE_READ_CONFIG_MISSING');
 const response=await remote.query(db,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
  [IRAN_NEWS_DISPLAY_KEY]);
 if(!Array.isArray(response?.results)||response.results.length!==1)
  throw Error('R13_EXISTING_D1_NEWS_KEY_UNVERIFIED');
 const row=response.results[0];
 let snapshot;
 try{snapshot=JSON.parse(row.body);}catch{throw Error('R13_REMOTE_NEWS_JSON_INVALID');}
 if(!validIranNewsSnapshot(snapshot,{now})||Number(row.stored_at)!==snapshot.publishedAt)
  throw Error('R13_REMOTE_NEWS_CONTRACT_INVALID');
 return snapshot;
}

export function buildIncrementalIranNewsPlan({cache,remoteSnapshot,preview,now=Date.now()}={}){
 if(preview?.status!=='R12_DISPLAY_PREVIEW_ONLY_NO_WRITES'
  ||preview.uninspected!==0||preview.inspected!==preview.discovered14d
  ||preview.discoveryCounts?.feedSucceeded!==4
  ||preview.discoveryCounts?.feedFailed!==0
  ||preview.discoveryCounts?.apiFailed!==0)
  throw Error('R13_DISCOVERY_INCOMPLETE_PRESERVE_EXISTING_NEWS');
 if(!Array.isArray(cache?.items)||!Array.isArray(preview.results))
  throw Error('R13_INPUT_CONTRACT_INVALID');
 const visibleCache=previewIranNewsPublic(cache,{now}).items;
 const visibleRemote=visibleIranNewsItems(remoteSnapshot.items,{now});
 if(JSON.stringify(visibleCache)!==JSON.stringify(visibleRemote))
  throw Error('R13_CACHE_AND_REMOTE_NEWS_DIVERGED');
 const originalIds=new Set(cache.items.map(item=>item.id));
 const incoming=[];
 const held=[];
 for(const candidate of preview.results){
  if(candidate.status!=='ELIGIBLE_SAFE_TEXT_ONLY'){
   held.push({sourceUrl:candidate.sourceUrl,reason:candidate.status});continue;
  }
  const item=toDisplayNewsItem({source:'GOV.UK',sourceUrl:candidate.sourceUrl,
   publishedAt:candidate.publishedAt,title:candidate.title,
   summary:candidate.summary,impact:'neutral',
   ...(candidate.titleEn&&candidate.summaryEn?{titleEn:candidate.titleEn,summaryEn:candidate.summaryEn}:{}),
   rightsVerified:true,
   rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL},{now});
  if(!item||item.id!==candidate.displayId)
   throw Error('R13_RIGHTS_APPROVAL_CONTRACT_MISMATCH');
  // Prevent a generic automated line replacing a previously reviewed article.
  if(!originalIds.has(item.id))incoming.push({source:'GOV.UK',sourceUrl:item.sourceUrl,
   publishedAt:item.publishedAt,title:item.title,summary:item.summary,
   ...(item.titleEn&&item.summaryEn?{titleEn:item.titleEn,summaryEn:item.summaryEn}:{}),
   impact:item.impact,rightsVerified:true,rightsSource:RIGHTS_SOURCE,
   rightsPolicyUrl:RIGHTS_POLICY_URL});
 }
 const next=previewIranNewsRetention(cache,incoming,{now});
 if(next.report.rejected!==0)throw Error('R13_VALIDATED_CANDIDATE_REJECTED');
 const publicNext=previewIranNewsPublic(next.cache,{now});
 for(const item of cache.items){
  const preserved=next.cache.items.find(existing=>existing.id===item.id);
  if(preserved&&JSON.stringify(item)!==JSON.stringify(preserved))
   throw Error('R13_EXISTING_REVIEWED_ARTICLE_MODIFIED');
 }
 return {report:{status:'PASS_R13_INCREMENTAL_NEWS_PREFLIGHT_READ_ONLY',
   checkedAtKst:new Date(now+9*3600000).toISOString().slice(0,19).replace('T',' '),
   source:'GOV.UK',keywordPolicy:'IRAN_OR_SAUDI_OR_YEMEN_OR_HOUTHI',
   discovery:preview.discoveryCounts,discovered30d:preview.discovered30d,
   discovered14d:preview.discovered14d,rightsEligible:preview.eligible,
   rightsHeld:preview.held,rightsHoldReasons:held,
   existingLocalCount:cache.items.length,existingRemoteCount:remoteSnapshot.itemCount,
   newArticles:incoming.length,duplicatesPreserved:preview.eligible-incoming.length,
   nextLocalCount:next.cache.items.length,nextPublicCount:publicNext.itemCount,
   pendingNewUrls:incoming.map(item=>item.sourceUrl),
   pcCacheWritten:false,d1Written:false,schedulerModified:false,
   scoreLedgerModified:false,publication:'NOT_STARTED'},
  cache:next.cache,publicSnapshot:publicNext,incoming};
}

export async function preflightIncrementalIranNewsR13({dataDirectory,remote,db,
 now=Date.now(),fetcher=fetch}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory))
  throw Error('R13_DATA_DIRECTORY_INVALID');
 // Read existing state BEFORE live discovery. Nothing here mutates the cache.
 const cache=requireOperationalCache(dataDirectory,now);
 const remoteSnapshot=await inspectRemoteNews(remote,db,now);
 const preview=await previewSafeIranNewsR12({now,fetcher});
 return buildIncrementalIranNewsPlan({cache,remoteSnapshot,preview,now});
}

async function commandLine(){
 if(process.argv.length!==3||process.argv[2]!=='--preflight')
  throw Error('R13_READ_ONLY_PREFLIGHT_MODE_REQUIRED');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 let refreshWasRequested=false;
 const token=credential(root,{refresh:()=>{refreshWasRequested=true;return {status:1};}});
 if(refreshWasRequested)throw Error('R13_EXISTING_D1_CREDENTIAL_REFRESH_REQUIRED');
 const result=await preflightIncrementalIranNewsR13({dataDirectory,
  remote:client(config,token),db:config.core});
 console.log(JSON.stringify(result.report));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await commandLine();}
 catch(error){console.error(JSON.stringify({status:'STOP_R13_NEWS_PREFLIGHT',
  reason:error.message,pcCacheWritten:false,d1Written:false}));process.exitCode=1;}
}
