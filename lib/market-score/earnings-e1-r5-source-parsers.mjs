import {inspectXlsxArchive} from "./earnings-e1-r5-offline-preflight.mjs";
import {annualizedLog3m,symmetricChange,percentChange} from "./earnings-e1-r5-contract.mjs";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const DAY_MS=86400000;
const SOURCE_WORKBOOK_MAX_COLS=512;

function day(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;
}
function quarterEnd(year,quarter){
  const month=[3,6,9,12][quarter-1];
  const date=new Date(Date.UTC(year,month,0));
  return date.toISOString().slice(0,10);
}
function monthStart(year,month){
  if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)return null;
  return `${year}-${String(month).padStart(2,"0")}-01`;
}
function shiftMonth(value,delta){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-01$/.test(value))return null;
  const [year,month]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1+delta,1));
  return monthStart(date.getUTCFullYear(),date.getUTCMonth()+1);
}
function parseQuarterToken(value){
  const text=clean(value).toUpperCase().replace(/\s+/g,"");
  let m=text.match(/^(19\d{2}|20\d{2})[-:/]?Q([1-4])$/);
  if(m)return {year:Number(m[1]),quarter:Number(m[2])};
  m=text.match(/^Q([1-4])[-:/]?(19\d{2}|20\d{2})$/);
  if(m)return {year:Number(m[2]),quarter:Number(m[1])};
  m=text.match(/^([1-4])Q[-:/]?(19\d{2}|20\d{2})$/);
  if(m)return {year:Number(m[2]),quarter:Number(m[1])};
  return null;
}
function parseYear(value){
  if(finite(value)&&Number.isInteger(value)&&value>=1900&&value<=2200)return value;
  const text=clean(value);
  const m=text.match(/(?:^|\D)(19\d{2}|20\d{2})(?:\D|$)/);
  return m?Number(m[1]):null;
}
function parseQuarterOnly(value){
  const text=clean(value).toUpperCase().replace(/\s+/g,"");
  const m=text.match(/^Q([1-4])$/)||text.match(/^([1-4])Q$/);
  if(m)return Number(m[1]);
  if(text==="I")return 1;
  if(text==="II")return 2;
  if(text==="III")return 3;
  if(text==="IV")return 4;
  return null;
}
function excelSerialToMonth(value){
  if(!finite(value)||value<20000||value>90000)return null;
  const ms=Date.UTC(1899,11,30)+Math.round(value)*DAY_MS;
  const date=new Date(ms);
  return monthStart(date.getUTCFullYear(),date.getUTCMonth()+1);
}
function expandTwoDigitYear(value){
  const year=Number(value);
  if(!Number.isInteger(year)||year<0||year>99)return null;
  return year>=70?1900+year:2000+year;
}
function parseMonthToken(value){
  if(finite(value))return excelSerialToMonth(value);
  const text=clean(value);
  if(!text)return null;
  let m=text.match(/^(19\d{2}|20\d{2})[-/.](0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\d|3[01]))?$/);
  if(m)return monthStart(Number(m[1]),Number(m[2]));
  m=text.match(/^(0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](19\d{2}|20\d{2})$/);
  if(m)return monthStart(Number(m[2]),Number(m[1]));
  const months={JAN:1,JANUARY:1,FEB:2,FEBRUARY:2,MAR:3,MARCH:3,APR:4,APRIL:4,MAY:5,JUN:6,JUNE:6,JUL:7,JULY:7,AUG:8,AUGUST:8,SEP:9,SEPT:9,SEPTEMBER:9,OCT:10,OCTOBER:10,NOV:11,NOVEMBER:11,DEC:12,DECEMBER:12};
  const normalized=text.toUpperCase().replace(/,/g,"").trim();
  m=normalized.match(/^([A-Z]{3,9})\s+(19\d{2}|20\d{2})$/);
  if(m&&months[m[1]])return monthStart(Number(m[2]),months[m[1]]);
  m=normalized.match(/^(19\d{2}|20\d{2})\s+([A-Z]{3,9})$/);
  if(m&&months[m[2]])return monthStart(Number(m[1]),months[m[2]]);
  m=normalized.match(/^([A-Z]{3,9})[-/.](\d{2})$/);
  if(m&&months[m[1]]){
    const year=expandTwoDigitYear(m[2]);
    return year==null?null:monthStart(year,months[m[1]]);
  }
  m=normalized.match(/^(\d{2})[-/.]([A-Z]{3,9})$/);
  if(m&&months[m[2]]){
    const year=expandTwoDigitYear(m[1]);
    return year==null?null:monthStart(year,months[m[2]]);
  }
  return null;
}
function parseMonthOnly(value){
  const text=clean(value).toUpperCase().replace(/\./g,"").replace(/\s+/g,"");
  if(!text)return null;
  const months={JAN:1,JANUARY:1,FEB:2,FEBRUARY:2,MAR:3,MARCH:3,APR:4,APRIL:4,MAY:5,JUN:6,JUNE:6,JUL:7,JULY:7,AUG:8,AUGUST:8,SEP:9,SEPT:9,SEPTEMBER:9,OCT:10,OCTOBER:10,NOV:11,NOVEMBER:11,DEC:12,DECEMBER:12};
  if(months[text])return months[text];
  let m=text.match(/^M(0[1-9]|1[0-2])$/);
  if(m)return Number(m[1]);
  m=text.match(/^(0?[1-9]|1[0-2])$/);
  if(m)return Number(m[1]);
  return null;
}
function rowCell(row,column){return row?.cells?.[column]??null;}
function maxColumns(rows){return rows.reduce((max,row)=>Math.max(max,row?.cells?.length??0),0);}

