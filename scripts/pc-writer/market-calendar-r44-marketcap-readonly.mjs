// R44 PC SQLite READ-ONLY audit; never contact providers or expose secret values.
import fs from 'node:fs';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';import {fileURLToPath} from 'node:url';
export const DISPLAY_KEY='market-calendar:earnings-display-html';
const pattern=/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">/;
const fail=status=>({status,readOnly:true,providerRequests:0,dbWrites:0,d1Writes:0});
export function analyzeEarningsStorageBody(body){
 let saved;try{saved=JSON.parse(body);}catch{return fail('R44_DISPLAY_JSON_INVALID');}
 if(saved?.status!=='READY_DISPLAY'||saved.mode!=='OWN_SITE_HTML_ONLY'||
  saved.rawVendorJsonExposed!==false||saved.publicJsonFeed!==false||saved.redistribution!==false||
  !Array.isArray(saved.coveredDays)||saved.coveredDays.length!==14||!saved.byDay||
  typeof saved.byDay!=='object')return fail('R44_DISPLAY_CONTRACT_INVALID');
 let count=0;const unique=new Set(),dayCounts={};
 for(const day of saved.coveredDays){
  if(!Array.isArray(saved.byDay[day]))return fail('R44_DISPLAY_DAY_INVALID');
  dayCounts[day]=saved.byDay[day].length;
  for(const html of saved.byDay[day]){
   const m=typeof html==='string'&&html.length<=1600?pattern.exec(html):null;
   if(!m||!html.endsWith('</article>'))return fail('R44_DISPLAY_ROW_INVALID');
   unique.add(m[1].toUpperCase());count++;
  }
 }
 if(count!==saved.recordCount||count>5000)return fail('R44_DISPLAY_COUNT_MISMATCH');
 return {status:'R44_READONLY_RETRIEVED',readOnly:true,providerRequests:0,dbWrites:0,d1Writes:0,
  checkedAt:saved.checkedAt,calendarDays:saved.coveredDays.length,eventCount:count,uniqueTickers:unique.size,
  dayCounts,marketCapCoverage:null,capSourcePermission:'UNVERIFIED',missingMarketCapTickers:null,
  reason:'STORED_DISPLAY_HAS_NO_MARKET_CAP_VALUES'};
}
export function auditPc({pcHome='E:\\ZGmini\\data\\pc-writer'}={}){
 const dbFile=path.join(pcHome,'storage','core.sqlite');
 if(!fs.existsSync(dbFile))return {...fail('R44_PC_DB_NOT_FOUND'),dbPathExpected:dbFile};
 const db=new DatabaseSync(dbFile,{readOnly:true});
 try{
  const exists=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='public_feed_snapshots_v1'").get();
  if(!exists)return fail('R44_PUBLIC_FEED_TABLE_NOT_FOUND');
  const row=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(DISPLAY_KEY);
  if(!row)return fail('R44_LOCAL_DISPLAY_NOT_FOUND');
  const report=analyzeEarningsStorageBody(row.body);
  const providerFile=path.join(pcHome,'providers.env');
  if(fs.existsSync(providerFile)){
   const content=fs.readFileSync(providerFile,'utf8');
   report.configuredProviderKeyNames=['FMP_API_KEY','EARNINGS_API_KEY','EARNINGSAPI_API_KEY'].filter(k=>new RegExp('^'+k+'=', 'm').test(content));
  }else report.configuredProviderKeyNames=[];
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (lower(name) LIKE '%cap%' OR lower(name) LIKE '%profile%' OR lower(name) LIKE '%screener%') LIMIT 40").all();
  report.marketCapCandidateTables=tables.map(x=>x.name);
  report.marketCapStorageAvailability=tables.length?'CANDIDATE_TABLES_UNVERIFIED':'NO_NAMED_CANDIDATE';
  report.sourceStoredAt=row.stored_at;
  report.pcSourceShaVerified=false;report.runtimeEntitlementVerified=false;
  return report;
 }finally{db.close();}
}
const entry=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===entry){
 const pcHome=process.argv[2]||'E:\\ZGmini\\data\\pc-writer';
 let report;try{report=auditPc({pcHome});}catch(e){report={...fail('R44_READONLY_RUNTIME_ERROR'),code:e.code??'UNKNOWN'};}
 const target=path.join(path.dirname(entry),'MARKET_CALENDAR_R44_MARKETCAP_READONLY_RESULT.txt');
 fs.writeFileSync(target,'AUDIT=MARKET_CALENDAR_R44_MARKETCAP_READONLY\n'+
  Object.entries(report).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n','utf8');
 process.stdout.write('RESULT_FILE='+target+'\nSTATUS='+report.status+'\n');
 if(report.status!=='R44_READONLY_RETRIEVED')process.exitCode=1;
}
