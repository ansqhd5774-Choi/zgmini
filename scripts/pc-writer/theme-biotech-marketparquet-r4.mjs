// R4: pair saved R165 Parquet files with R167 audit records, read-only.
// Audit membership is NOT direct proof of rows inside Parquet.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const TARGETS=['IBB','XBI','SPY'];
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i>=0?process.argv[i+1]:fallback;};
const root=path.resolve(arg('--data-root','E:/ZGmini/data'));
const safe=(f,r)=>{const x=path.resolve(f);if(!x.startsWith(path.resolve(r)+path.sep))throw Error('UNSAFE_PATH');return x;};
const rel=(f,r)=>path.relative(r,f).replaceAll('\\','/');
const sha=file=>{
 const h=createHash('sha256'),fd=fs.openSync(file,'r'),buf=Buffer.alloc(1024*1024);
 try {let n;while((n=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,n));}
 finally{fs.closeSync(fd);}return h.digest('hex');
};
const type=x=>Array.isArray(x)?'array':x===null?'null':typeof x;
const rowTicker=row=>typeof row?.symbol==='string'?row.symbol.toUpperCase():typeof row?.ticker==='string'?row.ticker.toUpperCase():null;
const presentIn=(value,ticker)=>{
 if(Array.isArray(value))return value.some(x=>rowTicker(x)===ticker);
 if(value&&typeof value==='object')return Object.keys(value).some(k=>k.toUpperCase()===ticker);
 return false;
};
const fileStructure=f=>{
 const s=fs.statSync(f).size,fd=fs.openSync(f,'r'),head=Buffer.alloc(4),tail=Buffer.alloc(8);
 try{if(s>=12){fs.readSync(fd,head,0,4,0);fs.readSync(fd,tail,0,8,s-8);}}
 finally{fs.closeSync(fd);}
 const footerBytes=tail.readUInt32LE(0);
 return {sizeBytes:s,parquetMagicAndFooterPlausible:s>=12&&head.toString()==='PAR1'&&tail.subarray(4).toString()==='PAR1'&&footerBytes>0&&footerBytes<=s-12};
};

export function inspectSavedAudits(dataRoot=root,{maxRecent=7}={}){
 const report={report:'ZGMINI_BIOTECH_MARKETPARQUET_R4',checkedAt:new Date().toISOString(),
  mode:'READ_ONLY_SAVED_AUDIT',providerCalls:0,d1Writes:0,schedulerWrites:0,
  priceWrites:0,originalR3Searches:0,rights:'NOT_VERIFIED_FOR_FREE_COMMERCIAL_DERIVED_PUBLICATION',
  directParquetRowsVerified:false,priceModeReconciled:false};
 if(!fs.existsSync(dataRoot))return {...report,status:'DATA_ROOT_UNAVAILABLE_NO_FALLBACK'};
 const archive=safe(path.join(dataRoot,'theme-market-history-r131','marketparquet-r165'),dataRoot);
 const audits=safe(path.join(dataRoot,'theme-market-history-r131','marketparquet-r167'),dataRoot);
 if(!fs.existsSync(archive))return {...report,status:'R165_ARCHIVE_MISSING'};
 const names=fs.readdirSync(archive).filter(x=>/^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(x)).sort().slice(-maxRecent);
 report.archive={path:rel(archive,dataRoot),fileCount:names.length};report.dates=[];
 for(const name of names){
  const date=name.slice('etf_daily_'.length,-'.parquet'.length);
  const parquet=safe(path.join(archive,name),dataRoot),audit=safe(path.join(audits,name.replace('.parquet','.audit.json')),dataRoot);
  const record={date,parquetPath:rel(parquet,dataRoot),auditPath:rel(audit,dataRoot),...fileStructure(parquet),
   parquetFileSha256:sha(parquet),auditFileSha256:null,claimedParquetSha256:null,
   shaBinding:'AUDIT_MISSING',targetEvidence:Object.fromEntries(TARGETS.map(t=>[t,'NOT_EVIDENCED']))};
  if(fs.existsSync(audit)){
   record.auditFileSha256=sha(audit);
   try{
    const a=JSON.parse(fs.readFileSync(audit,'utf8'));
    record.claimedParquetSha256=typeof a.sha256==='string'?a.sha256:null;
    record.shaBinding=!record.claimedParquetSha256?'AUDIT_HASH_MISSING':
     record.claimedParquetSha256.toLowerCase()===record.parquetFileSha256?'HASH_MATCH':'HASH_MISMATCH';
    record.auditDateMatches=date===a.date;
    record.auditSource=a.source??null;
    record.auditComplete=typeof a.complete==='boolean'?a.complete:null;
    record.rawRowsType=type(a.rawRows);
    record.rawRowsCount=Array.isArray(a.rawRows)?a.rawRows.length:Number.isSafeInteger(a.rawRows)?a.rawRows:null;
    record.pricesType=type(a.prices);
    for(const t of TARGETS){
     if(presentIn(a.rawRows,t))record.targetEvidence[t]='AUDIT_RAWROWS';
     else if(presentIn(a.prices,t))record.targetEvidence[t]='AUDIT_PRICES';
    }
   }catch{record.shaBinding='AUDIT_JSON_INVALID';}
  }
  report.dates.push(record);
 }
 const good=report.dates.filter(x=>x.shaBinding==='HASH_MATCH'&&x.auditDateMatches&&
  x.auditComplete===true&&x.auditSource==='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'&&
  x.parquetMagicAndFooterPlausible&&TARGETS.every(t=>x.targetEvidence[t]!=='NOT_EVIDENCED'));
 report.auditLinkedAllThreeCount=good.length;
 report.status=report.dates.length===0?'NO_SAVED_PARQUET':good.length===report.dates.length?
  'AUDIT_CLAIMS_TARGETS_AND_HASHES_MATCH_NOT_DIRECT_ROWS':'AUDIT_LINK_PARTIAL_OR_UNVERIFIED';
 report.caution='R167 audit fields and file hashes are indirect evidence only; direct Parquet row reading and price-mode reconciliation remain separate gates.';
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(inspectSavedAudits(),null,2));}
 catch(e){console.log(JSON.stringify({report:'ZGMINI_BIOTECH_MARKETPARQUET_R4',status:'READONLY_FAILED',error:String(e?.message??e)},null,2));process.exitCode=1;}
}
