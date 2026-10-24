// R3: inspect the actual marketparquet-r165 raw archive indicated by R167.
// Read-only; no download, R3-original search, price rewrite, D1, or scheduling.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const arg=(k,def)=>{const i=process.argv.indexOf(k);return i>=0?process.argv[i+1]:def;};
const root=path.resolve(arg('--data-root','E:/ZGmini/data'));
const sha=f=>{const h=createHash('sha256'),fd=fs.openSync(f,'r'),buf=Buffer.alloc(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');};
const relative=(f,r)=>path.relative(r,f).replaceAll('\\','/');
const safe=(f,r)=>{const x=path.resolve(f);if(!x.startsWith(path.resolve(r)+path.sep))throw new Error('UNSAFE_FILE_PATH');return x;};

const pythonCode=String.raw`
import json,sys
p=sys.argv[1]
try:
 import duckdb
 db=duckdb.connect(':memory:')
 meta=db.execute('select * from read_parquet(?) limit 0',[p]).description
 cols=[m[0] for m in meta]
 symbol=next((x for x in cols if x.lower() in ('symbol','ticker')),None)
 date=next((x for x in cols if x.lower() in ('date','timestamp','datetime','time')),None)
 if not symbol:
  print(json.dumps({'status':'NO_SYMBOL_COLUMN','columns':cols[:40]}));sys.exit(0)
 dateExpr=('min("'+date+'") as first,max("'+date+'") as last' if date else 'null as first,null as last')
 sql='select "'+symbol+'" as symbol,count(*) as rows,'+dateExpr+' from read_parquet(?) where upper(cast("'+symbol+'" as varchar)) in (?,?,?) group by 1'
 rows=db.execute(sql,[p,'IBB','XBI','SPY']).fetchall()
 out={t:{'rows':0} for t in ['IBB','XBI','SPY']}
 for t,n,first,last in rows:out[str(t).upper()]={'rows':int(n),'first':str(first),'last':str(last)}
 print(json.dumps({'status':'PARQUET_ROWS_VERIFIED','reader':'python_duckdb','columns':cols[:40],'symbols':out}))
 sys.exit(0)
except ImportError:
 pass
except Exception as e:
 print(json.dumps({'status':'DUCKDB_ROW_READ_FAILED','detail':str(e)[:180]}));sys.exit(0)
try:
 import pyarrow.parquet as pq
 import pyarrow.compute as pc
 t=pq.read_table(p);cols=t.column_names
 symbol=next((x for x in cols if x.lower() in ('symbol','ticker')),None)
 date=next((x for x in cols if x.lower() in ('date','timestamp','datetime','time')),None)
 if not symbol:print(json.dumps({'status':'NO_SYMBOL_COLUMN','columns':cols[:40]}));sys.exit(0)
 out={}
 for ticker in ('IBB','XBI','SPY'):
  mask=pc.equal(t[symbol],ticker);n=int(pc.sum(pc.cast(mask,'int64')).as_py() or 0)
  row={'rows':n}
  if n and date:
   a=pc.filter(t[date],mask);row.update({'first':str(pc.min(a).as_py()),'last':str(pc.max(a).as_py())})
  out[ticker]=row
 print(json.dumps({'status':'PARQUET_ROWS_VERIFIED','reader':'python_pyarrow','columns':cols[:40],'symbols':out}))
except ImportError:
 print(json.dumps({'status':'NO_INSTALLED_PARQUET_DECODER'}))
except Exception as e:
 print(json.dumps({'status':'PYARROW_ROW_READ_FAILED','detail':str(e)[:180]}))
`;

const parquetMeta=f=>{
 const s=fs.statSync(f).size,header=Buffer.alloc(4),tail=Buffer.alloc(8),fd=fs.openSync(f,'r');
 try{if(s>=8){fs.readSync(fd,header,0,4,0);fs.readSync(fd,tail,0,8,s-8);}}finally{fs.closeSync(fd);}
 const footerSize=tail.readUInt32LE(0),isParquet=s>=12&&header.toString()==='PAR1'&&tail.subarray(4).toString()==='PAR1'&&footerSize>0&&footerSize<=s-12;
 return {sizeBytes:s,sha256:sha(f),magicAndFooterValid:isParquet,footerSize:isParquet?footerSize:null};
};
const inspectRows=f=>{
 const failedReaders=[];
 for(const command of ['python','py']){
  const args=command==='py'?['-3','-c',pythonCode,f]:['-c',pythonCode,f];
  const p=spawnSync(command,args,{encoding:'utf8',timeout:90000,maxBuffer:80000,windowsHide:true});
  if(p.error||p.status!==0)continue;
  try{const report=JSON.parse((p.stdout||'').trim());if(report.status==='PARQUET_ROWS_VERIFIED')return report;
    failedReaders.push({reader:command,status:report.status});}catch{}
 }
 // DuckDB CLI is optional and does not save a database. Only symbol counts here.
 const sqlFile=f.replaceAll("'","''").replaceAll('\\','/');
 const sql=`SELECT upper(cast(symbol as varchar)) AS symbol,count(*) AS rows FROM read_parquet('${sqlFile}') WHERE upper(cast(symbol as varchar)) IN ('IBB','XBI','SPY') GROUP BY 1;`;
 const db=spawnSync('duckdb',['-csv',':memory:','-c',sql],{encoding:'utf8',timeout:90000,maxBuffer:60000,windowsHide:true});
 if(!db.error&&db.status===0){const rows=db.stdout.trim().split(/\r?\n/).slice(1);const symbols=Object.fromEntries(['IBB','XBI','SPY'].map(s=>[s,{rows:0}]));for(const row of rows){const [t,n]=row.split(',');if(symbols[t])symbols[t].rows=Number(n);}return {status:'PARQUET_ROWS_VERIFIED',reader:'duckdb_cli',symbols};}
 return {status:'PARQUET_ROWS_UNINSPECTED_NO_DECODER',failedReaders,
  warning:'No new software is installed. Filename and audit metadata do not prove symbol rows.'};
};

const auditMeta=(f,r)=>{
 let obj;try{obj=JSON.parse(fs.readFileSync(f,'utf8'));}catch{return {path:relative(f,r),status:'INVALID_JSON'};}
 const objKeys=Object.keys(obj),summary={path:relative(f,r),sha256:sha(f),keys:objKeys.slice(0,35),source:obj.source??null};
 for(const k of ['date','status','rows','coverage','file','fileSha256','sha256','downloadSha256','sourceVersion','tickerCount','symbolCount','symbols']){
  if(obj[k]!==undefined)summary[k]=typeof obj[k]==='string'?obj[k].slice(0,140):typeof obj[k]==='number'?obj[k]:
   Array.isArray(obj[k])?obj[k].filter(x=>typeof x==='string').slice(0,35):null;
 }
 return summary;
};

export function inspectArchive(dataRoot=root,{maxRecent=7,attemptRowRead=true}={}){
 const out={report:'ZGMINI_BIOTECH_MARKETPARQUET_R3',checkedAt:new Date().toISOString(),mode:'READ_ONLY',
  rights:'NOT_VERIFIED_FOR_FREE_COMMERCIAL_DERIVED_PUBLICATION',originalR3Searches:0,providerCalls:0,d1Writes:0,schedulerWrites:0,
  savedCommonSessionRefetches:0};
 if(!fs.existsSync(dataRoot))return {...out,status:'DATA_ROOT_UNAVAILABLE_NO_FALLBACK'};
 const top=safe(path.join(dataRoot,'theme-market-history-r131'),dataRoot);
 const archive=safe(path.join(top,'marketparquet-r165'),dataRoot);
 const source=safe(path.join(top,'marketparquet-r167'),dataRoot);
 out.archive={path:relative(archive,dataRoot),exists:fs.existsSync(archive)};
 const code=path.join(source,'r167-cycle.mjs');
 if(fs.existsSync(code)){
  const lines=fs.readFileSync(code,'utf8').split(/\r?\n/);
  out.codeReferences=lines.flatMap((s,i)=>/^(?:const|let) (?:archive|root|home)=|^import .*from /.test(s.trim())?
   [{line:i+1,text:s.trim().slice(0,160)}]:[]).slice(0,20);
 }
 if(!fs.existsSync(archive))return {...out,status:'ARCHIVE_NOT_PRESENT_NOT_PROVEN_PROVIDER_ABSENT'};
 const all=fs.readdirSync(archive).filter(f=>/^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(f)).sort();
 out.archive.count=all.length;out.archive.firstDate=all[0]?.slice(10,20)??null;out.archive.lastDate=all.at(-1)?.slice(10,20)??null;
 out.archive.otherFileCount=fs.readdirSync(archive).length-all.length;
 const names=all.slice(-maxRecent);out.recentParquet=[];
 for(const name of names){const f=safe(path.join(archive,name),dataRoot),meta=parquetMeta(f);
  out.recentParquet.push({date:name.slice(10,20),path:relative(f,dataRoot),...meta,
   rowEvidence:meta.magicAndFooterValid&&attemptRowRead?inspectRows(f):{status:'ROW_INSPECTION_NOT_AVAILABLE_OR_INVALID_FOOTER'}});
 }
 out.audit=[];
 for(const name of names){const audit=path.join(source,name.replace('.parquet','.audit.json'));if(fs.existsSync(audit))out.audit.push(auditMeta(audit,dataRoot));}
 // These audits may live in R167 without matching archive files.
 for(const name of ['etf_daily_2026-10-16.audit.json','etf_daily_2026-10-19.audit.json','etf_daily_2026-10-20.audit.json','etf_daily_2026-10-21.audit.json','etf_daily_2026-10-22.audit.json']){
  const f=path.join(source,name);if(fs.existsSync(f)&&!out.audit.some(x=>x.path===relative(f,dataRoot)))out.audit.push(auditMeta(f,dataRoot));
 }
 const rights=path.join(source,'R171_MARKETPARQUET_RIGHTS_EVIDENCE.json');
 if(fs.existsSync(rights)){
  let v={};try{v=JSON.parse(fs.readFileSync(rights,'utf8'));}catch{}
  out.savedRightsClaim={file:relative(rights,dataRoot),sha256:sha(rights),keys:Object.keys(v),
   provider:v.provider??null,useCase:v.useCase??null,permission:v.permission??null,kind:v.kind??null,
   legalStatus:'SAVED_CLAIM_ONLY_NOT_INDEPENDENT_LICENSE_GRANT'};
 }
 out.status=out.recentParquet.some(x=>x.rowEvidence.status==='PARQUET_ROWS_VERIFIED')?'SOME_PARQUET_ROWS_VERIFIED':'PARQUET_ROWS_NOT_VERIFIED';
 out.caution='MarketParquet adjusted EOD cannot be combined with unadjusted GMH 15:00 NY hourly prices without approved reconciliation.';
 return out;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(inspectArchive(),null,2));}
 catch(e){console.log(JSON.stringify({report:'ZGMINI_BIOTECH_MARKETPARQUET_R3',status:'READONLY_FAILED',error:String(e?.message??e)},null,2));process.exitCode=1;}
}
