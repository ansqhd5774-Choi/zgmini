// Private research-only #3 natural-gas and #4 industrial-electricity raw collectors.
// Never changes operating Core, R2, DB, scheduler, public data or score.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const GAS_ID='DHHNGSP';
export const EIA_ROUTE='https://api.eia.gov/v2/electricity/retail-sales';
export const FRED_ROUTE='https://api.stlouisfed.org/fred/series/observations';
export const GAS_FILE='inflation-causal-r1/gas-dhhngsp.json';
export const ELECTRIC_FILE='inflation-causal-r1/electricity-industrial-eia.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const ISO=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
const SOURCE_VERSION='INFLATION_CAUSAL_GAS_ELECTRIC_R1';
const MAX_BODY=3_000_000;

function safeDir(directory){
  try{const stat=fs.lstatSync(directory);return stat.isDirectory()&&!stat.isSymbolicLink();}
  catch{return false;}
}
function safeFile(file,maxBytes=8_000_000){
  try{const stat=fs.lstatSync(file);return stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=maxBytes;}
  catch{return false;}
}
function validDate(s){return typeof s==='string'&&ISO.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
function finitePositive(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0;}

async function boundedJson(url,{quotaFetch,maxBytes=MAX_BODY}={}){
  if(typeof quotaFetch!=='function')fail('APPROVED_QUOTA_FETCH_REQUIRED');
  const link=new URL(url);
  if(link.protocol!=='https:'||!['api.eia.gov','api.stlouisfed.org'].includes(link.hostname))fail('PROVIDER_HOST_DENIED');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const res=await quotaFetch(link,{method:'GET',redirect:'manual',signal:controller.signal});
    if(!res?.ok)fail(`PROVIDER_HTTP_${Number.isInteger(res?.status)?res.status:'FAILED'}`);
    if(!res.body?.getReader)fail('PROVIDER_RESPONSE_STREAM_REQUIRED');
    const stream=res.body.getReader();let total=0;const chunks=[];
    while(true){
      const {done,value}=await stream.read();if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){await stream.cancel();fail('PROVIDER_BODY_LIMIT')}
      chunks.push(value);
    }
    const bytes=Buffer.concat(chunks);
    try{return JSON.parse(bytes.toString('utf8'))}
    catch{fail('PROVIDER_JSON_INVALID')}
  }finally{clearTimeout(timer)}
}

export function normalizeFredGas(raw){
  if(raw?.error_code||!Array.isArray(raw?.observations)||raw.observations.length<20||raw.observations.length>10000)
    fail('GAS_PROVIDER_SHAPE');
  const daily=[],missing=[],dates=new Set();
  for(const x of raw.observations){
    if(!validDate(x?.date)||dates.has(x.date))fail('GAS_DATE_OR_DUPLICATE');
    dates.add(x.date);
    if(x.value==='.'){
      missing.push({date:x.date,status:'NOT_REPORTED'});continue;
    }
    if(typeof x.value!=='string'||!x.value.trim()||!Number.isFinite(Number(x.value))||Number(x.value)<0)
      fail('GAS_INVALID_VALUE');
    daily.push({date:x.date,value:Number(x.value)});
  }
  if(daily.length<16)fail('GAS_INCOMPLETE');
  daily.sort((a,b)=>a.date.localeCompare(b.date));
  const byMonth=new Map();
  for(const row of daily){
    const month=row.date.slice(0,7),acc=byMonth.get(month)??{sum:0,count:0};
    acc.sum+=row.value;acc.count++;byMonth.set(month,acc);
  }
  const monthly=[...byMonth].sort(([a],[b])=>a.localeCompare(b)).map(([month,v])=>({
    month,value:v.sum/v.count,observedDays:v.count,aggregation:'ARITHMETIC_MEAN_OF_REPORTED_DAYS',
  }));
  return {daily,monthly,missing};
}

export function confirmEiaUsIndustrialFacet(raw){
  const options=raw?.response?.facets;
  if(!Array.isArray(options)||options.length>1000)fail('EIA_STATE_METADATA_INVALID');
  const us=options.find(x=>x?.id==='US');
  if(!us||!/(united states|^u\.s\.$|^us$)/i.test(String(us.name??us.alias??'')))
    fail('EIA_US_NATIONAL_FACET_UNVERIFIED');
  return true;
}

