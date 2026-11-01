// Tenth theme, private candidate only. Reuses the existing GMH collector and
// approved R188 ETF-only scorer. No public API, D1, task or existing theme writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {regularHour15Rows,scoreAll252} from './theme-optional-score-r188.mjs';

const THEME='data-center-power';
const SYMBOLS=['DTCR','GRID','SPY'];
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const PRICE_MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const RAW_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValid=(value,code)=>{if(!value)throw Object.assign(new Error(code),{code});};
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

export function calculateDataCenterPower({dataRoot}={}){
 requireValid(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'DC_POWER_DATA_ROOT_MISSING');
 const root=fs.realpathSync(dataRoot),home=path.join(root,'themes',THEME);
 requireValid(fs.existsSync(home)&&fs.realpathSync(home)===home,'DC_POWER_HOME_MISSING');
 const manifestPath=path.join(home,'raw-manifest.json');
 requireValid(fs.existsSync(manifestPath),'DC_POWER_MANIFEST_MISSING');
 const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
 requireValid(manifest.version===1&&manifest.themeId===THEME&&Array.isArray(manifest.files)&&
  manifest.files.length>=3,'DC_POWER_MANIFEST_INVALID');
 const bars=Object.fromEntries(SYMBOLS.map(s=>[s,new Map()]));
 const observedFiles=new Set();
 for(const entry of manifest.files){
  requireValid(typeof entry.path==='string'&&/^raw\/(DTCR|GRID|SPY)_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   /^[a-f0-9]{64}$/.test(entry.sha256??'')&&entry.path.endsWith(entry.sha256+'.jsonl'),
   'DC_POWER_RAW_PATH_INVALID');
  requireValid(entry.source==='https://getmarkethistory.com'&&entry.priceMode===RAW_MODE&&
   Number.isFinite(Date.parse(entry.collectedAt))&&isDate(entry.observationThrough),
   'DC_POWER_SOURCE_INVALID');
  const filename=path.join(home,entry.path),real=fs.realpathSync(filename);
  requireValid(real.startsWith(home+path.sep),'DC_POWER_RAW_PATH_ESCAPE');
  const bytes=fs.readFileSync(real);
  requireValid(sha(bytes)===entry.sha256,'DC_POWER_RAW_HASH_MISMATCH');
  const symbol=path.basename(entry.path).split('_')[0];observedFiles.add(symbol);
  let previous='';
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   requireValid(row.symbol===symbol&&typeof row.timestamp==='string'&&Number.isFinite(Date.parse(row.timestamp))&&
    typeof row.close==='number'&&Number.isFinite(row.close)&&row.close>0&&
    (!previous||row.timestamp>previous),'DC_POWER_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const old=bars[symbol].get(row.timestamp);
   requireValid(!old||old.close===row.close,'DC_POWER_OVERLAP_PRICE_CONFLICT');
   bars[symbol].set(row.timestamp,row);
  }
 }
 requireValid(SYMBOLS.every(s=>observedFiles.has(s)),'DC_POWER_SYMBOL_MISSING');
 const daily=Object.fromEntries(SYMBOLS.map(s=>[s,new Map(
  regularHour15Rows([...bars[s].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)))
   .map(row=>[row.date,row.close]))]));
 const common=[...daily.SPY.keys()].filter(date=>SYMBOLS.every(s=>daily[s].has(date))).sort();
 requireValid(common.length>=628,'DC_POWER_COMMON_628_SESSIONS_MISSING');
 requireValid(common.at(-1)<='2028-12-31','DC_POWER_EARLY_CLOSE_CALENDAR_REVALIDATION_REQUIRED');
 const dates=common.slice(-628),spy=dates.map(date=>daily.SPY.get(date));
 const values=['DTCR','GRID'].map(symbol=>scoreAll252(dates.map(date=>daily[symbol].get(date)),spy));
 const history=dates.slice(-252).map((date,i)=>({date,
  score:Number(((values[0][i]+values[1][i])/2).toFixed(5))}));
 const scorerSha256=sha(fs.readFileSync(new URL('./theme-optional-score-r188.mjs',import.meta.url)));
 return {themeId:THEME,theme:'데이터센터·전력',etfs:['DTCR','GRID'],benchmark:'SPY',
  status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',methodologyVersion:METHOD,individualStocksUsed:0,
  priceMode:PRICE_MODE,source:'GETMARKETHISTORY_LOCAL_SHA_VERIFIED',
  sourceVersion:'GMH_MANIFEST_SHA256_'+sha(manifestBytes),scorerSha256,
  manifestFileCount:manifest.files.length,commonSessions:common.length,
  observationDate:history.at(-1).date,score:history.at(-1).score,history,
  publicationAuthorized:false,providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
}

export function saveDataCenterPower(dataRoot,result){
 requireValid(result?.themeId===THEME&&result.status==='PRIVATE_CANDIDATE_NOT_PUBLISHED'&&
  result.d1Writes===0&&result.history?.length===252,'DC_POWER_SAVE_NOT_ALLOWED');
 const home=path.join(fs.realpathSync(dataRoot),'themes',THEME),dir=path.join(home,'derived');
 fs.mkdirSync(dir,{recursive:true});
 requireValid(fs.realpathSync(dir)===dir,'DC_POWER_DERIVED_PATH_ESCAPE');
 const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n'),digest=sha(bytes);
 const name='dc-power-r1-'+digest.slice(0,16)+'.json',dest=path.join(dir,name);
 if(!fs.existsSync(dest)){
  const tmp=dest+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,bytes,{flag:'wx'});
  try{fs.renameSync(tmp,dest);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
 }
 requireValid(sha(fs.readFileSync(dest))===digest,'DC_POWER_DERIVED_READBACK_FAILED');
 return {relativePath:'themes/'+THEME+'/derived/'+name,sha256:digest};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--score'){
  console.log('Usage: node theme-data-center-power-r1.mjs --score (stored SHA-verified prices only; never publishes)');
  process.exitCode=2;
 }else{
  try{
   const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
   const result=calculateDataCenterPower({dataRoot});
   const artifact=saveDataCenterPower(dataRoot,result);
   console.log(JSON.stringify({status:result.status,theme:result.theme,etfs:result.etfs,
    observationDate:result.observationDate,score:result.score,historyPoints:result.history.length,
    commonSessions:result.commonSessions,sourceVersion:result.sourceVersion,artifact,
    publicWrites:0,d1Writes:0,schedulerWrites:0}));
  }catch(e){console.error(JSON.stringify({status:'BLOCKED',reason:e.code??'DC_POWER_UNCLASSIFIED'}));process.exitCode=1;}
 }
}
