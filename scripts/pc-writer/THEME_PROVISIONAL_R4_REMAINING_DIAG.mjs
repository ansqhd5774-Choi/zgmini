// ZGMINI R4: read-only assessment for two missing provisional themes.
// It reads only registered tasks, pre-existing SHA-verified raw manifests,
// and pre-existing MarketParquet daily archives. Its sole write is this TXT.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUTPUT=path.join(HERE,'THEME_PROVISIONAL_R4_REMAINING_RESULT.txt');
const ROOT='E:\\ZGmini\\data';
const PARENT=path.join(ROOT,'theme-market-history-r131');
const ARCHIVE=path.join(PARENT,'marketparquet-r165');
const AUDITS=path.join(PARENT,'marketparquet-r167');
const EXPECTED_SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const SYMBOLS=['DTCR','GRID','UFO','NASA','WARP','ROKT','SPY'];
const NEED={power:['DTCR','GRID','SPY'],space:['UFO','NASA','WARP','ROKT','SPY']};
const out=[];
const sha=x=>createHash('sha256').update(x).digest('hex');
const put=(key,value)=>out.push(`${key}=${String(value).replace(/[\r\n]/g,' ').slice(0,450)}`);
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'));
function inside(base,target){
  const relative=path.relative(base,target);
  return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
}

function task(name,key){
  if(process.platform!=='win32'){put(`${key}_TASK`,'WINDOWS_ONLY');return;}
  const child=spawnSync('schtasks.exe',['/query','/tn',name,'/xml'],{
    windowsHide:true,timeout:15000,maxBuffer:2_000_000,encoding:'buffer'});
  if(child.error||child.status!==0){put(`${key}_TASK`,'NOT_FOUND_OR_NO_ACCESS');return;}
  const bytes=child.stdout;
  const xml=bytes[0]===0xff&&bytes[1]===0xfe?bytes.subarray(2).toString('utf16le'):
    bytes[0]===0x3c&&bytes[1]===0x00?bytes.toString('utf16le'):
    bytes.toString('utf8').replace(/^\uFEFF/,'');
  const actions=xml.match(/<Actions(?:\s[^>]*)?>[\s\S]*?<\/Actions>/gi)||[];
  const action=actions.join(' ');
  put(`${key}_TASK`,'REGISTERED');
  put(`${key}_ACTION_VERSION`,/BIOTECH_R8|source-r8|biotech[^<]{0,80}r8/i.test(action)?'R8':
    /data.center.power[^<]{0,80}r6|source-r6/i.test(action)?'R6':
    /data.center.power[^<]{0,80}r5|source-r5/i.test(action)?'R5':
    /space.satellite|space[_-]satellite/i.test(action)?'SPACE': 'NOT_CLASSIFIED');
  put(`${key}_TRIGGER_COUNT`,(xml.match(/<CalendarTrigger\b|<TimeTrigger\b|<BootTrigger\b|<LogonTrigger\b/gi)||[]).length);
  put(`${key}_ENABLED`,/<Enabled>true<\/Enabled>/i.test(xml)?'TRUE_OR_TRIGGER_ENABLED':'UNDETERMINED');
}

function sourceManifest(id,key,symbols){
  const home=path.join(ROOT,'themes',id),manifestPath=path.join(home,'raw-manifest.json');
  if(!fs.existsSync(manifestPath)){put(`${key}_MANIFEST`,'NOT_FOUND');return;}
  try{
    const base=fs.realpathSync(home),file=fs.realpathSync(manifestPath);
    if(!inside(base,file)||fs.statSync(file).size>2_000_000)throw Error('MANIFEST_PATH_UNSAFE');
    const content=fs.readFileSync(file),doc=JSON.parse(content.toString('utf8'));
    if(doc.version!==1||doc.themeId!==id||!Array.isArray(doc.files))throw Error('IDENTITY_MISMATCH');
    put(`${key}_MANIFEST`,'READABLE');put(`${key}_MANIFEST_SHA256`,sha(content));
    for(const symbol of symbols){
      const found=doc.files.filter(x=>x?.path?.startsWith('raw/'+symbol+'_')&&date(x.observationThrough))
        .sort((a,b)=>b.observationThrough.localeCompare(a.observationThrough));
      const newest=found[0];
      if(!newest){put(`${key}_${symbol}_RAW`,'NOT_LISTED');continue;}
      put(`${key}_${symbol}_OBSERVED_THROUGH`,newest.observationThrough);
      if(!/^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(newest.path)||
        !/^[a-f0-9]{64}$/.test(newest.sha256)||!newest.path.endsWith(newest.sha256+'.jsonl')){
        put(`${key}_${symbol}_RAW`,'BAD_MANIFEST_ENTRY');continue;
      }
      const real=fs.realpathSync(path.join(base,newest.path));
      if(!inside(base,real)||fs.statSync(real).size>12_000_000){
        put(`${key}_${symbol}_RAW`,'UNSAFE_SIZE_OR_PATH');continue;
      }
      put(`${key}_${symbol}_RAW`,sha(fs.readFileSync(real))===newest.sha256?'LATEST_SHA_VERIFIED':'HASH_MISMATCH');
    }
  }catch(error){put(`${key}_MANIFEST_CHECK`,'STOPPED_'+String(error.code||error.message||'UNKNOWN').slice(0,60));}
}

