// Targeted read-only evidence follow-up to BIOTECH_FORENSIC_R1.
// No R3 file search, provider call, price rewrite, D1 write, or scheduler edit.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const parseArg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const dataRoot=path.resolve(parseArg('--data-root','E:/ZGmini/data'));
const explicitParquet=parseArg('--parquet-path',null);
const shaFile=f=>{const h=createHash('sha256'),fd=fs.openSync(f,'r'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');};
const cleanPath=(p,root=dataRoot)=>path.relative(root,p).replaceAll('\\','/');
const safe=(f,root=dataRoot)=>{
 const resolved=path.resolve(f);if(!resolved.startsWith(root+path.sep))throw new Error('TARGET_NOT_UNDER_APPROVED_DATA_ROOT');return resolved;
};
const fileMeta=(f,root=dataRoot)=>({relativePath:cleanPath(f,root),sizeBytes:fs.statSync(f).size,sha256:shaFile(f)});
const redactedStrings=o=>{
 const entries=[];
 const scan=(node,depth)=>{
  if(depth>2||!node||typeof node!=='object')return;
  for(const [k,v] of Object.entries(node).slice(0,50)){
   if(/(?:^|_)(source|provider|origin|priceMode|adjusted|schemaVersion|collectedAt)(?:$|_)/i.test(k)){
    if(typeof v==='string'&&!/token|key|secret/i.test(k))entries.push({key:k,value:/https?:\/\//.test(v)?'URL_PRESENT_REDACTED':v.slice(0,160)});
    else if(typeof v==='boolean'||typeof v==='number')entries.push({key:k,value:v});
   }
   if(v&&typeof v==='object'&&!Array.isArray(v))scan(v,depth+1);
  }
 };
 scan(o,0);return entries.slice(0,30);
};
const readRawJson=(f,root=dataRoot)=>{
 const base=fileMeta(f,root),s=fs.readFileSync(f,'utf8');let obj=null;
 try{obj=JSON.parse(s)}catch{}
 const names=['IBB','XBI','SPY'].filter(t=>new RegExp('"(?:symbol|ticker)"\\s*:\\s*"'+t+'"','i').test(s));
 const domains={getmarkethistory:/getmarkethistory\.(?:com|io)/i.test(s),marketparquet:/marketparquet\.com/i.test(s)};
 let rootKeys=[],recordCount=null,modeEvidence=[];
 if(obj){rootKeys=Object.keys(obj).slice(0,35);modeEvidence=redactedStrings(obj);
  for(const candidate of [obj, obj.data,obj.bars,obj.results,obj.items])if(Array.isArray(candidate)){recordCount=candidate.length;break;}
 }
 return {...base,parseStatus:obj?'VALID_JSON':'NOT_SINGLE_JSON',rootKeys,recordCount,
  symbolLiteralEvidence:names,originDomainEvidence:domains,metadata:modeEvidence,
  conclusion:'SOURCE_AND_PRICE_MODE_REQUIRE_EXPLICIT_PROVENANCE_NOT_FILENAME'};
};

const pyarrowCode=String.raw`
import json,sys
try:
 import pyarrow.parquet as pq
except Exception as e:
 print(json.dumps({'status':'NO_INSTALLED_PARQUET_READER','detail':str(e)[:140]}));sys.exit(0)
try:
 import pyarrow.compute as pc
 f=pq.ParquetFile(sys.argv[1]);cols=f.schema_arrow.names
 ticker=next((x for x in cols if x.lower() in ('symbol','ticker')),None)
 date=next((x for x in cols if x.lower() in ('date','timestamp','datetime','time')),None)
 if not ticker:
  print(json.dumps({'status':'PARQUET_TICKER_FIELD_MISSING','columns':cols[:40],'rowCount':f.metadata.num_rows}));sys.exit(0)
 table=pq.read_table(sys.argv[1],columns=[ticker]+([date] if date else []))
 result={}
 for t in ('IBB','XBI','SPY'):
  mask=pc.equal(table[ticker],t);count=int(pc.sum(pc.cast(mask,'int64')).as_py() or 0)
  row={'rows':count}
  if count and date:
   d=pc.filter(table[date],mask);row.update({'first':str(pc.min(d).as_py()),'last':str(pc.max(d).as_py())})
  result[t]=row
 print(json.dumps({'status':'ROW_CONTENT_INSPECTED','columns':cols[:40],'rowCount':f.metadata.num_rows,'symbols':result}))
except Exception as e:
 print(json.dumps({'status':'ROW_READ_FAILED','detail':str(e)[:200]}))
`;
const inspectParquet=(f,root=dataRoot)=>{
 const base=fileMeta(f,root),fd=fs.openSync(f,'r'),sz=fs.statSync(f).size,magic=Buffer.alloc(4);
 try{fs.readSync(fd,magic,0,4,0);}finally{fs.closeSync(fd);}
 if(magic.toString()!=='PAR1')return {...base,status:'NOT_PARQUET_MAGIC',tickerPresence:'UNVERIFIED'};
 for(const command of ['python','py']){
  const args=command==='py'?['-3','-c',pyarrowCode,f]:['-c',pyarrowCode,f];
  const p=spawnSync(command,args,{encoding:'utf8',timeout:90000,maxBuffer:128000,windowsHide:true});
  if(p.error?.code==='ENOENT'||p.status!==0)continue;
  try{const result=JSON.parse((p.stdout||'').trim());return {...base,status:result.status,inspector:command,result,tickerPresence:result.status==='ROW_CONTENT_INSPECTED'?'SEE_RESULT':'UNVERIFIED'};}catch{}
 }
 return {...base,status:'PARQUET_ROWS_UNINSPECTED_READER_NOT_AVAILABLE',sizeBytes:sz,tickerPresence:'UNVERIFIED'};
};

export function investigate(root=dataRoot,requested=explicitParquet){
 if(!fs.existsSync(root))throw new Error('DATA_ROOT_UNAVAILABLE_NO_FALLBACK');
 const output={report:'ZGMINI_BIOTECH_MARKETPARQUET_R2',at:new Date().toISOString(),mode:'READ_ONLY_NO_PROVIDER_OR_D1_OR_SCHEDULER',
  sourceSearch:'R3_ORIGINAL_PREVIOUS_NOT_FOUND_NOT_REPEATED',dataRoot:root,found:[],files:[],parquet:[],issues:[],
  rights:'FREE_COMMERCIAL_DERIVED_AND_STORAGE_RIGHTS_NOT_VERIFIED',priceMode:'RAW_GMH_VS_SPLIT_ADJUSTED_MARKETPARQUET_NOT_INTERCHANGEABLE'};
 const raw=path.join(root,'theme-market-history-r131','raw');
 if(fs.existsSync(raw)){
  const n=fs.readdirSync(raw).filter(x=>/^(IBB|XBI|SPY)_.*\.json$/i.test(x));
  for(const filename of n){const f=safe(path.join(raw,filename),root);output.files.push(readRawJson(f,root));}
 }
 const mpCode=path.join(root,'theme-market-history-r131','marketparquet-r167');
 if(fs.existsSync(mpCode)){
  const candidates=fs.readdirSync(mpCode).filter(x=>/\.(mjs|json)$/i.test(x)).slice(0,100);
  for(const filename of candidates){const f=path.join(mpCode,filename);if(!fs.statSync(f).isFile())continue;
   const text=fs.readFileSync(f,'utf8');
   const hints=text.split(/\r?\n/).flatMap((line,i)=>{
    if(/password|secret|authorization|api[_-]?key|access[_-]?token|bearer/i.test(line))return [];
    return /marketparquet|\.parquet|download\/stock_daily|sourceRoot/i.test(line)?[{line:i+1,excerpt:line.trim().slice(0,170).replace(/https?:\/\/[^\s"']+/g,'SOURCE_URL_REDACTED')}]:[];
   }).slice(0,14);
   if(hints.length)output.found.push({path:cleanPath(f,root),hints});
  }
 }
 const paths=[path.join(root,'pc-writer','r10-march26.parquet')];
 if(requested)paths.push(safe(requested,root));
 for(const f of [...new Set(paths)])if(fs.existsSync(f)&&fs.statSync(f).isFile())output.parquet.push(inspectParquet(f,root));
 output.conclusion={knownJsonSymbolLiterals:[...new Set(output.files.flatMap(x=>x.symbolLiteralEvidence))],
  parquetTickerPresence:output.parquet.some(p=>p.result?.status==='ROW_CONTENT_INSPECTED')?'CHECK_PER_FILE_ROWS':'NO_CONFIRMED_PARQUET_ROWS',
  warning:'JSON provenance and Parquet row coverage, right grants, and price mode must all pass before provisional use.'};
 return output;
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 try{console.log(JSON.stringify(investigate(),null,2));}
 catch(e){console.log(JSON.stringify({report:'ZGMINI_BIOTECH_MARKETPARQUET_R2',status:'READONLY_FAILED',message:String(e?.message??e)},null,2));process.exitCode=1;}
}
