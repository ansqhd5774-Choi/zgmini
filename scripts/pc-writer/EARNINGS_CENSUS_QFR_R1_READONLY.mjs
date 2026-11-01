// Census QFR official bulk ZIP: direct-source read-only probe for earnings recession context.
// No API key, PC source ledger update, D1, scheduler, risk score or website write.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

export const QFR_URL='https://www.census.gov/econ_getzippedfile/?programCode=QFR';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const MAX_ZIP=4_000_000,MAX_CSV=12_000_000;
const fail=code=>{throw Error(code);};
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const csvLine=input=>{
  const fields=[];let field='',quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){
      if(quoted&&input[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){fields.push(field);field='';}
    else field+=c;
  }
  if(quoted)fail('QFR_UNTERMINATED_CSV_QUOTE');
  fields.push(field);
  return fields;
};
const crc32=input=>{
  let crc=0xffffffff;
  for(const b of input){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
};

export function extractQfrCsv(archive){
  const zip=Buffer.isBuffer(archive)?archive:Buffer.from(archive);
  if(zip.length<22||zip.length>MAX_ZIP)fail('QFR_ZIP_SIZE_INVALID');
  let end=-1;
  for(let at=zip.length-22;at>=Math.max(0,zip.length-65557);at--){
    if(zip.readUInt32LE(at)===0x06054b50){end=at;break;}
  }
  if(end<0||zip.readUInt16LE(end+4)!==0||zip.readUInt16LE(end+6)!==0
    ||zip.readUInt16LE(end+8)!==zip.readUInt16LE(end+10))
    fail('QFR_ZIP_CENTRAL_DIRECTORY_INVALID');
  const count=zip.readUInt16LE(end+10),length=zip.readUInt32LE(end+12);
  let cursor=zip.readUInt32LE(end+16);
  if(count<1||count>8||cursor+length>end)fail('QFR_ZIP_DIRECTORY_RANGE_INVALID');
  let match=null;
  for(let i=0;i<count;i++){
    if(cursor+46>zip.length||zip.readUInt32LE(cursor)!==0x02014b50)
      fail('QFR_ZIP_CENTRAL_DIRECTORY_INVALID');
    const flags=zip.readUInt16LE(cursor+8),method=zip.readUInt16LE(cursor+10);
    const expectedCrc=zip.readUInt32LE(cursor+16),compressed=zip.readUInt32LE(cursor+20);
    const uncompressed=zip.readUInt32LE(cursor+24),nameLen=zip.readUInt16LE(cursor+28);
    const extraLen=zip.readUInt16LE(cursor+30),commentLen=zip.readUInt16LE(cursor+32);
    const offset=zip.readUInt32LE(cursor+42),next=cursor+46+nameLen+extraLen+commentLen;
    if(next>zip.length)fail('QFR_ZIP_ENTRY_RANGE_INVALID');
    const name=zip.subarray(cursor+46,cursor+46+nameLen).toString('utf8');
    if(name==='QFR-mf.csv'){
      if(match||flags&1||![0,8].includes(method)||compressed>MAX_ZIP||uncompressed>MAX_CSV)
        fail('QFR_ZIP_ENTRY_INVALID');
      if(offset+30>zip.length||zip.readUInt32LE(offset)!==0x04034b50
        ||zip.readUInt16LE(offset+8)!==method
        ||zip.readUInt16LE(offset+6)!==flags)fail('QFR_ZIP_LOCAL_HEADER_INVALID');
      if(!(flags&8)&&(zip.readUInt32LE(offset+14)!==expectedCrc
        ||zip.readUInt32LE(offset+18)!==compressed
        ||zip.readUInt32LE(offset+22)!==uncompressed))
        fail('QFR_ZIP_INTEGRITY_FAILED');
      if(!zip.subarray(offset+30,offset+30+zip.readUInt16LE(offset+26)).equals(zip.subarray(cursor+46,cursor+46+nameLen)))
        fail('QFR_ZIP_FILENAME_MISMATCH');
      const dataAt=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28);
      if(dataAt+compressed>zip.length)fail('QFR_ZIP_PAYLOAD_RANGE_INVALID');
      const packed=zip.subarray(dataAt,dataAt+compressed);
      let unpacked;
      try {unpacked=method===8?zlib.inflateRawSync(packed,{maxOutputLength:MAX_CSV}):packed;}
      catch{fail('QFR_ZIP_INFLATE_FAILED');}
      if(unpacked.length!==uncompressed||crc32(unpacked)!==expectedCrc)
        fail('QFR_ZIP_INTEGRITY_FAILED');
      match=unpacked.toString('utf8');
    }
    cursor=next;
  }
  if(!match)fail('QFR_ZIP_CSV_MISSING');
  return match;
}

