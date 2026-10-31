// SEC R57: READ-ONLY coverage audit for *proposed* R1 financial health score.
// No rating, ratios, data export, network, SQLite/D1 writes, scheduled tasks or publication.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const RESULT='MARKET_CALENDAR_R57_SEC_CREDIT_COVERAGE_RESULT.txt';
const SOURCE_KEY='market-calendar:earnings-display-html';
const INSTANTS={
 assets:[['us-gaap','Assets'],['ifrs-full','Assets']],
 currentAssets:[['us-gaap','AssetsCurrent'],['ifrs-full','CurrentAssets']],
 currentLiabilities:[['us-gaap','LiabilitiesCurrent'],['ifrs-full','CurrentLiabilities']],
 cash:[['us-gaap','CashAndCashEquivalentsAtCarryingValue'],['ifrs-full','CashAndCashEquivalents']],
 shortInvestments:[['us-gaap','ShortTermInvestments'],['us-gaap','MarketableSecuritiesCurrent'],['ifrs-full','ShorttermInvestments']],
 debtEvidence:[['us-gaap','LongTermDebtCurrent'],['us-gaap','LongTermDebtNoncurrent'],['us-gaap','ShortTermBorrowings'],['us-gaap','ShortTermBorrowingsAndCurrentPortionOfLongTermDebt'],['us-gaap','LongTermDebt'],['us-gaap','LongTermDebtAndCapitalLeaseObligations'],['us-gaap','LongTermDebtAndCapitalLeaseObligationsCurrent'],['ifrs-full','BorrowingsCurrent'],['ifrs-full','BorrowingsNoncurrent']],
};
const FLOWS={
 operatingProfitProxy:[['us-gaap','OperatingIncomeLoss'],['ifrs-full','ProfitLossFromOperatingActivities']],
 interest:[['us-gaap','InterestExpense'],['us-gaap','InterestAndDebtExpense'],['ifrs-full','FinanceCosts']],
 operatingCashFlow:[['us-gaap','NetCashProvidedByUsedInOperatingActivities'],['ifrs-full','CashFlowsFromUsedInOperatingActivities']],
 capex:[['us-gaap','PaymentsToAcquirePropertyPlantAndEquipment'],['ifrs-full','PurchaseOfPropertyPlantAndEquipment']],
};
const ALL={...INSTANTS,...FLOWS};
const SCORE_PARTS=['currentRatio','cashRatioLowerBound','debtEvidenceOverAssets','interestCoverageProxy','ocfOverAverageAssets','fcfOverAverageAssets'];
const VALID_FORM=new Set(['10-K','10-K/A','10-KT','20-F','20-F/A','40-F','40-F/A']);
const validDay=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const age=(asOf,end)=>Math.floor((Date.parse(asOf)-Date.parse(end))/86400000);
const goodNum=x=>typeof x==='number'&&Number.isFinite(x);
const safePath=p=>{try{return fs.statSync(p).isFile();}catch{return false;}};
const rawGroup=(facts,fields)=>fields.some(([taxonomy,tag])=>!!facts?.[taxonomy]?.[tag]?.units?.USD?.length);

