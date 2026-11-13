// Private inflation research candidates #22, #23 and #24.
// Does not alter the published 19 inputs, scoring, Core schedule, DB or D1.
// An approved Core wrapper must supply the existing quota-enforced fetch and BLS key.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';

export const INFLATION_CANDIDATE_BLS_IDS=Object.freeze({
  rent:'CUSR0000SEHA',
  ownerEquivalentRent:'CUSR0000SEHC01',
  finalDemandPpi:'WPSFD4',
});
export const INFLATION_CANDIDATE_BLS_ENDPOINT='https://api.bls.gov/publicAPI/v2/timeseries/data/';
export const INFLATION_CANDIDATE_BLS_FILE='inflation-causal-candidates-r1/bls-cpi-ppi3.json';
export const INFLATION_CANDIDATE_BLS_VERSION='INFLATION_CAUSAL_CANDIDATE_BLS3_R1';
const GROUPS=Object.freeze({
  cpi:Object.freeze([INFLATION_CANDIDATE_BLS_IDS.rent,INFLATION_CANDIDATE_BLS_IDS.ownerEquivalentRent]),
  ppi:Object.freeze([INFLATION_CANDIDATE_BLS_IDS.finalDemandPpi]),
});
const ALL_IDS=new Set(Object.values(INFLATION_CANDIDATE_BLS_IDS));
const MAX_BYTES=4_000_000;
const MONTH=/^\d{4}-(0[1-9]|1[0-2])-01$/;
const error=code=>Object.assign(new Error(code),{code});
const hash=value=>createHash('sha256').update(value).digest('hex');