function resolveQuarterColumns(headerRows){
  const columns=maxColumns(headerRows);
  const out=new Map();
  let carriedYear=null;
  for(let column=0;column<columns;column++){
    let direct=null,year=null,quarter=null;
    for(const row of headerRows){
      const value=rowCell(row,column);
      const token=parseQuarterToken(value);
      if(token)direct=token;
      const y=parseYear(value);if(y!=null)year=y;
      const q=parseQuarterOnly(value);if(q!=null)quarter=q;
    }
    if(year!=null)carriedYear=year;
    const resolved=direct??(quarter!=null&&carriedYear!=null?{year:carriedYear,quarter}:null);
    if(resolved)out.set(column,resolved);
  }
  return out;
}

export function parseBeaA051rcQuarterlyWorkbook(buffer,{seriesCode="A051RC",tableName="T11200-Q",asOf="9999-12-31"}={}){
  const archive=inspectXlsxArchive(buffer,{maxRows:160,maxCols:SOURCE_WORKBOOK_MAX_COLS});
  if(archive.status==="FAIL")return {status:"FAIL",reason:archive.reason,seriesCode,tableName,observations:[]};
  const observations=[];const matchedRows=[];
  const targetSamples=(archive.samples??[]).filter(sample=>clean(sample.name).toUpperCase()===tableName.toUpperCase());
  if(!targetSamples.length)return {status:"FAIL",reason:"BEA_A051RC_TABLE_MISSING",seriesCode,tableName,observations:[],matchedRows:[]};
  for(const sample of targetSamples){
    const rows=sample.sampledRows??[];
    for(let index=0;index<rows.length;index++){
      const row=rows[index];
      const texts=(row.cells??[]).map(clean);
      const hasCode=texts.includes(seriesCode);
      if(!hasCode)continue;
      const labelMatch=texts.some(value=>/corporate profits/i.test(value)&&(/iva/i.test(value)||/inventory valuation/i.test(value))&&(/ccadj/i.test(value)||/capital consumption/i.test(value)));
      const quarterColumns=resolveQuarterColumns(rows.slice(0,index));
      let parsed=0;
      for(const [column,{year,quarter}] of quarterColumns){
        const value=rowCell(row,column);
        if(!finite(value))continue;
        const end=quarterEnd(year,quarter);
        if(day(end)==null||day(end)>day(asOf))continue;
        observations.push({period:`${year}Q${quarter}`,year,quarter,end,value,sheet:sample.name});
        parsed++;
      }
      matchedRows.push({sheet:sample.name,row:row.row,codeMatch:true,labelMatch,parsedObservations:parsed});
    }
  }
  const byPeriod=new Map();
  for(const item of observations){
    const old=byPeriod.get(item.period);
    if(old&&old.value!==item.value)return {status:"FAIL",reason:"BEA_A051RC_QUARTER_CONFLICT",seriesCode,tableName,period:item.period,observations:[],matchedRows};
    byPeriod.set(item.period,item);
  }
  const rows=[...byPeriod.values()].sort((a,b)=>a.year-b.year||a.quarter-b.quarter);
  const latest=rows.at(-1)??null;
  const prior=latest?byPeriod.get(`${latest.year-1}Q${latest.quarter}`)??null:null;
  const raw=latest&&prior?symmetricChange(latest.value,prior.value):null;
  const yoy=latest&&prior&&prior.value>0?percentChange(latest.value,prior.value):null;
  return {
    status:latest&&prior&&finite(raw)?"PASS":rows.length?"PARTIAL":"FAIL",
    reason:latest&&prior&&finite(raw)?null:rows.length?"BEA_A051RC_YOY_PAIR_MISSING":"BEA_A051RC_QUARTER_VALUES_MISSING",
    seriesCode,
    tableName,
    source:"BEA_NIPA_T11200_CURRENT_WORKBOOK",
    currentVintageOnly:true,
    lookAheadSafeHistorical:false,
    matchedRows,
    observations:rows,
    observationCount:rows.length,
    latest,
    priorYear:prior,
    symmetricYoY:raw,
    conventionalYoYPercent:yoy,
  };
}

