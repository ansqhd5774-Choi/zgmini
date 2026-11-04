// Approved private one-shot inflation input capture for #3 FRED gas / #4 EIA industrial electricity.
// No Core, SQLite, D1, scheduler, public score, or site writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  collectGas,collectIndustrialElectricity,GAS_FILE,ELECTRIC_FILE,
} from '../inflation-causal-gas-electric.mjs';

export const APPROVED_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const SHA=/^[a-f0-9]{64}$/;
const GAS='DHHNGSP';
const ELECTRIC='EIA_INDUSTRIAL_US';
const RESEARCH_VERSION='INFLATION_CAUSAL_GAS_ELECTRIC_R1';

async function defaultProviders(base){
  const {loadLocalProviders}=await import('./local-env.mjs');
  return loadLocalProviders(base);
}
async function defaultQuota({base,originalFetch,mode}){
  const {createQuotaFetch}=await import('./quota-fetch.mjs');
  return createQuotaFetch({base,originalFetch,mode});
}
function safeDir(folder){
  try{const s=fs.lstatSync(folder);return s.isDirectory()&&!s.isSymbolicLink()}
  catch{return false}
}
function safeFile(file){
  try{const s=fs.lstatSync(file);return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=8_000_000}
  catch{return false}
}
function assertApprovedWriter(base){
  if(typeof base!=='string'||!path.isAbsolute(base)||!safeDir(base)||
    path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||
    (process.platform==='win32'&&path.win32.normalize(base).toLowerCase()!==path.win32.normalize(APPROVED_PC_HOME).toLowerCase()))
    throw Error('GAS_ELECTRIC_PC_WRITER_DENIED');
  const root=path.join(base,'inflation-causal-r1');
  if(fs.existsSync(root)&&!safeDir(root))throw Error('GAS_ELECTRIC_OUTPUT_ROOT_UNSAFE');
  for(const rel of [GAS_FILE,ELECTRIC_FILE]){
    const file=path.join(base,...rel.split('/'));
    if(fs.existsSync(file)&&!safeFile(file))throw Error('GAS_ELECTRIC_OUTPUT_FILE_UNSAFE');
  }
}
function keyFrom(providers,names){
  return names.map(name=>providers?.[name]).find(v=>typeof v==='string'&&v.trim())??null;
}
function cleanError(error){
  const code=typeof error?.code==='string'?error.code:error?.message;
  return typeof code==='string'&&/^(?:GAS_|EIA_|FRED_|PROVIDER_|APPROVED_|EXISTING_|PC_|PRIVATE_|NOW_|LOCAL_|GAS_ELECTRIC_)[A-Z0-9_]{2,80}$/.test(code)
    ?code:'GAS_ELECTRIC_COLLECT_FAILED';
}
function readbackHash(base,rel,source){
  const file=path.join(base,...rel.split('/'));
  if(!safeFile(file))throw Error('GAS_ELECTRIC_READBACK_FILE_UNSAFE');
  const bytes=fs.readFileSync(file);
  let doc;try{doc=JSON.parse(bytes.toString('utf8'))}catch{throw Error('GAS_ELECTRIC_READBACK_INVALID')}
  if(doc?.schemaVersion!==1||doc?.sourceVersion!==RESEARCH_VERSION||doc?.source!==source||
     !Array.isArray(doc?.observations)||!doc.observations.length)
    throw Error('GAS_ELECTRIC_READBACK_INVALID');
  return createHash('sha256').update(bytes).digest('hex');
}
const start=()=>({status:'BLOCKED',code:'GAS_ELECTRIC_NOT_STARTED',providerCalls:0,
  ids:0,counts:{},latest:{},fileSha256:{},coreWrites:0,dbWrites:0,d1Writes:0,
  schedulerWrites:0,publications:0});

/**
 * Research source and quota modules are pinned by the separate fixed B-grade controller.
 * Collection order is fixed: one FRED GET, then EIA facet GET, then EIA data GET.
 * The caller does not accept an arbitrary path, code, URL, or provider command.
 */
