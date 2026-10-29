// R48: existing local evidence only. Never computes publishable market caps.
// Only aggregate diagnostics are written; no provider calls, raw rows or identifiers leave the PC.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const FEED_KEY='market-calendar:earnings-display-html';
const RESULT='MARKET_CALENDAR_R48_OFFLINE_QUALITY_RESULT.txt';
const TICKER=/^[A-Z0-9.-]{1,12}$/;
const CIK_FILE=/^CIK(\d{10})\.json$/i;
const PRICE_FILE=/^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-group-\d+\.json$/;
const MAX_SEC_BYTES=32*1024*1024;
const MAX_PRICE_BYTES=32*1024*1024;
const MAX_PRICE_FILES=1200;
const MAX_TOTAL_PRICE_BYTES=512*1024*1024;

const cleanTicker=s=>typeof s==='string'&&TICKER.test(s.toUpperCase())?s.toUpperCase():null;
const cleanCik=s=>{const v=String(s??'').replace(/\D/g,'');return v.length>0&&v.length<=10?v.padStart(10,'0'):null;};
const day=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`))&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;
const dayAge=(now,then)=>Math.floor((Date.parse(`${now}T00:00:00Z`)-Date.parse(`${then}T00:00:00Z`))/86400000);
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const isFile=f=>{try{return fs.statSync(f).isFile();}catch{return false;}};
const existsTable=(db,name)=>Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name));
const safeError=error=>/^[A-Z0-9_]+$/.test(String(error?.message??''))?error.message:'R48_READONLY_AUDIT_FAILED';

export function parseCalendar(body){
 const data=typeof body==='string'?JSON.parse(body):body;
 if(data?.status!=='READY_DISPLAY'||data.mode!=='OWN_SITE_HTML_ONLY'||data.rawVendorJsonExposed!==false||data.publicJsonFeed!==false||data.redistribution!==false||!Array.isArray(data.coveredDays)||data.coveredDays.length!==14||!data.byDay||typeof data.byDay!=='object')throw Error('R48_DISPLAY_CONTRACT_INVALID');
 const seen=new Set();let events=0,previous='';
 for(const d of data.coveredDays){
  if(!day(d)||d<=previous||!Array.isArray(data.byDay[d]))throw Error('R48_DISPLAY_DATES_INVALID');
  previous=d;
  for(const html of data.byDay[d]){
   const m=typeof html==='string'&&html.length<=1600&&html.endsWith('</article>')?/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.-]{1,12}) [^"]*">/.exec(html):null;
   if(!m)throw Error('R48_DISPLAY_ROW_INVALID');
   seen.add(m[1].toUpperCase());events++;
  }
 }
 if(events!==data.recordCount||events>5000)throw Error('R48_DISPLAY_COUNT_INVALID');
 return {events,tickers:seen,checkedAt:data.checkedAt??null};
}

export function mapIssuerCandidates(members,calendarTickers){
 const mapping=new Map(),conflicts=new Set();
 for(const row of members){
  const ticker=cleanTicker(row?.ticker),cik=cleanCik(row?.cik);
  if(!ticker||!cik||!calendarTickers.has(ticker)||conflicts.has(ticker))continue;
  if(mapping.has(ticker)&&mapping.get(ticker)!==cik){mapping.delete(ticker);conflicts.add(ticker);continue;}
  mapping.set(ticker,cik);
 }
 const byCik=new Map();
 for(const [ticker,cik] of mapping){byCik.set(cik,(byCik.get(cik)??0)+1);}
 return {mapping,conflictTickers:conflicts.size,multiTickerIssuerCount:[...byCik.values()].filter(n=>n>1).length};
}

// Both DEI and US-GAAP facts are candidates; XBRL CompanyFacts strips dimensional
// contexts, so neither tag alone proves a single class or issuer-wide float.
export function inspectSecShares(document,expectedCik,asOf){
 if(cleanCik(document?.cik)!==expectedCik)return {status:'CIK_MISMATCH'};
 const tags=[document?.facts?.dei?.EntityCommonStockSharesOutstanding,document?.facts?.['us-gaap']?.CommonStockSharesOutstanding];
 const rows=[];let rawFacts=0;
 for(let i=0;i<tags.length;i++){
  const facts=tags[i]?.units?.shares;
  if(!Array.isArray(facts))continue;
  for(const row of facts){
   rawFacts++;
   if(!Number.isSafeInteger(row?.val)||row.val<=0||!day(row?.end)||!day(row?.filed)||row.end>asOf||row.filed>asOf)continue;
   rows.push({val:row.val,end:row.end,filed:row.filed,tag:i});
  }
 }
 if(!rows.length)return {status:'NO_USABLE_SHARE_FACTS',rawFacts};
 rows.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed)||a.tag-b.tag);
 const latest=rows[0],sameDate=rows.filter(r=>r.end===latest.end);
 const conflicting=sameDate.some(r=>r.val!==latest.val);
 return {status:conflicting?'SHARE_FACT_CONFLICT':'SHARE_FACT_CANDIDATE',rawFacts,
  end:latest.end,filed:latest.filed,tagKinds:new Set(rows.map(r=>r.tag)).size,
  multipleValues:sameDate.length>1,ageDays:dayAge(asOf,latest.end)};
}

export function latestPriceBars(rows,selectedTickers,asOf,prior=new Map(),conflicts=new Set()){
 let accepted=0,rejected=0;
 if(!Array.isArray(rows))throw Error('R48_PRICE_ARRAY_INVALID');
 for(const row of rows){
  const ticker=cleanTicker(row?.ticker);
  if(!ticker||!selectedTickers.has(ticker))continue;
  if(!day(row.tradeDate)||row.tradeDate>asOf||!positive(row.currentClose)||row.source!=='ALPACA'||row.feed!=='iex'||row.adjustmentStatus!=='split'){rejected++;continue;}
  accepted++;
  if(conflicts.has(ticker))continue;
  const old=prior.get(ticker);
  if(old?.date===row.tradeDate&&old.close!==row.currentClose){conflicts.add(ticker);prior.delete(ticker);continue;}
  if(!old||row.tradeDate>old.date)prior.set(ticker,{date:row.tradeDate,close:row.currentClose});
 }
 return {latest:prior,conflicts,accepted,rejected};
}

function readUniverse(db){
 if(!existsTable(db,'market_score_earnings_e1_r3_universe_v1'))return {status:'TABLE_MISSING',members:[]};
 const row=db.prepare('SELECT body_json,period_end FROM market_score_earnings_e1_r3_universe_v1 ORDER BY period_end DESC LIMIT 1').get();
 if(!row)return {status:'ROW_MISSING',members:[]};
 const body=JSON.parse(row.body_json);
 if(!Array.isArray(body?.members))return {status:'MEMBERS_INVALID',members:[]};
 return {status:'PRESENT',members:body.members,periodEnd:row.period_end};
}

function scanPrices(dir,tickers,asOf){
 if(!fs.existsSync(dir))return {status:'DIRECTORY_ABSENT',fileCount:0,readFiles:0,skipped:0,accepted:0,rejected:0,latest:new Map(),conflicts:new Set()};
 const names=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&PRICE_FILE.test(e.name)).map(e=>e.name).sort().reverse();
 const partial=names.length>MAX_PRICE_FILES,chosen=names.slice(0,MAX_PRICE_FILES);
 const latest=new Map(),conflicts=new Set();let readFiles=0,skipped=0,accepted=0,rejected=0,totalBytes=0;
 for(let i=0;i<chosen.length;i++){
  const name=chosen[i];
  const file=path.join(dir,name);
  try{
   const bytes=fs.statSync(file).size;
   if(bytes>MAX_PRICE_BYTES){skipped++;continue;}
   if(totalBytes+bytes>MAX_TOTAL_PRICE_BYTES){skipped+=chosen.length-i;break;}
   const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
   const summary=latestPriceBars(parsed,tickers,asOf,latest,conflicts);
   totalBytes+=bytes;
   accepted+=summary.accepted;rejected+=summary.rejected;readFiles++;
  }catch{skipped++;}
 }
 return {status:partial||skipped?'PARTIAL_SOURCE_FILES':names.length?'INCREMENTAL_PRICE_ROWS_ONLY':'NO_INCREMENTAL_PRICE_FILES',fileCount:names.length,readFiles,skipped:skipped+Math.max(0,names.length-chosen.length),accepted,rejected,latest,conflicts};
}

export function auditPc({pcHome=String.raw`E:\ZGmini\data\pc-writer`,asOf=new Date().toISOString().slice(0,10)}={}){
 const report={audit:'MARKET_CALENDAR_R48_OFFLINE_QUALITY',status:'R48_READONLY_AUDIT_FAILED',asOf,readOnly:true,providerRequests:0,dbWrites:0,d1Writes:0,scheduled:false,credentialsExposed:false,rawDataLogged:false,marketCapValuesComputed:0,issuerLevelMarketCapsVerified:0,gradeableTickerCount:0,publicDisplayRightsVerified:false};
 if(!day(asOf))return {...report,status:'R48_AUDIT_DATE_INVALID'};
 const dbFile=path.join(pcHome,'storage','core.sqlite');
 if(!isFile(dbFile))return {...report,status:'R48_PC_DB_MISSING'};
 let db;
 try{
  db=new DatabaseSync(dbFile,{readOnly:true});db.exec('PRAGMA query_only=ON');
  if(!existsTable(db,'public_feed_snapshots_v1'))return {...report,status:'R48_FEED_TABLE_MISSING'};
  const row=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(FEED_KEY);
  if(!row)return {...report,status:'R48_DISPLAY_MISSING'};
  const calendar=parseCalendar(row.body),universe=readUniverse(db);
  const {mapping,conflictTickers,multiTickerIssuerCount}=mapIssuerCandidates(universe.members,calendar.tickers);
  const secDir=path.join(pcHome,'manual-input','e1-r5','incoming','companyfacts');
  const knownFiles=fs.existsSync(secDir)?new Set(fs.readdirSync(secDir,{withFileTypes:true}).filter(e=>e.isFile()&&CIK_FILE.test(e.name)).map(e=>CIK_FILE.exec(e.name)[1])):new Set();
  const secs=new Map();let secReadable=0,secParseFailures=0,secCikMismatch=0,secShareCandidates=0,secShareConflicts=0,secNoShareFacts=0,secMultipleTagCount=0;
  let shareAge0to90=0,shareAge91to180=0,shareAgeOver180=0;
  for(const cik of new Set(mapping.values())){
   if(!knownFiles.has(cik))continue;
   try{
    const file=path.join(secDir,`CIK${cik}.json`);
    if(fs.statSync(file).size>MAX_SEC_BYTES)throw Error('SIZE_LIMIT');
    const inspected=inspectSecShares(JSON.parse(fs.readFileSync(file,'utf8')),cik,asOf);
    secs.set(cik,inspected);secReadable++;
    if(inspected.status==='CIK_MISMATCH')secCikMismatch++;
    else if(inspected.status==='NO_USABLE_SHARE_FACTS')secNoShareFacts++;
    else if(inspected.status==='SHARE_FACT_CONFLICT')secShareConflicts++;
    else {
     secShareCandidates++;if(inspected.tagKinds>1)secMultipleTagCount++;
     if(inspected.ageDays<=90)shareAge0to90++;else if(inspected.ageDays<=180)shareAge91to180++;else shareAgeOver180++;
    }
   }catch{secParseFailures++;}
  }
  const price=scanPrices(path.join(pcHome,'asset-r10-alpaca','incremental'),calendar.tickers,asOf);
  let mappingSecPriceCandidates=0,shareAndPriceCandidates=0,priceAge0to7=0,priceAge8to30=0,priceAgeOver30=0;
  for(const ticker of calendar.tickers){
   const bar=price.latest.get(ticker);
   if(bar){const age=dayAge(asOf,bar.date);if(age<=7)priceAge0to7++;else if(age<=30)priceAge8to30++;else priceAgeOver30++;}
   const cik=mapping.get(ticker);
   if(!cik||!bar)continue;
   if(secs.has(cik)&&secs.get(cik)?.status!=='CIK_MISMATCH')mappingSecPriceCandidates++;
   if(secs.get(cik)?.status==='SHARE_FACT_CANDIDATE')shareAndPriceCandidates++;
  }
  return {...report,status:'R48_READONLY_QUALITY_RETRIEVED',calendarEvents:calendar.events,calendarUniqueTickers:calendar.tickers.size,sourceCheckedAt:calendar.checkedAt,
   universeStatus:universe.status,universePeriodEnd:universe.periodEnd??null,issuerMappingCandidates:mapping.size,issuerMappingConflicts:conflictTickers,multiTickerIssuerCount,
   secDirectoryStatus:fs.existsSync(secDir)?'PRESENT':'ABSENT',secAvailableFileCount:knownFiles.size,secMappedReadableIssuers:secReadable,secParseFailures,secCikMismatch,
   secShareFactCandidates:secShareCandidates,secShareFactConflicts:secShareConflicts,secNoUsableShareFacts:secNoShareFacts,secMultipleShareTagIssuers:secMultipleTagCount,
   shareObservationAge0to90Days:shareAge0to90,shareObservationAge91to180Days:shareAge91to180,shareObservationAgeOver180Days:shareAgeOver180,
   priceSourceStatus:price.status,priceFileCount:price.fileCount,priceFilesRead:price.readFiles,priceFilesSkipped:price.skipped,
   acceptedStoredPriceRows:price.accepted,rejectedStoredPriceRows:price.rejected,storedPriceTickerCandidates:price.latest.size,priceTickerConflicts:price.conflicts.size,
   priceObservationAge0to7Days:priceAge0to7,priceObservationAge8to30Days:priceAge8to30,priceObservationAgeOver30Days:priceAgeOver30,
   mappedSecAndPriceCandidates:mappingSecPriceCandidates,shareFactAndPriceCandidates:shareAndPriceCandidates,
   caveat:'SEC_COMPANYFACTS_STRIPS_CLASS_CONTEXT; SPLIT_ADJUSTED_IEX_BARS_AND_ASOF_SHARES_REQUIRE_ISSUER_CLASS_CORPORATE_ACTION_AND_RIGHTS_REVIEW',
   next:'DATA_QUALITY_CANDIDATES_ONLY_NO_CAP_CALCULATION_OR_PUBLICATION'};
 }catch(error){return {...report,status:safeError(error)};}finally{try{db?.close();}catch{}}
}

export function runPc({pcHome=String.raw`E:\ZGmini\data\pc-writer`,outputDir=path.dirname(fileURLToPath(import.meta.url)),asOf=new Date().toISOString().slice(0,10)}={}){
 const file=path.join(outputDir,RESULT);
 if(fs.existsSync(file))return {status:'R48_RESULT_ALREADY_EXISTS_STOP',file:RESULT};
 const report=auditPc({pcHome,asOf});
 fs.writeFileSync(file,['AUDIT=MARKET_CALENDAR_R48_OFFLINE_QUALITY',...Object.entries(report).filter(([k])=>k!=='audit').map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});
 return {status:report.status,file:RESULT};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=runPc({pcHome:process.argv[2]||String.raw`E:\ZGmini\data\pc-writer`,outputDir:process.argv[3]?path.resolve(process.argv[3]):undefined});
 process.stdout.write(`STATUS=${r.status}\nRESULT=${r.file}\n`);
 if(r.status!=='R48_READONLY_QUALITY_RETRIEVED')process.exitCode=2;
}
