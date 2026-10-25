// Private, read-only provenance adapter for an already collected SPY benchmark.
// Never downloads bars, changes a raw manifest, publishes, or promotes rights.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const ALLOWED_SOURCES=new Set(['data-center-power','ai-semiconductor','biotech']);
const RAW_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const SOURCE='https://getmarkethistory.com';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(condition,reason)=>{if(!condition)throw Object.assign(new Error(reason),{code:reason});};
const within=(base,actual)=>{const relative=path.relative(base,actual);
 return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};

export function readVerifiedSharedSpy({dataRoot,sourceTheme}={}){
 need(ALLOWED_SOURCES.has(sourceTheme),'SHARED_SPY_SOURCE_NOT_APPROVED_FOR_PRIVATE_AUDIT');
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'SHARED_SPY_DATA_ROOT_MISSING');
 const root=fs.realpathSync(dataRoot),homePath=path.join(root,'themes',sourceTheme);
 need(fs.existsSync(homePath),'SHARED_SPY_SOURCE_FOLDER_MISSING');
 const home=fs.realpathSync(homePath);
 need(within(root,home),'SHARED_SPY_SOURCE_ROOT_ESCAPE');
 const manifestPath=path.join(home,'raw-manifest.json');
 need(fs.existsSync(manifestPath)&&fs.statSync(manifestPath).size<=2_000_000,
  'SHARED_SPY_MANIFEST_MISSING_OR_TOO_LARGE');
 need(within(home,fs.realpathSync(manifestPath)),'SHARED_SPY_MANIFEST_ESCAPE');
 const bytes=fs.readFileSync(manifestPath),manifest=JSON.parse(bytes);
 need(manifest.version===1&&manifest.themeId===sourceTheme&&Array.isArray(manifest.files),
  'SHARED_SPY_MANIFEST_IDENTITY');
 const candidates=manifest.files.filter(entry=>typeof entry?.path==='string'&&
  (entry.path.startsWith('raw/SPY_')||entry.path.includes('/SPY_')));
 need(candidates.length>0&&candidates.length<=12,'SHARED_SPY_RAW_NOT_REGISTERED_OR_UNBOUNDED');
 const bars=new Map(),paths=[];
 for(const entry of candidates){
  need(/^raw\/SPY_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   entry.sha256===entry.path.slice(8,72)&&entry.source===SOURCE&&
   entry.priceMode===RAW_MODE&&Number.isFinite(Date.parse(entry.collectedAt))&&
   /^\d{4}-\d{2}-\d{2}$/.test(entry.observationFrom??'')&&
   /^\d{4}-\d{2}-\d{2}$/.test(entry.observationThrough??''),
   'SHARED_SPY_ENTRY_CONTRACT');
  const rawPath=path.join(home,entry.path);
  need(fs.existsSync(rawPath)&&fs.statSync(rawPath).size<=6_000_000,
   'SHARED_SPY_RAW_MISSING_OR_TOO_LARGE');
  const actual=fs.realpathSync(rawPath);
  need(within(home,actual),'SHARED_SPY_RAW_ESCAPE');
  const raw=fs.readFileSync(actual);
  need(sha(raw)===entry.sha256,'SHARED_SPY_SHA_MISMATCH');
  let previous='',count=0;
  for(const line of raw.toString('utf8').split(/\r?\n/)){
   if(!line)continue;
   count++;need(count<=5000,'SHARED_SPY_TOO_MANY_BARS');
   const row=JSON.parse(line);
   need(row?.symbol==='SPY'&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&typeof row.close==='number'&&
    Number.isFinite(row.close)&&row.close>0&&(!previous||row.timestamp>previous),
    'SHARED_SPY_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const prior=bars.get(row.timestamp);
   need(!prior||prior.close===row.close,'SHARED_SPY_OVERLAP_CONFLICT');
   bars.set(row.timestamp,row);
  }
  paths.push({path:entry.path,sha256:entry.sha256,
   observationFrom:entry.observationFrom,observationThrough:entry.observationThrough});
 }
 need(bars.size>0,'SHARED_SPY_NO_ACTUAL_BARS');
 return {sourceTheme,manifestSha256:sha(bytes),priceMode:RAW_MODE,
  rawFiles:paths,actualHourlyBars:bars.size,
  bars:[...bars.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)),
  providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0,
  rightsVerified:false,publicationAuthorized:false};
}
