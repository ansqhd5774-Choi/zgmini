// AI-only, read-only inspection of the seven existing themes' archived ETF daily source.
// No provider requests, no new prices, no D1 writes, no scheduler modifications.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

const SYMBOLS=['SMH','SOXX','SPY'];
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const SHA=b=>createHash('sha256').update(b).digest('hex');
const DAY=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
  !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const rowDay=x=>x instanceof Date?x.toISOString().slice(0,10):typeof x==='string'?x.slice(0,10):
  Number.isInteger(x)&&x>10000&&x<100000?new Date(x*86400000).toISOString().slice(0,10):null;

async function defaultReader(file,bytes){
 let mod;
 try {mod=await import('hyparquet');}
 catch {
  const root=path.resolve(file,'..','..','..','..');
  const projects=path.join(root,'projects');
  const candidates=[process.env.ZGMINI_HYPARQUET_MODULE,
   path.join(path.dirname(file),'..','marketparquet-r167','node_modules','hyparquet','src','index.js')];
  if(fs.existsSync(projects))for(const name of fs.readdirSync(projects).slice(0,80)){
   candidates.push(path.join(projects,name,'node_modules','hyparquet','src','index.js'));
   candidates.push(path.join(projects,name,'zgmini','node_modules','hyparquet','src','index.js'));
  }
  const found=candidates.find(p=>typeof p==='string'&&fs.existsSync(p));
  if(!found)throw Error('EXISTING_PARQUET_DECODER_UNAVAILABLE');
  mod=await import(pathToFileURL(fs.realpathSync(found)).href);
 }
 if(typeof mod.parquetReadObjects!=='function')throw Error('EXISTING_PARQUET_DECODER_INVALID');
 const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 return mod.parquetReadObjects({file:arrayBuffer,columns:['date','symbol','asset_type','close']});
}

// `targetDate` is the real session to inspect; no date or score is synthesized.
// Each archive date is checked independently. The overlap date is required in
// addition to the target date to compare the two price modes before calculation.
export async function inspectExistingSevenAiSource({dataRoot,targetDate='2026-10-23',
 overlapDate='2026-10-22',pendingDates=null,includePrivatePrices=false,reader=defaultReader}={}){
 const result={report:'AI_SEVEN_THEME_SOURCE_PARITY_READONLY_R1',targetDate,overlapDate,
  symbols:SYMBOLS,source:SOURCE,providerCalls:0,d1Writes:0,schedulerWrites:0,
  status:'STARTED',dates:[],targetCoverage:null};
 const pending=pendingDates??[targetDate];
 if(!DAY(targetDate)||!DAY(overlapDate)||!Array.isArray(pending)||pending.length<1||pending.length>2||
  pending.at(-1)!==targetDate||pending.some((d,i)=>!DAY(d)||d<=overlapDate||(i>0&&d<=pending[i-1]))){
  result.status='DATES_INVALID';return result;
 }
 if(!dataRoot||!fs.existsSync(dataRoot)){result.status='DATA_ROOT_UNAVAILABLE';return result;}
 const parent=path.join(dataRoot,'theme-market-history-r131');
 const archive=path.join(parent,'marketparquet-r165'),audits=path.join(parent,'marketparquet-r167');
 if(!fs.existsSync(archive)||!fs.existsSync(audits)){result.status='SEVEN_ARCHIVE_UNAVAILABLE';return result;}
 const verifiedPrivatePrices={};
 for(const date of [overlapDate,...pending]){
  const name=`etf_daily_${date}.parquet`;
  const file=path.join(archive,name),auditFile=path.join(audits,`etf_daily_${date}.audit.json`);
  const daily={date,filePresent:fs.existsSync(file),auditPresent:fs.existsSync(auditFile),
   shaVerified:false,complete:false,coverage:Object.fromEntries(SYMBOLS.map(s=>[s,false]))};
  result.dates.push(daily);
  if(!daily.filePresent){result.status=date===targetDate?'TARGET_DATE_PARQUET_MISSING':'OVERLAP_DATE_PARQUET_MISSING';return result;}
  if(!daily.auditPresent){result.status='SEVEN_SOURCE_AUDIT_MISSING';return result;}
  let bytes,audit;
  try{bytes=fs.readFileSync(file);audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));}
  catch{result.status='SOURCE_READ_FAILED';return result;}
  if(bytes.length<12||bytes.toString('ascii',0,4)!=='PAR1'||
   bytes.toString('ascii',bytes.length-4)!=='PAR1'||
   bytes.readUInt32LE(bytes.length-8)<1||bytes.readUInt32LE(bytes.length-8)>bytes.length-12){
   result.status='PARQUET_INTEGRITY_INVALID';return result;
  }
  const digest=SHA(bytes);
  if(audit.date!==date||audit.sha256!==digest||audit.complete!==true||audit.source!==SOURCE){
   result.status='SEVEN_SOURCE_AUDIT_MISMATCH';return result;
  }
  daily.shaVerified=true;daily.complete=true;daily.sha256=digest;
  let rows;
  try{rows=await reader(file,bytes);}
  catch(e){result.status='PARQUET_DECODER_UNAVAILABLE_OR_FAILED';
   result.decoderReason=String(e?.message??'UNKNOWN').slice(0,120);return result;}
  if(!Array.isArray(rows)){result.status='DECODED_ROWS_INVALID';return result;}
  const prices={};
  for(const row of rows){
   const symbol=typeof row.symbol==='string'?row.symbol.toUpperCase():null;
   if(!SYMBOLS.includes(symbol))continue;
   if(rowDay(row.date)!==date||!number(row.close)||
    (row.asset_type&&String(row.asset_type).toLowerCase()!=='etf')||Object.hasOwn(prices,symbol)){
    result.status='TARGET_ROW_INVALID_OR_DUPLICATE';return result;
   }
   prices[symbol]=row.close;daily.coverage[symbol]=true;
  }
  if(SYMBOLS.some(s=>!daily.coverage[s])){
   result.status='ACTUAL_TARGET_SYMBOLS_MISSING';result.targetCoverage=daily.coverage;return result;
  }
  daily.sourceStoredAt=new Date(fs.statSync(file).mtimeMs).toISOString();
  if(includePrivatePrices)verifiedPrivatePrices[date]=prices;
 }
 result.status='ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED';
 result.targetCoverage=result.dates.at(-1).coverage;
 // The CLI never prints prices. An in-process calculation may explicitly opt
 // into a private in-memory map after each archive/audit/ticker gate passed.
 if(includePrivatePrices)result.privateVerifiedPrices=verifiedPrivatePrices;
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==1||args[0]!=='--inspect'){
  console.error('Usage: node theme-ai-marketparquet-readonly-r1.mjs --inspect');process.exitCode=2;
 }else{
  const result=await inspectExistingSevenAiSource({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED')process.exitCode=1;
 }
}