function safeDirectory(location){
  try{const info=fs.lstatSync(location);return info.isDirectory()&&!info.isSymbolicLink();}
  catch{return false;}
}
function safeFile(location){
  try{const info=fs.lstatSync(location);return info.isFile()&&!info.isSymbolicLink()&&info.size>0&&info.size<=24_000_000;}
  catch{return false;}
}
function isoTimestamp(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
function validateGroup(group){
  if(!Object.hasOwn(GROUPS,group))throw error('BLS_CANDIDATE_GROUP_NOT_APPROVED');
  return GROUPS[group];
}

export function normalizeInflationCandidateBls(payload,{group}={}){
  const ids=validateGroup(group),found={};
  if(payload?.status!=='REQUEST_SUCCEEDED')throw error('BLS_CANDIDATE_STATUS_FAILED');
  if(!Array.isArray(payload?.Results?.series)||payload.Results.series.length!==ids.length)
    throw error('BLS_CANDIDATE_SERIES_COUNT');
  for(const item of payload.Results.series){
    const id=item?.seriesID;
    if(!ids.includes(id)||Object.hasOwn(found,id)||!Array.isArray(item?.data))
      throw error('BLS_CANDIDATE_ID_OR_ROWS_INVALID');
    const rows=[],seen=new Set();
    for(const row of item.data){
      if(row?.period==='M13')continue;
      if(!/^\d{4}$/.test(String(row?.year??''))||!/^M(0[1-9]|1[0-2])$/.test(row?.period??''))
        throw error('BLS_CANDIDATE_MONTH_INVALID');
      const date=`${row.year}-${row.period.slice(1)}-01`;
      if(seen.has(date))throw error('BLS_CANDIDATE_VALUE_OR_DUPLICATE');
      const footnotes=Array.isArray(row?.footnotes)?row.footnotes:[];
      // The BLS CPI API publishes unavailable months as "-" with footnote X
      // (e.g. October 2025). Preserve the gap, not a fabricated index value;
      // the unmodified provider response remains in the raw archive.
      if(typeof row?.value==='string'&&row.value.trim()==='-'&&
        footnotes.some(note=>note?.code==='X')){
        seen.add(date);continue;
      }
      const value=Number(row?.value);
      if(typeof row?.value!=='string'||!row.value.trim()||
        !Number.isFinite(value)||value<0)throw error('BLS_CANDIDATE_VALUE_OR_DUPLICATE');
      seen.add(date);rows.push({date,value,footnotes});
    }
    if(!rows.length)throw error('BLS_CANDIDATE_SERIES_EMPTY');
    found[id]=rows.sort((a,b)=>a.date.localeCompare(b.date));
  }
  for(const id of ids)if(!Object.hasOwn(found,id))throw error('BLS_CANDIDATE_SERIES_MISSING');
  return found;
}

function validPrior(doc){
  return doc?.schemaVersion===1&&doc?.provider==='BLS'&&
    doc.sourceVersion===INFLATION_CANDIDATE_BLS_VERSION&&isoTimestamp(doc.sourceStoredAt)&&
    doc.series&&typeof doc.series==='object'&&
    Object.entries(doc.series).every(([id,rows])=>ALL_IDS.has(id)&&Array.isArray(rows)&&
      rows.every(r=>MONTH.test(r?.date??'')&&typeof r.value==='number'&&Number.isFinite(r.value)&&r.value>=0));
}

export function mergeInflationCandidateBls(previous,incoming){
  if(previous!=null&&!validPrior(previous))throw error('BLS_CANDIDATE_PRIOR_INVALID');
  const merged={};
  for(const id of ALL_IDS){
    const observations=[...(previous?.series?.[id]??[]),...(incoming[id]??[])];
    if(!observations.length)continue;
    const byDate=new Map(observations.map(r=>[r.date,r]));
    merged[id]=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  return merged;
}

async function readResponse(response){
  if(response?.status>=300&&response.status<400)throw error('BLS_CANDIDATE_REDIRECT_DENIED');
  if(!response?.ok)throw error(`BLS_CANDIDATE_HTTP_${Number.isInteger(response?.status)?response.status:'FAILED'}`);
  if(!response.body?.getReader)throw error('BLS_CANDIDATE_STREAM_REQUIRED');
  const reader=response.body.getReader(),parts=[];let total=0;
  for(;;){
    const {done,value}=await reader.read();if(done)break;
    total+=value.byteLength;
    if(total>MAX_BYTES){await reader.cancel();throw error('BLS_CANDIDATE_RESPONSE_TOO_LARGE');}
    parts.push(Buffer.from(value));
  }
  const bytes=Buffer.concat(parts);
  try{return {payload:JSON.parse(bytes.toString('utf8')),bytes};}
  catch{throw error('BLS_CANDIDATE_JSON_INVALID');}
}

function ensureSafeChild(parent,name){
  const dir=path.join(parent,name);
  if(fs.existsSync(dir)&&!safeDirectory(dir))throw error('BLS_CANDIDATE_STORAGE_PATH_UNSAFE');
  if(!fs.existsSync(dir))fs.mkdirSync(dir);
  if(!safeDirectory(dir))throw error('BLS_CANDIDATE_STORAGE_PATH_UNSAFE');
  return dir;
}

function archiveRaw(parent,group,bytes){
  const raw=ensureSafeChild(parent,'raw');
  const sourceSha256=hash(bytes),file=path.join(raw,`bls-${group}-${sourceSha256}.json`);
  if(!fs.existsSync(file)){
    try{fs.writeFileSync(file,bytes,{flag:'wx'});}
    catch(e){if(e.code!=='EEXIST')throw e;}
  }
  if(!safeFile(file)||hash(fs.readFileSync(file))!==sourceSha256)
    throw error('BLS_CANDIDATE_RAW_READBACK_FAILED');
  return {sourceSha256,archive:`raw/bls-${group}-${sourceSha256}.json`};
}

function atomicWrite(file,doc){
  const bytes=Buffer.from(JSON.stringify(doc)),temp=`${file}.next-${randomUUID()}`;
  fs.writeFileSync(temp,bytes,{flag:'wx'});
  try{fs.renameSync(temp,file);}catch{
    try{fs.unlinkSync(temp);}catch{}
    throw error('BLS_CANDIDATE_ATOMIC_RENAME_FAILED');
  }
  if(!safeFile(file)||hash(fs.readFileSync(file))!==hash(bytes))
    throw error('BLS_CANDIDATE_SAVE_READBACK_FAILED');
  return hash(bytes);
}

export async function collectInflationCandidateBls({base,group,blsKey,quotaFetch,
  now=new Date(),startYear}={}){
  const ids=validateGroup(group);
  if(typeof base!=='string'||path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||
    !safeDirectory(base))throw error('BLS_CANDIDATE_PC_BASE_DENIED');
  if(typeof blsKey!=='string'||!blsKey.trim())throw error('BLS_CANDIDATE_KEY_MISSING');
  if(typeof quotaFetch!=='function')throw error('BLS_CANDIDATE_QUOTA_FETCH_REQUIRED');
  const moment=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(moment.getTime()))throw error('BLS_CANDIDATE_NOW_INVALID');
  const year=moment.getUTCFullYear(),begin=startYear??year-19;
  if(!Number.isInteger(begin)||begin<year-19||begin>year)
    throw error('BLS_CANDIDATE_YEAR_RANGE_INVALID');
  const body=JSON.stringify({seriesid:ids,startyear:String(begin),endyear:String(year),
    registrationkey:blsKey.trim()});
  const response=await quotaFetch(INFLATION_CANDIDATE_BLS_ENDPOINT,{method:'POST',
    redirect:'manual',headers:{'content-type':'application/json'},body,signal:AbortSignal.timeout(20_000)});
  const {payload,bytes}=await readResponse(response);
  const incoming=normalizeInflationCandidateBls(payload,{group});
  // Validate all data before touching persistent storage.
  const directory=ensureSafeChild(base,'inflation-causal-candidates-r1');
  const file=path.join(directory,'bls-cpi-ppi3.json');
  let prior=null;
  if(fs.existsSync(file)){
    if(!safeFile(file))throw error('BLS_CANDIDATE_EXISTING_FILE_UNSAFE');
    try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}
    catch{throw error('BLS_CANDIDATE_EXISTING_JSON_INVALID');}
    if(!validPrior(prior))throw error('BLS_CANDIDATE_EXISTING_CONTRACT_INVALID');
  }
  const series=mergeInflationCandidateBls(prior,incoming);
  if(prior&&JSON.stringify(prior.series)===JSON.stringify(series))return {
    status:'UNCHANGED',group,stored:false,providerRequests:1,
    latest:Object.fromEntries(ids.map(id=>[id,series[id].at(-1).date])),
  };
  const provenance=archiveRaw(directory,group,bytes);
  const document={schemaVersion:1,provider:'BLS',sourceVersion:INFLATION_CANDIDATE_BLS_VERSION,
    sourceStoredAt:moment.toISOString(),frequency:'MONTHLY',groupUpdated:group,
    series,provenanceByGroup:{...(prior?.provenanceByGroup??{}),[group]:provenance}};
  const fileSha256=atomicWrite(file,document);
  return {status:'SAVED_READBACK',group,stored:true,providerRequests:1,
    latest:Object.fromEntries(ids.map(id=>[id,series[id].at(-1).date])),
    counts:Object.fromEntries(ids.map(id=>[id,series[id].length])),
    sourceStoredAt:document.sourceStoredAt,fileSha256,...provenance};
}
