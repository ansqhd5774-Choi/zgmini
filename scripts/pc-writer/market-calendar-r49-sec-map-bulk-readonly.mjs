// R49: SEC issuer mapping and local bulk ZIP coverage, without cap calculation or publication.
// One bounded SEC mapping download is allowed only when no local copy exists.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {parseCalendar,mapIssuerCandidates} from './market-calendar-r48-quality-readonly.mjs';

const RESULT='MARKET_CALENDAR_R49_SEC_MAPPING_BULK_RESULT.txt';
const FEED_KEY='market-calendar:earnings-display-html';
const SEC_URL='https://www.sec.gov/files/company_tickers_exchange.json';
const SEC_UA='ZGMINI/1.0 (+https://zgmini.kr)'; // Reuse approved SEC client identity.
const MAX_MAP_BYTES=8*1024*1024;
const MAX_DIRECTORY_BYTES=16*1024*1024;
const CIK_FILE=/(?:^|\/)CIK(\d{10})\.json$/i;
const TICKER=/^[A-Z0-9.-]{1,12}$/;

const cleanCik=value=>{
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const digits=String(value);
 return /^\d{1,10}$/.test(digits)?digits.padStart(10,'0'):null;
};
const cleanTicker=value=>typeof value==='string'&&TICKER.test(value.toUpperCase())?value.toUpperCase():null;
const isFile=file=>{try{return fs.statSync(file).isFile();}catch{return false;}};
const tableExists=(db,table)=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
const baseReport=()=>({audit:'MARKET_CALENDAR_R49_SEC_MAPPING_BULK',status:'R49_READONLY_FAILED',readOnlyDatabase:true,
 providerRequests:0,dbWrites:0,d1Writes:0,capValuesComputed:0,gradeableTickerCount:0,productionStarsChanged:false,
 scheduled:false,rawDataLogged:false,credentialsExposed:false,publicDisplayRightsVerified:false});

export function parseExchangeMap(body){
 const data=typeof body==='string'?JSON.parse(body):body;
 if(!Array.isArray(data?.fields)||!Array.isArray(data?.data)||data.data.length>40000)throw Error('R49_EXCHANGE_MAP_SCHEMA_INVALID');
 const keys=['cik','name','ticker','exchange'];
 const offsets=keys.map(k=>data.fields.indexOf(k));
 if(offsets.some(n=>n<0)||new Set(offsets).size!==4)throw Error('R49_EXCHANGE_MAP_FIELDS_INVALID');
 const map=new Map(),conflicts=new Set();let ignored=0;
 for(const entry of data.data){
  if(!Array.isArray(entry)){ignored++;continue;}
  const cik=cleanCik(entry[offsets[0]]),ticker=cleanTicker(entry[offsets[2]]);
  if(!cik||!ticker){ignored++;continue;}
  if(conflicts.has(ticker))continue;
  if(map.has(ticker)&&map.get(ticker)!==cik){conflicts.add(ticker);map.delete(ticker);continue;}
  map.set(ticker,cik);
 }
 return {map,conflicts,ignored,sourceRows:data.data.length};
}

// Read only ZIP central-directory metadata. Never extract or copy ZIP entries.
export function inspectCentralDirectory(file){
 if(!isFile(file))return {status:'ZIP_ABSENT',ciks:new Set(),entries:0};
 let fd;
 try{
  const size=fs.statSync(file).size;
  if(size<22||size>10*1024*1024*1024)throw Error('ZIP_SIZE_INVALID');
  fd=fs.openSync(file,'r');
  const tailLength=Math.min(22+65535,size),tail=Buffer.allocUnsafe(tailLength);
  if(fs.readSync(fd,tail,0,tail.length,size-tailLength)!==tail.length)throw Error('ZIP_TAIL_TRUNCATED');
  let eocd=-1;
  for(let i=tail.length-22;i>=0;i--){
   if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){eocd=i;break;}
  }
  if(eocd<0)throw Error('ZIP_END_MISSING');
  const entries=tail.readUInt16LE(eocd+10),countThisDisk=tail.readUInt16LE(eocd+8);
  const bytes=tail.readUInt32LE(eocd+12),offset=tail.readUInt32LE(eocd+16);
  if(entries===0xffff||bytes===0xffffffff||offset===0xffffffff)throw Error('ZIP64_NEEDS_REVIEW');
  if(tail.readUInt16LE(eocd+4)!==0||tail.readUInt16LE(eocd+6)!==0||countThisDisk!==entries)throw Error('ZIP_MULTIDISK_UNSUPPORTED');
  if(bytes>MAX_DIRECTORY_BYTES||entries>40000||offset+bytes>size-tailLength+eocd)throw Error('ZIP_DIRECTORY_BOUNDS_INVALID');
  const central=Buffer.allocUnsafe(bytes);
  if(fs.readSync(fd,central,0,bytes,offset)!==bytes)throw Error('ZIP_DIRECTORY_TRUNCATED');
  const ciks=new Set();let at=0;
  for(let i=0;i<entries;i++){
   if(at+46>bytes||central.readUInt32LE(at)!==0x02014b50)throw Error('ZIP_CENTRAL_HEADER_INVALID');
   const nameBytes=central.readUInt16LE(at+28),extra=central.readUInt16LE(at+30),comment=central.readUInt16LE(at+32);
   const next=at+46+nameBytes+extra+comment;
   if(next>bytes)throw Error('ZIP_CENTRAL_ENTRY_TRUNCATED');
   const name=central.toString('utf8',at+46,at+46+nameBytes),m=CIK_FILE.exec(name);
   if(m)ciks.add(m[1]);
   at=next;
  }
  if(at!==bytes)throw Error('ZIP_DIRECTORY_TRAILING_BYTES');
  return {status:'ZIP_INDEX_READ',ciks,entries};
 }catch{return {status:'ZIP_INDEX_UNREADABLE',ciks:new Set(),entries:0};}
 finally{if(fd!==undefined)fs.closeSync(fd);}
}

