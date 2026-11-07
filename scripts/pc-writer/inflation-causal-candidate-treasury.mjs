// Research candidate #16: Treasury MTS Table 4 Customs Duties monthly cash receipts.
// Private raw observation only. No score, schedule, D1, API or public page writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const CUSTOMS_DUTIES_LINE='405';
export const TREASURY_MTS_CUSTOMS_ENDPOINT='https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_4';
export const TREASURY_MTS_CUSTOMS_FILE='inflation-causal-candidates-r1/treasury-mts-customs-duties.json';
export const TREASURY_MTS_CUSTOMS_VERSION='INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1';
const MAX_RESPONSE_BYTES=5_000_000;
const MONTH_LAST=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const MONEY=/^-?(?:0|[1-9]\d*)\.\d{2}$/;
const fail=code=>Object.assign(new Error(code),{code});
const sha=x=>createHash('sha256').update(x).digest('hex');
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const safeDir=dir=>{try{const s=fs.lstatSync(dir);return s.isDirectory()&&!s.isSymbolicLink();}catch{return false;}};
const safeFile=file=>{try{const s=fs.lstatSync(file);return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=24_000_000;}catch{return false;}};
function strictDate(s){
  return typeof s==='string'&&MONTH_LAST.test(s)&&Number.isFinite(Date.parse(s))&&
    new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s&&
    new Date(Date.UTC(Number(s.slice(0,4)),Number(s.slice(5,7)),0)).toISOString().slice(0,10)===s;
}
const cents=v=>{
  if(typeof v!=='string'||!MONEY.test(v))throw fail('TREASURY_CUSTOMS_MONEY_INVALID');
  const negative=v[0]==='-',abs=negative?v.slice(1):v;
  const [d,c]=abs.split('.');const amount=BigInt(d)*100n+BigInt(c);
  return negative?-amount:amount;
};

export function normalizeTreasuryCustoms(payload){
  if(!Array.isArray(payload?.data)||!payload.data.length||payload.data.length>200)
    throw fail('TREASURY_CUSTOMS_PAYLOAD_INVALID');
  const total=Number(payload?.meta?.['total-count']);
  if(!Number.isSafeInteger(total)||total!==payload.data.length)
    throw fail('TREASURY_CUSTOMS_PAGINATION_INCOMPLETE');
  const seen=new Set(),observations=[];
  for(const row of payload.data){
    if(String(row?.line_code_nbr)!==CUSTOMS_DUTIES_LINE||row?.classification_desc!=='Customs Duties'||
      !strictDate(row?.record_date)||seen.has(row.record_date))
      throw fail('TREASURY_CUSTOMS_ROW_ID_OR_DATE_INVALID');
    const net=cents(row.current_month_net_rcpt_amt);
    const gross=cents(row.current_month_gross_rcpt_amt);
    const refund=cents(row.current_month_refund_amt);
    if(gross-refund!==net)throw fail('TREASURY_CUSTOMS_ARITHMETIC_MISMATCH');
    seen.add(row.record_date);
    observations.push({date:row.record_date,period:row.record_date.slice(0,7),
      netUsdDecimal:row.current_month_net_rcpt_amt,
      grossUsdDecimal:row.current_month_gross_rcpt_amt,
      refundUsdDecimal:row.current_month_refund_amt,
      unit:'USD',valueKind:'MONTHLY_NET_CASH_RECEIPTS'});
  }
  observations.sort((a,b)=>a.date.localeCompare(b.date));
  return observations;
}