const readSections=csv=>{
  const sections=new Map();
  const blocks=csv.replace(/^\uFEFF/,'').split(/\r?\n\s*\r?\n/);
  for(const block of blocks){
    const rows=block.split(/\r?\n/);
    const title=rows.shift()?.trim();
    if(['CATEGORIES','DATA TYPES','GEO LEVELS','TIME PERIODS','DATA UPDATED ON','DATA'].includes(title)){
      if(sections.has(title))fail('QFR_DUPLICATE_SECTION');
      sections.set(title,rows.filter(row=>row.length));
    }
  }
  for(const key of ['CATEGORIES','DATA TYPES','GEO LEVELS','TIME PERIODS','DATA UPDATED ON','DATA'])
    if(!sections.has(key))fail('QFR_REQUIRED_SECTION_MISSING');
  return sections;
};
const metadata=(lines,header)=>{
  if(lines.shift()!==header)fail('QFR_METADATA_HEADER_CHANGED');
  return lines.map(csvLine);
};
const quarterlyOrdinal=period=>{
  const m=/^Q([1-4])-(\d{4})$/.exec(period);
  if(!m)fail('QFR_INVALID_QUARTER');
  return Number(m[2])*4+Number(m[1])-1;
};
const ordinalToQuarter=ordinal=>`${Math.floor(ordinal/4)}-Q${ordinal%4+1}`;

export function analyzeQfrCsv(csv,{retrievedAt=new Date().toISOString(),sourceSha256}={}){
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(retrievedAt)
    ||new Date(retrievedAt).toISOString()!==retrievedAt)fail('QFR_RETRIEVAL_TIME_INVALID');
  if(!/^[a-f0-9]{64}$/.test(sourceSha256??''))fail('QFR_ARCHIVE_SHA_INVALID');
  const sections=readSections(csv);
  const categories=metadata([...sections.get('CATEGORIES')],'cat_idx,cat_code,cat_desc,cat_indent');
  const dataTypes=metadata([...sections.get('DATA TYPES')],'dt_idx,dt_code,dt_desc,dt_unit');
  const geographies=metadata([...sections.get('GEO LEVELS')],'geo_idx,geo_code,geo_desc');
  const periods=metadata([...sections.get('TIME PERIODS')],'per_idx,per_name');
  const category=categories.filter(row=>row[1]==='MFG'&&row[2]==='All Manufacturing');
  const geo=geographies.filter(row=>row[1]==='US');
  const sales=dataTypes.filter(row=>row[1]==='101'&&row[3]==='MLN$');
  const profit=dataTypes.filter(row=>row[1]==='115'&&row[3]==='MLN$');
  if(category.length!==1||geo.length!==1||sales.length!==1||profit.length!==1)
    fail('QFR_REQUIRED_METADATA_CHANGED');
  const wantedCat=category[0][0],wantedGeo=geo[0][0];
  const wantedTypes=new Map([[sales[0][0],'salesMillionsUSD'],[profit[0][0],'afterTaxProfitMillionsUSD']]);
  const periodMap=new Map(periods.map(row=>[row[0],quarterlyOrdinal(row[1])]));
  if(periodMap.size!==periods.length)fail('QFR_PERIOD_DUPLICATE');
  const lines=sections.get('DATA');
  if(lines[0]!=='per_idx,cat_idx,dt_idx,et_idx,geo_idx,is_adj,val')
    fail('QFR_DATA_HEADER_CHANGED');
  const byQuarter=new Map();
  for(let i=1;i<lines.length;i++){
    const row=csvLine(lines[i]);
    if(row.length!==7)fail('QFR_DATA_COLUMN_COUNT_CHANGED');
    if(row[1]!==wantedCat||row[4]!==wantedGeo||row[3]!=='0'||row[5]!=='0')continue;
    const column=wantedTypes.get(row[2]);
    if(!column)continue;
    const quarter=periodMap.get(row[0]);
    if(quarter===undefined)fail('QFR_DATA_UNKNOWN_QUARTER');
    if(!/^-?\d+(?:\.\d+)?$/.test(row[6]))fail('QFR_DATA_MISSING_OR_NONNUMERIC');
    const value=Number(row[6]);
    if(!Number.isFinite(value))fail('QFR_DATA_NONFINITE');
    let item=byQuarter.get(quarter);
    if(!item){item={};byQuarter.set(quarter,item);}
    if(Object.hasOwn(item,column))fail('QFR_DATA_DUPLICATE_OBSERVATION');
    item[column]=value;
  }
  const complete=[...byQuarter].filter(([,row])=>row.salesMillionsUSD>0
    &&Number.isFinite(row.afterTaxProfitMillionsUSD)).sort((a,b)=>a[0]-b[0]);
  if(complete.length<5)fail('QFR_INSUFFICIENT_QUARTER_HISTORY');
  const latest=complete.at(-1)[0],history=[];
  if(Math.max(...byQuarter.keys())>latest)fail('QFR_NEWER_PARTIAL_QUARTER');
  for(let q=latest-4;q<=latest;q++){
    const row=byQuarter.get(q);
    if(!row||!(row.salesMillionsUSD>0)||!Number.isFinite(row.afterTaxProfitMillionsUSD))
      fail('QFR_HISTORY_MISSING_QUARTER');
    history.push({period:ordinalToQuarter(q),salesMillionsUSD:row.salesMillionsUSD,
      afterTaxProfitMillionsUSD:row.afterTaxProfitMillionsUSD,
      afterTaxProfitMarginPct:100*row.afterTaxProfitMillionsUSD/row.salesMillionsUSD});
  }
  const current=history.at(-1),previous=history.at(-2);
  return {status:'READY_READ_ONLY',provider:'U.S. Census Bureau',program:'Quarterly Financial Report',
    sourceURL:QFR_URL,sourceSha256,retrievedAt,
    dataUpdatedOn:sections.get('DATA UPDATED ON')[0]?.trim()??null,
    geography:'US',category:'All Manufacturing',categoryCode:'MFG',adjustment:'NOT_SEASONALLY_ADJUSTED',
    unit:'PERCENT',method:'100 * AFTER_TAX_PROFIT_MILLIONS_USD / SALES_MILLIONS_USD',
    observedThrough:current.period,value:current.afterTaxProfitMarginPct,
    previousValue:previous.afterTaxProfitMarginPct,
    changePercentagePoints:current.afterTaxProfitMarginPct-previous.afterTaxProfitMarginPct,
    history,historyMode:'CURRENT_RETRIEVAL_NOT_PIT',
    provenance:{salesDataType:'101',afterTaxProfitDataType:'115',geoCode:'US',isAdj:'0',errorType:'0'},
    publishedToD1:false,scoreModified:false};
}

