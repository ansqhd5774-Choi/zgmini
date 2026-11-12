// Isolated, one-shot #31 SCE collection entrypoint for an approved PC writer.
// This file does not register a Controller operation, schedule, publish, or score.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectSceOneYear} from '../inflation-sce-collector.mjs';

async function quotaFactory(options) {
  const {createQuotaFetch}=await import('./quota-fetch.mjs');
  return createQuotaFetch(options);
}

async function isSafeDirectory(directory,{missingAllowed=false}={}) {
  try {
    const info=await fs.lstat(directory);
    return info.isDirectory()&&!info.isSymbolicLink();
  } catch(error) {
    if(missingAllowed&&error?.code==='ENOENT')return true;
    return false;
  }
}

export async function runInflationSce31Once({
  writerHome,
  fetcher=globalThis.fetch,
  makeQuotaFetch=quotaFactory,
  collect=collectSceOneYear,
  now=()=>new Date(),
}={}) {
  // The approved host provides its fixed PC writer home. Never accept CLI paths.
  if(typeof writerHome!=='string'||!path.isAbsolute(writerHome)||
     path.basename(path.resolve(writerHome)).toLowerCase()!=='pc-writer'||
     !(await isSafeDirectory(writerHome)))throw Error('SCE_WRITER_HOME_NOT_APPROVED');
  if(typeof fetcher!=='function')throw Error('SCE_FETCH_UNAVAILABLE');
  const parent=path.join(writerHome,'inflation-causal');
  const directory=path.join(parent,'sce31');
  if(!(await isSafeDirectory(parent,{missingAllowed:true}))||
     !(await isSafeDirectory(directory,{missingAllowed:true})))
    throw Error('SCE_OUTPUT_PATH_UNSAFE');
  await fs.mkdir(parent,{recursive:true});
  if(!(await isSafeDirectory(parent)))throw Error('SCE_OUTPUT_PATH_UNSAFE');
  const transport=await makeQuotaFetch({base:writerHome,originalFetch:fetcher,mode:'enforce'});
  if(typeof transport?.fetch!=='function')throw Error('SCE_QUOTA_TRANSPORT_UNAVAILABLE');
  const saved=await collect({directory,fetcher:transport.fetch,now});
  if(saved?.status!=='STORED'||!Number.isInteger(saved?.count)||saved.count<24)
    throw Error('SCE_STORAGE_READBACK_NOT_VERIFIED');
  // Safe, bounded evidence: no raw series, credentials, or absolute PC paths.
  return {
    status:'PASS',code:'SCE31_ONESHOT_SAVED_READBACK',
    source:'NY_FED_SCE_ONE_YEAR_MEDIAN',
    latestMonth:saved.latestMonth,count:saved.count,
    fetchedAt:saved.fetchedAt,downloadSha256:saved.downloadSha256,
    provider:'NYFED',coreWrites:0,d1Writes:0,publications:0,
  };
}

// This standalone command is for an already-approved fixed PC writer host only.
// An A-grade pc-job cannot execute it or authorize this B-grade local write.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==2)throw Error('SCE31_UNEXPECTED_ARGUMENTS');
  const result=await runInflationSce31Once({writerHome:process.env.ZGMINI_PC_HOME});
  console.log(JSON.stringify(result));
}
