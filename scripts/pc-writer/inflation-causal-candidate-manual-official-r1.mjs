// Offline parsing of official static inflation source files.
// This module NEVER changes PC state, checks Core cadence, calls providers,
// or claims a published result. An approved operator must own persistence.
import {createHash} from 'node:crypto';

export const MANUAL_OFFICIAL_VERSION='INFLATION_CAUSAL_CANDIDATE_MANUAL_OFFICIAL_R1';
export const BLS_HOUSING_URL='https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing';
export const CENSUS_INVENTORY_URL='https://www.census.gov/manufacturing/m3/prel/historical_data/histshts/naics/naicsinvp.xlsx';
export const BLS_RENT_ID='CUSR0000SEHA';
export const BLS_OER_ID='CUSR0000SEHC01';
export const CENSUS_M3_SHEET='m3-outp-invp';
export const CENSUS_M3_SERIES='AMTMTI';
export const BLS_CANDIDATE_VERSION='INFLATION_CAUSAL_CANDIDATE_BLS3_R1';
export const CENSUS_CANDIDATE_VERSION='INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1';

const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const MONTH=/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-01$/;
const NUMBER=/^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SOURCE_IDS=[BLS_RENT_ID,BLS_OER_ID];

function checkBytes(source,maxBytes,kind){
  if(!(source instanceof Uint8Array)||source.byteLength<20||source.byteLength>maxBytes)
    fail(`INFL_MANUAL_${kind}_BYTES_INVALID`);
  return Buffer.from(source.buffer,source.byteOffset,source.byteLength);
}

export function parseOfficialBlsHousingFlatfile(source){
  const bytes=checkBytes(source,8_000_000,'BLS');
  const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
  const lines=body.split(/\r?\n/);
  if(!/^\s*series_id\s+year\s+period\s+value\s+footnote_codes\s*$/.test(lines[0]??''))
    fail('INFL_MANUAL_BLS_HEADER_INVALID');
  const found=Object.fromEntries(SOURCE_IDS.map(id=>[id,[]]));
  const seen=new Set();
  const missing=[];
  for(const [index,line] of lines.entries()){
    if(index===0||!line.trim())continue;
    const cells=line.trim().split(/\s+/);
    if(!SOURCE_IDS.includes(cells[0]))continue;
    if(cells.length<4||cells.length>5)fail('INFL_MANUAL_BLS_ROW_INVALID');
    const [id,year,period,raw,footnote='']=cells;
    if(!/^(?:19|20|21)\d{2}$/.test(year)||!/^M(?:0[1-9]|1[0-3])$/.test(period))
      fail('INFL_MANUAL_BLS_MONTH_INVALID');
    if(period==='M13')continue;
    const date=`${year}-${period.slice(1)}-01`;
    if(!MONTH.test(date))fail('INFL_MANUAL_BLS_MONTH_INVALID');
    const key=`${id}:${date}`;
    if(seen.has(key))fail('INFL_MANUAL_BLS_DUPLICATE');
    seen.add(key);
    if(raw==='-'){
      if(!footnote.includes('X'))fail('INFL_MANUAL_BLS_UNEXPLAINED_MISSING');
      missing.push({seriesID:id,date,footnote:'X'});
      continue;
    }
    if(!NUMBER.test(raw)||!Number.isFinite(Number(raw)))
      fail('INFL_MANUAL_BLS_VALUE_INVALID');
    found[id].push({date,value:Number(raw),footnotes:footnote?[{code:footnote}]:[]});
  }
  for(const id of SOURCE_IDS){
    found[id].sort((a,b)=>a.date.localeCompare(b.date));
    if(found[id].length<2)fail('INFL_MANUAL_BLS_HISTORY_INCOMPLETE');
  }
  return {
    provider:'BLS',sourceKind:'BLS_OFFICIAL_CU_STATIC_FLATFILE',sourceUrl:BLS_HOUSING_URL,
    sourceSha256:hash(bytes),series:found,missing,
    latestBySeries:Object.fromEntries(SOURCE_IDS.map(id=>[id,found[id].at(-1).date])),
  };
}

