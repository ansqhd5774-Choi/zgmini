// Private inflation research candidate #28: Census M3 total manufacturing inventories.
// Reuses Growth G016's MTM/TI selector, but saves official raw values locally
// instead of treating the transformed Growth D1 feature as PC source data.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const CENSUS_M3_ENDPOINT='https://api.census.gov/data/timeseries/eits/m3';
export const CENSUS_M3_INVENTORIES_FILE='inflation-causal-candidates-r1/census-m3-manufacturing-inventories.json';
export const CENSUS_M3_INVENTORIES_VERSION='INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1';
const MAX_BODY=5_000_000;
const fail=code=>Object.assign(new Error(code),{code});
const sha=x=>createHash('sha256').update(x).digest('hex');
const safeDir=dir=>{try{const s=fs.lstatSync(dir);return s.isDirectory()&&!s.isSymbolicLink();}catch{return false;}};
const safeFile=file=>{try{const s=fs.lstatSync(file);return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=24_000_000;}catch{return false;}};
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const monthDate=x=>{
  const raw=String(x??'').trim();
  // Census EITS time_slot_date may include a zero-time suffix: YYYY-MM-DD 00:00:00.0.
  // Accept only midnight to avoid interpreting arbitrary timestamps as observations.
  const date=raw.replace(/^(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])) 00:00:00(?:\.0+)?$/, '$1');
  const match=date.match(/^(20\d{2})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/);
  if(!match)return null;
  // Monthly EITS observations must start on day 01. Never coerce an
  // explicit intra-month date into a fabricated first-of-month observation.
  if(match[3]&&match[3]!=='01')return null;
  if(match[3]&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)return null;
  return `${match[1]}-${match[2]}-01`;
};

export function normalizeCensusM3Inventories(payload){
  if(!Array.isArray(payload)||payload.length<1||payload.length>20_000||
    !Array.isArray(payload[0]))throw fail('CENSUS_M3_SHAPE_INVALID');
  // EITS can return uppercase/trimmed header names. Treat the supplier's
  // column labels as case-insensitive, not as a fixed ZGMINI column order.
  const headers=payload[0].map(x=>typeof x==='string'?x.trim().toLowerCase():null);
  const mandatory=['data_type_code','seasonally_adj','category_code','cell_value','us'];
  if(headers.some(x=>!x)||new Set(headers).size!==headers.length||
    !mandatory.every(x=>headers.includes(x))||
    (!headers.includes('time_slot_date')&&!headers.includes('time')))
    throw fail('CENSUS_M3_HEADERS_INVALID');
  const byDate=new Map(),conflicts=new Set();
  const diagnostics={missing:0,invalid:0,duplicate:0,conflict:0,ignored:0,available:0};
  for(const values of payload.slice(1)){
    if(!Array.isArray(values)||values.length!==headers.length){
      diagnostics.invalid++;continue;
    }
    const row=Object.fromEntries(headers.map((key,i)=>[key,values[i]]));
    if(String(row.data_type_code??'').trim().toUpperCase()!=='TI'||
       String(row.category_code??'').trim().toUpperCase()!=='MTM'||
       String(row.seasonally_adj??'').trim().toLowerCase()!=='yes'){
      diagnostics.ignored++;continue;
    }
    if(String(row.us??'').trim()!=='1'){
      diagnostics.invalid++;continue;
    }
    // time_slot_date can be empty although `time` carries the actual
    // year-month. Neither is required to supersede a contradictory date.
    const slotDate=monthDate(row.time_slot_date);
    const timeDate=monthDate(row.time);
    const date=slotDate??timeDate;
    const raw=String(row.cell_value??'').replace(/,/g,'').trim();
    // A present but malformed official monthly date is not missing data.
    // Never silently replace it with the alternate `time` month.
    const invalidExplicitDate=row.time_slot_date!=null&&
      String(row.time_slot_date).trim()!==''&&!slotDate;
    if(invalidExplicitDate||!date||(slotDate&&timeDate&&slotDate!==timeDate)){
      diagnostics.invalid++;continue;
    }
    if(raw===''||raw==='-'||raw.toUpperCase()==='NA'||raw.toUpperCase()==='N'){
      diagnostics.missing++;continue;
    }
    if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)||
       !Number.isFinite(Number(raw))||Number(raw)<0){
      diagnostics.invalid++;continue;
    }
    if(conflicts.has(date))continue;
    const value=Number(raw),old=byDate.get(date);
    if(old){
      if(old.value===value)diagnostics.duplicate++;
      else{
        // Do not select an arbitrary value; quarantine this month's conflict.
        byDate.delete(date);conflicts.add(date);diagnostics.conflict++;
      }
      continue;
    }
    byDate.set(date,{date,value,unit:'USD_MILLION_SA_NOMINAL',
      selector:'MTM/TI',seasonallyAdjusted:true});
  }
  const observations=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  diagnostics.available=observations.length;
  return Object.defineProperty(observations,'diagnostics',{value:diagnostics,enumerable:false});
}