export function analyzeQfrZip(zip,{retrievedAt=new Date().toISOString()}={}){
  return analyzeQfrCsv(extractQfrCsv(zip),{retrievedAt,sourceSha256:sha256(zip)});
}

export async function fetchQfrZip({fetchImpl=fetch}={}){
  const response=await fetchImpl(QFR_URL,{headers:{accept:'application/zip,application/octet-stream'},
    signal:AbortSignal.timeout(30000)});
  if(!response.ok)fail('QFR_SOURCE_HTTP_FAILED');
  const url=new URL(response.url||QFR_URL);
  if(url.protocol!=='https:'||!['www.census.gov','www2.census.gov'].includes(url.hostname))
    fail('QFR_SOURCE_REDIRECT_NOT_CENSUS');
  if(Number(response.headers.get('content-length'))>MAX_ZIP)fail('QFR_SOURCE_TOO_LARGE');
  if(!response.body)fail('QFR_SOURCE_BODY_MISSING');
  const reader=response.body.getReader(),parts=[];
  let bytes=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_ZIP)fail('QFR_SOURCE_TOO_LARGE');
      parts.push(Buffer.from(value));
    }
  }finally{reader.releaseLock();}
  return Buffer.concat(parts,bytes);
}

async function main(){
  const now=new Date().toISOString();
  const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
  const args=process.argv.slice(2);
  let error=null,result;
  try{
    if(args.length!==0&&!(args.length===1&&args[0]==='--dry-run')
      &&!(args.length===2&&args[0]==='--offline-zip'))fail('QFR_INVALID_ARGUMENT');
    const zip=args[0]==='--offline-zip'?fs.readFileSync(args[1]):await fetchQfrZip();
    result=analyzeQfrZip(zip,{retrievedAt:now});
  }catch(e){error=/^[A-Z0-9_]{1,90}$/.test(String(e?.message))?e.message:'QFR_READONLY_FAILED';}
  const lines=['EARNINGS_CENSUS_QFR_R1_READONLY',`UTC=${now}`,
    'MODE=READ_ONLY_NO_SQLITE_NO_D1','SOURCE='+QFR_URL,
    ...(result?[
      `SOURCE_SHA256=${result.sourceSha256}`,
      `DATA_UPDATED_ON=${result.dataUpdatedOn}`,
      `OBSERVED_THROUGH=${result.observedThrough}`,
      `MANUFACTURING_AFTER_TAX_PROFIT_MARGIN_PCT=${result.value}`,
      `PREVIOUS_QUARTER_MARGIN_PCT=${result.previousValue}`,
      `CHANGE_PERCENTAGE_POINTS=${result.changePercentagePoints}`,
      `HISTORY=${JSON.stringify(result.history)}`,
    ]:[]),
    ...(error?[`ERROR=${error}`]:[]),
    'PC_SQLITE_WRITES=0','D1_QUERIES=0','D1_WRITES=0','SCORE_WRITES=0',
    `RESULT=${error?'FAIL_QFR_SOURCE_PROBE':'PASS_QFR_SOURCE_PROBE_ONLY'}`];
  const file=path.join(HERE,`EARNINGS_CENSUS_QFR_R1_RESULT_${stamp}.txt`);
  try{fs.writeFileSync(file,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});}
  catch{console.error('ERROR=QFR_TXT_WRITE_FAILED');process.exitCode=1;return;}
  console.log(`LOG=${file}`);
  console.log(lines.filter(line=>/^(MODE|RESULT|ERROR|OBSERVED_THROUGH|MANUFACTURING_AFTER_TAX_PROFIT_MARGIN_PCT)=/.test(line)).join('\n'));
  if(error)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
