// R43 annual SEC issuer CANDIDATE draft. PC-private, offline and review-only.
// This file never creates the approved R57 issuer roster or marks eligibility.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const SOURCE='local-sec-company-tickers-exchange.json';
const OUTPUT='local-market-calendar-r43-sec-review-draft.json';
const METHOD='R43_SEC_EDGAR_ISSUER_CANDIDATE_DRAFT_R1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const stop=code=>{throw Error(code)};
const printable=text=>typeof text==='string'&&text.length>0&&text.length<=240&&
  !/[\u0000-\u001f\u007f]/.test(text);

export function parseR43SecDraftArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 let mode='preflight',modeSeen=false,confirmed=false,pcHome=null;
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--preflight'||arg==='--write-review-draft'){
   if(modeSeen)stop('R43_SEC_DRAFT_MODE_CONFLICT_STOP');
   mode=arg.slice(2);modeSeen=true;
  }else if(arg==='--confirm-r43-sec-draft'){
   if(confirmed)stop('R43_SEC_DRAFT_CONFIRM_DUPLICATE_STOP');
   confirmed=true;
  }else if(arg==='--pc-home'){
   if(pcHome!==null||!args[i+1]||args[i+1].startsWith('--'))
    stop('R43_SEC_DRAFT_ARGS_STOP');
   pcHome=args[++i];
  }else stop('R43_SEC_DRAFT_ARGS_STOP');
 }
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome))
  stop('R43_SEC_DRAFT_ABSOLUTE_PC_HOME_REQUIRED_STOP');
 if((mode==='write-review-draft')!==confirmed)
  stop('R43_SEC_DRAFT_EXPLICIT_CONFIRMATION_REQUIRED_STOP');
 const resolved=path.resolve(pcHome);
 if(resolved===path.parse(resolved).root)
  stop('R43_SEC_DRAFT_PC_HOME_TOO_BROAD_STOP');
 return {pcHome:resolved,write:mode==='write-review-draft'};
}

export function buildR43SecReviewDraft(sec,{sourceSha256,now=Date.now()}={}){
 if(!Number.isFinite(now)||now<=0||!/^[a-f0-9]{64}$/.test(sourceSha256??'')||
  !sec||!Array.isArray(sec.fields)||
  JSON.stringify(sec.fields)!==JSON.stringify(['cik','name','ticker','exchange'])||
  !Array.isArray(sec.data)||sec.data.length<2000||sec.data.length>50000)
  stop('R43_SEC_DRAFT_OFFICIAL_SCHEMA_OR_SCOPE_STOP');
 const issuers=new Map(),tickerIssuers=new Map(),observations=new Set();
 let duplicatedSourceRows=0;
 for(const row of sec.data){
  if(!Array.isArray(row)||row.length!==4||
   !Number.isSafeInteger(row[0])||row[0]<=0||row[0]>9999999999||
   !printable(row[1])||!printable(row[2])||!printable(row[3]))
   stop('R43_SEC_DRAFT_SOURCE_ROW_INVALID_STOP');
  const [cik,name,ticker,exchange]=row;
  if(ticker!==ticker.trim()||exchange!==exchange.trim()||
   name!==name.trim()||ticker.length>32)
   stop('R43_SEC_DRAFT_SOURCE_ROW_INVALID_STOP');
  const identity=String(cik).padStart(10,'0');
  const fingerprint=JSON.stringify([identity,name,ticker,exchange]);
  if(observations.has(fingerprint)){duplicatedSourceRows++;continue}
  observations.add(fingerprint);
  if(!issuers.has(identity))issuers.set(identity,{
   cik:identity,issuerIdCandidate:'SEC_CIK_'+identity,
   observedNames:[],securities:[],
   reviewStatus:'PENDING',eligible:null,headquartersCountry:null,
   exclusionReason:null,approvedIssuerId:null,
  });
  const draft=issuers.get(identity);
  if(!draft.observedNames.includes(name))draft.observedNames.push(name);
  draft.securities.push({ticker,exchange,eligible:null,reviewStatus:'PENDING',
   tickerFormatSupported:/^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(ticker),
   exchangeReviewRequired:!['NYSE','Nasdaq'].includes(exchange)});
  if(!tickerIssuers.has(ticker))tickerIssuers.set(ticker,new Set());
  tickerIssuers.get(ticker).add(identity);
 }
 if(issuers.size<1500)stop('R43_SEC_DRAFT_ISSUER_CANDIDATES_INSUFFICIENT_STOP');
 const rows=[...issuers.values()].sort((a,b)=>a.cik.localeCompare(b.cik));
 for(const row of rows){
  row.observedNames.sort();
  row.securities.sort((a,b)=>a.ticker.localeCompare(b.ticker)||a.exchange.localeCompare(b.exchange));
 }
 const collisions=[...tickerIssuers.values()].filter(group=>group.size>1).length;
 const tickers=[...tickerIssuers.keys()].length;
 return {version:1,method:METHOD,scope:'PC_PRIVATE_ONLY',
  approvedForR43:false,universeReviewed:false,allEligibilityPending:true,
  source:'SEC_COMPANY_TICKERS_EXCHANGE_MANUALLY_SAVED',
  sourceSha256,generatedAt:new Date(now).toISOString(),
  observedSourceRows:sec.data.length,duplicatedSourceRows,
  candidateIssuerCount:rows.length,observedTickerCount:tickers,
  tickerIssuerCollisionCount:collisions,
  reviewRequirements:[
   'CONFIRM_CURRENT_NYSE_NASDAQ_LISTING_AND_OTC_EXCLUSIONS',
   'VERIFY_HEADQUARTERS_COUNTRY_AND_CHINA_EXCLUSIONS',
   'VERIFY_ISSUER_ID_AND_MULTIPLE_SHARE_CLASSES',
   'VERIFY_SOURCE_RIGHTS_AND_REVIEWED_TRADING_SESSIONS',
  ],candidates:rows};
}