export function normalizeEiaIndustrial(raw){
  const response=raw?.response;
  if(response?.frequency!=='monthly'||!Array.isArray(response?.data)||
    response.data.length<12||response.data.length>1000)fail('EIA_MONTHLY_SHAPE');
  const total=Number(response.total);
  if(!Number.isSafeInteger(total)||total!==response.data.length)
    fail('EIA_PAGINATION_INCOMPLETE');
  const months=new Set(),observations=[];
  for(const item of response.data){
    if(!MONTH.test(item?.period??'')||item?.stateid!=='US'||item?.sectorid!=='IND'||
      months.has(item.period)||!Number.isFinite(Number(item.price))||
      String(item.price??'').trim()===''||Number(item.price)<0)
      fail('EIA_ROW_INVALID_OR_MIXED_FACET');
    const unit=item['price-units'];
    if(unit!=='cents per kilowatthour')fail('EIA_PRICE_UNITS_CHANGED');
    months.add(item.period);
    observations.push({month:item.period,value:Number(item.price),unit:'cents_per_kWh'});
  }
  observations.sort((a,b)=>a.month.localeCompare(b.month));
  return observations;
}

function approvedPath(base,relative){
  if(typeof base!=='string'||!path.isAbsolute(base)||
    path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||!safeDir(base))
    fail('PC_WRITER_HOME_DENIED');
  const directory=path.join(base,'inflation-causal-r1');
  if(fs.existsSync(directory)&&!safeDir(directory))fail('PRIVATE_OUTPUT_PATH_UNSAFE');
  return path.join(base,...relative.split('/'));
}
function existing(file,kind){
  if(!fs.existsSync(file))return null;
  if(!safeFile(file))fail(`EXISTING_${kind}_FILE_UNSAFE`);
  let parsed;try{parsed=JSON.parse(fs.readFileSync(file,'utf8'))}
  catch{fail(`EXISTING_${kind}_JSON_INVALID`)}
  if(parsed?.schemaVersion!==1||parsed?.sourceVersion!==SOURCE_VERSION||parsed?.source!==kind||
    typeof parsed.sourceStoredAt!=='string'||!Number.isFinite(Date.parse(parsed.sourceStoredAt))||
    !Array.isArray(parsed.observations)||!parsed.observations.length)
    fail(`EXISTING_${kind}_CONTRACT_INVALID`);
  return parsed;
}
function mergeRows(before,next,key){
  const map=new Map();
  for(const x of before??[])if(typeof x?.[key]==='string')map.set(x[key],x);
  for(const x of next)map.set(x[key],x);
  return [...map.values()].sort((a,b)=>a[key].localeCompare(b[key]));
}
function gasMonthlyFromDaily(daily){
  const groups=new Map();
  for(const row of daily){
    const month=row.date.slice(0,7),g=groups.get(month)??{sum:0,count:0};
    g.sum+=row.value;g.count++;groups.set(month,g);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([month,g])=>({
    month,value:g.sum/g.count,observedDays:g.count,
    aggregation:'ARITHMETIC_MEAN_OF_REPORTED_DAYS',
  }));
}
function storeRawSnapshot(file,source,raw){
  const root=path.dirname(file),container=path.join(root,'raw');
  if(fs.existsSync(root)&&!safeDir(root))fail('PRIVATE_OUTPUT_PATH_UNSAFE');
  if(!fs.existsSync(root))fs.mkdirSync(root);
  if(!safeDir(root))fail('PRIVATE_OUTPUT_PATH_UNSAFE');
  if(fs.existsSync(container)&&!safeDir(container))fail('PRIVATE_RAW_ARCHIVE_PATH_UNSAFE');
  if(!fs.existsSync(container))fs.mkdirSync(container);
  if(!safeDir(container))fail('PRIVATE_RAW_ARCHIVE_PATH_UNSAFE');
  const bytes=Buffer.from(JSON.stringify(raw));
  const signature=sha(bytes),archive=path.join(container,`${source}-${signature}.json`);
  if(!fs.existsSync(archive)){
    try{fs.writeFileSync(archive,bytes,{flag:'wx'})}
    catch(e){if(e.code!=='EEXIST')throw e;}
  }
  if(!safeFile(archive)||sha(fs.readFileSync(archive))!==signature)
    fail('PRIVATE_RAW_ARCHIVE_READBACK_FAILED');
  return {sha256:signature,file:`raw/${source}-${signature}.json`};
}
function atomicSave(file,doc){
  const directory=path.dirname(file);
  if(!fs.existsSync(directory))fs.mkdirSync(directory);
  if(!safeDir(directory))fail('PRIVATE_OUTPUT_PATH_UNSAFE');
  const bytes=Buffer.from(JSON.stringify(doc));
  const temporary=`${file}.next-${randomUUID()}`;
  fs.writeFileSync(temporary,bytes,{flag:'wx'});
  try{fs.renameSync(temporary,file)}
  catch{try{fs.unlinkSync(temporary)}catch{}fail('PRIVATE_ATOMIC_RENAME_FAILED')}
  const reread=fs.readFileSync(file);
  if(sha(reread)!==sha(bytes))fail('PRIVATE_READBACK_HASH_MISMATCH');
  const stored=JSON.parse(reread.toString('utf8'));
  if(stored.sourceVersion!==SOURCE_VERSION||stored.sourceStoredAt!==doc.sourceStoredAt)
    fail('PRIVATE_READBACK_CONTRACT_MISMATCH');
  return {fileSha256:sha(bytes),count:stored.observations.length,
    latest:stored.observations.at(-1)[doc.source==='FRED_DHHNGSP'?'date':'month']};
}

