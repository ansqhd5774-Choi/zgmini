// W01 A4-01: fixed 23-input private readback; no collector, scheduler or D1 calls.
// Reuse the existing source parsers rather than infer raw availability from a
// staged public projection. The CLI is deliberately NOT a Controller operation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {INFLATION_CAUSAL_19_IDS} from '../../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7_IDS} from '../../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {previewInflation19} from './inflation-causal-public-preview-r1.mjs';
import {previewInflationCandidates7} from './inflation-causal-candidates-public-7-preview-r1.mjs';

export const A401_EXISTING_FOUR=Object.freeze(['2','16','24','29']);
export const A401_EXPECTED_COUNT=23;
const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const HEX64=/^[a-f0-9]{64}$/;
const failure=code=>Object.assign(new Error(code),{code});
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&
  new Date(v).toISOString()===v;
const validDate=v=>typeof v==='string'&&/^(?:19|20)\d\d-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?$/.test(v)&&
  Number.isFinite(Date.parse(v.length===7?v+'-01T00:00:00Z':v+'T00:00:00Z'));
const unique=x=>new Set(x).size===x.length;

function exactIds(rows,expected) {
  if(!Array.isArray(rows)||rows.length!==expected.length)return false;
  const ids=rows.map(x=>String(x?.id??''));
  return unique(ids)&&expected.every(id=>ids.includes(id));
}

// This accepts *reader results*, never a public projection. It is pure to
// permit contract tests; only runA401Baseline23() constitutes an actual read.
export function evaluateA401Baseline23({original,additional}={}) {
  const originalRows=original?.payload?.indicators;
  const extraRows=additional?.payload?.indicators;
  const structure=exactIds(originalRows,INFLATION_CAUSAL_19_IDS)&&
    exactIds(extraRows,INFLATION_CANDIDATES_7_IDS)&&
    unique([...INFLATION_CAUSAL_19_IDS,...A401_EXISTING_FOUR]);
  if(!structure)return {status:'STOP',code:'W01_A401_SOURCE_CATALOG_MISMATCH',
    originalReady:0,additionalReady:0,verified:0,expected:A401_EXPECTED_COUNT,
    providerCalls:0,sqliteWrites:0,d1Writes:0,sourceWrites:0,taskChanges:0};
  const first=originalRows.map(row=>({
    id:String(row.id),status:row.status==='READY'&&validDate(row.observationDate)&&
      iso(row.sourceStoredAt)&&typeof row.value==='number'&&Number.isFinite(row.value)
      ?'PRESENT_VALID':'UNVERIFIED',
    observationDate:validDate(row.observationDate)?row.observationDate:null,
    sourceStoredAt:iso(row.sourceStoredAt)?row.sourceStoredAt:null,
  }));
  const four=A401_EXISTING_FOUR.map(id=>{
    const row=extraRows.find(x=>String(x.id)===id);
    return {id,status:row.status==='READY'&&validDate(row.observationDate)&&
      iso(row.sourceStoredAt)&&typeof row.value==='number'&&Number.isFinite(row.value)
      ?'PRESENT_VALID':'UNVERIFIED',
      observationDate:validDate(row.observationDate)?row.observationDate:null,
      sourceStoredAt:iso(row.sourceStoredAt)?row.sourceStoredAt:null};
  });
  const originalReady=first.filter(x=>x.status==='PRESENT_VALID').length;
  const additionalReady=four.filter(x=>x.status==='PRESENT_VALID').length;
  const verified=originalReady+additionalReady;
  const success=original?.status==='PASS_READONLY'&&
    additional?.status==='PASS_READONLY'&&verified===A401_EXPECTED_COUNT;
  return {status:success?'PASS':'PARTIAL',
    code:success?'W01_A401_PRIVATE_SOURCE_23_VALID':
      'W01_A401_PRIVATE_SOURCE_READBACK_INCOMPLETE',
    originalReady,additionalReady,verified,expected:A401_EXPECTED_COUNT,
    original:first,additional:four,providerCalls:0,sqliteWrites:0,
    d1Writes:0,sourceWrites:0,taskChanges:0};
}

function fixedSourceHome(home) {
  if(typeof home!=='string'||!path.isAbsolute(home)||
    (process.platform==='win32'&&
      path.win32.normalize(home).toLowerCase()!==path.win32.normalize(PC_HOME).toLowerCase()))
    throw failure('W01_A401_HOME_DENIED');
  const stat=fs.lstatSync(home);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw failure('W01_A401_HOME_DENIED');
  return home;
}

// SQLite readOnly can itself create a -shm sidecar under WAL mode. Never open
// the DB unless both sidecars already exist as regular files.
export function requireExistingWalSidecars(home,file) {
  const expected=path.resolve(home,'storage','core.sqlite');
  if(path.resolve(file)!==expected)throw failure('W01_A401_DB_PATH_DENIED');
  for(const name of [file,file+'-wal',file+'-shm']){
    let stat;
    try{stat=fs.lstatSync(name);}catch{throw failure('W01_A401_DB_SIDECAR_UNVERIFIED');}
    if(!stat.isFile()||stat.isSymbolicLink()||
      (name===file&&(stat.size<100||stat.size>50_000_000_000))||
      (name!==file&&stat.size>50_000_000_000))
      throw failure('W01_A401_DB_SIDECAR_UNVERIFIED');
  }
  let fd;
  try {
    fd=fs.openSync(file,'r');
    const header=Buffer.alloc(16);
    if(fs.readSync(fd,header,0,16,0)!==16||
      header.toString('ascii')!=='SQLite format 3\u0000')
      throw failure('W01_A401_DB_HEADER_UNVERIFIED');
  } finally {if(fd!==undefined)fs.closeSync(fd);}
  return true;
}

export function runA401Baseline23(home=PC_HOME) {
  const root=fixedSourceHome(home);
  const original=previewInflation19(root,{openDb:file=>{
    requireExistingWalSidecars(root,file);
    return new DatabaseSync(file,{readOnly:true,timeout:1000});
  }});
  const additional=previewInflationCandidates7(root);
  return evaluateA401Baseline23({original,additional});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let report;
  try {
    if(process.argv.length!==2)throw failure('W01_A401_ARGS_DENIED');
    report=runA401Baseline23();
  } catch(error) {
    report={status:'STOP',code:/^W01_A401_[A-Z_]+$/.test(error?.code??'')?
      error.code:'W01_A401_READBACK_UNVERIFIED',
      providerCalls:0,sqliteWrites:0,d1Writes:0,sourceWrites:0,taskChanges:0};
  }
  console.log(JSON.stringify(report));
  if(report.status!=='PASS')process.exitCode=1;
}
