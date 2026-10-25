// Space/satellite R1 research lane: verified real ETF bars, two unselected pair
// alternatives. No approved final basket, public feed, D1 or scheduled task.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {regularHour15Rows,scoreAll252} from './theme-optional-score-r188.mjs';

const THEME='space-satellite';
const SYMBOLS=['UFO','ROKT','ARKX','SPY'];
const PAIRS=[['UFO','ROKT'],['UFO','ARKX']];
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const RAW_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const PRICE_MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
const requireValid=(truth,code)=>{if(!truth)fail(code);};
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

export function auditSpaceSatellite({dataRoot}={}){
 requireValid(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'SPACE_DATA_ROOT_MISSING');
 const root=fs.realpathSync(dataRoot),home=path.join(root,'themes',THEME);
 requireValid(fs.existsSync(home)&&fs.realpathSync(home)===home,'SPACE_HOME_MISSING');
 const manifestPath=path.join(home,'raw-manifest.json');
 requireValid(fs.existsSync(manifestPath),'SPACE_MANIFEST_MISSING');
 const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
 requireValid(manifest.version===1&&manifest.themeId===THEME&&Array.isArray(manifest.files),'SPACE_MANIFEST_INVALID');
 const bars=Object.fromEntries(SYMBOLS.map(s=>[s,new Map()]));
 const fileCount=Object.fromEntries(SYMBOLS.map(s=>[s,0]));
 for(const entry of manifest.files){
  requireValid(typeof entry.path==='string'&&
   /^raw\/(UFO|ROKT|ARKX|SPY)_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   /^[a-f0-9]{64}$/.test(entry.sha256??'')&&entry.path.endsWith(entry.sha256+'.jsonl'),
   'SPACE_RAW_PATH_INVALID');
  requireValid(entry.source==='https://getmarkethistory.com'&&entry.priceMode===RAW_MODE&&
   Number.isFinite(Date.parse(entry.collectedAt))&&isDate(entry.observationThrough),
   'SPACE_SOURCE_INVALID');
  const filename=path.join(home,entry.path),real=fs.realpathSync(filename);
  requireValid(real.startsWith(home+path.sep),'SPACE_RAW_PATH_ESCAPE');
  const bytes=fs.readFileSync(real);
  requireValid(sha(bytes)===entry.sha256,'SPACE_RAW_HASH_MISMATCH');
  const symbol=path.basename(entry.path).split('_')[0];fileCount[symbol]++;
  let previous='';
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   requireValid(row.symbol===symbol&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&typeof row.close==='number'&&
    Number.isFinite(row.close)&&row.close>0&&(!previous||row.timestamp>previous),
    'SPACE_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const old=bars[symbol].get(row.timestamp);
   requireValid(!old||old.close===row.close,'SPACE_OVERLAP_PRICE_CONFLICT');
   bars[symbol].set(row.timestamp,row);
  }
 }
 const daily={};
 const coverage={};
 for(const symbol of SYMBOLS){
  const sorted=[...bars[symbol].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  let selected=[];
  if(sorted.length>=628)selected=regularHour15Rows(sorted);
  daily[symbol]=new Map(selected.map(row=>[row.date,row.close]));
  coverage[symbol]={rawFiles:fileCount[symbol],dailySessions:selected.length,
   lastObservationDate:selected.at(-1)?.date??null};
 }
 const candidates=PAIRS.map(([first,second])=>{
  const names=[first,second,'SPY'];
  const common=[...daily.SPY.keys()].filter(date=>names.every(s=>daily[s].has(date))).sort();
  if(common.length<628)return {etfs:[first,second],status:'INSUFFICIENT_REAL_COMMON_SESSIONS',
   commonSessions:common.length,observationDate:common.at(-1)??null,history:[]};
  const dates=common.slice(-628),benchmark=dates.map(date=>daily.SPY.get(date));
  const values=[first,second].map(symbol=>scoreAll252(dates.map(date=>daily[symbol].get(date)),benchmark));
  const history=dates.slice(-252).map((date,i)=>({date,
   score:Number(((values[0][i]+values[1][i])/2).toFixed(5))}));
  return {etfs:[first,second],status:'PRIVATE_PAIR_CANDIDATE_ONLY',
   commonSessions:common.length,observationDate:history.at(-1).date,
   score:history.at(-1).score,history};
 });
 const ready=candidates.filter(p=>p.status==='PRIVATE_PAIR_CANDIDATE_ONLY').length;
 const scorerSha256=sha(fs.readFileSync(new URL('./theme-optional-score-r188.mjs',import.meta.url)));
 return {themeId:THEME,theme:'우주·위성',symbols:SYMBOLS,benchmark:'SPY',
  status:ready===2?'PRIVATE_ALTERNATIVES_READY':ready===1?'PRIVATE_ALTERNATIVES_PARTIAL':'PRIVATE_COVERAGE_INCOMPLETE',
  methodologyVersion:METHOD,priceMode:PRICE_MODE,source:'GETMARKETHISTORY_LOCAL_SHA_VERIFIED',
  sourceVersion:'GMH_MANIFEST_SHA256_'+sha(manifestBytes),scorerSha256,coverage,candidates,
  finalPairSelected:false,publicationAuthorized:false,derivedLicenseVerified:false,
  individualStocksUsed:0,providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
}

export function saveSpaceSatellite(dataRoot,result){
 requireValid(result?.themeId===THEME&&result.publicationAuthorized===false&&
  result.candidates?.some(x=>x.history?.length===252)&&result.d1Writes===0,
  'SPACE_PRIVATE_SAVE_NOT_ALLOWED');
 const home=path.join(fs.realpathSync(dataRoot),'themes',THEME),dir=path.join(home,'derived');
 fs.mkdirSync(dir,{recursive:true});
 requireValid(fs.realpathSync(dir)===dir,'SPACE_DERIVED_PATH_ESCAPE');
 const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n'),digest=sha(bytes);
 const name='space-r1-'+digest.slice(0,16)+'.json',dest=path.join(dir,name);
 if(!fs.existsSync(dest)){
  const temp=dest+'.'+process.pid+'.tmp';fs.writeFileSync(temp,bytes,{flag:'wx'});
  try{fs.renameSync(temp,dest);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 }
 requireValid(sha(fs.readFileSync(dest))===digest,'SPACE_DERIVED_READBACK_FAILED');
 return {relativePath:'themes/'+THEME+'/derived/'+name,sha256:digest};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('Usage: node theme-space-satellite-r1.mjs --audit (private SHA-verified pair alternatives; no publication)');
  process.exitCode=2;
 }else try{
  const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',result=auditSpaceSatellite({dataRoot});
  const artifact=result.candidates.some(x=>x.history.length===252)?saveSpaceSatellite(dataRoot,result):null;
  console.log(JSON.stringify({status:result.status,theme:result.theme,coverage:result.coverage,
   candidates:result.candidates.map(({etfs,status,commonSessions,observationDate,score,history})=>
    ({etfs,status,commonSessions,observationDate,score:score??null,historyPoints:history.length})),
   finalPairSelected:false,publicationAuthorized:false,artifact,
   publicWrites:0,d1Writes:0,schedulerWrites:0}));
 }catch(error){console.error(JSON.stringify({status:'BLOCKED',reason:error.code??'SPACE_UNCLASSIFIED'}));process.exitCode=1;}
}
