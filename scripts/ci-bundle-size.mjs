// R2 Bundle Size CI: deterministic read-only measurement of existing Vite
// client JS/CSS output. Raw bytes and per-file gzip are not HTTP transfer sizes.
// No registry, browser, baseline writes, or additional network access.
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Writable} from 'node:stream';
import {createGzip} from 'node:zlib';
import {fileURLToPath} from 'node:url';

export const SCHEMA_VERSION=1;
const EMPTY=()=>({files:0,rawBytes:0,gzipBytes:0});

export async function measureAssetFile(filepath){
 const before=await stat(filepath);
 if(!before.isFile()||!Number.isSafeInteger(before.size))
  throw Error('CI_BUNDLE_SIZE_INVALID_FILE');
 let rawBytes=0,gzipBytes=0;
 const digest=createHash('sha256');
 const source=createReadStream(filepath);
 source.on('data',chunk=>{
  rawBytes+=chunk.length;
  digest.update(chunk);
 });
 const sink=new Writable({write(chunk,_encoding,callback){
  gzipBytes+=chunk.length;
  callback();
 }});
 await pipeline(source,createGzip({level:6}),sink);
 const after=await stat(filepath);
 if(after.size!==before.size||rawBytes!==before.size||
    after.mtimeMs!==before.mtimeMs)
  throw Error('CI_BUNDLE_SIZE_FILE_CHANGED_DURING_READ');
 return {rawBytes,gzipBytes,sha256:digest.digest('hex')};
}

export async function collectBundleSize(directory){
 const entries=await readdir(directory,{withFileTypes:true});
 const files=[];
 for(const entry of entries){
  const kind=entry.name.endsWith('.js')?'js':
   entry.name.endsWith('.css')?'css':null;
  if(!kind)continue;
  if(!entry.isFile())throw Error('CI_BUNDLE_SIZE_ASSET_NOT_REGULAR');
  files.push({name:entry.name,kind});
 }
 files.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 const totals={js:EMPTY(),css:EMPTY()};
 const items=[];
 for(const file of files){
  const m=await measureAssetFile(join(directory,file.name));
  items.push({...file,...m});
  const category=totals[file.kind];
  category.files++;
  category.rawBytes+=m.rawBytes;
  category.gzipBytes+=m.gzipBytes;
 }
 if(!totals.js.files||!totals.css.files)
  throw Error('CI_BUNDLE_SIZE_REQUIRED_ASSETS_MISSING');
 for(const value of Object.values(totals)){
  if(!Number.isSafeInteger(value.rawBytes)||!Number.isSafeInteger(value.gzipBytes))
   throw Error('CI_BUNDLE_SIZE_BYTES_OVERFLOW');
 }
 return {
  schemaVersion:SCHEMA_VERSION,
  scope:'dist/client/assets/*.js,*.css',
  compression:'per-file gzip level 6 (estimate; not served transfer bytes)',
  totals,
  files:items
 };
}

function goodTotal(v){
 return v&&Number.isSafeInteger(v.files)&&v.files>=0&&
  Number.isSafeInteger(v.rawBytes)&&v.rawBytes>=0&&
  Number.isSafeInteger(v.gzipBytes)&&v.gzipBytes>=0;
}
export function compareBundleSizes(baseline,current){
 if(!baseline||!current||
    baseline.schemaVersion!==SCHEMA_VERSION||
    current.schemaVersion!==SCHEMA_VERSION||
    baseline.scope!==current.scope||
    !['js','css'].every(k=>goodTotal(baseline.totals?.[k])&&
      goodTotal(current.totals?.[k])))
  throw Error('CI_BUNDLE_SIZE_BASELINE_INCOMPARABLE');
 const compared={};
 for(const kind of ['js','css']){
  const old=baseline.totals[kind],next=current.totals[kind];
  const rawDelta=next.rawBytes-old.rawBytes;
  const gzipDelta=next.gzipBytes-old.gzipBytes;
  compared[kind]={
   rawDeltaBytes:rawDelta,
   gzipDeltaBytes:gzipDelta,
   rawPercent:old.rawBytes?Math.round(rawDelta/old.rawBytes*1e4)/100:null,
   gzipPercent:old.gzipBytes?Math.round(gzipDelta/old.gzipBytes*1e4)/100:null
  };
 }
 return compared;
}

// Comparison is descriptive and needs an existing GitHub Actions artifact.
// Missing or schema-incompatible history must never be recorded as a zero delta.
export async function compareSavedBundleReports(currentPath,baselinePath){
 const current=JSON.parse(await readFile(currentPath,'utf8'));
 let baseline;
 try{baseline=JSON.parse(await readFile(baselinePath,'utf8'));}
 catch(error){
  if(error?.code==='ENOENT')return {status:'UNAVAILABLE_NO_BASELINE'};
  if(error instanceof SyntaxError)return {status:'UNVERIFIED_BASELINE_JSON'};
  throw error;
 }
 try{return {status:'COMPARABLE',schemaVersion:SCHEMA_VERSION,
  scope:current.scope,delta:compareBundleSizes(baseline,current)};}
 catch(error){
  if(error?.message==='CI_BUNDLE_SIZE_BASELINE_INCOMPARABLE')
   return {status:'INCOMPARABLE_BASELINE'};
  throw error;
 }
}

export async function main(){
 if(process.argv.length===3&&process.argv[2]==='--compare-baseline'){
  const result=await compareSavedBundleReports(
   resolve('artifacts/ci-bundle-size/report.json'),
   resolve('artifacts/ci-bundle-size/baseline/report.json'));
  if(result.status==='COMPARABLE'){
   result.baselineRunId=/^[1-9]\d*$/.test(process.env.CI_BUNDLE_BASELINE_RUN_ID??'')?
    Number(process.env.CI_BUNDLE_BASELINE_RUN_ID):null;
   await writeFile(resolve('artifacts/ci-bundle-size/comparison.json'),
    JSON.stringify(result,null,2)+'\n','utf8');
  }
  console.log('CI_BUNDLE_SIZE_BASELINE='+result.status+
   (result.status==='COMPARABLE'?' '+JSON.stringify(result.delta):''));
  return;
 }
 if(process.argv.length!==2)throw Error('CI_BUNDLE_SIZE_NO_ARGUMENTS');
 const root=resolve('dist/client/assets');
 const report=await collectBundleSize(root);
 const output=resolve('artifacts/ci-bundle-size/report.json');
 await mkdir(resolve('artifacts/ci-bundle-size'),{recursive:true});
 await writeFile(output,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('CI_BUNDLE_SIZE_METRICS '+JSON.stringify(report.totals));
 console.log('CI_BUNDLE_SIZE_BASELINE=UNAVAILABLE (report only; no artificial threshold)');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
