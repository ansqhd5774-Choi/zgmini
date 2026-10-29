// R50: examine existing SEC bulk ZIP and ALL cached Alpaca price-group files.
// It never creates issuer caps, star grades, SQLite/D1 rows, or provider requests.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {parseCalendar,inspectSecShares,latestPriceBars} from './market-calendar-r48-quality-readonly.mjs';
import {parseExchangeMap} from './market-calendar-r49-sec-map-bulk-readonly.mjs';

const RESULT='MARKET_CALENDAR_R50_BULK_FACTS_RESULT.txt';
const FEED_KEY='market-calendar:earnings-display-html';
const CIK_ENTRY=/(?:^|\/)CIK(\d{10})\.json$/i;
const PRICE_FILE=/^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-group-\d+\.json$/;
const ZIP_DIRECTORY_LIMIT=16*1024*1024;
const ZIP_ENTRY_INFLATED_LIMIT=32*1024*1024;
const ZIP_ENTRY_COMPRESSED_LIMIT=24*1024*1024;
const PRICE_FILE_LIMIT=32*1024*1024;
const PRICE_SCAN_BYTES_LIMIT=512*1024*1024;
const MAP_FILE_LIMIT=8*1024*1024;
const datePattern=/^20\d{2}-\d{2}-\d{2}$/;
const isFile=p=>{try{return fs.statSync(p).isFile();}catch{return false;}};
const dateIsValid=s=>typeof s==='string'&&datePattern.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`))&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;
const dayAge=(today,observed)=>Math.floor((Date.parse(today)-Date.parse(observed))/86400000);
const todayKst=()=>new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
const baseReport=asOf=>({audit:'MARKET_CALENDAR_R50_BULK_FACTS',status:'R50_READONLY_FAILED',asOf,
 readOnlyDatabase:true,providerRequests:0,dbWrites:0,d1Writes:0,capValuesComputed:0,gradeableTickerCount:0,
 productionStarsChanged:false,scheduled:false,publicDisplayRightsVerified:false,rawDataLogged:false,credentialsExposed:false});

// Checksummed and bounded ZIP entry access without extracting/writing any files.
const crcTable=Uint32Array.from({length:256},(_,i)=>{
 let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
const readExact=(fd,size,offset)=>{
 const data=Buffer.alloc(size);let got=0;
 while(got<size){const n=fs.readSync(fd,data,got,size-got,offset+got);if(n===0)throw Error('ZIP_READ_TRUNCATED');got+=n;}
 return data;
};

export function openBulkZip(zipPath){
 if(!isFile(zipPath))throw Error('ZIP_ABSENT');
 const fileSize=fs.statSync(zipPath).size;
 if(fileSize<22||fileSize>10*1024*1024*1024)throw Error('ZIP_SIZE_INVALID');
 const fd=fs.openSync(zipPath,'r');
 try{
  const tailSize=Math.min(fileSize,65557),tail=readExact(fd,tailSize,fileSize-tailSize);
  let eocd=-1;
  for(let i=tail.length-22;i>=0;i--){
   if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){eocd=i;break;}
  }
  if(eocd<0)throw Error('ZIP_EOCD_INVALID');
  const entries=tail.readUInt16LE(eocd+10),diskEntries=tail.readUInt16LE(eocd+8);
  const dirBytes=tail.readUInt32LE(eocd+12),dirStart=tail.readUInt32LE(eocd+16);
  if(entries===0xffff||dirBytes===0xffffffff||dirStart===0xffffffff)throw Error('ZIP64_UNSUPPORTED');
  if(tail.readUInt16LE(eocd+4)||tail.readUInt16LE(eocd+6)||diskEntries!==entries)throw Error('ZIP_MULTIDISK_UNSUPPORTED');
  if(!dirBytes||dirBytes>ZIP_DIRECTORY_LIMIT||entries>40000||dirStart+dirBytes>fileSize-tailSize+eocd)throw Error('ZIP_DIR_BOUNDS');
  const directory=readExact(fd,dirBytes,dirStart);
  const index=new Map(),duplicates=new Set();let offset=0;
  for(let i=0;i<entries;i++){
   if(offset+46>dirBytes||directory.readUInt32LE(offset)!==0x02014b50)throw Error('ZIP_CENTRAL_INVALID');
   const nameLen=directory.readUInt16LE(offset+28),extraLen=directory.readUInt16LE(offset+30),commentLen=directory.readUInt16LE(offset+32);
   const next=offset+46+nameLen+extraLen+commentLen;
   if(next>dirBytes)throw Error('ZIP_CENTRAL_TRUNCATED');
   const name=directory.toString('utf8',offset+46,offset+46+nameLen),match=CIK_ENTRY.exec(name);
   if(match){
    const cik=match[1];
    if(index.has(cik)){duplicates.add(cik);index.delete(cik);}
    else if(!duplicates.has(cik))index.set(cik,{
     name,flags:directory.readUInt16LE(offset+8),method:directory.readUInt16LE(offset+10),
     crc:directory.readUInt32LE(offset+16),compressed:directory.readUInt32LE(offset+20),
     inflated:directory.readUInt32LE(offset+24),localOffset:directory.readUInt32LE(offset+42),
    });
   }
   offset=next;
  }
  if(offset!==dirBytes)throw Error('ZIP_CENTRAL_TRAILING_BYTES');
  return {fd,index,duplicates,entries,fileSize,close:()=>fs.closeSync(fd)};
 }catch(error){fs.closeSync(fd);throw error;}
}

export function readCompanyFact(zip,item){
 if(item.compressed>ZIP_ENTRY_COMPRESSED_LIMIT||item.inflated>ZIP_ENTRY_INFLATED_LIMIT)throw Error('ENTRY_TOO_LARGE');
 if(item.flags&1||![0,8].includes(item.method))throw Error('ENTRY_UNSUPPORTED_METHOD');
 if(item.localOffset+30>zip.fileSize)throw Error('ENTRY_OFFSET_INVALID');
 const local=readExact(zip.fd,30,item.localOffset);
 if(local.readUInt32LE(0)!==0x04034b50)throw Error('ENTRY_LOCAL_HEADER_INVALID');
 if(local.readUInt16LE(8)!==item.method)throw Error('ENTRY_METHOD_MISMATCH');
 const nameLen=local.readUInt16LE(26),extraLen=local.readUInt16LE(28);
 if(nameLen>4096||extraLen>65535)throw Error('ENTRY_HEADER_BOUNDS');
 const contentAt=item.localOffset+30+nameLen+extraLen;
 if(contentAt+item.compressed>zip.fileSize)throw Error('ENTRY_BODY_BOUNDS');
 const name=readExact(zip.fd,nameLen,item.localOffset+30).toString('utf8');
 if(name!==item.name)throw Error('ENTRY_NAME_MISMATCH');
 const compressed=readExact(zip.fd,item.compressed,contentAt);
 let expanded;
 try{expanded=item.method===0?compressed:zlib.inflateRawSync(compressed,{maxOutputLength:ZIP_ENTRY_INFLATED_LIMIT});}
 catch{throw Error('ENTRY_INFLATE_FAILED');}
 if(expanded.length!==item.inflated||crc32(expanded)!==item.crc)throw Error('ENTRY_CHECKSUM_FAILED');
 try{return JSON.parse(expanded.toString('utf8'));}
 catch{throw Error('ENTRY_JSON_INVALID');}
}

export function scanCachedPrices(directory,tickers,asOf){
 const blank={status:'DIRECTORY_ABSENT',fileCount:0,readFiles:0,skippedFiles:0,skippedByBudget:0,
  acceptedRows:0,rejectedRows:0,latest:new Map(),conflicts:new Set(),readBytes:0};
 if(!fs.existsSync(directory))return blank;
 const files=fs.readdirSync(directory,{withFileTypes:true})
  .filter(e=>e.isFile()&&PRICE_FILE.test(e.name)).map(e=>e.name).sort().reverse();
 const latest=new Map(),conflicts=new Set();let readFiles=0,skippedFiles=0,skippedByBudget=0;
 let acceptedRows=0,rejectedRows=0,readBytes=0;
 for(const name of files){
  const file=path.join(directory,name);let bytes;
  try{bytes=fs.statSync(file).size;}catch{skippedFiles++;continue;}
  if(bytes>PRICE_FILE_LIMIT){skippedFiles++;continue;}
  if(readBytes+bytes>PRICE_SCAN_BYTES_LIMIT){skippedByBudget++;continue;}
  try{
   const obj=JSON.parse(fs.readFileSync(file,'utf8'));
   const stats=latestPriceBars(obj,tickers,asOf,latest,conflicts);
   acceptedRows+=stats.accepted;rejectedRows+=stats.rejected;readFiles++;readBytes+=bytes;
  }catch{skippedFiles++;}
 }
 return {status:skippedFiles||skippedByBudget?'PARTIAL_SCAN':files.length?'ALL_MATCHING_FILES_SCANNED':'NO_PRICE_FILES',
  fileCount:files.length,readFiles,skippedFiles,skippedByBudget,acceptedRows,rejectedRows,latest,conflicts,readBytes};
}

export function auditPc({pcHome=String.raw`E:\ZGmini\data\pc-writer`,asOf=todayKst(),progress=()=>{}}={}){
 const r=baseReport(asOf);
 if(!dateIsValid(asOf))return {...r,status:'R50_ASOF_INVALID'};
 const dbPath=path.join(pcHome,'storage','core.sqlite');
 if(!isFile(dbPath))return {...r,status:'R50_PC_DB_ABSENT'};
 let tickers,sourceCheckedAt;
 let db;
 try{
  db=new DatabaseSync(dbPath,{readOnly:true});db.exec('PRAGMA query_only=ON');
  const row=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(FEED_KEY);
  if(!row)return {...r,status:'R50_CALENDAR_ROW_ABSENT'};
  const calendar=parseCalendar(row.body);tickers=calendar.tickers;sourceCheckedAt=calendar.checkedAt;
 }catch{return {...r,status:'R50_CALENDAR_DB_UNREADABLE'};}
 finally{try{db?.close();}catch{}}
 const incoming=path.join(pcHome,'manual-input','e1-r5','incoming');
 const mapPath=path.join(incoming,'company_tickers_exchange.json');
 if(!isFile(mapPath))return {...r,status:'R50_SEC_MAPPING_FILE_ABSENT'};
 let mapping;
 try{
  if(fs.statSync(mapPath).size>MAP_FILE_LIMIT)throw Error('MAP_TOO_LARGE');
  mapping=parseExchangeMap(fs.readFileSync(mapPath,'utf8'));
 }catch{return {...r,status:'R50_SEC_MAPPING_FILE_INVALID'};}
 let zip;
 try{zip=openBulkZip(path.join(incoming,'companyfacts.zip'));}
 catch(error){return {...r,status:'R50_BULK_ZIP_UNAVAILABLE',zipReason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'ZIP_INVALID'};}
 try{
  const ciToTickers=new Map(),absentMap=new Set();
  for(const ticker of tickers){
   const cik=mapping.map.get(ticker);
   if(!cik){absentMap.add(ticker);continue;}
   if(!ciToTickers.has(cik))ciToTickers.set(cik,[]);
   ciToTickers.get(cik).push(ticker);
  }
  const shareByCik=new Map();
  let usable=0,conflicting=0,none=0,parseFailures=0,checksumFailures=0,sizeFailures=0,cikMismatch=0;
  let zipMatchIssuers=0,shareAge0to90=0,shareAge91to180=0,shareAgeOver180=0,multiTagIssuers=0;
  let processed=0;
  for(const cik of ciToTickers.keys()){
   const entry=zip.index.get(cik);
   if(entry){
    zipMatchIssuers++;
    try{
     const fact=readCompanyFact(zip,entry);
     const result=inspectSecShares(fact,cik,asOf);
     shareByCik.set(cik,result);
     if(result.status==='CIK_MISMATCH')cikMismatch++;
     else if(result.status==='SHARE_FACT_CANDIDATE'){
      usable++;if(result.tagKinds>1)multiTagIssuers++;
      if(result.ageDays<=90)shareAge0to90++;
      else if(result.ageDays<=180)shareAge91to180++;
      else shareAgeOver180++;
     }else if(result.status==='SHARE_FACT_CONFLICT')conflicting++;
     else none++;
    }catch(error){
     if(error.message==='ENTRY_TOO_LARGE')sizeFailures++;
     else if(error.message==='ENTRY_CHECKSUM_FAILED')checksumFailures++;
     else parseFailures++;
    }
   }
   processed++;
   if(processed%250===0)progress({processed,total:ciToTickers.size});
  }
  const price=scanCachedPrices(path.join(pcHome,'asset-r10-alpaca','incremental'),tickers,asOf);
  let shareAndPriceTickers=0,freshShareAndPriceTickers=0,price0to7=0,price8to30=0,priceOver30=0,priceConflicts=0;
  for(const ticker of tickers){
   const p=price.latest.get(ticker);
   if(price.conflicts.has(ticker))priceConflicts++;
   if(!p)continue;
   const pAge=dayAge(asOf,p.date);
   if(pAge<=7)price0to7++;else if(pAge<=30)price8to30++;else priceOver30++;
   const s=shareByCik.get(mapping.map.get(ticker));
   if(s?.status==='SHARE_FACT_CANDIDATE'){
    shareAndPriceTickers++;
    if(s.ageDays<=90&&pAge<=7)freshShareAndPriceTickers++;
   }
  }
  const secZipUsableTickers=[...tickers].filter(t=>shareByCik.get(mapping.map.get(t))?.status==='SHARE_FACT_CANDIDATE').length;
  const multiTickerIssuers=[...ciToTickers.values()].filter(group=>group.length>1).length;
  return {...r,status:'R50_BULK_AND_PRICE_READONLY_COMPLETE',sourceCheckedAt,
   calendarUniqueTickers:tickers.size,secMappedTickers:tickers.size-absentMap.size,secUnmappedTickers:absentMap.size,
   secMappedIssuerCount:ciToTickers.size,secMultiTickerIssuerCount:multiTickerIssuers,
   zipArchiveEntries:zip.entries,zipDuplicateCikEntries:zip.duplicates.size,
   zipMappedIssuerEntries:zipMatchIssuers,zipMappedIssuerMissing:ciToTickers.size-zipMatchIssuers,
   zipSharesUsableIssuerCandidates:usable,zipSharesUsableTickerCandidates:secZipUsableTickers,
   zipSharesConflictIssuerCount:conflicting,zipSharesNoUsableFactsIssuerCount:none,
   zipCikMismatchIssuerCount:cikMismatch,zipEntryInvalidOrJsonFailIssuerCount:parseFailures,
   zipEntryChecksumFailedIssuerCount:checksumFailures,zipEntryOverSizeIssuerCount:sizeFailures,
   shareObservationAge0to90Days:shareAge0to90,shareObservationAge91to180Days:shareAge91to180,
   shareObservationAgeOver180Days:shareAgeOver180,shareMultipleTagIssuerCount:multiTagIssuers,
   priceSourceStatus:price.status,priceFileCount:price.fileCount,priceFilesRead:price.readFiles,
   priceFilesSkipped:price.skippedFiles,priceFilesSkippedByBudget:price.skippedByBudget,
   storedPriceTickerCandidates:price.latest.size,storedPriceTickerConflicts:priceConflicts,
   priceAge0to7Days:price0to7,priceAge8to30Days:price8to30,priceAgeOver30Days:priceOver30,
   shareFactAndPriceTickerCandidates:shareAndPriceTickers,
   freshShareFactAndPriceTickerCandidates:freshShareAndPriceTickers,
   caveat:'COMPANYFACTS_NO_DIMENSIONS; MULTI_CLASS_ADR_ISSUER_SHARES_UNVERIFIED; SPLIT_ADJUSTED_IEX_PRICE_AND_LICENSE_UNVERIFIED',
   next:'TARGET_PRICE_COVERAGE_AND_VALIDATE_CLASS_SPLIT_ASOF_RIGHTS_BEFORE_CAP_OR_STAR'};
 }finally{zip.close();}
}

export function runPc({pcHome=String.raw`E:\ZGmini\data\pc-writer`,outputDir=path.dirname(fileURLToPath(import.meta.url)),asOf=todayKst(),progress}={}){
 const result=path.join(outputDir,RESULT);
 if(fs.existsSync(result))return {status:'R50_RESULT_ALREADY_EXISTS_STOP',file:RESULT};
 let data;
 try{data=auditPc({pcHome,asOf,progress});}
 catch{data={...baseReport(asOf),status:'R50_UNEXPECTED_LOCAL_READ_FAILURE'};}
 fs.writeFileSync(result,['AUDIT=MARKET_CALENDAR_R50_BULK_FACTS',...Object.entries(data)
  .filter(([k])=>k!=='audit').map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n',
  {flag:'wx',encoding:'utf8'});
 return {status:data.status,file:RESULT};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pcHome=process.argv[2]||String.raw`E:\ZGmini\data\pc-writer`;
 const outputDir=process.argv[3]?path.resolve(process.argv[3]):undefined;
 const result=runPc({pcHome,outputDir,progress:({processed,total})=>process.stdout.write(`SEC_ZIP_PROGRESS=${processed}/${total}\n`)});
 process.stdout.write(`STATUS=${result.status}\nRESULT=${result.file}\n`);
 if(result.status!=='R50_BULK_AND_PRICE_READONLY_COMPLETE')process.exitCode=2;
}