async function parquetModule(){
  try{return await import('hyparquet');}catch{/* existing PC copy only */}
  const paths=[process.env.ZGMINI_HYPARQUET_MODULE,
    path.join(PARENT,'marketparquet-r167','node_modules','hyparquet','src','index.js')];
  const projectRoot=path.join(ROOT,'projects');
  if(fs.existsSync(projectRoot)){
    for(const name of fs.readdirSync(projectRoot).slice(0,80)){
      paths.push(path.join(projectRoot,name,'node_modules','hyparquet','src','index.js'));
      paths.push(path.join(projectRoot,name,'zgmini','node_modules','hyparquet','src','index.js'));
    }
  }
  const existing=paths.find(p=>typeof p==='string'&&fs.existsSync(p));
  if(!existing)throw Error('EXISTING_HYPARQUET_NOT_FOUND');
  return import(pathToFileURL(fs.realpathSync(existing)).href);
}

async function savedParquet(){
  if(!fs.existsSync(ARCHIVE)||!fs.existsSync(AUDITS)){
    put('MARKETPARQUET_ARCHIVE','NOT_FOUND');return;
  }
  const all=fs.readdirSync(ARCHIVE).filter(x=>/^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(x)).sort();
  put('MARKETPARQUET_ARCHIVE',all.length?'FOUND':'EMPTY');
  if(!all.length)return;
  // Latest three saved sessions: strictly bounded, no historical re-scan.
  const recent=all.slice(-3);put('MARKETPARQUET_DATES',recent.map(x=>x.slice(10,20)).join(','));
  let mod;
  try{mod=await parquetModule();}catch(e){put('MARKETPARQUET_DECODER',e.message);return;}
  if(typeof mod.parquetReadObjects!=='function'){
    put('MARKETPARQUET_DECODER','NO_PARQUET_READ_OBJECTS');return;
  }
  const has=Object.fromEntries(SYMBOLS.map(x=>[x,[]]));
  for(const filename of recent){
    const day=filename.slice(10,20),filepath=path.join(ARCHIVE,filename),auditFile=path.join(AUDITS,filename.replace('.parquet','.audit.json'));
    try{
      const bytes=fs.readFileSync(filepath),validMagic=bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&
        bytes.toString('ascii',bytes.length-4)==='PAR1';
      if(!validMagic)throw Error('BAD_PARQUET_MAGIC');
      const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
      if(audit.date!==day||audit.sha256!==sha(bytes)||audit.complete!==true||audit.source!==EXPECTED_SOURCE)
        throw Error('SHA_AUDIT_MISMATCH');
      const arr=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
      const rows=await mod.parquetReadObjects({file:arr,columns:['date','symbol','asset_type','close']});
      if(!Array.isArray(rows))throw Error('PARQUET_ROW_FORMAT');
      const available=new Set();
      for(const row of rows){
        const symbol=typeof row?.symbol==='string'?row.symbol.toUpperCase():'';
        if(!SYMBOLS.includes(symbol))continue;
        const actual=row.date instanceof Date?row.date.toISOString().slice(0,10):
          typeof row.date==='string'?row.date.slice(0,10):
          Number.isInteger(row.date)?new Date(row.date*86400000).toISOString().slice(0,10):null;
        if(actual!==day||!(row.close>0)||
          (row.asset_type&&String(row.asset_type).toLowerCase()!=='etf'))throw Error('TARGET_ROW_INVALID');
        if(available.has(symbol))throw Error('DUPLICATE_TARGET_'+symbol);
        available.add(symbol);
      }
      for(const symbol of available)has[symbol].push(day);
      put('MARKETPARQUET_'+day+'_AUDIT','SHA_VERIFIED');
    }catch(e){put('MARKETPARQUET_'+day+'_AUDIT','STOPPED_'+String(e.code||e.message).slice(0,50));}
  }
  for(const symbol of SYMBOLS)put('MARKETPARQUET_'+symbol+'_VERIFIED_DATES',has[symbol].join(',')||'NONE');
  for(const [id,symbols] of Object.entries(NEED)){
    const latest=recent.at(-1).slice(10,20);
    const covered=symbols.filter(symbol=>has[symbol].includes(latest));
    put(`MARKETPARQUET_${id.toUpperCase()}_LATEST_COVERAGE`,covered.length+'/'+symbols.length);
    put(`MARKETPARQUET_${id.toUpperCase()}_LATEST_SYMBOLS`,covered.join(',')||'NONE');
  }
}

