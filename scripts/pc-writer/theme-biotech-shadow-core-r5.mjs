// Biotech-only private Shadow from already saved, SHA-verified GMH bars.
// No provider request, public write, task change, or seven-theme dependency.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {scoreAll252,regularHour15Rows} from './theme-optional-score-r188.mjs';

const SYMBOLS=['IBB','XBI','SPY'];
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const GMH='https://getmarkethistory.com';
const RAW_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const SHA_PATTERN=/^[a-f0-9]{64}$/;
const sha=b=>createHash('sha256').update(b).digest('hex');
const ensure=(v,code)=>{if(!v)throw Object.assign(new Error(code),{code});};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const validScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;

function validatedInput(dataRoot){
 const base=fs.realpathSync(dataRoot),home=path.join(base,'themes','biotech');
 ensure(fs.existsSync(home)&&fs.realpathSync(home).startsWith(base+path.sep),'BIOTECH_DATA_MISSING');
 const manifestPath=path.join(home,'raw-manifest.json');
 ensure(fs.existsSync(manifestPath),'BIOTECH_MANIFEST_MISSING');
 ensure(fs.realpathSync(manifestPath).startsWith(fs.realpathSync(home)+path.sep),'BIOTECH_MANIFEST_ESCAPE');
 const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
 ensure(manifest.version===1&&manifest.themeId==='biotech'&&Array.isArray(manifest.files)&&manifest.files.length>0,'BIOTECH_MANIFEST_INVALID');
 const bars=Object.fromEntries(SYMBOLS.map(s=>[s,new Map()]));
 const receipts=[];
 for(const f of manifest.files){
  ensure(typeof f.path==='string'&&/^raw\/(IBB|XBI|SPY)_[a-f0-9]{64}\.jsonl$/.test(f.path)&&SHA_PATTERN.test(f.sha256??''),'BIOTECH_RAW_PATH_INVALID');
  ensure(f.path.split('_')[1]?.split('.')[0]===f.sha256,'BIOTECH_RAW_NAME_SHA_MISMATCH');
  ensure(f.source===GMH&&f.priceMode===RAW_MODE&&Number.isFinite(Date.parse(f.collectedAt)),'BIOTECH_SOURCE_CONTRACT');
  const file=path.join(home,f.path),real=fs.realpathSync(file);
  ensure(real.startsWith(fs.realpathSync(home)+path.sep),'BIOTECH_RAW_ESCAPE');
  const bytes=fs.readFileSync(real);ensure(sha(bytes)===f.sha256,'BIOTECH_RAW_SHA_MISMATCH');
  const symbol=path.basename(f.path).split('_')[0];
  let lastTimestamp='';
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   ensure(row.symbol===symbol&&typeof row.timestamp==='string'&&Number.isFinite(Date.parse(row.timestamp))&&
    typeof row.close==='number'&&Number.isFinite(row.close)&&row.close>0&&(!lastTimestamp||row.timestamp>lastTimestamp),'BIOTECH_BAR_INVALID');
   lastTimestamp=row.timestamp;
   if(row.is_gap===true)continue;
   const previous=bars[symbol].get(row.timestamp);
   ensure(!previous||Math.abs(previous.close-row.close)<=1e-9,'BIOTECH_OVERLAP_PRICE_CONFLICT');
   bars[symbol].set(row.timestamp,row);
  }
  receipts.push({symbol,collectedAt:f.collectedAt,observationThrough:f.observationThrough??null});
 }
 ensure(SYMBOLS.every(s=>bars[s].size>=628),'BIOTECH_RAW_INSUFFICIENT');
 const tables=Object.fromEntries(SYMBOLS.map(s=>[s,new Map(regularHour15Rows([...bars[s].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp))).map(x=>[x.date,x.close]))]));
 const common=[...tables.SPY.keys()].filter(d=>SYMBOLS.every(s=>tables[s].has(d))).sort();
 ensure(common.length>=628,'BIOTECH_COMMON_SESSIONS_INSUFFICIENT');
 return {manifestSha256:sha(manifestBytes),manifestFiles:manifest.files.length,latestCommonDate:common.at(-1),common,tables,receipts};
}

