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
  const match=String(x??'').match(/^(20\d{2})-?(0?[1-9]|1[0-2])$/);
  return match?`${match[1]}-${String(Number(match[2])).padStart(2,'0')}-01`:null;
};

export function normalizeCensusM3Inventories(payload){
  if(!Array.isArray(payload)||payload.length<2||payload.length>20_000||
    !Array.isArray(payload[0]))throw fail('CENSUS_M3_SHAPE_INVALID');
  const headers=payload[0];
  const mandatory=['data_type_code','time_slot_id','seasonally_adj','category_code','cell_value','us'];
  if(!mandatory.every(x=>headers.includes(x))||new Set(headers).size!==headers.length)
    throw fail('CENSUS_M3_HEADERS_INVALID');
  const observations=[],seen=new Set();
  for(const values of payload.slice(1)){
    if(!Array.isArray(values)||values.length!==headers.length)throw fail('CENSUS_M3_ROW_SHAPE_INVALID');
    const row=Object.fromEntries(headers.map((key,i)=>[key,values[i]]));
    if(row.data_type_code!=='TI'||row.category_code!=='MTM'||
      String(row.seasonally_adj).toLowerCase()!=='yes')continue;
    if(String(row.us)!=='1')throw fail('CENSUS_M3_NATIONAL_FACET_INVALID');
    const date=monthDate(row.time_slot_id),raw=String(row.cell_value??'').replace(/,/g,'').trim();
    if(!date||!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw))||
      Number(raw)<0||seen.has(date))throw fail('CENSUS_M3_INVENTORIES_VALUE_OR_DUPLICATE');
    seen.add(date);
    observations.push({date,value:Number(raw),unit:'USD_MILLION_SA_NOMINAL',
      selector:'MTM/TI',seasonallyAdjusted:true});
  }
  if(!observations.length)throw fail('CENSUS_M3_INVENTORIES_NOT_FOUND');
  return observations.sort((a,b)=>a.date.localeCompare(b.date));
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
  const year=moment.getUTCFullYear(),archives=[],incoming=[];
  for(const y of [year-1,year]){
    const url=new URL(CENSUS_M3_ENDPOINT);
    for(const [k,v] of Object.entries({
      get:'data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data',
      time:String(y),category_code:'MTM',seasonally_adj:'yes',key:censusKey.trim(),'for':'us:*',
    }))url.searchParams.set(k,v);
    const res=await quotaFetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(20_000)});
    const {payload,bytes}=await readBody(res);
    const observations=normalizeCensusM3Inventories(payload);
    if(observations.some(x=>Number(x.date.slice(0,4))!==y))throw fail('CENSUS_M3_YEAR_MISMATCH');
    incoming.push(...observations);archives.push({year:y,bytes});
  }
  const dir=child(base,'inflation-causal-candidates-r1'),file=path.join(dir,'census-m3-manufacturing-inventories.json');
  let prior=null;
  if(fs.existsSync(file)){
    if(!safeFile(file))throw fail('CENSUS_M3_EXISTING_FILE_UNSAFE');
    try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw fail('CENSUS_M3_EXISTING_JSON_INVALID');}
    if(!validPrior(prior))throw fail('CENSUS_M3_EXISTING_CONTRACT_INVALID');
  }
  const byDate=new Map([...(prior?.observations??[]),...incoming].map(x=>[x.date,x]));
  const observations=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(prior&&JSON.stringify(prior.observations)===JSON.stringify(observations))return {
    status:'UNCHANGED',stored:false,providerRequests:2,count:observations.length,
    latest:observations.at(-1).date};
  const raw=child(dir,'raw'),provenance=[];
  for(const snapshot of archives){
    const sourceSha256=sha(snapshot.bytes),name=`census-m3-mtm-${snapshot.year}-${sourceSha256}.json`;
    const archiveFile=path.join(raw,name);
    if(!fs.existsSync(archiveFile)){
      try{fs.writeFileSync(archiveFile,snapshot.bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
    }
    if(!safeFile(archiveFile)||sha(fs.readFileSync(archiveFile))!==sourceSha256)
      throw fail('CENSUS_M3_ARCHIVE_READBACK_FAILED');
    provenance.push({year:snapshot.year,sourceSha256,archive:`raw/${name}`});
  }
  const doc={schemaVersion:1,provider:'US_CENSUS_M3',sourceVersion:CENSUS_M3_INVENTORIES_VERSION,
    sourceStoredAt:moment.toISOString(),selector:'MTM/TI',frequency:'MONTHLY',
    unit:'USD_MILLION_SA_NOMINAL',observations,provenance};
  const fileSha256=atomic(file,doc);
  return {status:'SAVED_READBACK',stored:true,providerRequests:2,count:observations.length,
    latest:observations.at(-1).date,sourceStoredAt:doc.sourceStoredAt,fileSha256,
    sourceHashes:provenance.map(x=>x.sourceSha256)};
}