export async function collectGas({base,fredKey,quotaFetch,now=new Date()}={}){
  const file=approvedPath(base,GAS_FILE);
  const prior=existing(file,'FRED_DHHNGSP');
  if(typeof fredKey!=='string'||!fredKey.trim())fail('FRED_KEY_MISSING');
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))fail('NOW_INVALID');
  const year=now.getUTCFullYear(),url=new URL(FRED_ROUTE);
  for(const [k,v] of Object.entries({series_id:GAS_ID,api_key:fredKey.trim(),
    file_type:'json',units:'lin',sort_order:'asc',
    observation_start:`${year-19}-01-01`,observation_end:now.toISOString().slice(0,10)}))url.searchParams.set(k,v);
  const payload=await boundedJson(url,{quotaFetch});
  const parsed=normalizeFredGas(payload);
  const observations=mergeRows(prior?.observations,parsed.daily,'date');
  const presentDates=new Set(observations.map(x=>x.date));
  const missing=mergeRows(prior?.missing,parsed.missing,'date')
    .filter(x=>!presentDates.has(x.date));
  if(prior&&JSON.stringify(prior.observations)===JSON.stringify(observations)&&
    JSON.stringify(prior.missing??[])===JSON.stringify(missing))
    return {status:'UNCHANGED',source:'FRED_DHHNGSP',count:observations.length,
      latest:observations.at(-1).date,providerRequests:1,stored:false};
  const doc={schemaVersion:1,sourceVersion:SOURCE_VERSION,source:'FRED_DHHNGSP',
    sourceStoredAt:now.toISOString(),unit:'USD_PER_MMBTU',frequency:'DAILY',
    observations,monthlyAggregates:gasMonthlyFromDaily(observations),
    missing,providerRawObservations:payload.observations,
    rawArchive:storeRawSnapshot(file,'gas',payload.observations),
    responseSha256:sha(JSON.stringify(payload))};
  return {status:'SAVED_READBACK',source:'FRED_DHHNGSP',providerRequests:1,
    stored:true,...atomicSave(file,doc)};
}

export async function collectIndustrialElectricity({base,eiaKey,quotaFetch,now=new Date()}={}){
  const file=approvedPath(base,ELECTRIC_FILE);
  const prior=existing(file,'EIA_INDUSTRIAL_ELECTRICITY_US');
  if(typeof eiaKey!=='string'||!eiaKey.trim())fail('EIA_KEY_MISSING');
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))fail('NOW_INVALID');
  const facetUrl=new URL(`${EIA_ROUTE}/facet/stateid/`);
  facetUrl.searchParams.set('api_key',eiaKey.trim());
  const facets=await boundedJson(facetUrl,{quotaFetch});
  confirmEiaUsIndustrialFacet(facets); // No data request until the US aggregate is confirmed.
  const url=new URL(`${EIA_ROUTE}/data/`);
  for(const [k,v] of Object.entries({api_key:eiaKey.trim(),frequency:'monthly',
    'data[0]':'price','facets[stateid][]':'US','facets[sectorid][]':'IND',
    start:`${now.getUTCFullYear()-19}-01`,end:now.toISOString().slice(0,7),
    'sort[0][column]':'period','sort[0][direction]':'asc',
    length:'1000',offset:'0'}))url.searchParams.set(k,v);
  const payload=await boundedJson(url,{quotaFetch});
  const parsed=normalizeEiaIndustrial(payload);
  const observations=mergeRows(prior?.observations,parsed,'month');
  if(prior&&JSON.stringify(prior.observations)===JSON.stringify(observations))
    return {status:'UNCHANGED',source:'EIA_INDUSTRIAL_ELECTRICITY_US',
      count:observations.length,latest:observations.at(-1).month,providerRequests:2,stored:false};
  const doc={schemaVersion:1,sourceVersion:SOURCE_VERSION,source:'EIA_INDUSTRIAL_ELECTRICITY_US',
    sourceStoredAt:now.toISOString(),unit:'CENTS_PER_KWH',frequency:'MONTHLY',
    facets:{stateid:'US',sectorid:'IND'},observations,
    rawArchive:storeRawSnapshot(file,'electricity',payload.response.data),
    providerRawData:payload.response.data,responseSha256:sha(JSON.stringify(payload))};
  return {status:'SAVED_READBACK',source:'EIA_INDUSTRIAL_ELECTRICITY_US',
    providerRequests:2,stored:true,...atomicSave(file,doc)};
}