function eligibleFact(x,end,asOf,isFlow){
 if(!x||!VALID_FORM.has(x.form)||!goodNum(x.val)||!validDay(x.end)||!validDay(x.filed)||x.end>asOf||x.filed>asOf||x.end!==end)return false;
 if(isFlow){if(!validDay(x.start)||x.start>=x.end||age(x.end,x.start)<320||age(x.end,x.start)>400)return false;}
 else if(x.start!=null)return false;
 return true;
}
function matchFacts(facts,fields,end,asOf,isFlow=false){
 const candidates=[];
 for(const [taxonomy,tag] of fields){
  const rows=facts?.[taxonomy]?.[tag]?.units?.USD;
  if(!Array.isArray(rows))continue;
  for(const x of rows)if(eligibleFact(x,end,asOf,isFlow))candidates.push({tag:taxonomy+':'+tag,filed:x.filed,val:x.val,end:x.end,start:x.start??null,form:x.form});
 }
 if(!candidates.length)return {ok:false,reason:'NO_ANNUAL_FACT'};
 candidates.sort((a,b)=>b.filed.localeCompare(a.filed)||a.tag.localeCompare(b.tag));
 const newest=candidates[0].filed;
 // Equal-filing-date disagreement is ambiguous; do not auto-reconcile two tags.
 const latest=candidates.filter(x=>x.filed===newest);
 const values=new Set(latest.map(x=>x.val));
 if(values.size>1)return {ok:false,reason:'LATEST_TAG_VALUE_CONFLICT'};
 return {ok:true,val:latest[0].val,filed:newest};
}
function selectAnchor(doc,asOf){
 let candidates=[];
 for(const [taxonomy,tag] of INSTANTS.assets){
  const rows=doc?.facts?.[taxonomy]?.[tag]?.units?.USD;
  for(const x of Array.isArray(rows)?rows:[])if(VALID_FORM.has(x?.form)&&validDay(x.end)&&validDay(x.filed)&&x.end<=asOf&&x.filed<=asOf&&goodNum(x.val)&&x.val>0&&!x.start)candidates.push(x);
 }
 candidates.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 return candidates[0]?.end??null;
}
function previousAssets(facts,asOf,end){
 const c=[];
 for(const fields of INSTANTS.assets){
  const rows=facts?.[fields[0]]?.[fields[1]]?.units?.USD;
  for(const x of Array.isArray(rows)?rows:[])if(x?.end&&validDay(x.end)&&x.end<end&&age(end,x.end)>=300&&age(end,x.end)<=430&&eligibleFact(x,x.end,asOf,false)&&x.val>0)c.push(x);
 }
 c.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 if(!c.length)return {ok:false};
 return matchFacts(facts,INSTANTS.assets,c[0].end,asOf);
}
function precedingOCF(facts,asOf,end){
 const c=[];
 for(const [tax,tag] of FLOWS.operatingCashFlow){
  const rows=facts?.[tax]?.[tag]?.units?.USD;
  for(const x of Array.isArray(rows)?rows:[])if(x?.end&&validDay(x.end)&&x.end<end&&age(end,x.end)>=300&&age(end,x.end)<=430&&eligibleFact(x,x.end,asOf,true))c.push(x);
 }
 c.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 if(!c.length)return {ok:false};
 return matchFacts(facts,FLOWS.operatingCashFlow,c[0].end,asOf,true);
}
export function inspectIssuer(doc,cik,asOf){
 if(String(doc?.cik??'').padStart(10,'0')!==cik)return {status:'CIK_MISMATCH'};
 const facts=doc.facts??{};
 const raw=Object.fromEntries(Object.entries(ALL).map(([k,fields])=>[k,rawGroup(facts,fields)]));
 const end=selectAnchor(doc,asOf);
 if(!end)return {status:'NO_ANNUAL_ASSETS_ANCHOR',raw};
 const values={};const conflicted=[];
 for(const [key,fields] of Object.entries(ALL)){
  if(key==='debtEvidence'){
   // Debt tags represent different debt components: their distinct values are NOT conflicts.
   // A matching tag signals evidence only; it never proves total debt completeness.
   const found=fields.some(field=>matchFacts(facts,[field],end,asOf,false).ok);
   values[key]={ok:found,reason:found?null:'NO_ANNUAL_DEBT_TAG'};
  }else values[key]=matchFacts(facts,fields,end,asOf,Object.hasOwn(FLOWS,key));
  if(values[key].reason==='LATEST_TAG_VALUE_CONFLICT')conflicted.push(key);
 }
 const priorAssets=previousAssets(facts,asOf,end);
 const priorOCF=precedingOCF(facts,asOf,end);
 const ok=k=>values[k]?.ok;
 const positive=k=>ok(k)&&values[k].val>0;
 const proxy={
  currentRatio:ok('currentAssets')&&positive('currentLiabilities'),
  cashRatioLowerBound:ok('cash')&&positive('currentLiabilities'),
  debtEvidenceOverAssets:ok('debtEvidence')&&positive('assets'),
  interestCoverageProxy:ok('operatingProfitProxy')&&positive('interest'),
  ocfOverAverageAssets:ok('operatingCashFlow')&&positive('assets')&&priorAssets.ok,
  fcfOverAverageAssets:ok('operatingCashFlow')&&ok('capex')&&positive('assets')&&priorAssets.ok,
 };
 return {status:'ANNUAL_ANCHOR_PRESENT',end,raw,annual:Object.fromEntries(Object.keys(ALL).map(k=>[k,ok(k)])),
  priorAssets:priorAssets.ok,priorOCF:priorOCF.ok,conflictFields:conflicted,
  proxy,allSixProxy:SCORE_PARTS.every(x=>proxy[x]),
  twoYearOCF:priorOCF.ok&&ok('operatingCashFlow'),
  recentAnnual:age(asOf,end)<=550};
}