function resolveMonthColumns(headerRows){
  const columns=maxColumns(headerRows);
  const out=new Map();
  let carriedYear=null;
  for(let column=0;column<columns;column++){
    let direct=null,year=null,month=null;
    for(const row of headerRows){
      const value=rowCell(row,column);
      const full=parseMonthToken(value);if(full)direct=full;
      const y=parseYear(value);if(y!=null)year=y;
      const m=parseMonthOnly(value);if(m!=null)month=m;
    }
    if(year!=null)carriedYear=year;
    const resolved=direct??(month!=null&&carriedYear!=null?monthStart(carriedYear,month):null);
    if(resolved)out.set(column,resolved);
  }
  return out;
}
function findInputRows(sample){
  const rows=sample?.sampledRows??[];
  const out=[];
  for(let index=0;index<rows.length;index++){
    const row=rows[index];
    for(let column=0;column<(row.cells?.length??0);column++){
      const code=clean(rowCell(row,column)).toUpperCase();
      if(!/^IN\d{3}$/.test(code))continue;
      out.push({index,row,column,code,naics:code.slice(2),title:(row.cells??[]).map(clean).find(value=>value&&value!==code&&/input|industry|excluding|manufactur|trade|service|construction|mining|transport|information|finance|real estate|professional|administrative|education|health|arts|accommodation|government/i.test(value))??null});
      break;
    }
  }
  return out;
}

export function parseBlsSatelliteInputWorkbook(buffer,{asOf="9999-12-31"}={}){
  const archive=inspectXlsxArchive(buffer,{maxRows:400,maxCols:SOURCE_WORKBOOK_MAX_COLS});
  if(archive.status==="FAIL")return {status:"FAIL",reason:archive.reason,series:[]};
  const series=[];
  for(const sample of archive.samples??[]){
    const candidates=findInputRows(sample);
    for(const candidate of candidates){
      const monthColumns=resolveMonthColumns((sample.sampledRows??[]).slice(0,candidate.index));
      const values=[];
      for(const [column,month] of monthColumns){
        const value=rowCell(candidate.row,column);
        if(!finite(value)||day(month)==null||day(month)>day(asOf))continue;
        values.push({month,value});
      }
      const byMonth=new Map();
      let conflict=false;
      for(const item of values){
        const old=byMonth.get(item.month);
        if(old!=null&&old!==item.value){conflict=true;break;}
        byMonth.set(item.month,item.value);
      }
      if(conflict)continue;
      const observations=[...byMonth].map(([month,value])=>({month,value})).sort((a,b)=>a.month.localeCompare(b.month));
      const latest=observations.at(-1)??null;
      const lagMonth=latest?shiftMonth(latest.month,-3):null;
      const lag3m=lagMonth?observations.find(item=>item.month===lagMonth)??null:null;
      const annualized3m=latest&&lag3m?annualizedLog3m(latest.value,lag3m.value):null;
      series.push({code:candidate.code,naics:candidate.naics,title:candidate.title,sheet:sample.name,observations,observationCount:observations.length,latest,lag3m,annualized3m});
    }
  }
  const unique=new Map();
  for(const item of series){
    const old=unique.get(item.code);
    if(!old||item.observationCount>old.observationCount)unique.set(item.code,item);
  }
  const rows=[...unique.values()].sort((a,b)=>a.code.localeCompare(b.code));
  const ready=rows.filter(item=>finite(item.annualized3m));
  const latestMonths={};for(const item of rows){const key=item.latest?.month??"MISSING";latestMonths[key]=(latestMonths[key]??0)+1;}
  return {
    status:rows.length?"PASS":"PARTIAL",
    reason:rows.length?null:"BLS_SATELLITE_ROOT_SERIES_MISSING",
    source:"BLS_SATELLITE_INPUT_CURRENT_WORKBOOK",
    experimental:true,
    currentVintageOnly:true,
    lookAheadSafeHistorical:false,
    series:rows,
    rootSeriesCount:rows.length,
    annualized3mReadyCount:ready.length,
    latestMonthDistribution:latestMonths,
  };
}