async function publicApi(){
  await new Promise(resolve=>{
    const request=https.get('https://zgmini.kr/api/theme-fear-greed/',{
      timeout:16000,headers:{accept:'application/json','user-agent':'ZGMINI-R4-readonly/1'}},response=>{
      put('PUBLIC_HTTP',response.statusCode);
      if(response.statusCode!==200){response.resume();resolve();return;}
      const bufs=[];let size=0;
      response.on('data',b=>{size+=b.length;if(size>3_000_000)request.destroy(Error('OVERSIZED'));else bufs.push(b);});
      response.on('end',()=>{
        try{
          const doc=JSON.parse(Buffer.concat(bufs).toString('utf8'));
          const points=Array.isArray(doc.provisional?.points)?doc.provisional.points:[];
          const current=points.at(-1),scores=current?.scores&&typeof current.scores==='object'?current.scores:{};
          put('PUBLIC_STATUS',doc.status??'UNKNOWN');
          put('PUBLIC_PROVISIONAL_DATE',current?.date??'NONE');
          put('PUBLIC_PROVISIONAL_COUNT',Object.keys(scores).length);
          for(const label of ['바이오·신약','데이터센터·전력','우주·위성'])
            put('PUBLIC_'+({'바이오·신약':'BIOTECH','데이터센터·전력':'POWER','우주·위성':'SPACE'}[label]),
              Object.hasOwn(scores,label)?'PRESENT':'ABSENT');
        }catch{put('PUBLIC_JSON','INVALID');}
        resolve();
      });
    });
    request.on('timeout',()=>request.destroy(Error('TIMEOUT')));
    request.on('error',e=>{put('PUBLIC_REQUEST',e.message==='TIMEOUT'?'TIMEOUT':'NETWORK_ERROR');resolve();});
  });
}

async function main(){
  if(process.argv.length!==3||path.resolve(process.argv[2])!==path.resolve(OUTPUT))throw Error('OUTPUT_ARGUMENT_INVALID');
  put('REPORT','THEME_PROVISIONAL_R4_REMAINING_READONLY');put('RUN_UTC',new Date().toISOString());
  put('READ_ONLY','YES');put('PC_OS',process.platform);
  out.push('');out.push('[CURRENT TASKS]');
  task('\\ZGMINI-PC-Theme-Biotech','BIOTECH');
  task('\\ZGMINI-PC-Theme-Data-Center-Power','POWER');
  task('\\ZGMINI-PC-Theme-Space-Satellite','SPACE');
  out.push('');out.push('[EXISTING VERIFIED UPSTREAM SOURCE]');
  sourceManifest('data-center-power','POWER',['DTCR','GRID','SPY']);
  sourceManifest('space-satellite','SPACE',['UFO','NASA','WARP','ROKT']);
  out.push('');out.push('[EXISTING MARKETPARQUET LATEST DAYS - ONLY AVAILABILITY, NO SCORE]');
  await savedParquet();
  out.push('');out.push('[PUBLIC API]');await publicApi();
  put('D1_WRITES',0);put('PC_RAW_WRITES',0);put('SCHEDULER_WRITES',0);
  put('NEXT','Upload this TXT. Neither publication nor scheduler cutover was attempted.');
  fs.writeFileSync(OUTPUT,'\ufeff'+out.join('\r\n')+'\r\n','utf8');
  process.stdout.write('RESULT_TXT_CREATED\n');
}
main().catch(e=>{
  put('DIAGNOSTIC_ERROR',e.code||e.message||'UNKNOWN');
  try{fs.writeFileSync(OUTPUT,'\ufeff'+out.join('\r\n')+'\r\n','utf8');}catch{}
  process.exitCode=1;
});