const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function readExact(fd,size,offset){if(!Number.isSafeInteger(size)||size<0||size>33*1024*1024)throw Error('ZIP_READ_BOUNDS');const v=Buffer.alloc(size);let n=0;while(n<size){let k=fs.readSync(fd,v,n,size-n,offset+n);if(!k)throw Error('ZIP_TRUNCATED');n+=k;}return v;}
export function openZip(file){
 if(!safePath(file))throw Error('ZIP_NOT_FOUND');
 const fd=fs.openSync(file,'r');
 try{
 const len=fs.fstatSync(fd).size;if(len<22||len>10*1024*1024*1024)throw Error('ZIP_SIZE_STOP');
 const tail=readExact(fd,Math.min(len,65557),Math.max(0,len-65557));let off=-1;
 for(let i=tail.length-22;i>=0;i--){if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){off=i;break;}}
 if(off<0)throw Error('ZIP_EOCD_STOP');
 const count=tail.readUInt16LE(off+10),centralSize=tail.readUInt32LE(off+12),centralAt=tail.readUInt32LE(off+16);
 if(count===0xffff||centralSize===0xffffffff||centralAt===0xffffffff)throw Error('ZIP64_UNSUPPORTED');
 if(centralSize>16*1024*1024||centralAt+centralSize>len||count>40000)throw Error('ZIP_CENTRAL_SIZE_STOP');
 const b=readExact(fd,centralSize,centralAt),index=new Map();let p=0;
 for(let i=0;i<count;i++){
  if(p+46>b.length||b.readUInt32LE(p)!==0x02014b50)throw Error('ZIP_CENTRAL_STOP');
  const n=b.readUInt16LE(p+28),e=b.readUInt16LE(p+30),c=b.readUInt16LE(p+32),next=p+46+n+e+c;
  if(next>b.length)throw Error('ZIP_CENTRAL_TRUNCATED');
  const filename=b.toString('utf8',p+46,p+46+n),m=/(?:^|\/)CIK(\d{10})\.json$/i.exec(filename);
  if(m){if(index.has(m[1]))throw Error('ZIP_DUPLICATE_CIK_STOP');index.set(m[1],{filename,flags:b.readUInt16LE(p+8),method:b.readUInt16LE(p+10),crc:b.readUInt32LE(p+16),compressed:b.readUInt32LE(p+20),inflated:b.readUInt32LE(p+24),at:b.readUInt32LE(p+42)});}
  p=next;
 }
 if(p!==b.length)throw Error('ZIP_CENTRAL_REMAINDER_STOP');
 return {fd,len,index,totalEntries:count,close:()=>fs.closeSync(fd)};
 }catch(err){fs.closeSync(fd);throw err;}
}
export function readZipCompany(zip,cik){
 const entry=zip.index.get(cik);if(!entry)return null;
 if(entry.compressed>24*1024*1024||entry.inflated>32*1024*1024)throw Error('ZIP_ENTRY_SIZE_STOP');
 if(entry.flags&1||![0,8].includes(entry.method))throw Error('ZIP_ENTRY_FLAGS_STOP');
 const h=readExact(zip.fd,30,entry.at);
 if(h.readUInt32LE(0)!==0x04034b50||h.readUInt16LE(8)!==entry.method)throw Error('ZIP_LOCAL_HEADER_STOP');
 const n=h.readUInt16LE(26),e=h.readUInt16LE(28);if(n>4096)throw Error('ZIP_NAME_SIZE_STOP');
 const name=readExact(zip.fd,n,entry.at+30).toString('utf8');if(name!==entry.filename)throw Error('ZIP_NAME_MISMATCH_STOP');
 const at=entry.at+30+n+e;if(at+entry.compressed>zip.len)throw Error('ZIP_BODY_BOUNDS_STOP');
 const compressed=readExact(zip.fd,entry.compressed,at);
 const raw=entry.method===0?compressed:zlib.inflateRawSync(compressed,{maxOutputLength:32*1024*1024});
 if(raw.length!==entry.inflated||crc32(raw)!==entry.crc)throw Error('ZIP_CHECKSUM_STOP');
 try{return JSON.parse(raw.toString('utf8'));}catch{throw Error('ZIP_JSON_STOP');}
}
export function calendarTickers(pc){
 const dbfile=path.join(pc,'storage','core.sqlite');if(!safePath(dbfile))throw Error('PC_DB_ABSENT_STOP');
 const db=new DatabaseSync(dbfile,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON');
  const data=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(SOURCE_KEY);
  if(!data)throw Error('CALENDAR_SNAPSHOT_ABSENT_STOP');
  const obj=JSON.parse(data.body);
  if(obj.status!=='READY_DISPLAY'||obj.mode!=='OWN_SITE_HTML_ONLY'||!Array.isArray(obj.coveredDays)||obj.coveredDays.length!==14)throw Error('CALENDAR_CONTRACT_STOP');
  const tickers=new Set();let rows=0;
  for(const d of obj.coveredDays){if(!Array.isArray(obj.byDay?.[d]))throw Error('CALENDAR_DAYS_STOP');for(const html of obj.byDay[d]){const m=/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.-]{1,12}) /i.exec(html);if(!m)throw Error('CALENDAR_HTML_STOP');tickers.add(m[1].toUpperCase());rows++;}}
  if(rows!==obj.recordCount||tickers.size>10000)throw Error('CALENDAR_ROW_COUNT_STOP');
  return {tickers,sourceStoredAt:data.stored_at,sourceCheckedAt:obj.checkedAt??null};
 }finally{db.close();}
}
export function secTickerMap(pc){
 const file=path.join(pc,'manual-input','e1-r5','incoming','company_tickers_exchange.json');
 if(!safePath(file)||fs.statSync(file).size>8*1024*1024)throw Error('SEC_MAPPING_ABSENT_OR_SIZE_STOP');
 const obj=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(obj.fields)||!Array.isArray(obj.data)||obj.data.length>40000)throw Error('SEC_MAPPING_SCHEMA_STOP');
 const i=obj.fields.indexOf('ticker'),j=obj.fields.indexOf('cik');if(i<0||j<0)throw Error('SEC_MAPPING_FIELDS_STOP');
 const map=new Map(),bad=new Set();
 for(const row of obj.data){if(!Array.isArray(row))continue;const t=String(row[i]??'').toUpperCase(),c=String(row[j]??'').padStart(10,'0');
  if(!/^[A-Z0-9.-]{1,12}$/.test(t)||!/^[0-9]{10}$/.test(c)||bad.has(t))continue;
  if(map.has(t)&&map.get(t)!==c){map.delete(t);bad.add(t);}else map.set(t,c);
 }
 return {map,bad};
}
const emptyCounter=keys=>Object.fromEntries(keys.map(k=>[k,0]));
export function auditPc({pcHome=DEFAULT_HOME,asOf=new Date(Date.now()+9*3600000).toISOString().slice(0,10)}={}){
 if(!validDay(asOf))throw Error('ASOF_INVALID_STOP');
 const calendar=calendarTickers(pcHome),mapping=secTickerMap(pcHome),byCik=new Map();let unmapped=0;
 for(const ticker of calendar.tickers){const cik=mapping.map.get(ticker);if(!cik){unmapped++;continue;}if(!byCik.has(cik))byCik.set(cik,[]);byCik.get(cik).push(ticker);}
 const zipfile=path.join(pcHome,'manual-input','e1-r5','incoming','companyfacts.zip');const zip=openZip(zipfile);
 try{
 const groupNames=Object.keys(ALL),raw=emptyCounter(groupNames),annual=emptyCounter(groupNames),proxies=emptyCounter(SCORE_PARTS),issues=emptyCounter(['CIK_MISMATCH','NO_ANNUAL_ASSETS_ANCHOR','ZIP_ENTRY_MISSING','ZIP_READ_ERROR']);
 let issuersInZip=0,annualAnchor=0,recentAnchor=0,priorAssets=0,priorOCF=0,twoYearOCF=0,allSix=0,conflicts=0;const failReasons={};let processed=0;
 const addWeighted=(counter,booleans,weight)=>{for(const [key,val] of Object.entries(booleans||{}))if(val&&Object.hasOwn(counter,key))counter[key]+=weight;};
 for(const [cik,tickers] of byCik){
  const weight=tickers.length;
  if(!zip.index.has(cik)){issues.ZIP_ENTRY_MISSING+=weight;continue;}
  issuersInZip++;
  let item;try{item=inspectIssuer(readZipCompany(zip,cik),cik,asOf);}catch(err){issues.ZIP_READ_ERROR+=weight;const code=/^[A-Z0-9_]+$/.test(err.message)?err.message:'UNEXPECTED';failReasons[code]=(failReasons[code]??0)+weight;continue;}
  if(item.status!=='ANNUAL_ANCHOR_PRESENT'){issues[item.status]+=weight;addWeighted(raw,item.raw,weight);continue;}
  annualAnchor+=weight;if(item.recentAnnual)recentAnchor+=weight;
  if(item.priorAssets)priorAssets+=weight;
  if(item.priorOCF)priorOCF+=weight;
  if(item.twoYearOCF)twoYearOCF+=weight;
  if(item.allSixProxy)allSix+=weight;
  conflicts+=item.conflictFields.length;
  addWeighted(raw,item.raw,weight);addWeighted(annual,item.annual,weight);addWeighted(proxies,item.proxy,weight);
  processed++;
 }
 return {status:issues.ZIP_READ_ERROR?'R57_PARTIAL_READ_ERROR':'R57_LOCAL_FINANCIAL_COVERAGE_COMPLETE',asOf,
  calendarTickers:calendar.tickers.size,sourceCheckedAt:calendar.sourceCheckedAt,sourceStoredAt:calendar.sourceStoredAt,
  secMapTickers:calendar.tickers.size-unmapped,secUnmapped:unmapped,uniqueMappedIssuers:byCik.size,zipTotalEntries:zip.totalEntries,
  zipMappedIssuers:issuersInZip,zipMissingTickerCount:issues.ZIP_ENTRY_MISSING,
  noAnnualAnchorTickers:issues.NO_ANNUAL_ASSETS_ANCHOR,cikMismatchTickerCount:issues.CIK_MISMATCH,zipReadErrorTickers:issues.ZIP_READ_ERROR,
  annualAssetsAnchorTickers:annualAnchor,annualAnchorWithin550Days:recentAnchor,
  previousYearAssetsTickers:priorAssets,previousYearOcfTickers:priorOCF,twoAnnualOcfYearsTickers:twoYearOCF,
  rawTagPresenceTickers:raw,latestAnnualAlignedTickers:annual,r1ProxyComponentCoverageTickers:proxies,
  allSixProxyCoverageTickers:allSix,tagConflictCount:conflicts,readErrorCodes:failReasons,
  ratioGradesComputed:0,ratingsComputed:0,sectorModelsVerified:false,loanDebtCompletenessVerified:false,ebitDefinitionVerified:false,
  fundsAvailableIncludingShortInvestmentsVerified:false,providerRequests:0,dbWrites:0,d1Writes:0,publicStarsChanged:false,
  note:'COVERAGE_ONLY; TAG_EXISTENCE_NOT_SAME_AS_EVALUATION_READY; BANK_REIT_MODEL_UNVERIFIED; INTEREST_OR_DEBT_ABSENCE_NOT_ZERO'};
 }finally{zip.close();}
}
const SELF=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(SELF){
 const outputDir=path.dirname(fileURLToPath(import.meta.url));const dest=path.join(outputDir,'..',RESULT);
 if(fs.existsSync(dest)){process.stdout.write('STATUS=R57_RESULT_ALREADY_EXISTS_STOP\n');process.exitCode=2;}
 else{
  let data;try{data=auditPc();}
  catch(err){data={status:'R57_LOCAL_READ_FAILED',errorCode:/^[A-Z0-9_]+$/.test(err.message)?err.message:'LOCAL_UNEXPECTED_ERROR',providerRequests:0,dbWrites:0,d1Writes:0,publicStarsChanged:false};}
  fs.writeFileSync(dest,['AUDIT=MARKET_CALENDAR_R57_SEC_CREDIT_COVERAGE',...Object.entries(data).map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});
  process.stdout.write('STATUS='+data.status+'\nRESULT='+RESULT+'\n');
  if(data.status!=='R57_LOCAL_FINANCIAL_COVERAGE_COMPLETE')process.exitCode=2;
 }
}