function writeOnce(target,body){
 const tmp=path.join(path.dirname(target),'.r43-sec-draft-'+randomUUID()+'.tmp');
 let fd=null,created=false,verified=false;
 try{
  fd=fs.openSync(tmp,'wx',0o600);
  fs.writeFileSync(fd,body,{encoding:'utf8'});
  fs.fsyncSync(fd);fs.closeSync(fd);fd=null;
  fs.linkSync(tmp,target);created=true;
  if(sha(fs.readFileSync(target))!==sha(Buffer.from(body)))
   stop('R43_SEC_DRAFT_READBACK_FAILED_STOP');
  verified=true;
 }finally{
  if(fd!==null)fs.closeSync(fd);
  if(created&&!verified){try{fs.unlinkSync(target)}catch{}}
  try{fs.unlinkSync(tmp)}catch{}
 }
}

export function runR43SecDraftCommand(args,{now=Date.now()}={}){
 const options=parseR43SecDraftArgs(args);
 if(options.help)return {usage:'node R43_SEC_ROSTER_CANDIDATES.mjs --preflight|--write-review-draft --confirm-r43-sec-draft --pc-home <absolute-PC-home>',
  sourceName:SOURCE,outputName:OUTPUT,providerCalls:0,
  note:'SEC file must already have been saved manually. This creates a PENDING candidate draft, never an approved R43 issuer roster.'};
 let pcStat;
 try{pcStat=fs.statSync(options.pcHome)}catch{stop('R43_SEC_DRAFT_PC_HOME_MISSING_STOP')}
 if(!pcStat.isDirectory())
  stop('R43_SEC_DRAFT_PC_HOME_INVALID_STOP');
 const target=path.join(options.pcHome,OUTPUT);
 if(options.write&&fs.existsSync(target))
  stop('R43_SEC_DRAFT_EXISTING_REVIEW_PRESERVED_STOP');
 const sourcePath=path.join(options.pcHome,SOURCE);
 let source;
 try{
  const stat=fs.lstatSync(sourcePath);
  if(!stat.isFile()||stat.size<1000||stat.size>10_000_000)
   stop('R43_SEC_DRAFT_OFFICIAL_SOURCE_FILE_INVALID_STOP');
  source=fs.readFileSync(sourcePath);
 }catch(error){
  if(String(error?.message).startsWith('R43_'))throw error;
  stop('R43_SEC_DRAFT_OFFICIAL_SOURCE_MISSING_STOP');
 }
 let parsed;
 try{parsed=JSON.parse(source.toString('utf8'))}
 catch{stop('R43_SEC_DRAFT_OFFICIAL_SOURCE_JSON_INVALID_STOP')}
 const draft=buildR43SecReviewDraft(parsed,{sourceSha256:sha(source),now});
 const body=JSON.stringify(draft);
 if(Buffer.byteLength(body)>8_000_000)stop('R43_SEC_DRAFT_OUTPUT_SIZE_STOP');
 if(options.write)writeOnce(target,body);
 return {status:options.write?'R43_SEC_REVIEW_DRAFT_WRITTEN_AND_READBACK':
  'R43_SEC_REVIEW_DRAFT_PREFLIGHT_READY_NOT_WRITTEN',
  candidateIssuers:draft.candidateIssuerCount,
  observedTickers:draft.observedTickerCount,
  tickerIssuerCollisions:draft.tickerIssuerCollisionCount,
  eligibilityApproved:0,outputName:OUTPUT,outputWritten:options.write,
  providerCalls:0,d1Writes:0,coreChanges:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(runR43SecDraftCommand(process.argv.slice(2))))}
 catch(error){
  const code=String(error?.message??'UNKNOWN');
  console.error('R43_SEC_DRAFT_STOP:',/^R43_/.test(code)?code:'R43_SEC_DRAFT_LOCAL_INPUT_FAILED_STOP');
  process.exitCode=1;
 }
}