const CENSUS_MONTH_COLUMNS='CDEFGHIJKLMN';
const NUMERIC=/^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const cell=(row,column)=>row?.cells?.[`${column}${row.rowNum}`]?.value;

// Census Historical NAICS Inventory: A=series code, B=calendar year,
// C..N=January..December. Exact selector AMTMTI is seasonally adjusted,
// all manufacturing industries, total inventories (nominal USD millions).
export function parseOfficialCensusInventoryRows(rows){
  if(!Array.isArray(rows)||!rows.length||rows.length>40_000)
    fail('INFL_MANUAL_CENSUS_ROWS_INVALID');
  const observations=[],seenYears=new Set();
  for(const row of rows){
    if(!Number.isSafeInteger(row?.rowNum)||!row.cells||typeof row.cells!=='object')
      fail('INFL_MANUAL_CENSUS_ROW_SHAPE');
    if(String(cell(row,'A')??'').trim()!==CENSUS_M3_SERIES)continue;
    const rawYear=String(cell(row,'B')??'').trim();
    if(!/^(?:19|20|21)\d{2}$/.test(rawYear)||seenYears.has(rawYear))
      fail('INFL_MANUAL_CENSUS_YEAR_INVALID');
    seenYears.add(rawYear);
    let encounteredMissing=false;
    for(let month=1;month<=12;month++){
      const raw=String(cell(row,CENSUS_MONTH_COLUMNS[month-1])??'').replace(/,/g,'').trim();
      if(!raw||raw==='-'){
        encounteredMissing=true;
        continue;
      }
      if(!NUMERIC.test(raw)||!Number.isFinite(Number(raw)))
        fail('INFL_MANUAL_CENSUS_VALUE_INVALID');
      if(encounteredMissing)fail('INFL_MANUAL_CENSUS_INTERNAL_GAP');
      observations.push({
        date:`${rawYear}-${String(month).padStart(2,'0')}-01`,
        value:Number(raw),unit:'USD_MILLION_SA_NOMINAL',
        selector:'MTM/TI',seasonallyAdjusted:true,
      });
    }
  }
  observations.sort((a,b)=>a.date.localeCompare(b.date));
  if(seenYears.size<2||observations.length<13)
    fail('INFL_MANUAL_CENSUS_HISTORY_INCOMPLETE');
  return observations;
}

export async function parseOfficialCensusInventoryWorkbook(source,{readWorkbook}={}){
  const bytes=checkBytes(source,6_000_000,'CENSUS');
  if(bytes.subarray(0,4).toString('hex')!=='504b0304')
    fail('INFL_MANUAL_CENSUS_NOT_XLSX');
  const read=readWorkbook??(await import('../../lib/diagnostic-layer/xlsx-lite.mjs')).readXlsxWorkbook;
  const workbook=await read(bytes);
  const rows=workbook?.sheets?.get?.(CENSUS_M3_SHEET);
  if(!rows)fail('INFL_MANUAL_CENSUS_SHEET_MISSING');
  const observations=parseOfficialCensusInventoryRows(rows);
  return {provider:'US_CENSUS_M3',sourceKind:'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX',
    sourceUrl:CENSUS_INVENTORY_URL,sourceSha256:hash(bytes),
    selector:'MTM/TI',unit:'USD_MILLION_SA_NOMINAL',observations,
    latest:observations.at(-1).date};
}

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const isIso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&
  new Date(value).toISOString()===value;
const validateRows=rows=>Array.isArray(rows)&&rows.length>0&&
  rows.every(x=>MONTH.test(x?.date??'')&&typeof x.value==='number'&&
    Number.isFinite(x.value)&&x.value>=0);

