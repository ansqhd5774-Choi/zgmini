// Private inflation research candidate #29, Federal Reserve G.17 manufacturing IP.
// Only stores the official current-base raw index; does NOT import Growth G020
// chain-linked PIT values or alter any public indicator/scoring contract.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const FED_G17_MANUFACTURING_URL='https://www.federalreserve.gov/releases/g17/Current/ipdisk/ip_sa.txt';
export const FED_G17_MANUFACTURING_FILE='inflation-causal-candidates-r1/fed-g17-manufacturing-ip.json';
export const FED_G17_MANUFACTURING_VERSION='INFLATION_CAUSAL_CANDIDATE_FED_G17_R1';
const MAX_RAW=6_000_000;
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>Object.assign(new Error(code),{code});
const safeDir=dir=>{try{const s=fs.lstatSync(dir);return s.isDirectory()&&!s.isSymbolicLink();}catch{return false;}};
const safeFile=file=>{try{const s=fs.lstatSync(file);return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=12_000_000;}catch{return false;}};
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;

export function parseFedG17Manufacturing(raw){
  if(typeof raw!=='string'||!raw.includes('GMF: Manufacturing (NAICS)'))
    throw fail('FED_G17_GMF_HEADER_MISSING');
  const rows=[],seen=new Set();let inSeries=false;
  for(const line of raw.split(/\r?\n/)){
    if(/^\s*"GMF: Manufacturing \(NAICS\)"\s*$/.test(line)){
      if(inSeries)throw fail('FED_G17_GMF_HEADER_DUPLICATE');
      inSeries=true;continue;
    }
    if(!inSeries)continue;
    if(/^\s*"[A-Z0-9]+: /.test(line))break;
    const matched=line.match(/^\s*"GMF"\s+(\d{4})\s+(.+?)\s*$/);
    if(!matched){if(line.trim())throw fail('FED_G17_GMF_ROW_INVALID');continue;}
    const year=Number(matched[1]),values=matched[2].trim().split(/\s+/);
    if(year<1972||year>2100||values.length<1||values.length>12)
      throw fail('FED_G17_GMF_YEAR_OR_MONTH_COUNT_INVALID');
    for(let i=0;i<values.length;i++){
      const value=Number(values[i]);
      if(!/^\d+(?:\.\d+)?$/.test(values[i])||!Number.isFinite(value)||value<=0)
        throw fail('FED_G17_GMF_VALUE_INVALID');
      const date=`${year}-${String(i+1).padStart(2,'0')}-01`;
      if(seen.has(date))throw fail('FED_G17_GMF_DUPLICATE');
      seen.add(date);rows.push({date,value});
    }
  }
  if(rows.length<12)throw fail('FED_G17_GMF_HISTORY_SHORT');
  return rows.sort((a,b)=>a.date.localeCompare(b.date));
}

function child(parent,name){
  const dir=path.join(parent,name);
  if(fs.existsSync(dir)&&!safeDir(dir))throw fail('FED_G17_STORAGE_PATH_UNSAFE');
  if(!fs.existsSync(dir))fs.mkdirSync(dir);
  if(!safeDir(dir))throw fail('FED_G17_STORAGE_PATH_UNSAFE');
  return dir;
}
function validPrior(doc){
  return doc?.schemaVersion===1&&doc?.provider==='FEDERAL_RESERVE_G17'&&
    doc.sourceVersion===FED_G17_MANUFACTURING_VERSION&&validIso(doc.sourceStoredAt)&&
    Array.isArray(doc.observations)&&doc.observations.length>0&&
    doc.observations.every(x=>/^\d{4}-(0[1-9]|1[0-2])-01$/.test(x?.date??'')&&
      typeof x?.value==='number'&&Number.isFinite(x.value)&&x.value>0);
}
function atomic(file,doc){
  const bytes=Buffer.from(JSON.stringify(doc)),temp=`${file}.next-${randomUUID()}`;
  fs.writeFileSync(temp,bytes,{flag:'wx'});
  try{fs.renameSync(temp,file);}catch{try{fs.unlinkSync(temp);}catch{}throw fail('FED_G17_ATOMIC_RENAME_FAILED');}
  if(!safeFile(file)||sha(fs.readFileSync(file))!==sha(bytes))throw fail('FED_G17_READBACK_FAILED');
  return sha(bytes);
}

export async function collectFedG17Manufacturing({base,quotaFetch,now=new Date()}={}){
  if(typeof base!=='string'||path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||!safeDir(base))
    throw fail('FED_G17_PC_BASE_DENIED');
  if(typeof quotaFetch!=='function')throw fail('FED_G17_QUOTA_FETCH_REQUIRED');
  const moment=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(moment.getTime()))throw fail('FED_G17_NOW_INVALID');
  const res=await quotaFetch(new URL(FED_G17_MANUFACTURING_URL),{
    method:'GET',redirect:'manual',signal:AbortSignal.timeout(20_000)});
  if(res?.status>=300&&res.status<400)throw fail('FED_G17_REDIRECT_DENIED');
  if(!res?.ok)throw fail(`FED_G17_HTTP_${Number.isInteger(res?.status)?res.status:'FAILED'}`);
  if(!res.body?.getReader)throw fail('FED_G17_STREAM_REQUIRED');
  const reader=res.body.getReader(),chunks=[];let total=0;
  for(;;){const {done,value}=await reader.read();if(done)break;
    total+=value.byteLength;if(total>MAX_RAW){await reader.cancel();throw fail('FED_G17_BODY_LIMIT');}
    chunks.push(Buffer.from(value));
  }
  const bytes=Buffer.concat(chunks),observed=parseFedG17Manufacturing(bytes.toString('utf8'));
  const dir=child(base,'inflation-causal-candidates-r1'),file=path.join(dir,'fed-g17-manufacturing-ip.json');
  let prior=null;
  if(fs.existsSync(file)){
    if(!safeFile(file))throw fail('FED_G17_EXISTING_FILE_UNSAFE');
    try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw fail('FED_G17_EXISTING_JSON_INVALID');}
    if(!validPrior(prior))throw fail('FED_G17_EXISTING_CONTRACT_INVALID');
  }
  const byDate=new Map([...(prior?.observations??[]),...observed].map(row=>[row.date,row]));
  const observations=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(prior&&JSON.stringify(prior.observations)===JSON.stringify(observations))return {
    status:'UNCHANGED',stored:false,providerRequests:1,count:observations.length,
    latest:observations.at(-1).date};
  const raw=child(dir,'raw'),sourceSha256=sha(bytes),name=`fed-g17-gmf-${sourceSha256}.txt`;
  const archiveFile=path.join(raw,name);
  if(!fs.existsSync(archiveFile)){
    try{fs.writeFileSync(archiveFile,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  if(!safeFile(archiveFile)||sha(fs.readFileSync(archiveFile))!==sourceSha256)
    throw fail('FED_G17_ARCHIVE_READBACK_FAILED');
  const doc={schemaVersion:1,provider:'FEDERAL_RESERVE_G17',sourceVersion:FED_G17_MANUFACTURING_VERSION,
    sourceStoredAt:moment.toISOString(),selector:'GMF',frequency:'MONTHLY',unit:'CURRENT_G17_INDEX_SA',
    observations,provenance:{sourceSha256,archive:`raw/${name}`}};
  const fileSha256=atomic(file,doc);
  return {status:'SAVED_READBACK',stored:true,providerRequests:1,count:observations.length,
    latest:observations.at(-1).date,sourceStoredAt:doc.sourceStoredAt,fileSha256,
    sourceSha256,archive:`raw/${name}`};
}