export function buildBiotechShadow({dataRoot,priorRecord}={}){
 ensure(priorRecord?.status==='READY'&&priorRecord.methodologyVersion===METHOD&&priorRecord.etfs?.join(',')==='IBB,XBI'&&
  validDate(priorRecord.observationDate)&&priorRecord.history?.length===252,'BIOTECH_PRIOR_INVALID');
 ensure(priorRecord.history.at(-1).date===priorRecord.observationDate&&priorRecord.history.every((p,i)=>validDate(p.date)&&validScore(p.score)&&
  (i===0||p.date>priorRecord.history[i-1].date)),'BIOTECH_PRIOR_HISTORY_INVALID');
 const evidence=validatedInput(dataRoot),{tables,common}=evidence;
 ensure(evidence.latestCommonDate<='2028-12-31','NYSE_EARLY_CLOSE_CALENDAR_REVALIDATION_REQUIRED');
 const compute=through=>{
  const idx=common.indexOf(through);ensure(idx>=627,'BIOTECH_OBSERVATION_NOT_IN_SAVED_BARS');
  const days=common.slice(idx-627,idx+1);
  const scores=['IBB','XBI'].map(s=>scoreAll252(days.map(d=>tables[s].get(d)),days.map(d=>tables.SPY.get(d))));
  return days.slice(-252).map((date,i)=>({date,score:Number(((scores[0][i]+scores[1][i])/2).toFixed(5))}));
 };
 const oldComputed=compute(priorRecord.observationDate),latestComputed=compute(evidence.latestCommonDate);
 ensure(oldComputed.every((p,i)=>p.date===priorRecord.history[i].date),'BIOTECH_PRIOR_CALENDAR_MISMATCH');
 const drift=oldComputed.map((p,i)=>({date:p.date,diff:Math.abs(p.score-priorRecord.history[i].score)})).filter(x=>x.diff>0);
 const maximumDifference=drift.length?Math.max(...drift.map(x=>x.diff)):0;
 const inputSha256=evidence.manifestSha256;
 const scorerSha256=sha(fs.readFileSync(new URL('./theme-optional-score-r188.mjs',import.meta.url)));
 const result={revisionId:'BIOTECH_GMH_SHADOW_R5_'+sha(Buffer.from(inputSha256+scorerSha256)).slice(0,16),status:'PRIVATE_SHADOW_COMPUTED_NOT_PUBLISHED',
  themeId:'biotech',methodologyVersion:METHOD,priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  source:'GETMARKETHISTORY_LOCAL_SHA_VERIFIED',sourceVersion:'GMH_MANIFEST_SHA256_'+inputSha256,scorerCodeSha256:scorerSha256,
  sourceReceivedThrough:evidence.receipts.map(x=>x.collectedAt).sort().at(-1),
  manifestFileCount:evidence.manifestFiles,commonSessions:evidence.common.length,
  observationDate:evidence.latestCommonDate,score:latestComputed.at(-1).score,history:latestComputed,
  priorComparison:{publicObservationDate:priorRecord.observationDate,comparedDates:252,changedDates:drift.length,
   firstScoreMismatchDate:drift[0]?.date??null,maximumDifference:Number(maximumDifference.toFixed(5)),
   inputPriceRootCause:'ORIGINAL_R3_PRICES_UNAVAILABLE_NOT_INFERRED'},
  provisional:{points:[]},publicationAuthorized:false,publicWrites:0,d1Writes:0,providerCalls:0,schedulerWrites:0};
 return result;
}

export function saveBiotechShadow(dataRoot,result){
 ensure(result?.themeId==='biotech'&&result.status==='PRIVATE_SHADOW_COMPUTED_NOT_PUBLISHED'&&result.publicWrites===0,'BIOTECH_SHADOW_SAVE_NOT_ALLOWED');
 const base=fs.realpathSync(dataRoot),home=path.join(base,'themes','biotech');
 ensure(fs.existsSync(home)&&fs.realpathSync(home).startsWith(base+path.sep),'BIOTECH_DATA_MISSING');
 const dir=path.join(home,'derived');fs.mkdirSync(dir,{recursive:true});
 ensure(fs.realpathSync(dir).startsWith(fs.realpathSync(home)+path.sep),'BIOTECH_DERIVED_ESCAPE');
 const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n'),digest=sha(bytes);
 const filename='biotech-shadow-r5-'+digest.slice(0,16)+'.json',dest=path.join(dir,filename);
 if(fs.existsSync(dest)){ensure(sha(fs.readFileSync(dest))===digest,'BIOTECH_SHADOW_IMMUTABLE_CONFLICT');return {status:'EXISTING_IDENTICAL',path:'themes/biotech/derived/'+filename,sha256:digest};}
 const temp=dest+'.'+process.pid+'.tmp';fs.writeFileSync(temp,bytes,{flag:'wx'});
 try{fs.renameSync(temp,dest)}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 ensure(sha(fs.readFileSync(dest))===digest,'BIOTECH_SHADOW_READBACK_FAILED');
 return {status:'IMMUTABLE_SAVED',path:'themes/biotech/derived/'+filename,sha256:digest};
}
