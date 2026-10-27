// Original unmodified readApprovedSpacePrices from approved R28, private-only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
const SOURCE='https://getmarkethistory.com';
const PRICE_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const within=(root,target)=>{const relative=path.relative(root,target); return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

export function readApprovedSpacePrices({dataRoot,symbols}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot)&&
  Array.isArray(symbols)&&symbols.length>=3&&new Set(symbols).size===symbols.length&&
  symbols.every(symbol=>/^[A-Z][A-Z0-9.-]{0,15}$/.test(symbol)),
 'SPACE_R28_READ_ARGS_INVALID');
 const root=fs.realpathSync(dataRoot),home=fs.realpathSync(path.join(root,'themes','space-satellite'));
 need(within(root,home),'SPACE_R28_RAW_HOME_ESCAPE');
 const filename=fs.realpathSync(path.join(home,'raw-manifest.json'));
 need(within(home,filename)&&fs.statSync(filename).size<=2_000_000,
 'SPACE_R28_MANIFEST_INVALID');
 const bytes=fs.readFileSync(filename),manifest=JSON.parse(bytes);
 need(manifest.version===1&&manifest.themeId==='space-satellite'&&
  Array.isArray(manifest.files),'SPACE_R28_MANIFEST_IDENTITY');
 const collection=new Map(symbols.map(symbol=>[symbol,new Map()]));
 const files=new Map(symbols.map(symbol=>[symbol,0]));
 let lastCollectedAt=null;
 for(const item of manifest.files){
  need(typeof item?.path==='string'&&
   /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(item.path)&&
   item.path.endsWith(item.sha256+'.jsonl')&&
   item.source===SOURCE&&item.priceMode===PRICE_MODE&&
   Number.isFinite(Date.parse(item.collectedAt))&&
   validDate(item.observationFrom)&&validDate(item.observationThrough),
   'SPACE_R28_RAW_ENTRY_INVALID');
  const symbol=item.path.slice(4).split('_')[0];
  if(!collection.has(symbol))continue; // Known excluded old raw is preserved.
  if(lastCollectedAt===null||item.collectedAt>lastCollectedAt)lastCollectedAt=item.collectedAt;
  const file=fs.realpathSync(path.join(home,item.path));
  need(within(home,file)&&fs.statSync(file).size<=6_000_000,
   'SPACE_R28_RAW_PATH_INVALID');
  const raw=fs.readFileSync(file);
  need(sha(raw)===item.sha256,'SPACE_R28_RAW_SHA_MISMATCH');
  files.set(symbol,files.get(symbol)+1);
  let previous='',count=0;
  for(const line of raw.toString('utf8').split(/\r?\n/).filter(Boolean)){
   count++;need(count<=5000,'SPACE_R28_RAW_ROWS_UNBOUNDED');
   const row=JSON.parse(line);
   need(row.symbol===symbol&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&
    Number.isFinite(row.close)&&row.close>0&&
    (!previous||row.timestamp>previous),'SPACE_R28_RAW_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const prior=collection.get(symbol).get(row.timestamp);
   need(!prior||prior.close===row.close,'SPACE_R28_OVERLAP_CONFLICT');
   collection.get(symbol).set(row.timestamp,row);
  }
 }
 need(symbols.every(symbol=>files.get(symbol)>0),'SPACE_R28_APPROVED_ETF_RAW_MISSING');
 return {manifestSha256:sha(bytes),symbols:[...symbols],files:Object.fromEntries(files),
  lastCollectedAt,
  sessions:Object.fromEntries(symbols.map(symbol=>[symbol,
   selectRealHourlySessions([...collection.get(symbol).values()]
    .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)))])),
  providerCalls:0,rawFilesWritten:0,d1Writes:0,publicWrites:0};
}