// Prepare candidate files compatible with the current read-only seven-input
// presentation. These are PLANS, not writes. In particular, caller must not
// mark Core's attempted/processed event checkpoint or use a fake quotaFetch.
export function planOfficialManualCandidateDocuments({bls,census,previousBls=null,
  previousCensus=null,now=new Date()}={}){
  const moment=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(moment.getTime()))fail('INFL_MANUAL_TIMESTAMP_INVALID');
  const timestamp=moment.toISOString();
  if(!isIso(timestamp)||bls?.sourceKind!=='BLS_OFFICIAL_CU_STATIC_FLATFILE'||
    census?.sourceKind!=='CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX'||
    !/^[a-f0-9]{64}$/.test(bls.sourceSha256)||
    !/^[a-f0-9]{64}$/.test(census.sourceSha256))
    fail('INFL_MANUAL_PROVENANCE_INVALID');
  if(previousBls!==null&&(
    previousBls.schemaVersion!==1||previousBls.provider!=='BLS'||
    previousBls.sourceVersion!==BLS_CANDIDATE_VERSION||!isIso(previousBls.sourceStoredAt)||
    !previousBls.series||typeof previousBls.series!=='object'||
    Object.values(previousBls.series).some(rows=>!validateRows(rows))))
    fail('INFL_MANUAL_PRIOR_BLS_INVALID');
  if(previousCensus!==null&&(
    previousCensus.schemaVersion!==1||previousCensus.provider!=='US_CENSUS_M3'||
    previousCensus.sourceVersion!==CENSUS_CANDIDATE_VERSION||
    !isIso(previousCensus.sourceStoredAt)||
    previousCensus.selector!=='MTM/TI'||
    !validateRows(previousCensus.observations)))
    fail('INFL_MANUAL_PRIOR_CENSUS_INVALID');
  for(const id of SOURCE_IDS)if(!validateRows(bls.series?.[id]))
    fail('INFL_MANUAL_BLS_SERIES_INVALID');
  if(!validateRows(census.observations))
    fail('INFL_MANUAL_CENSUS_OBSERVATIONS_INVALID');

  const series={...previousBls?.series};
  for(const id of SOURCE_IDS){
    const rows=[...(previousBls?.series?.[id]??[]),...bls.series[id]];
    series[id]=[...new Map(rows.map(row=>[row.date,row])).values()]
      .sort((a,b)=>a.date.localeCompare(b.date));
  }
  const observations=[...new Map([
    ...(previousCensus?.observations??[]),...census.observations,
  ].map(row=>[row.date,row])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const blsChanged=!same(series,previousBls?.series),
    censusChanged=!same(observations,previousCensus?.observations);

  const blsProvenance={origin:'BLS_OFFICIAL_STATIC_FILE',method:'EXPLICIT_MANUAL_IMPORT',
    sourceUrl:BLS_HOUSING_URL,sourceSha256:bls.sourceSha256,
    archive:`raw/bls-cpi-official-${bls.sourceSha256}.txt`};
  const censusProvenance={origin:'CENSUS_OFFICIAL_HISTORICAL_XLSX',
    method:'EXPLICIT_MANUAL_IMPORT',sourceUrl:CENSUS_INVENTORY_URL,
    sourceSha256:census.sourceSha256,
    archive:`raw/census-m3-official-${census.sourceSha256}.xlsx`};
  const blsDoc=blsChanged?{
    schemaVersion:1,provider:'BLS',sourceVersion:BLS_CANDIDATE_VERSION,
    sourceStoredAt:timestamp,frequency:'MONTHLY',groupUpdated:'cpi',series,
    sourceAcquisition:MANUAL_OFFICIAL_VERSION,
    provenanceByGroup:{...previousBls?.provenanceByGroup,cpi:blsProvenance},
  }:previousBls;
  const censusDoc=censusChanged?{
    schemaVersion:1,provider:'US_CENSUS_M3',sourceVersion:CENSUS_CANDIDATE_VERSION,
    sourceStoredAt:timestamp,selector:'MTM/TI',frequency:'MONTHLY',
    unit:'USD_MILLION_SA_NOMINAL',observations,
    sourceAcquisition:MANUAL_OFFICIAL_VERSION,
    provenance:[...(previousCensus?.provenance??[]),censusProvenance],
  }:previousCensus;
  return {status:blsChanged||censusChanged?'PREPARED':'UNCHANGED',
    writes:{bls:blsChanged,census:censusChanged},
    expectedRawArchives:{bls:blsProvenance,census:censusProvenance},
    documents:{bls:blsDoc,census:censusDoc},
    apiCalls:0,dbWrites:0,d1Writes:0,coreCheckpointWrites:0};
}