function safeChild(parent,name){
  const dir=path.join(parent,name);
  if(fs.existsSync(dir)&&!safeDir(dir))throw fail('TREASURY_CUSTOMS_STORAGE_PATH_UNSAFE');
  if(!fs.existsSync(dir))fs.mkdirSync(dir);
  if(!safeDir(dir))throw fail('TREASURY_CUSTOMS_STORAGE_PATH_UNSAFE');
  return dir;
}
function validExisting(doc){
  return doc?.schemaVersion===1&&doc?.provider==='US_TREASURY_MTS'&&
    doc.sourceVersion===TREASURY_MTS_CUSTOMS_VERSION&&validIso(doc.sourceStoredAt)&&
    Array.isArray(doc.observations)&&doc.observations.length>0&&doc.observations.every(x=>
      strictDate(x?.date)&&typeof x.netUsdDecimal==='string'&&MONEY.test(x.netUsdDecimal));
}
function archive(parent,bytes){
  const raw=safeChild(parent,'raw'),sum=sha(bytes),name=`treasury-mts-customs-${sum}.json`;
  const file=path.join(raw,name);
  if(!fs.existsSync(file)){
    try{fs.writeFileSync(file,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  if(!safeFile(file)||sha(fs.readFileSync(file))!==sum)
    throw fail('TREASURY_CUSTOMS_ARCHIVE_VERIFY_FAILED');
  return {sourceSha256:sum,archive:`raw/${name}`};
}
function atomic(file,document){
  const bytes=Buffer.from(JSON.stringify(document)),temp=`${file}.next-${randomUUID()}`;
  fs.writeFileSync(temp,bytes,{flag:'wx'});
  try{fs.renameSync(temp,file);}catch{try{fs.unlinkSync(temp);}catch{}throw fail('TREASURY_CUSTOMS_ATOMIC_RENAME_FAILED');}
  if(!safeFile(file)||sha(fs.readFileSync(file))!==sha(bytes))
    throw fail('TREASURY_CUSTOMS_READBACK_FAILED');
  return sha(bytes);
}

export async function collectTreasuryCustoms({base,quotaFetch,now=new Date()}={}){
  if(typeof base!=='string'||path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||!safeDir(base))
    throw fail('TREASURY_CUSTOMS_PC_BASE_DENIED');
  if(typeof quotaFetch!=='function')throw fail('TREASURY_CUSTOMS_QUOTA_FETCH_REQUIRED');
  const moment=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(moment.getTime()))throw fail('TREASURY_CUSTOMS_NOW_INVALID');
  const url=new URL(TREASURY_MTS_CUSTOMS_ENDPOINT);
  url.searchParams.set('filter',`line_code_nbr:eq:${CUSTOMS_DUTIES_LINE}`);
  url.searchParams.set('fields',[
    'record_date','line_code_nbr','classification_desc','current_month_gross_rcpt_amt',
    'current_month_refund_amt','current_month_net_rcpt_amt',
  ].join(','));
  url.searchParams.set('sort','record_date');
  url.searchParams.set('page[size]','200');
  const response=await quotaFetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(20_000)});
  if(response?.status>=300&&response.status<400)throw fail('TREASURY_CUSTOMS_REDIRECT_DENIED');
  if(!response?.ok)throw fail(`TREASURY_CUSTOMS_HTTP_${Number.isInteger(response?.status)?response.status:'FAILED'}`);
  if(!response.body?.getReader)throw fail('TREASURY_CUSTOMS_STREAM_REQUIRED');
  const reader=response.body.getReader(),parts=[];let bytesCount=0;
  for(;;){const {done,value}=await reader.read();if(done)break;
    bytesCount+=value.byteLength;if(bytesCount>MAX_RESPONSE_BYTES){await reader.cancel();throw fail('TREASURY_CUSTOMS_BODY_LIMIT');}
    parts.push(Buffer.from(value));
  }
  const bytes=Buffer.concat(parts);let payload;
  try{payload=JSON.parse(bytes.toString('utf8'));}
  catch{throw fail('TREASURY_CUSTOMS_JSON_INVALID');}
  const incoming=normalizeTreasuryCustoms(payload);
  const dir=safeChild(base,'inflation-causal-candidates-r1');
  const file=path.join(dir,'treasury-mts-customs-duties.json');
  let prior=null;
  if(fs.existsSync(file)){
    if(!safeFile(file))throw fail('TREASURY_CUSTOMS_EXISTING_FILE_UNSAFE');
    try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw fail('TREASURY_CUSTOMS_EXISTING_JSON_INVALID');}
    if(!validExisting(prior))throw fail('TREASURY_CUSTOMS_EXISTING_CONTRACT_INVALID');
  }
  const byDate=new Map([...(prior?.observations??[]),...incoming].map(x=>[x.date,x]));
  const observations=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(prior&&JSON.stringify(observations)===JSON.stringify(prior.observations))return {
    status:'UNCHANGED',stored:false,providerRequests:1,count:observations.length,
    latest:observations.at(-1).date};
  const provenance=archive(dir,bytes);
  const doc={schemaVersion:1,sourceVersion:TREASURY_MTS_CUSTOMS_VERSION,provider:'US_TREASURY_MTS',
    sourceStoredAt:moment.toISOString(),lineCode:CUSTOMS_DUTIES_LINE,
    classification:'Customs Duties',frequency:'MONTHLY',observations,provenance};
  const fileSha256=atomic(file,doc);
  return {status:'SAVED_READBACK',stored:true,providerRequests:1,count:observations.length,
    latest:observations.at(-1).date,sourceStoredAt:doc.sourceStoredAt,fileSha256,...provenance};
}
