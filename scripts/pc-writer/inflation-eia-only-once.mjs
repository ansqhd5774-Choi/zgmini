// Approved private one-shot follow-up: #4 EIA U.S. industrial electricity only.
// #3 FRED gas was already verified and MUST NOT be requested again here.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {collectIndustrialElectricity,ELECTRIC_FILE} from '../inflation-causal-gas-electric.mjs';

export const APPROVED_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
export const EIA_ID='EIA_INDUSTRIAL_US';
const SOURCE='EIA_INDUSTRIAL_ELECTRICITY_US';
const SOURCE_VERSION='INFLATION_CAUSAL_GAS_ELECTRIC_R1';
const HASH=/^[a-f0-9]{64}$/;
const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
const fail=code=>{throw Error(code)};

async function defaultProviders(base){
  const {loadLocalProviders}=await import('./local-env.mjs');
  return loadLocalProviders(base);
}
async function defaultQuota({base,originalFetch,mode}){
  const {createQuotaFetch}=await import('./quota-fetch.mjs');
  return createQuotaFetch({base,originalFetch,mode});
}
function safeDir(dir){
  try{const st=fs.lstatSync(dir);return st.isDirectory()&&!st.isSymbolicLink()}
  catch{return false}
}
function safeFile(file){
  try{const st=fs.lstatSync(file);return st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=8_000_000}
  catch{return false}
}
function checkHome(base){
  if(typeof base!=='string'||!path.isAbsolute(base)||!safeDir(base)||
    path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||
    (process.platform==='win32'&&path.win32.normalize(base).toLowerCase()!==
      path.win32.normalize(APPROVED_PC_HOME).toLowerCase()))
    fail('EIA_ONLY_WRITER_DENIED');
  const root=path.join(base,'inflation-causal-r1');
  if(fs.existsSync(root)&&!safeDir(root))fail('EIA_ONLY_OUTPUT_ROOT_UNSAFE');
  const output=path.join(base,...ELECTRIC_FILE.split('/'));
  if(fs.existsSync(output)&&!safeFile(output))fail('EIA_ONLY_OUTPUT_UNSAFE');
  const rawDir=path.join(root,'raw');
  if(fs.existsSync(rawDir)&&!safeDir(rawDir))fail('EIA_ONLY_RAW_ARCHIVE_UNSAFE');
}
function resultStart(){return {status:'BLOCKED',code:'EIA_ONLY_NOT_STARTED',ids:0,
  providerCalls:0,providerAttempts:0,counts:{},latest:{},fileSha256:{},
  coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0,publications:0}}
function codeFor(error){
  const code=typeof error?.code==='string'?error.code:error?.message;
  return typeof code==='string'&&/^(?:EIA_|EIA_ONLY_|EXISTING_|PROVIDER_|APPROVED_|PC_|PRIVATE_|NOW_)[A-Z0-9_]{2,80}$/.test(code)?
    code:'EIA_ONLY_COLLECTION_FAILED';
}
function readback(base){
  const target=path.join(base,...ELECTRIC_FILE.split('/'));
  if(!safeFile(target))fail('EIA_ONLY_READBACK_MISSING');
  const bytes=fs.readFileSync(target);
  let saved;try{saved=JSON.parse(bytes.toString('utf8'))}
  catch{fail('EIA_ONLY_READBACK_JSON_INVALID')}
  if(saved?.schemaVersion!==1||saved.sourceVersion!==SOURCE_VERSION||saved.source!==SOURCE||
     !Array.isArray(saved.observations)||!saved.observations.length||
     typeof saved.sourceStoredAt!=='string')
    fail('EIA_ONLY_READBACK_CONTRACT_DENIED');
  return {sha:createHash('sha256').update(bytes).digest('hex'),
    count:saved.observations.length,latest:saved.observations.at(-1)?.month,
    sourceStoredAt:saved.sourceStoredAt};
}

export async function runInflationEiaOnlyOnce({
  writerHome,fetcher=globalThis.fetch,providerReader=defaultProviders,
  quotaFactory=defaultQuota,collector=collectIndustrialElectricity,
  now=()=>new Date(),
}={}){
  checkHome(writerHome);
  if(typeof fetcher!=='function'||typeof providerReader!=='function'||
    typeof quotaFactory!=='function'||typeof collector!=='function')
    fail('EIA_ONLY_DEPENDENCY_DENIED');
  let providers;
  try{providers=await providerReader(writerHome)}
  catch{return {...resultStart(),code:'EIA_ONLY_PROVIDERS_UNAVAILABLE'}}
  const key=[providers?.EIA_API_KEY,providers?.EIA_KEY].find(v=>
    typeof v==='string'&&v.trim());
  if(!key)return {...resultStart(),code:'EIA_ONLY_KEY_MISSING'};
  const transport=await quotaFactory({base:writerHome,originalFetch:fetcher,mode:'enforce'});
  if(typeof transport?.fetch!=='function')fail('EIA_ONLY_QUOTA_NOT_ENFORCED');
  const stamp=now();
  if(!(stamp instanceof Date)||!Number.isFinite(stamp.getTime()))
    fail('EIA_ONLY_CLOCK_INVALID');
  let calls=0;
  const guardedFetch=async(url,options)=>{
    let parsed;try{parsed=new URL(url)}catch{fail('EIA_ONLY_URL_DENIED')}
    if(parsed.protocol!=='https:'||parsed.hostname!=='api.eia.gov'||
       options?.method!=='GET'||options?.redirect!=='manual')
      fail('EIA_ONLY_REQUEST_DENIED');
    if(calls>=2)fail('EIA_ONLY_REQUEST_CAP');
    calls++;
    return transport.fetch(url,options);
  };
  let saved;
  try{
    saved=await collector({base:writerHome,eiaKey:key,quotaFetch:guardedFetch,now:stamp});
    if(!['SAVED_READBACK','UNCHANGED'].includes(saved?.status)||
      saved.source!==SOURCE||saved.providerRequests!==2||
      !Number.isInteger(saved.count)||saved.count<1||!MONTH.test(saved.latest??'')||
      calls!==2)fail('EIA_ONLY_CHILD_CONTRACT_DENIED');
    const verified=readback(writerHome);
    if(verified.count!==saved.count||verified.latest!==saved.latest||
       !HASH.test(verified.sha)||
       (saved.status==='SAVED_READBACK'&&saved.fileSha256!==verified.sha))
      fail('EIA_ONLY_READBACK_HASH_DENIED');
    return {...resultStart(),status:'PASS',
      code:saved.status==='SAVED_READBACK'?'EIA_ONLY_SAVED_READBACK':'EIA_ONLY_PREVIOUS_VALID_UNCHANGED',
      ids:1,providerCalls:calls,providerAttempts:calls,
      counts:{[EIA_ID]:verified.count},latest:{[EIA_ID]:verified.latest},
      fileSha256:{[EIA_ID]:verified.sha},sourceStoredAt:verified.sourceStoredAt};
  }catch(error){return {...resultStart(),status:'RUNTIME_FAILED',code:codeFor(error),
    providerCalls:calls,providerAttempts:calls};}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let result;
  try{
    if(process.argv.length!==2)fail('EIA_ONLY_ARGUMENTS_DENIED');
    result=await runInflationEiaOnlyOnce({writerHome:process.env.ZGMINI_PC_HOME});
  }catch(error){result={...resultStart(),status:'RUNTIME_FAILED',code:codeFor(error)}}
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='PASS')process.exitCode=1;
}
