// W01 Census M3: diagnose archived API response headers without
// provider calls, operational writes or disclosure of observation values.
// Source-only helper; not an approved Windows PC operation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const PC_BASE=String.raw`E:\ZGmini\data\pc-writer`;
const SHA64=/^[a-f0-9]{64}$/;
const ARCHIVE=/^census-m3-mtm-(20\d{2})-([a-f0-9]{64})\.json$/;
const MANDATORY=['data_type_code','seasonally_adj','category_code','cell_value','us'];
const MAX_FILE_BYTES=5_000_000;
const fail=code=>Object.assign(new Error(code),{code});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function checkedDirectory(dir){
  let st;try{st=fs.lstatSync(dir);}catch{throw fail('CENSUS_ARCHIVE_DIR_UNSAFE');}
  if(!st.isDirectory()||st.isSymbolicLink())throw fail('CENSUS_ARCHIVE_DIR_UNSAFE');
  return fs.realpathSync.native(dir);
}
function readPinnedArchive(rawDir,name,expectedSha){
  if(!ARCHIVE.test(name)||!SHA64.test(expectedSha))throw fail('CENSUS_ARCHIVE_NAME_INVALID');
  const file=path.join(rawDir,name);
  let st;try{st=fs.lstatSync(file);}catch{throw fail('CENSUS_ARCHIVE_FILE_UNSAFE');}
  if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>MAX_FILE_BYTES)
    throw fail('CENSUS_ARCHIVE_FILE_UNSAFE');
  const real=fs.realpathSync.native(file);
  if(path.dirname(real)!==fs.realpathSync.native(rawDir))
    throw fail('CENSUS_ARCHIVE_PATH_ESCAPE');
  const a=fs.readFileSync(file);
  if(a.length!==st.size||sha(a)!==expectedSha)
    throw fail('CENSUS_ARCHIVE_SHA_MISMATCH');
  const b=fs.readFileSync(file);
  if(b.length!==a.length||sha(b)!==expectedSha)
    throw fail('CENSUS_ARCHIVE_READ_DRIFT');
  return a;
}
function headerSummary(bytes){
  let body;
  try{body=JSON.parse(bytes.toString('utf8'));}
  catch{return {schema:'JSON_INVALID',missingRequired:[...MANDATORY],hasMonthlyDate:false,
    duplicateHeaderCount:0,unrecognizedHeaderCount:0,rowCount:null};}
  if(!Array.isArray(body)||!Array.isArray(body[0])||body.length>20_000)
    return {schema:'SHAPE_INVALID',missingRequired:[...MANDATORY],hasMonthlyDate:false,
      duplicateHeaderCount:0,unrecognizedHeaderCount:0,rowCount:null};
  const headers=body[0].map(s=>typeof s==='string'?s.trim().toLowerCase():null);
  const names=headers.filter(Boolean),uniques=new Set(names);
  const missingRequired=MANDATORY.filter(s=>!uniques.has(s));
  const hasMonthlyDate=uniques.has('time_slot_date')||uniques.has('time');
  const duplicateHeaderCount=names.length-uniques.size;
  const allowed=new Set([...MANDATORY,'time_slot_date','time','time_slot_id','error_data']);
  const unrecognizedHeaderCount=[...uniques].filter(s=>!allowed.has(s)).length;
  const valid=headers.length>0&&headers.every(Boolean)&&duplicateHeaderCount===0&&
    missingRequired.length===0&&hasMonthlyDate;
  return {schema:valid?'HEADERS_VALID':'HEADERS_INVALID',missingRequired,hasMonthlyDate,
    duplicateHeaderCount,unrecognizedHeaderCount,rowCount:body.length-1};
}
export function inspectCensusM3ArchiveHeaders({base,years,strictPlatform=true}={}){
  if(typeof base!=='string'||!path.isAbsolute(base)||
     (strictPlatform&&(process.platform!=='win32'||
       path.win32.normalize(base).toLowerCase()!==path.win32.normalize(PC_BASE).toLowerCase()))||
     (!strictPlatform&&path.basename(path.resolve(base))!=='pc-writer')||
     !Array.isArray(years)||years.length<1||years.length>2||
     new Set(years).size!==years.length||
     !years.every(y=>Number.isInteger(y)&&y>=2000&&y<=2099))
    throw fail('CENSUS_ARCHIVE_SCOPE_DENIED');
  const home=checkedDirectory(base);
  const archiveParent=checkedDirectory(path.join(home,'inflation-causal-candidates-r1'));
  const rawDir=checkedDirectory(path.join(archiveParent,'raw'));
  const names=fs.readdirSync(rawDir).filter(x=>ARCHIVE.test(x)).sort();
  if(names.length>512)throw fail('CENSUS_ARCHIVE_COUNT_LIMIT');
  const wanted=new Set(years),rows=[];
  for(const name of names){
    const m=name.match(ARCHIVE),year=Number(m[1]);
    if(!wanted.has(year))continue;
    rows.push({year,sourceSha256:m[2],...headerSummary(readPinnedArchive(rawDir,name,m[2]))});
  }
  const availableYears=new Set(rows.map(x=>x.year));
  const missingYears=years.filter(y=>!availableYears.has(y));
  const invalid=rows.filter(x=>x.schema!=='HEADERS_VALID').length;
  return {status:missingYears.length?'PARTIAL':invalid?'DIAGNOSED':'PASS',
    code:missingYears.length?'CENSUS_ARCHIVE_YEARS_MISSING':
      invalid?'CENSUS_ARCHIVE_HEADERS_INCOMPATIBLE':'CENSUS_ARCHIVE_HEADERS_COMPATIBLE',
    years:[...years].sort(),missingYears,archiveCount:rows.length,invalidArchiveCount:invalid,
    archives:rows,providerCalls:0,operationalWrites:0,d1Writes:0,sqliteOpened:false,
    evidenceLevel:'OFFLINE_ARCHIVE_HEADER_DIAGNOSTIC_NOT_PC_CERTIFIED'};
}
