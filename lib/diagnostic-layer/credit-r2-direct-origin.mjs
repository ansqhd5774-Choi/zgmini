// #1339: read-only, explicitly non-operational official-source candidate.
// NY Fed CMDI is already direct; this file supplies Treasury & Chicago formats.
const fail=code=>{throw new Error('CREDIT_DIRECT_'+code)};
const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:
 typeof x==='string'&&x.trim()!==''&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(x.trim())&&
 Number.isFinite(Number(x))?Number(x):null;
const row=(observationDate,value)=>({observationDate,value,releaseDate:null,availableAt:null,
 vintageId:null,vintageMethod:'CURRENT_VINTAGE_ONLY'});
const tenors=Object.freeze({DGS2:'BC_2YEAR',DGS5:'BC_5YEAR',DGS10:'BC_10YEAR',DGS30:'BC_30YEAR'});
export const CREDIT_R2_DIRECT_ORIGIN=Object.freeze({
 cmdi:'https://www.newyorkfed.org/research/policy/cmdi',
 nfci:'https://www.chicagofed.org/research/data/nfci/current-data-aws',
 treasury:'https://home.treasury.gov/treasury-daily-interest-rate-xml-feed'});
export function treasuryParYearUrl(year){
 if(!Number.isInteger(year)||year<1990||year>2100)fail('YEAR');
 const u=new URL('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml');
 u.search=new URLSearchParams({data:'daily_treasury_yield_curve',field_tdr_date_value:String(year)});
 return u;
}
function xmlTag(s,k){
 const pattern=new RegExp('<d:'+k+'(?:\\s[^>]*)?>([^<]*)<\\/d:'+k+'>','i');
 return pattern.exec(s)?.[1]??null;
}
export function parseTreasuryParXml(xml,{year,asOfDate}={}){
 if(typeof xml!=='string'||xml.length>3_000_000||!validDay(asOfDate)||
  !Number.isInteger(year)||year>Number(asOfDate.slice(0,4)))fail('INPUT');
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail('XML_ENTITY');
 const entries=[...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)];
 if(!entries.length)fail('NO_ENTRIES');
 const result=Object.fromEntries(Object.keys(tenors).map(k=>[k,[]]));
 const map=new Map();
 for(const [,entry] of entries){
  const date=xmlTag(entry,'NEW_DATE')?.slice(0,10);
  if(!validDay(date)||date.slice(0,4)!==String(year))fail('DATE');
  if(date>asOfDate)continue;
  const values={};
  for(const [id,tag] of Object.entries(tenors)){
   const raw=xmlTag(entry,tag);const value=num(raw);
   if(raw!==null&&raw.trim()!==''&&value===null)fail('NUMERIC');
   values[id]=value;
  }
  if(map.has(date)&&JSON.stringify(map.get(date))!==JSON.stringify(values))fail('DUPLICATE');
  map.set(date,values);
 }
 for(const [date,values] of [...map].sort(([a],[b])=>a.localeCompare(b)))
  for(const [id,value] of Object.entries(values))if(value!==null)result[id].push(row(date,value));
 if(Object.values(result).some(x=>x.length===0))fail('MISSING_TENOR');
 return {status:'READY_CANDIDATE_ONLY',authority:'US_TREASURY',asOfDate,year,series:result};
}
function csvRows(text){
 if(typeof text!=='string'||text.length>4_000_000)fail('CSV_SIZE');
 const result=[];let fields=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}
   else if(quoted||cell==='')quoted=!quoted;else fail('CSV_QUOTE');}
  else if(c===','&&!quoted){fields.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){
   fields.push(cell);cell='';
   if(fields.some(x=>x.trim()!==''))result.push(fields);fields=[];
   if(c==='\r'&&text[i+1]==='\n')i++;
  }else cell+=c;
 }
 if(quoted)fail('CSV_QUOTE');
 fields.push(cell);if(fields.some(x=>x.trim()!==''))result.push(fields);
 return result;
}
function csvDay(raw){
 const s=String(raw??'').trim();if(validDay(s))return s;
 const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
 if(!m)return null;
 const d=m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
 return validDay(d)?d:null;
}
export function parseChicagoNfciCsv(text,{asOfDate}={}){
 if(!validDay(asOfDate))fail('AS_OF');
 const data=csvRows(text);
 const dateName=/^(Date|Week(?: Ending)?|observation_date)$/i;
 const creditName=/^(Credit|NFCI Credit|Credit Subindex)$/i;
 const nfciName=/^(NFCI|NFCI Index)$/i;
 const headerIdx=data.findIndex(r=>r.some(x=>dateName.test(x.trim()))&&
  r.some(x=>creditName.test(x.trim()))&&r.some(x=>nfciName.test(x.trim())));
 if(headerIdx<0)fail('SCHEMA');
 const header=data[headerIdx].map(x=>x.trim());
 const dateIdx=header.findIndex(x=>dateName.test(x));
 const creditIdx=header.findIndex(x=>creditName.test(x));
 const map=new Map();
 for(const fields of data.slice(headerIdx+1)){
  const date=csvDay(fields[dateIdx]);if(!date)fail('DATE');
  if(date>asOfDate)continue;
  const value=num(fields[creditIdx]);if(value===null)fail('NUMERIC');
  if(map.has(date)&&map.get(date)!==value)fail('DUPLICATE');
  map.set(date,value);
 }
 if(!map.size)fail('EMPTY');
 return {status:'READY_CANDIDATE_ONLY',seriesId:'NFCICREDIT',authority:'CHICAGO_FED',
  rows:[...map].sort(([a],[b])=>a.localeCompare(b)).map(([d,v])=>row(d,v))};
}
export function compareCreditOriginRows(oldRows=[],candidateRows=[],{minOverlap=252,deltaLimit=0}={}){
 if(!Array.isArray(oldRows)||!Array.isArray(candidateRows)||!Number.isInteger(minOverlap)||
  minOverlap<1||!Number.isFinite(deltaLimit)||deltaLimit<0)fail('COMPARE_ARGUMENTS');
 const old=new Map();
 for(const x of oldRows)if(validDay(x?.observationDate)&&num(x?.value)!==null){
  if(old.has(x.observationDate)&&old.get(x.observationDate)!==num(x.value))fail('OLD_DUPLICATE');
  old.set(x.observationDate,num(x.value));
 }
 let overlap=0,maxDelta=0,firstMismatch=null;const seen=new Map();
 for(const x of candidateRows){
  if(!validDay(x?.observationDate)||num(x?.value)===null)fail('CANDIDATE_ROW');
  const date=x.observationDate,val=num(x.value);
  if(seen.has(date)&&seen.get(date)!==val)fail('DUPLICATE');
  seen.set(date,val);
  if(!old.has(date))continue;
  overlap++;
  const d=Math.abs(old.get(date)-val);
  maxDelta=Math.max(maxDelta,d);
  if(d>deltaLimit&&firstMismatch===null)firstMismatch=date;
 }
 return {status:overlap>=minOverlap&&firstMismatch===null?'PARITY_PASS':'NOT_PROVEN',
  overlap,maxDelta,firstMismatch};
}
export async function fetchTreasuryParYear(year,{asOfDate,fetchImpl=globalThis.fetch,timeoutMs=8000}={}){
 if(!validDay(asOfDate)||year>Number(asOfDate.slice(0,4)))fail('REQUEST');
 const url=treasuryParYearUrl(year),controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),Math.min(timeoutMs,8000));
 let reader;
 try{
  const res=await Reflect.apply(fetchImpl,globalThis,[url,{redirect:'manual',signal:controller.signal,
   headers:{accept:'application/xml,text/xml'}}]);
  if(!res.ok||!res.body?.getReader)fail('HTTP');
  reader=res.body.getReader();
  const decoder=new TextDecoder();let xml='',bytes=0;
  for(;;){const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;if(bytes>3_000_000)fail('BODY_LIMIT');
   xml+=decoder.decode(value,{stream:true});
  }
  xml+=decoder.decode();
  return parseTreasuryParXml(xml,{year,asOfDate});
 }finally{clearTimeout(timer);if(reader)await reader.cancel().catch(()=>{});}
}
