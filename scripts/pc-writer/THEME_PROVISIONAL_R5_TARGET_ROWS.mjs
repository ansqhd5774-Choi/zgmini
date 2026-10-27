// R5 read-only follow-up to R4: inspect approved MarketParquet symbol coverage.
// Does not install packages, contact providers, calculate scores or write D1.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'THEME_PROVISIONAL_R5_TARGET_ROWS_RESULT.txt');
const DATA='E:\\ZGmini\\data';
const PARENT=path.join(DATA,'theme-market-history-r131');
const ARCHIVE=path.join(PARENT,'marketparquet-r165');
const AUDITS=path.join(PARENT,'marketparquet-r167');
const R8=path.join(DATA,'themes','biotech','source-r8','scripts','pc-writer','theme-biotech-provisional-r8.mjs');
const SYMBOLS=['DTCR','GRID','UFO','NASA','WARP','ROKT','SPY'];
const KNOWN=['2026-10-23','2026-10-26'];
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const report=[];
const say=(k,v)=>report.push(`${k}=${String(v).replace(/[\r\n]/g,' ').slice(0,240)}`);
const hash=b=>createHash('sha256').update(b).digest('hex');

function existingPackageLocations(){
  const roots=[
    path.dirname(R8),path.dirname(path.dirname(R8)),
    path.dirname(path.dirname(path.dirname(R8))),
    path.dirname(path.dirname(path.dirname(path.dirname(R8)))),
    path.join(DATA,'theme-market-history-r131','marketparquet-r167'),
    'E:\\ZGmini\\runtime',
  ];
  for(const projects of ['E:\\ZGmini\\projects',path.join(DATA,'projects')]){
    if(!fs.existsSync(projects))continue;
    for(const item of fs.readdirSync(projects,{withFileTypes:true}).filter(x=>x.isDirectory()).slice(0,80)){
      roots.push(path.join(projects,item.name),path.join(projects,item.name,'zgmini'));
    }
  }
  const candidates=[process.env.ZGMINI_HYPARQUET_MODULE];
  if(fs.existsSync(R8)){
    try{candidates.push(createRequire(pathToFileURL(R8).href).resolve('hyparquet'));}
    catch{/* Import-only packages may not resolve in require mode. */}
  }
  for(const root of roots){
    candidates.push(path.join(root,'node_modules','hyparquet','src','index.js'));
    candidates.push(path.join(root,'node_modules','hyparquet','dist','index.js'));
  }
  return [...new Set(candidates.filter(p=>typeof p==='string'))];
}

async function decoder(){
  try{
    const mod=await import('hyparquet');
    if(typeof mod.parquetReadObjects==='function'){
      say('DECODER_SOURCE','DIRECT');return mod;
    }
  }catch{}
  for(const loc of existingPackageLocations()){
    if(!fs.existsSync(loc))continue;
    try{
      const mod=await import(pathToFileURL(fs.realpathSync(loc)).href);
      if(typeof mod.parquetReadObjects==='function'){
        say('DECODER_SOURCE','EXISTING_APPROVED_PC_MODULE');return mod;
      }
    }catch{/* Examine only existing paths. */}
  }
  throw new Error('MODULE_NOT_RESOLVED_FROM_R8_OR_PC_PROJECTS');
}

function dateOnly(x){
  if(x instanceof Date)return x.toISOString().slice(0,10);
  if(typeof x==='string')return x.slice(0,10);
  if(Number.isInteger(x)&&x>=10000&&x<100000)return new Date(x*86400000).toISOString().slice(0,10);
  return null;
}
async function inspect(){
  if(!fs.existsSync(R8)){
    say('R8_APPROVED_SOURCE','NOT_FOUND');
  }else say('R8_APPROVED_SOURCE','FOUND');
  let mod;
  try{mod=await decoder();say('DECODER','READY');}
  catch(e){say('DECODER','BLOCKED');say('DECODER_REASON',e.message);return;}
  const availability={};
  for(const d of KNOWN){
    const name=`etf_daily_${d}`;
    const f=path.join(ARCHIVE,name+'.parquet');
    const auditFile=path.join(AUDITS,name+'.audit.json');
    try{
      const bytes=fs.readFileSync(f);
      const m=bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&
        bytes.toString('ascii',bytes.length-4)==='PAR1';
      if(!m)throw Error('PARQUET_MAGIC_INVALID');
      const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
      if(audit.date!==d||audit.sha256!==hash(bytes)||audit.complete!==true||audit.source!==SOURCE)
        throw Error('SAVED_AUDIT_SHA_INVALID');
      const contents=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
      const rows=await mod.parquetReadObjects({file:contents,columns:['date','symbol','asset_type','close']});
      if(!Array.isArray(rows))throw Error('PARQUET_OBJECTS_INVALID');
      const found=new Set();
      for(const row of rows){
        const s=typeof row?.symbol==='string'?row.symbol.toUpperCase():'';
        if(!SYMBOLS.includes(s))continue;
        if(dateOnly(row.date)!==d||typeof row.close!=='number'||!(row.close>0)||
          (row.asset_type&&String(row.asset_type).toLowerCase()!=='etf'))
          throw Error('TARGET_ROW_INVALID_'+s);
        if(found.has(s))throw Error('DUPLICATE_ETF_'+s);
        found.add(s);
      }
      availability[d]=found;
      say('DATE_'+d+'_AUDIT','SHA_VERIFIED');
      for(const s of SYMBOLS)say('DATE_'+d+'_'+s,found.has(s)?'VALID_ETF_ROW':'ABSENT');
    }catch(e){say('DATE_'+d+'_AUDIT','BLOCKED');say('DATE_'+d+'_REASON',e.code||e.message||'UNKNOWN');}
  }
  const overlap=availability[KNOWN[0]],latest=availability[KNOWN[1]];
  if(overlap&&latest){
    for(const [id,symbols] of Object.entries({POWER:['DTCR','GRID','SPY'],SPACE:['UFO','NASA','WARP','ROKT','SPY']})){
      say(id+'_OVERLAP_COVERAGE',symbols.filter(s=>overlap.has(s)).length+'/'+symbols.length);
      say(id+'_LATEST_COVERAGE',symbols.filter(s=>latest.has(s)).length+'/'+symbols.length);
      say(id+'_LATEST_PRESENT',symbols.filter(s=>latest.has(s)).join(',')||'NONE');
      say(id+'_LATEST_MISSING',symbols.filter(s=>!latest.has(s)).join(',')||'NONE');
    }
  }
}

async function main(){
  if(process.argv.length!==3||path.resolve(process.argv[2])!==path.resolve(OUT))throw Error('OUTPUT_ARG_INVALID');
  say('REPORT','THEME_PROVISIONAL_R5_TARGET_ROWS_READONLY');
  say('RUN_UTC',new Date().toISOString());
  say('READ_ONLY','YES');
  try{await inspect();}
  catch(e){say('INSPECTION','BLOCKED');say('REASON',e.code||e.message||'UNKNOWN');}
  say('PROVIDER_CALLS',0);say('D1_WRITES',0);say('RAW_WRITES',0);say('TASK_CHANGES',0);
  fs.writeFileSync(OUT,'\ufeff'+report.join('\r\n')+'\r\n','utf8');
  process.stdout.write('R5_RESULT_TXT_CREATED\n');
}
main().catch(e=>{
  say('EXIT_ERROR',e.code||e.message||'UNKNOWN');
  try{fs.writeFileSync(OUT,'\ufeff'+report.join('\r\n')+'\r\n','utf8');}catch{}
  process.exitCode=1;
});