export function summarizeCoverage({tickers,oldMapping,secMapping,zipCiks,extractedCiks}={}){
 let old=0,mapped=0,added=0,mappingChanged=0,bulkMatched=0,extractedMatched=0,oldBulk=0;
 const collisions=secMapping.conflicts??new Set(),map=secMapping.map??new Map();
 let aliasCandidates=0;
 for(const ticker of tickers){
  const prior=oldMapping.get(ticker),cik=map.get(ticker);
  if(prior)old++;
  if(!cik){
   const alias=ticker.includes('.')?ticker.replaceAll('.','-'):ticker.includes('-')?ticker.replaceAll('-','.'):null;
   if(alias&&map.has(alias))aliasCandidates++;
   if(prior&&zipCiks.has(prior))oldBulk++;
   continue;
  }
  mapped++;
  if(!prior)added++;
  if(prior&&prior!==cik)mappingChanged++;
  if(zipCiks.has(cik))bulkMatched++;
  if(extractedCiks.has(cik))extractedMatched++;
  if(prior&&zipCiks.has(prior))oldBulk++;
 }
 return {calendarTickerCount:tickers.size,existingUniverseMappingCount:old,secMappingTickerCount:mapped,
  secNewMappingTickerCount:added,secVsExistingCikMismatch:mappingChanged,
  secMappingConflicts: [...collisions].filter(t=>tickers.has(t)).length,
  secBulkZipTickerMatches:bulkMatched,secExtractedFileTickerMatches:extractedMatched,
  existingUniverseBulkMatches:oldBulk,dotHyphenAliasCandidatesNotAutoMapped:aliasCandidates};
}

async function fetchOfficialMap({fetchImpl=fetch}={}){
 const response=await fetchImpl(SEC_URL,{redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{'User-Agent':SEC_UA,'Accept':'application/json'}});
 if(!response.ok)throw Error(`SEC_HTTP_${Number(response.status)||0}`);
 const len=Number(response.headers.get('content-length')||0);
 if(len>MAX_MAP_BYTES)throw Error('SEC_MAP_RESPONSE_TOO_LARGE');
 if(!response.body)throw Error('SEC_MAP_EMPTY_BODY');
 const chunks=[];let total=0;
 for await(const chunk of response.body){total+=chunk.length;if(total>MAX_MAP_BYTES)throw Error('SEC_MAP_RESPONSE_TOO_LARGE');chunks.push(chunk);}
 const body=Buffer.concat(chunks).toString('utf8');parseExchangeMap(body);
 return body;
}

