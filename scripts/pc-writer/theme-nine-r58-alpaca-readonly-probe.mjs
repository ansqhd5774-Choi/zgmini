// R58: read-only alternative hourly source availability probe.
// Only SPY, two known NY dates, at most three HTTPS GETs. No market-data
// ingestion, formula calculation, state changes or publication.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

const DAYS=Object.freeze(['2026-10-26','2026-10-27']);
const GMH='https://getmarkethistory.com/api/v1/bars/stocks/SPY/1h';
const ALPACA='https://data.alpaca.markets/v2/stocks/bars';
const ny=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const dayHour=timestamp=>{
  const d=new Date(timestamp);
  if(!Number.isFinite(d.getTime()))return null;
  const parts=Object.fromEntries(ny.formatToParts(d)
    .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
};
const readSecrets=dataRoot=>{
  const file=path.join(dataRoot,'providers.env');
  if(!fs.existsSync(file))return null;
  const values=parseEnv(fs.readFileSync(file,'utf8'));
  if(!values.APCA_API_KEY_ID?.trim()||!values.APCA_API_SECRET_KEY?.trim())return null;
  return {id:values.APCA_API_KEY_ID,secret:values.APCA_API_SECRET_KEY};
};
const pick=rows=>{
  const selected={};
  for(const day of DAYS){
    const matches=rows.filter(r=>dayHour(r.t)===`${day}T15`&&
      Number.isFinite(r.c)&&r.c>0);
    selected[day]={count:matches.length,close:matches.length===1?matches[0].c:null};
  }
  return selected;
};
async function boundedBody(response,maxBytes=2_000_000){
  if(!response?.body)throw Error('RESPONSE_EMPTY');
  const length=Number(response.headers?.get('content-length'));
  if(Number.isFinite(length)&&length>maxBytes)throw Error('RESPONSE_TOO_LARGE');
  let size=0;const chunks=[];
  for await(const part of response.body){
    size+=part.byteLength;
    if(size>maxBytes)throw Error('RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(part));
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function request(url,headers,fetchImpl){
  try{
    const response=await fetchImpl(url,{method:'GET',redirect:'error',headers,
      signal:AbortSignal.timeout(15000)});
    if(!response?.ok)return {httpStatus:response?.status??null,rows:[],error:'HTTP_NOT_OK'};
    return {httpStatus:response.status,body:await boundedBody(response)};
  }catch{return {httpStatus:null,rows:[],error:'NETWORK_TIMEOUT_OR_BAD_RESPONSE'};}
}
const safeResult=(response,rows,kind)=>({
  httpStatus:response.httpStatus,
  status:response.error??'OK',
  source:kind,
  sessions:Object.fromEntries(Object.entries(pick(rows))
    .map(([day,bar])=>[day,{ny15BarCount:bar.count,hasUsableBar:bar.count===1}]))
});

export async function probeNineR58({dataRoot='E:/ZGmini/data/pc-writer',
  fetchImpl=fetch,credentials=undefined}={}){
  const report={report:'THEME_NINE_R58_EXISTING_ALPACA_1H_READONLY',
    branch:'codex/theme-fear-greed-integration-20261025',
    checkedDates:DAYS,requestBudgetMax:3,marketDataWrites:0,rawWrites:0,
    scheduleWrites:0,formulaWrites:0,d1Writes:0,published:false,
    proposedPriceMode:'RAW_UNADJUSTED_ALPACA_1H_NOT_YET_APPROVED',
    priceModeApproved:false};
  const creds=credentials===undefined?readSecrets(dataRoot):credentials;
  if(!creds?.id||!creds?.secret)return {...report,
    status:'STOP_ALPACA_REGISTERED_CREDENTIALS_UNAVAILABLE',requests:0};
  let calls=0;
  const gmUrl=new URL(GMH);
  gmUrl.search=new URLSearchParams({start:DAYS[0],end:DAYS[0],format:'jsonl'});
  calls++;
  const gmh=await request(gmUrl,{accept:'application/x-ndjson'},fetchImpl);
  let gmhRows=[];
  if(!gmh.error){
    try{gmhRows=gmh.body.split(/\r?\n/).filter(Boolean).map(x=>{
      const p=JSON.parse(x);
      return {t:p.timestamp,c:p.is_gap?null:p.close};
    });}catch{gmh.error='GMH_BAD_NDJSON';}
  }
  const baseline=pick(gmhRows)[DAYS[0]];
  const feeds={};
  for(const feed of ['sip','iex']){
    const url=new URL(ALPACA);
    url.search=new URLSearchParams({symbols:'SPY',timeframe:'1Hour',
      start:'2026-10-26T00:00:00Z',end:'2026-10-29T00:00:00Z',
      adjustment:'raw',feed,limit:'500'});
    calls++;
    const result=await request(url,{
      'APCA-API-KEY-ID':creds.id,'APCA-API-SECRET-KEY':creds.secret,
      accept:'application/json'},fetchImpl);
    let rows=[];
    if(!result.error){
      try{
        const json=JSON.parse(result.body);
        if(json.next_page_token!==null&&json.next_page_token!==undefined)
          throw Error('PAGINATION_NOT_COMPLETE');
        if(!Array.isArray(json.bars?.SPY))throw Error('NO_SPY_ARRAY');
        rows=json.bars.SPY;
      }catch{result.error='ALPACA_INVALID_OR_PAGED_JSON';}
    }
    const selected=pick(rows)[DAYS[0]];
    feeds[feed]={...safeResult(result,rows,`ALPACA_${feed.toUpperCase()}_1H_RAW`),
      baselineSPY26CloseCompared:baseline.count===1&&selected.count===1,
      baselineSPY26CloseExactMatch:baseline.count===1&&selected.count===1
        ?Math.abs(baseline.close-selected.close)<1e-8:null};
  }
  return {...report,status:'READ_ONLY_PROBE_COMPLETE',requests:calls,
    gmh:safeResult(gmh,gmhRows,'GETMARKETHISTORY_1H'),alpaca:feeds,
    next:'NEEDS_APPROVAL_AND_63_ETF_COVERAGE_PLUS_PRICE_MODE_PROOF_BEFORE_ANY_R32_USE'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||process.argv[2]!=='--probe'){
    console.error('RESULT=STOP_R58_USAGE');process.exitCode=2;
  }else{
    try{
      const result=await probeNineR58();
      console.log(JSON.stringify(result,null,2));
      if(result.status!=='READ_ONLY_PROBE_COMPLETE')process.exitCode=3;
    }catch{console.error('RESULT=STOP_R58_LOCAL_SETUP_OR_UNEXPECTED_ERROR');process.exitCode=4;}
  }
}