function child(parent,name){
  const dir=path.join(parent,name);
  if(fs.existsSync(dir)&&!safeDir(dir))throw fail('CENSUS_M3_STORAGE_PATH_UNSAFE');
  if(!fs.existsSync(dir))fs.mkdirSync(dir);
  if(!safeDir(dir))throw fail('CENSUS_M3_STORAGE_PATH_UNSAFE');
  return dir;
}
function validPrior(doc){
  return doc?.schemaVersion===1&&doc?.provider==='US_CENSUS_M3'&&
    doc.sourceVersion===CENSUS_M3_INVENTORIES_VERSION&&validIso(doc.sourceStoredAt)&&
    Array.isArray(doc.observations)&&doc.observations.length>0&&
    doc.observations.every(x=>/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(x?.date??'')&&
      typeof x?.value==='number'&&Number.isFinite(x.value)&&x.value>=0);
}
async function readBody(res){
  if(res?.status>=300&&res.status<400)throw fail('CENSUS_M3_REDIRECT_DENIED');
  if(!res?.ok)throw fail(`CENSUS_M3_HTTP_${Number.isInteger(res?.status)?res.status:'FAILED'}`);
  if(!res.body?.getReader)throw fail('CENSUS_M3_STREAM_REQUIRED');
  const reader=res.body.getReader(),chunks=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw fail('CENSUS_M3_BODY_LIMIT');}
    chunks.push(Buffer.from(value));
  }
  const bytes=Buffer.concat(chunks);
  try{return {payload:JSON.parse(bytes.toString('utf8')),bytes};}
  catch{throw fail('CENSUS_M3_JSON_INVALID');}
}
function atomic(file,doc){
  const bytes=Buffer.from(JSON.stringify(doc)),temp=`${file}.next-${randomUUID()}`;
  fs.writeFileSync(temp,bytes,{flag:'wx'});
  try{fs.renameSync(temp,file);}catch{try{fs.unlinkSync(temp);}catch{}throw fail('CENSUS_M3_ATOMIC_RENAME_FAILED');}
  if(!safeFile(file)||sha(fs.readFileSync(file))!==sha(bytes))throw fail('CENSUS_M3_READBACK_FAILED');
  return sha(bytes);
}