export async function auditPc({pcHome=String.raw`E:\ZGmini\data\pc-writer`,allowDownload=true,fetchImpl}={}){
 const report=baseReport(),dbPath=path.join(pcHome,'storage','core.sqlite');
 if(!isFile(dbPath))return {...report,status:'R49_PC_DB_MISSING'};
 let db,calendar,universe;
 try{
  db=new DatabaseSync(dbPath,{readOnly:true});db.exec('PRAGMA query_only=ON');
  if(!tableExists(db,'public_feed_snapshots_v1')||!tableExists(db,'market_score_earnings_e1_r3_universe_v1'))return {...report,status:'R49_REQUIRED_TABLE_MISSING'};
  const feed=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(FEED_KEY);
  const stored=db.prepare('SELECT body_json,period_end FROM market_score_earnings_e1_r3_universe_v1 ORDER BY period_end DESC LIMIT 1').get();
  if(!feed||!stored)return {...report,status:'R49_REQUIRED_ROW_MISSING'};
  calendar=parseCalendar(feed.body);universe={members:JSON.parse(stored.body_json).members,periodEnd:stored.period_end};
  if(!Array.isArray(universe.members))throw Error('UNIVERSE_MEMBERS_INVALID');
 }catch{return {...report,status:'R49_PC_SOURCE_INVALID'};}
 finally{try{db?.close();}catch{}}
 const old=mapIssuerCandidates(universe.members,calendar.tickers),incoming=path.join(pcHome,'manual-input','e1-r5','incoming');
 const archive=inspectCentralDirectory(path.join(incoming,'companyfacts.zip'));
 const extracted=new Set();
 try{for(const entry of fs.readdirSync(path.join(incoming,'companyfacts'),{withFileTypes:true})){
  const m=entry.isFile()&&/^CIK(\d{10})\.json$/i.exec(entry.name);if(m)extracted.add(m[1]);
 }}catch{/* no extracted files */}
 const mapPath=path.join(incoming,'company_tickers_exchange.json');
 let source='LOCAL_EXISTING',mapping,sourceStatus='PRESENT',requests=0;
 if(!isFile(mapPath)){
  source='SEC_OFFICIAL_ONE_TIME';sourceStatus='ABSENT';
  if(!allowDownload)return {...report,status:'R49_MAPPING_FILE_ABSENT_NO_NETWORK',mappingFileStatus:sourceStatus,
   secArchiveStatus:archive.status,secBulkZipCikCount:archive.ciks.size};
  if(!fs.existsSync(incoming))return {...report,status:'R49_INCOMING_DIRECTORY_ABSENT'};
  requests=1;
  try{
   const body=await fetchOfficialMap({fetchImpl});
   fs.writeFileSync(mapPath,body,{flag:'wx',encoding:'utf8'});
   const readBack=fs.readFileSync(mapPath,'utf8');
   if(readBack!==body)throw Error('SEC_MAP_READBACK_MISMATCH');
   sourceStatus='DOWNLOADED_AND_STORED';mapping=parseExchangeMap(readBack);
  }catch(error){return {...report,status:'R49_SEC_MAP_DOWNLOAD_FAILED',providerRequests:requests,
   failureCode:/^SEC_HTTP_\d+$/.test(error?.message)?error.message:'SEC_MAP_DOWNLOAD_OR_SAVE_FAILED',
   secArchiveStatus:archive.status};}
 }else{
  try{if(fs.statSync(mapPath).size>MAX_MAP_BYTES)throw Error('MAP_LARGE');
   mapping=parseExchangeMap(fs.readFileSync(mapPath,'utf8'));
  }catch{return {...report,status:'R49_LOCAL_MAPPING_INVALID',providerRequests:0};}
 }
 const coverage=summarizeCoverage({tickers:calendar.tickers,oldMapping:old.mapping,
  secMapping:mapping,zipCiks:archive.ciks,extractedCiks:extracted});
 const status=archive.status==='ZIP_INDEX_READ'?'R49_MAPPING_AND_BULK_INDEX_RETRIEVED':'R49_MAPPING_RETRIEVED_BULK_UNAVAILABLE';
 return {...report,status,providerRequests:requests,
  sourceCheckedAt:calendar.checkedAt,universePeriodEnd:universe.periodEnd,
  secMappingSource:source,mappingFileStatus:sourceStatus,secMappingSourceRows:mapping.sourceRows,
  secArchiveStatus:archive.status,secBulkZipEntries:archive.entries,secBulkZipCikCount:archive.ciks.size,
  secExtractedCikFileCount:extracted.size,...coverage,
  note:'SOURCE_COVERAGE_ONLY; NO_ISSUER_CAP; NO_CLASS_ACTION_PRICE_OR_PUBLIC_RIGHTS_VERIFIED'};
}

export async function runPc({pcHome=String.raw`E:\ZGmini\data\pc-writer`,outputDir=path.dirname(fileURLToPath(import.meta.url)),fetchImpl}={}){
 const dest=path.join(outputDir,RESULT);
 if(fs.existsSync(dest))return {status:'R49_RESULT_ALREADY_EXISTS_STOP',file:RESULT};
 const report=await auditPc({pcHome,fetchImpl});
 fs.writeFileSync(dest,['AUDIT=MARKET_CALENDAR_R49_SEC_MAPPING_BULK',...Object.entries(report)
  .filter(([k])=>k!=='audit').map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});
 return {status:report.status,file:RESULT};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await runPc({pcHome:process.argv[2]||String.raw`E:\ZGmini\data\pc-writer`,
  outputDir:process.argv[3]?path.resolve(process.argv[3]):undefined});
 process.stdout.write(`STATUS=${r.status}\nRESULT=${r.file}\n`);
 if(r.status!=='R49_MAPPING_AND_BULK_INDEX_RETRIEVED')process.exitCode=2;
}
