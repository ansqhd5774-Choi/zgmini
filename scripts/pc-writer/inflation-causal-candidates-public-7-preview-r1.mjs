// PC-side read-only preview for seven *private* stored research source files.
// Not part of the scheduler, installed Writer lane, or public D1 publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {INFLATION_CANDIDATES_7} from '../../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {INFLATION_CANDIDATES_7_PUBLIC_SCHEMA,validateInflationCandidates7Public}
  from '../../worker/inflation-causal-candidates-public-7-r1.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const FOLDER='inflation-causal-candidates-r1';
const SOURCES=Object.freeze({
  '2':{file:'eia-us-regular-gasoline-weekly.json',provider:'EIA',
    version:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1'},
  '16':{file:'treasury-mts-customs-duties.json',provider:'US_TREASURY_MTS',
    version:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1'},
  '22':{file:'bls-cpi-ppi3.json',provider:'BLS',version:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1'},
  '23':{file:'bls-cpi-ppi3.json',provider:'BLS',version:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1'},
  '24':{file:'bls-cpi-ppi3.json',provider:'BLS',version:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1'},
  '28':{file:'census-m3-manufacturing-inventories.json',provider:'US_CENSUS_M3',
    version:'INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1'},
  '29':{file:'fed-g17-manufacturing-ip.json',provider:'FEDERAL_RESERVE_G17',
    version:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1'},
});
const digest=value=>createHash('sha256').update(value).digest('hex');
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validIso=value=>typeof value==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===
  (value.includes('.')?value:value.replace('Z','.000Z'));
const validDate=value=>{
  if(typeof value!=='string'||!/^(?:19|20)\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(value))return false;
  const parsed=new Date(value+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
};
const pending=meta=>({id:meta.id,series:meta.series,unit:meta.unit,status:'PENDING',
  value:null,previousValue:null,observationDate:null,previousObservationDate:null,
  sourceStoredAt:null,availableAt:null,history:[]});
const fail=code=>{throw Error(code);};

function approvedHome(home){
  if(typeof home!=='string'||!path.isAbsolute(home))fail('INFL7_PC_HOME_DENIED');
  let canonical;
  try{
    const stat=fs.lstatSync(home);
    if(process.platform!=='win32'&&stat.isSymbolicLink())fail('INFL7_PC_HOME_DENIED');
    canonical=fs.realpathSync.native(home);
    if(!fs.statSync(canonical).isDirectory())fail('INFL7_PC_HOME_DENIED');
    if(process.platform==='win32'){
      const approved=fs.realpathSync.native(PC_HOME);
      if(path.win32.normalize(canonical).toLowerCase()!==path.win32.normalize(approved).toLowerCase())
        fail('INFL7_PC_HOME_DENIED');
    }
  }catch{fail('INFL7_PC_HOME_DENIED');}
  return canonical;
}
function safeDirectory(directory){
  try{
    const stat=fs.lstatSync(directory);
    return stat.isDirectory()&&!stat.isSymbolicLink();
  }catch{return false;}
}
function readSource(directory,file){
  if(!safeDirectory(directory))fail('INFL7_SOURCE_DIR_MISSING');
  const target=path.join(directory,file);
  let stat;
  try{stat=fs.lstatSync(target);}
  catch(error){if(error?.code==='ENOENT')fail('INFL7_SOURCE_FILE_MISSING');fail('INFL7_SOURCE_FILE_DENIED');}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>8_000_000)
    fail('INFL7_SOURCE_FILE_DENIED');
  try{return JSON.parse(fs.readFileSync(target,'utf8'));}
  catch{fail('INFL7_SOURCE_JSON_INVALID');}
}

function rawValue(id,row){
  if(id==='16'){
    const money=row?.netUsdDecimal;
    // The Treasury collector saves monthly net cash receipts as a decimal string.
    // Restrict magnitude so cent precision is not silently lost in Number.
    if(typeof money!=='string'||! /^(?:-)?(?:0|[1-9]\d*)\.\d{2}$/.test(money))
      fail('INFL7_TREASURY_MONEY_INVALID');
    const value=Number(money);
    if(!finite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER/100)
      fail('INFL7_TREASURY_MONEY_INVALID');
    return value;
  }
  return row?.value;
}
function readObservations(meta,doc){
  const id=meta.id;
  if(id==='2'&& (doc.selector!=='EMM_EPMR_PTE_NUS_DPG'||
      doc.unit!=='USD_PER_GALLON'||doc.frequency!=='WEEKLY'))
    fail('INFL7_EIA_SELECTOR_INVALID');
  if(id==='16'&& (doc.lineCode!=='405'||doc.classification!=='Customs Duties'||
      doc.frequency!=='MONTHLY'))
    fail('INFL7_TREASURY_SELECTOR_INVALID');
  if(['22','23','24'].includes(id)&&doc.frequency!=='MONTHLY')
    fail('INFL7_BLS_FREQUENCY_INVALID');
  if(id==='28'&& (doc.selector!=='MTM/TI'||doc.frequency!=='MONTHLY'||
      doc.unit!=='USD_MILLION_SA_NOMINAL'))
    fail('INFL7_CENSUS_SELECTOR_INVALID');
  if(id==='29'&& (doc.selector!=='GMF'||doc.frequency!=='MONTHLY'||
      doc.unit!=='CURRENT_G17_INDEX_SA'))
    fail('INFL7_FED_SELECTOR_INVALID');

  const source=['22','23','24'].includes(id)?doc.series?.[meta.series]:doc.observations;
  if(!Array.isArray(source)||source.length<1||source.length>25_000)
    fail('INFL7_SOURCE_ROWS_MISSING');
  const entries=[],seen=new Set();
  for(const item of source){
    const day=item?.date,value=rawValue(id,item);
    if(!validDate(day)||!finite(value)||seen.has(day))fail('INFL7_SOURCE_ROW_INVALID');
    // Match collector-side physical contracts while preserving signed Treasury receipts.
    if((['2','29'].includes(id)&&value<=0)||
      (['22','23','24','28'].includes(id)&&value<0))
      fail('INFL7_SOURCE_VALUE_INVALID');
    if(['22','23','24','28','29'].includes(id)&&day.slice(8)!=='01')
      fail('INFL7_SOURCE_MONTH_INVALID');
    if(id==='16'&&(item.period!==day.slice(0,7)||item.unit!=='USD'||
        item.valueKind!=='MONTHLY_NET_CASH_RECEIPTS'))
      fail('INFL7_TREASURY_ROW_INVALID');
    if(id==='28'&&(item.selector!=='MTM/TI'||item.unit!=='USD_MILLION_SA_NOMINAL'||
        item.seasonallyAdjusted!==true))
      fail('INFL7_CENSUS_ROW_INVALID');
    if(id==='2'&&item.unit!=='USD_PER_GALLON')fail('INFL7_EIA_ROW_INVALID');
    seen.add(day);entries.push({date:day,value});
  }
  entries.sort((a,b)=>a.date.localeCompare(b.date));
  return entries;
}

export function projectInflationCandidate7Row(meta,doc,{now=Date.now()}={}){
  const source=SOURCES[meta?.id];
  if(!source||!doc||doc.schemaVersion!==1||doc.provider!==source.provider||
    doc.sourceVersion!==source.version||!validIso(doc.sourceStoredAt)||
    Date.parse(doc.sourceStoredAt)>now)
    fail('INFL7_SOURCE_PROVENANCE_INVALID');
  const observations=readObservations(meta,doc);
  const last=observations.at(-1),previous=observations.at(-2);
  return {id:meta.id,series:meta.series,unit:meta.unit,status:'READY',
    value:last.value,previousValue:previous?.value??null,
    observationDate:last.date,previousObservationDate:previous?.date??null,
    sourceStoredAt:doc.sourceStoredAt,availableAt:null,history:observations.slice(-13)};
}

// Missing/invalid sources remain PENDING; no fabricated values or raw-data egress.
// A caller must inspect `missing` and decide publication separately; this is not a publisher.
export function previewInflationCandidates7(home,{now=Date.now()}={}){
  const directory=path.join(approvedHome(home),FOLDER),cached=new Map();
  const missing={},rows=[];
  for(const meta of INFLATION_CANDIDATES_7){
    const name=SOURCES[meta.id].file;
    try{
      if(!cached.has(name))cached.set(name,readSource(directory,name));
      rows.push(projectInflationCandidate7Row(meta,cached.get(name),{now}));
    }catch(error){
      missing[meta.id]=/^INFL7_[A-Z0-9_]{3,80}$/.test(error?.message??'')?
        error.message:'INFL7_SOURCE_UNAVAILABLE';
      rows.push(pending(meta));
    }
  }
  const ready=rows.filter(row=>row.status==='READY');
  const common={ready:ready.length,missing,providerCalls:0,dbWrites:0,d1Writes:0,
    coreWrites:0,schedulerWrites:0};
  if(ready.length===0)return {status:'PENDING',code:'INFL7_PUBLIC_INPUTS_UNAVAILABLE',
    ...common,payload:null};
  const at=Math.max(...ready.map(row=>Date.parse(row.sourceStoredAt)));
  const payload={schemaVersion:INFLATION_CANDIDATES_7_PUBLIC_SCHEMA,
    status:ready.length===7?'READY':'PARTIAL',score:null,
    sourceVersion:'INFL7_PRESENTATION_'+digest(JSON.stringify(rows)),
    sourceStoredAt:at,indicators:rows};
  validateInflationCandidates7Public(payload,{now});
  return {status:'PASS_READONLY',code:'INFL7_PUBLIC_PREVIEW',...common,payload};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let output;
  try{
    if(process.argv.length!==2)fail('INFL7_ARGS_DENIED');
    const result=previewInflationCandidates7(PC_HOME);
    output={status:result.status,code:result.code,ready:result.ready,
      missing:result.missing,latest:Object.fromEntries((result.payload?.indicators??[])
        .filter(row=>row.status==='READY').map(row=>[row.id,row.observationDate])),
      sourceVersion:result.payload?.sourceVersion??null,
      providerCalls:0,dbWrites:0,d1Writes:0,coreWrites:0,schedulerWrites:0};
  }catch(error){
    output={status:'BLOCKED',code:/^INFL7_[A-Z0-9_]{3,80}$/.test(error?.message??'')?
      error.message:'INFL7_PREVIEW_UNAVAILABLE',providerCalls:0,dbWrites:0,d1Writes:0,
      coreWrites:0,schedulerWrites:0};
  }
  console.log(JSON.stringify(output));
  if(output.status!=='PASS_READONLY')process.exitCode=1;
}
