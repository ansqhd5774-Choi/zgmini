// First-run, one-article D1 news-only publication. Not a recurring writer.
// Does not modify the PC cache, the Iran R3/R5 score ledger, or scheduled tasks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {previewIranNewsPublic} from './news-display-r1.mjs';
import {publishIranNewsDisplay} from './news-display-publication-r1.mjs';
import {IRAN_NEWS_DISPLAY_KEY} from '../../lib/iran-progress/news-display-r1.mjs';

export const FIRST_NEWS_URL='https://www.gov.uk/government/news/chief-of-defence-hosts-tenth-dragon-group-meeting-in-london';
const FIRST_PUBLISHED_AT='2026-10-23T13:30:50.000Z';
const FIRST_TITLE='영국 주재 중동 국방 수뇌부 회의에서 미·이란 분쟁 논의';
const FIRST_SUMMARY='영국 국방참모총장이 런던에서 걸프·중동 지역 국방 수뇌부 회의를 주재했다. 영국 국방부 발표에 따르면 참석자들은 미·이란 분쟁과 사우디아라비아를 향한 후티 공격 확대 등 지역 안보 현안을 논의했다.';

export function firstIranNewsSnapshot(dataDirectory,{now=Date.now()}={}){
 const cache=readNewsDisplayCache(dataDirectory);
 if(cache.items.length!==1)throw Error('NEWS_R4_CACHE_ITEM_COUNT_UNEXPECTED');
 const first=cache.items[0];
 if(first.source!=='GOV.UK'||first.sourceUrl!==FIRST_NEWS_URL||
    first.publishedAt!==FIRST_PUBLISHED_AT||first.title!==FIRST_TITLE||
    first.summary!==FIRST_SUMMARY||first.impact!=='neutral')
  throw Error('NEWS_R4_REVIEWED_ARTICLE_MISMATCH');
 const snapshot=previewIranNewsPublic(cache,{now});
 if(snapshot.itemCount!==1||snapshot.items[0].sourceUrl!==FIRST_NEWS_URL)
  throw Error('NEWS_R4_ARTICLE_OUTSIDE_DISPLAY_WINDOW');
 return snapshot;
}

export async function inspectNewsD1FirstPublish(remote,db,dataDirectory,{now=Date.now()}={}){
 const snapshot=firstIranNewsSnapshot(dataDirectory,{now});
 const response=await remote.query(db,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[IRAN_NEWS_DISPLAY_KEY]);
 if(!Array.isArray(response?.results))throw Error('NEWS_R4_D1_READBACK_UNAVAILABLE');
 if(response.results.length!==0)throw Error('NEWS_R4_TARGET_KEY_ALREADY_EXISTS');
 return snapshot;
}

export async function publishNewsD1FirstOnly(remote,db,dataDirectory,{now=Date.now()}={}){
 const snapshot=await inspectNewsD1FirstPublish(remote,db,dataDirectory,{now});
 // This is the only D1 mutation. The publication module reads back the exact
 // row after a possible transport failure; it never blindly retries a write.
 const result=await publishIranNewsDisplay(remote,db,snapshot,{now});
 if(result.status!=='VERIFIED'||result.itemCount!==1)
  throw Error('NEWS_R4_PUBLICATION_NOT_VERIFIED');
 return {status:'PASS_D1_NEWS_ONLY_PUBLISHED',itemCount:1,publication:result.status,
  publishedAt:result.publishedAt,source:'GOV.UK',scoreLedgerChanged:false};
}

async function commandLine(){
 const flag=process.argv[2];
 if(process.argv.length!==3||!['--preflight','--publish'].includes(flag))
  throw Error('NEWS_R4_EXPLICIT_MODE_REQUIRED');
 if(flag==='--publish'&&process.env.ZG_IRAN_NEWS_R4_APPROVED!=='YES')
  throw Error('NEWS_R4_CMD_APPROVAL_GATE_MISSING');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(dataDirectory,'iran.sqlite')))
  throw Error('NEWS_R4_PC_OPERATIONAL_DIRECTORY_UNVERIFIED');
 const configPath=path.join(os.homedir(),'.zgmini','pc-writer','config.json');
 const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 // Do not attempt an OAuth renewal from the downloaded temporary runtime;
 // a renewal requires the user's already configured Wrangler installation.
 let refreshWasRequested=false;
 const token=credential(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),{
  refresh:()=>{refreshWasRequested=true;return {status:1};}
 });
 if(refreshWasRequested)throw Error('NEWS_R4_WRANGLER_LOGIN_REFRESH_REQUIRED');
 const remote=client(config,token),now=Date.now();
 if(flag==='--preflight'){
  const snapshot=await inspectNewsD1FirstPublish(remote,config.core,dataDirectory,{now});
  console.log(JSON.stringify({status:'PASS_NEWS_R4_D1_READ_ONLY_GATE',key:IRAN_NEWS_DISPLAY_KEY,
   remoteKey:'ABSENT',itemCount:snapshot.itemCount,source:'GOV.UK',publishedAt:snapshot.items[0].publishedAt}));
  return;
 }
 console.log(JSON.stringify(await publishNewsD1FirstOnly(remote,config.core,dataDirectory,{now})));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await commandLine();}
 catch(error){console.error(JSON.stringify({status:'STOP_NEWS_R4_REVIEW_REQUIRED',reason:error.message}));process.exitCode=1;}
}