export async function runInflationGasElectricOnce({
  writerHome,fetcher=globalThis.fetch,providerReader=defaultProviders,
  quotaFactory=defaultQuota,gasCollector=collectGas,electricCollector=collectIndustrialElectricity,
  now=()=>new Date(),
}={}){
  assertApprovedWriter(writerHome);
  if(typeof fetcher!=='function'||typeof providerReader!=='function'||
     typeof quotaFactory!=='function'||typeof gasCollector!=='function'||
     typeof electricCollector!=='function')throw Error('GAS_ELECTRIC_DEPENDENCY_DENIED');
  let providers;
  try{providers=await providerReader(writerHome)}
  catch{return {...start(),code:'GAS_ELECTRIC_PROVIDER_FILE_UNAVAILABLE'}}
  const fredKey=keyFrom(providers,['FRED_API_KEY','FRED_KEY']);
  const eiaKey=keyFrom(providers,['EIA_API_KEY','EIA_KEY']);
  if(!fredKey&&!eiaKey)return {...start(),code:'GAS_ELECTRIC_BOTH_KEYS_UNAVAILABLE'};
  const transport=await quotaFactory({base:writerHome,originalFetch:fetcher,mode:'enforce'});
  if(typeof transport?.fetch!=='function')throw Error('GAS_ELECTRIC_QUOTA_NOT_ENFORCED');
  const attempts={FRED:0,EIA:0};let total=0;
  const quotaFetch=async(url,options)=>{
    let host;try{host=new URL(url).hostname.toLowerCase()}
    catch{throw Error('GAS_ELECTRIC_HOST_DENIED')}
    const provider=host==='api.stlouisfed.org'?'FRED':host==='api.eia.gov'?'EIA':null;
    if(!provider||options?.method!=='GET'||options.redirect!=='manual')
      throw Error('GAS_ELECTRIC_REQUEST_DENIED');
    if(total>=3||attempts[provider]>=(provider==='FRED'?1:2))
      throw Error('GAS_ELECTRIC_REQUEST_CAP');
    total++;attempts[provider]++;
    return transport.fetch(url,options);
  };
  const result={...start(),status:'RUNTIME_FAILED',code:'GAS_ELECTRIC_NOT_FULLY_COLLECTED',
    failures:{},metrics:{}};
  const stamp=now();
  if(!(stamp instanceof Date)||!Number.isFinite(stamp.getTime()))
    throw Error('GAS_ELECTRIC_CLOCK_DENIED');
  for(const item of [
    {id:GAS,key:fredKey,provider:'FRED',rel:GAS_FILE,source:'FRED_DHHNGSP',collector:gasCollector},
    {id:ELECTRIC,key:eiaKey,provider:'EIA',rel:ELECTRIC_FILE,source:'EIA_INDUSTRIAL_ELECTRICITY_US',collector:electricCollector},
  ]){
    if(!item.key){result.failures[item.id]=`${item.provider}_KEY_MISSING`;continue}
    let saved;
    try{
      saved=await item.collector({base:writerHome,
        [item.provider==='FRED'?'fredKey':'eiaKey']:item.key,quotaFetch,now:stamp});
      const expectedRequests=item.provider==='FRED'?1:2;
      if(!['SAVED_READBACK','UNCHANGED'].includes(saved?.status)||
         saved.source!==item.source||saved.providerRequests!==expectedRequests||
         !Number.isInteger(saved.count)||saved.count<1||
         !(item.id===GAS?/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(saved.latest):
           /^\d{4}-(0[1-9]|1[0-2])$/.test(saved.latest)))
        throw Error('GAS_ELECTRIC_COLLECT_CONTRACT_DENIED');
      const fileSha256=readbackHash(writerHome,item.rel,item.source);
      if(!SHA.test(fileSha256)||(saved.status==='SAVED_READBACK'&&saved.fileSha256!==fileSha256))
        throw Error('GAS_ELECTRIC_READBACK_HASH_MISMATCH');
      result.ids++;
      result.counts[item.id]=saved.count;
      result.latest[item.id]=saved.latest;
      result.fileSha256[item.id]=fileSha256;
      result.metrics[item.id]={status:'PASS',code:saved.status,count:saved.count,latest:saved.latest};
    }catch(error){result.failures[item.id]=cleanError(error)}
  }
  result.providerCalls=total;
  result.providerAttempts=total;
  if(result.ids===2&&total===3){
    result.status='PASS';result.code=Object.values(result.metrics).every(v=>v.code==='UNCHANGED')?
      'GAS_ELECTRIC_PREVIOUS_VALID_UNCHANGED':'GAS_ELECTRIC_SAVED_READBACK';
  }else if(result.ids>=1){result.status='PARTIAL';result.code='GAS_ELECTRIC_PARTIAL_INPUTS';}
  else if(!fredKey||!eiaKey){result.status='BLOCKED';result.code='GAS_ELECTRIC_KEY_MISSING';}
  else{result.status='RUNTIME_FAILED';result.code='GAS_ELECTRIC_BOTH_FAILED';}
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let result;
  try{
    if(process.argv.length!==2)throw Error('GAS_ELECTRIC_ARGUMENTS_DENIED');
    result=await runInflationGasElectricOnce({writerHome:process.env.ZGMINI_PC_HOME});
  }catch(error){result={...start(),status:'RUNTIME_FAILED',code:cleanError(error)}}
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='PASS')process.exitCode=1;
}
