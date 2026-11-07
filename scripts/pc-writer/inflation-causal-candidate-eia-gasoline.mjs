// Candidate #2, official EIA weekly US regular gasoline. Private raw only.
// The EIA v2 live series facet must be verified via an approved key-backed PC GET.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const EIA_REGULAR_SERIES='EMM_EPMR_PTE_NUS_DPG';
export const EIA_REGULAR_URL='https://api.eia.gov/v2/petroleum/pri/gnd/data/';
export const EIA_REGULAR_FILE='inflation-causal-candidates-r1/eia-us-regular-gasoline-weekly.json';
const VERSION='INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1';
const fail=c=>Object.assign(new Error(c),{code:c});
const hash=x=>createHash('sha256').update(x).digest('hex');
const safeDir=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink();}catch{return false;}};
const safeFile=p=>{try{const s=fs.lstatSync(p);return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<12_000_000;}catch{return false;}};
const dateValid=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
  Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

export function parseEiaRegularWeekly(payload){
  const rows=payload?.response?.data,total=Number(payload?.response?.total);
  if(payload?.response?.frequency!=='weekly'||!Array.isArray(rows)||rows.length<5||
    rows.length>520||!Number.isSafeInteger(total)||total<rows.length)
    throw fail('EIA_REGULAR_RESPONSE_INVALID');
  const seen=new Set(),observations=[],missing=[];
  for(const r of rows){
    if(r?.series!==EIA_REGULAR_SERIES||r?.duoarea!=='NUS'||r?.units!=='$/GAL'||
      !dateValid(r?.period)||seen.has(r.period))throw fail('EIA_REGULAR_SERIES_OR_DATE_INVALID');
    seen.add(r.period);
    if(r.value===null){missing.push({date:r.period,status:'NOT_REPORTED'});continue;}
    const raw=String(r.value??'').trim(),value=Number(raw);
    if(!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(value)||value<=0)
      throw fail('EIA_REGULAR_VALUE_INVALID');
    observations.push({date:r.period,value,unit:'USD_PER_GALLON'});
  }
  if(observations.length<4)throw fail('EIA_REGULAR_HISTORY_SHORT');
  return {observations:observations.sort((a,b)=>a.date.localeCompare(b.date)),
    missing:missing.sort((a,b)=>a.date.localeCompare(b.date))};
}

function child(parent,name){
  const dir=path.join(parent,name);
  if(fs.existsSync(dir)&&!safeDir(dir))throw fail('EIA_REGULAR_STORAGE_UNSAFE');
  if(!fs.existsSync(dir))fs.mkdirSync(dir);
  if(!safeDir(dir))throw fail('EIA_REGULAR_STORAGE_UNSAFE');
  return dir;
}
function validateSaved(x){return x?.schemaVersion===1&&x?.provider==='EIA'&&x?.sourceVersion===VERSION&&
  typeof x.sourceStoredAt==='string'&&Number.isFinite(Date.parse(x.sourceStoredAt))&&
  Array.isArray(x.observations)&&x.observations.length>0&&Array.isArray(x.missing)&&
  x.observations.every(r=>dateValid(r?.date)&&typeof r.value==='number'&&Number.isFinite(r.value)&&r.value>0);}

export async function collectEiaRegularWeekly({base,eiaKey,quotaFetch,now=new Date()}={}){
  if(typeof base!=='string'||path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||!safeDir(base))
    throw fail('EIA_REGULAR_PC_BASE_DENIED');
  if(typeof eiaKey!=='string'||!eiaKey.trim())throw fail('EIA_REGULAR_KEY_MISSING');
  if(typeof quotaFetch!=='function')throw fail('EIA_REGULAR_QUOTA_REQUIRED');
  const timestamp=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(timestamp.getTime()))throw fail('EIA_REGULAR_NOW_INVALID');
  const url=new URL(EIA_REGULAR_URL);
  for(const [key,value] of Object.entries({api_key:eiaKey.trim(),frequency:'weekly',
    'data[0]':'value','facets[series][]':EIA_REGULAR_SERIES,
    'sort[0][column]':'period','sort[0][direction]':'desc',offset:'0',length:'520'}))
    url.searchParams.set(key,value);
  const res=await quotaFetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(20_000)});
  if(res?.status>=300&&res.status<400)throw fail('EIA_REGULAR_REDIRECT_DENIED');
  if(!res?.ok||!res.body?.getReader)throw fail('EIA_REGULAR_HTTP_OR_STREAM_FAILED');
  const chunks=[],reader=res.body.getReader();let count=0;
  for(;;){const {done,value}=await reader.read();if(done)break;
    count+=value.byteLength;if(count>4_000_000){await reader.cancel();throw fail('EIA_REGULAR_BODY_LIMIT');}
    chunks.push(Buffer.from(value));
  }
  const bytes=Buffer.concat(chunks);let payload;
  try{payload=JSON.parse(bytes.toString('utf8'));}catch{throw fail('EIA_REGULAR_JSON_INVALID');}
  const incoming=parseEiaRegularWeekly(payload);
  const dir=child(base,'inflation-causal-candidates-r1'),file=path.join(dir,'eia-us-regular-gasoline-weekly.json');
  let prior=null;
  if(fs.existsSync(file)){
    if(!safeFile(file))throw fail('EIA_REGULAR_EXISTING_UNSAFE');
    try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw fail('EIA_REGULAR_EXISTING_JSON_INVALID');}
    if(!validateSaved(prior))throw fail('EIA_REGULAR_EXISTING_CONTRACT_INVALID');
  }
  const merged=new Map([...(prior?.observations??[]),...incoming.observations].map(r=>[r.date,r]));
  const observations=[...merged.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const missing=new Map([...(prior?.missing??[]),...incoming.missing].map(r=>[r.date,r]));
  const absent=[...missing.values()].filter(r=>!merged.has(r.date)).sort((a,b)=>a.date.localeCompare(b.date));
  if(prior&&JSON.stringify(prior.observations)===JSON.stringify(observations)&&
    JSON.stringify(prior.missing)===JSON.stringify(absent))return {status:'UNCHANGED',stored:false,providerRequests:1};
  const rawDir=child(dir,'raw'),sourceSha256=hash(bytes),name=`eia-regular-${sourceSha256}.json`;
  const rawFile=path.join(rawDir,name);
  if(!fs.existsSync(rawFile)){
    try{fs.writeFileSync(rawFile,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  if(!safeFile(rawFile)||hash(fs.readFileSync(rawFile))!==sourceSha256)throw fail('EIA_REGULAR_ARCHIVE_FAILED');
  const doc={schemaVersion:1,provider:'EIA',sourceVersion:VERSION,sourceStoredAt:timestamp.toISOString(),
    selector:EIA_REGULAR_SERIES,frequency:'WEEKLY',unit:'USD_PER_GALLON',observations,missing:absent,
    provenance:{sourceSha256,archive:`raw/${name}`}};
  const output=Buffer.from(JSON.stringify(doc)),temp=`${file}.next-${randomUUID()}`;
  fs.writeFileSync(temp,output,{flag:'wx'});
  try{fs.renameSync(temp,file);}catch{try{fs.unlinkSync(temp);}catch{}throw fail('EIA_REGULAR_ATOMIC_RENAME_FAILED');}
  if(!safeFile(file)||hash(fs.readFileSync(file))!==hash(output))throw fail('EIA_REGULAR_READBACK_FAILED');
  return {status:'SAVED_READBACK',stored:true,providerRequests:1,count:observations.length,
    latest:observations.at(-1).date,sourceStoredAt:doc.sourceStoredAt,
    fileSha256:hash(output),sourceSha256};
}
