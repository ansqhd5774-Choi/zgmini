// Explicitly approved, one-shot PC-private BLS PPI inputs. Not a Core job.
// No scheduler, SQLite, D1, public feed, or production-score integration.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectInflationCausalBls8,BLS8_IDS,BLS8_OUTPUT_RELATIVE} from '../inflation-causal-bls8.mjs';

export const APPROVED_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const KEY_NAMES=Object.freeze(['BLS_API_KEY','BLS_REGISTRATION_KEY']);

async function defaultProviders(base){
  const {loadLocalProviders}=await import('./local-env.mjs');
  return loadLocalProviders(base);
}
async function defaultQuota({base,originalFetch,mode}){
  const {createQuotaFetch}=await import('./quota-fetch.mjs');
  return createQuotaFetch({base,originalFetch,mode});
}
const safeDirectory=folder=>{
  try{const st=fs.lstatSync(folder);return st.isDirectory()&&!st.isSymbolicLink();}
  catch{return false;}
};
function checkApprovedHome(home){
  if(typeof home!=='string'||!path.isAbsolute(home)||
    path.basename(path.resolve(home)).toLowerCase()!=='pc-writer'||!safeDirectory(home))
    throw Error('BLS8_PC_HOME_NOT_APPROVED');
  if(process.platform==='win32'&&path.win32.normalize(home).toLowerCase()!==
      path.win32.normalize(APPROVED_PC_HOME).toLowerCase())
    throw Error('BLS8_PC_HOME_NOT_APPROVED');
  const output=path.join(home,BLS8_OUTPUT_RELATIVE),folder=path.dirname(output);
  if(fs.existsSync(folder)&&!safeDirectory(folder))throw Error('BLS8_OUTPUT_FOLDER_UNSAFE');
  if(fs.existsSync(output)){
    const st=fs.lstatSync(output);
    if(!st.isFile()||st.isSymbolicLink())throw Error('BLS8_OUTPUT_FILE_UNSAFE');
  }
}
const reject=code=>({status:'BLOCKED',code,providerAttempts:0,providerCallsMax:0,
  providerCalls:0,
  coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0,publications:0});

/** The caller pins source, host and file hashes in a separate B-grade manifest. */
export async function runInflationBls8Once({
  writerHome,
  fetcher=globalThis.fetch,
  providerReader=defaultProviders,
  quotaFactory=defaultQuota,
  collect=collectInflationCausalBls8,
  now=()=>new Date(),
}={}){
  checkApprovedHome(writerHome);
  if(typeof fetcher!=='function'||typeof providerReader!=='function'||
    typeof quotaFactory!=='function'||typeof collect!=='function')
    throw Error('BLS8_DEPENDENCY_UNAVAILABLE');
  let providers;
  try{providers=await providerReader(writerHome);}catch{return reject('BLS8_PROVIDER_FILE_UNAVAILABLE')}
  const key=KEY_NAMES.map(name=>providers?.[name]).find(v=>typeof v==='string'&&v.trim());
  if(!key)return reject('BLS8_REGISTRATION_KEY_MISSING');
  const transport=await quotaFactory({base:writerHome,originalFetch:fetcher,mode:'enforce'});
  if(typeof transport?.fetch!=='function')throw Error('BLS8_QUOTA_TRANSPORT_NOT_ENFORCED');
  let attempts=0;
  const countedFetch=async(...args)=>{attempts++;if(attempts>1)throw Error('BLS8_ONE_REQUEST_CAP');
    return transport.fetch(...args);};
  let saved;
  try{
    saved=await collect({base:writerHome,blsKey:key,quotaFetch:countedFetch,now:now()});
  }catch(error){
    const known=typeof error?.code==='string'&&/^[A-Z0-9_]{3,75}$/.test(error.code)
      ?error.code:'BLS8_RESEARCH_COLLECT_FAILED';
    return {...reject(known),status:'RUNTIME_FAILED',providerAttempts:attempts,
      providerCallsMax:attempts};
  }
  if(saved?.ids!==BLS8_IDS.length||
    !['SAVED_READBACK','UNCHANGED_VALID_INPUT_PRESERVED'].includes(saved.status)||
    typeof saved?.counts!=='object'||typeof saved?.latest!=='object'||
    BLS8_IDS.some(id=>!Number.isInteger(saved.counts[id])||saved.counts[id]<1||
      !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(saved.latest[id]??'')))
    throw Error('BLS8_STORAGE_RESULT_DENIED');
  return {
    status:'PASS',code:saved.status==='SAVED_READBACK'?
      'BLS8_SAVED_READBACK':'BLS8_PREVIOUS_VALID_UNCHANGED',
    ids:saved.ids,counts:saved.counts,latest:saved.latest,
    providerAttempts:attempts,providerCalls:attempts,providerCallsMax:attempts,
    sourceStoredAt:saved.sourceStoredAt??null,sourceVersion:saved.sourceVersion??null,
    fileSha256:saved.fileSha256??null,coreWrites:0,dbWrites:0,
    d1Writes:0,schedulerWrites:0,publications:0,
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let result;
  try{
    if(process.argv.length!==2)throw Error('BLS8_ARGUMENTS_DENIED');
    result=await runInflationBls8Once({writerHome:process.env.ZGMINI_PC_HOME});
  }catch(error){
    const code=/^BLS8_[A-Z0-9_]+$/.test(error?.message??'')?
      error.message:'BLS8_UNEXPECTED_STOP';
    result={...reject(code),status:'RUNTIME_FAILED'};
  }
  // This is safe to return to the private host wrapper; it contains no keys or raw values.
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='PASS')process.exitCode=1;
}