export async function collectCensusM3Inventories({base,censusKey,quotaFetch,now=new Date()}={}){
  if(typeof base!=='string'||path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||!safeDir(base))
    throw fail('CENSUS_M3_PC_BASE_DENIED');
  if(typeof censusKey!=='string'||!censusKey.trim())throw fail('CENSUS_M3_KEY_MISSING');
  if(typeof quotaFetch!=='function')throw fail('CENSUS_M3_QUOTA_FETCH_REQUIRED');
  const moment=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(moment.getTime()))throw fail('CENSUS_M3_NOW_INVALID');
  const year=moment.getUTCFullYear(),archives=[],incoming=[],diagnostics=[];
  const dir=child(base,'inflation-causal-candidates-r1');
  // Each API response belongs to Census. Archive its exact bytes regardless
  // of whether a year includes nulls or zero usable monthly observations.
  const rawDir=child(dir,'raw');
  for(const y of [year-1,year]){
    const url=new URL(CENSUS_M3_ENDPOINT);
    for(const [k,v] of Object.entries({
      get:'data_type_code,time_slot_id,time_slot_date,seasonally_adj,category_code,cell_value,error_data',
      time:String(y),category_code:'MTM',seasonally_adj:'yes',key:censusKey.trim(),'for':'us:*',
    }))url.searchParams.set(k,v);
    const res=await quotaFetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(20_000)});
    const {payload,bytes}=await readBody(res);
    const sourceSha256=sha(bytes),name='census-m3-mtm-'+y+'-'+sourceSha256+'.json';
    const archiveFile=path.join(rawDir,name);
    if(!fs.existsSync(archiveFile)){
      try{fs.writeFileSync(archiveFile,bytes,{flag:'wx'});}
      catch(e){if(e.code!=='EEXIST')throw e;}
    }
    if(!safeFile(archiveFile)||sha(fs.readFileSync(archiveFile))!==sourceSha256)
      throw fail('CENSUS_M3_ARCHIVE_READBACK_FAILED');
    archives.push({year:y,sourceSha256,archive:'raw/'+name});
    // Treat years independently. An unavailable schema in one year cannot
    // erase valid monthly observations from the other response.
    let rows;
    try{rows=normalizeCensusM3Inventories(payload);}
    catch(e){
      if(!['CENSUS_M3_HEADERS_INVALID','CENSUS_M3_SHAPE_INVALID'].includes(e?.code))throw e;
      diagnostics.push({year:y,available:0,sourceShape:e.code});
      continue;
    }
    const matched=rows.filter(x=>Number(x.date.slice(0,4))===y);
    incoming.push(...matched);
    diagnostics.push({year:y,...rows.diagnostics,available:matched.length});
  }
  const file=path.join(dir,'census-m3-manufacturing-inventories.json');
  let prior=null;
  if(fs.existsSync(file)){
    if(!safeFile(file))throw fail('CENSUS_M3_EXISTING_FILE_UNSAFE');
    try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}
    catch{throw fail('CENSUS_M3_EXISTING_JSON_INVALID');}
    if(!validPrior(prior))throw fail('CENSUS_M3_EXISTING_CONTRACT_INVALID');
  }
  const byDate=new Map([...(prior?.observations??[]),...incoming].map(x=>[x.date,x]));
  const observations=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=observations.at(-1)?.date??null;
  const unavailable=diagnostics.filter(x=>x.sourceShape);
  const coverage=unavailable.length?'PARTIAL_SCHEMA_UNAVAILABLE':
    incoming.length?'OBSERVATIONS_AVAILABLE':'NO_USABLE_OBSERVATIONS';
  // An all-invalid supplier response is a parser compatibility failure, not
  // a provider transport failure. Keep both raw responses for diagnosis.
  // If both official yearly schemas are unusable, the current collection
  // failed even when a valid prior file is available. Preserve that file as
  // last-good, but never misreport a broken two-GET attempt as UNCHANGED.
  if(unavailable.length===2)
    throw fail(unavailable[0].sourceShape);
  // No first successful snapshot exists: a two-GET response containing zero
  // valid observations must not be reported as a successful UNCHANGED readback.
  // The raw response archives remain available for private diagnosis.
  if(!prior&&!observations.length)
    throw fail('CENSUS_M3_NO_USABLE_OBSERVATIONS');
  if(JSON.stringify(prior?.observations??[])===JSON.stringify(observations)||!observations.length)
    return {status:'UNCHANGED',stored:false,providerRequests:2,count:observations.length,
      latest,coverage,diagnostics,provenance:archives};
  const backups=child(dir,'backups');
  if(prior){
    const before=fs.readFileSync(file),priorSha=sha(before);
    const backup=path.join(backups,'census-m3-'+priorSha+'.json');
    if(!fs.existsSync(backup)){
      try{fs.writeFileSync(backup,before,{flag:'wx'});}
      catch(e){if(e.code!=='EEXIST')throw e;}
    }
    if(!safeFile(backup)||sha(fs.readFileSync(backup))!==priorSha)
      throw fail('CENSUS_M3_BACKUP_READBACK_FAILED');
  }
  const doc={schemaVersion:1,provider:'US_CENSUS_M3',sourceVersion:CENSUS_M3_INVENTORIES_VERSION,
    sourceStoredAt:moment.toISOString(),selector:'MTM/TI',frequency:'MONTHLY',
    unit:'USD_MILLION_SA_NOMINAL',observations,provenance:archives};
  const fileSha256=atomic(file,doc);
  return {status:'SAVED_READBACK',stored:true,providerRequests:2,count:observations.length,
    latest,coverage,diagnostics,sourceStoredAt:doc.sourceStoredAt,fileSha256,
    sourceHashes:archives.map(x=>x.sourceSha256)};
}

